/**
 * VisibilityScheduler — MOTEUR MÉTIER d'ordonnancement (pas un simple timer).
 *
 * Décision d'architecture (MVP) :
 *  - Les échéances sont gérées par des timers EN MÉMOIRE (setTimeout) pour la
 *    précision, doublés d'un SWEEP périodique de réconciliation.
 *  - Chaque tâche est PERSISTÉE en base (ScheduledTask: type, runAt, status…),
 *    ce qui permet de survivre aux redémarrages.
 *  - Au démarrage, le Recovery Scheduler (voir recovery.ts) relance le sweep qui
 *    recharge et (re)planifie les tâches échues ou à venir.
 *  - L'implémentation est cachée derrière l'interface `IScheduler` : on pourra
 *    remplacer les timers locaux par un ordonnanceur distribué (Redis/BullMQ,
 *    Temporal…) SANS toucher à la logique métier (handlers).
 *
 * Le moteur est générique (registre de handlers par `type`) : au-delà de la
 * diffusion des missions, il portera relances, rappels client, expiration
 * d'offres, remboursements de crédits et notifications de suivi.
 */

import ScheduledTask, { IScheduledTask, ScheduledTaskType } from '../models/ScheduledTask'
import { connectMongoose } from '../mongoose'

export interface ScheduleInput {
  type: ScheduledTaskType
  runAt: Date
  requestId?: string
  stage?: number
  payload?: Record<string, any>
  maxAttempts?: number
}

export type TaskHandler = (task: IScheduledTask) => Promise<void>

export interface IScheduler {
  register(type: ScheduledTaskType, handler: TaskHandler): void
  schedule(input: ScheduleInput): Promise<string>
  cancelForRequest(requestId: string, types?: ScheduledTaskType[]): Promise<number>
  start(): void
  stop(): void
  runDue(): Promise<void>
}

const HORIZON_MS = 6 * 60 * 1000 // on arme un timer précis si l'échéance est < 6 min
const SWEEP_MS = 15_000 // réconciliation toutes les 15 s
const STALE_RUNNING_MS = 2 * 60 * 1000 // une tâche 'running' bloquée > 2 min est requeue
const BACKOFF_MS = 30_000

class InProcessScheduler implements IScheduler {
  private handlers = new Map<ScheduledTaskType, TaskHandler>()
  private timers = new Map<string, ReturnType<typeof setTimeout>>()
  private sweepInterval: ReturnType<typeof setInterval> | null = null
  private started = false

  register(type: ScheduledTaskType, handler: TaskHandler): void {
    this.handlers.set(type, handler)
  }

  async schedule(input: ScheduleInput): Promise<string> {
    await connectMongoose()
    const task = await ScheduledTask.create({
      type: input.type,
      runAt: input.runAt,
      requestId: input.requestId,
      stage: input.stage,
      payload: input.payload || {},
      maxAttempts: input.maxAttempts ?? 3,
      status: 'pending',
    })
    this.arm(String(task._id), task.runAt)
    return String(task._id)
  }

  async cancelForRequest(requestId: string, types?: ScheduledTaskType[]): Promise<number> {
    await connectMongoose()
    const filter: any = { requestId, status: 'pending' }
    if (types?.length) filter.type = { $in: types }
    const pending = await ScheduledTask.find(filter).select('_id').lean() as any[]
    for (const t of pending) this.clearTimer(String(t._id))
    const res = await ScheduledTask.updateMany(filter, { $set: { status: 'cancelled' } })
    return res.modifiedCount || 0
  }

  start(): void {
    if (this.started) return
    this.started = true
    void this.sweep()
    this.sweepInterval = setInterval(() => { void this.sweep() }, SWEEP_MS)
    console.log('[VisibilityScheduler] démarré (in-process timers + sweep)')
  }

  stop(): void {
    this.started = false
    if (this.sweepInterval) { clearInterval(this.sweepInterval); this.sweepInterval = null }
    for (const t of this.timers.values()) clearTimeout(t)
    this.timers.clear()
  }

  /** Exécute immédiatement toutes les tâches échues (utilisé par le recovery/tests). */
  async runDue(): Promise<void> {
    await connectMongoose()
    const now = new Date()
    const due = await ScheduledTask.find({ status: 'pending', runAt: { $lte: now } }).select('_id').lean() as any[]
    for (const t of due) await this.fire(String(t._id))
  }

  private clearTimer(taskId: string) {
    const t = this.timers.get(taskId)
    if (t) { clearTimeout(t); this.timers.delete(taskId) }
  }

  private arm(taskId: string, runAt: Date) {
    if (this.timers.has(taskId)) return
    const delay = new Date(runAt).getTime() - Date.now()
    if (delay > HORIZON_MS) return // laissé au sweep
    const timer = setTimeout(() => { void this.fire(taskId) }, Math.max(0, delay))
    this.timers.set(taskId, timer)
  }

  /** Réconciliation : requeue les tâches bloquées et arme celles à venir/échues. */
  private async sweep(): Promise<void> {
    try {
      await connectMongoose()
      const now = Date.now()

      // Requeue des tâches 'running' bloquées (process tombé pendant l'exécution)
      await ScheduledTask.updateMany(
        { status: 'running', lockedAt: { $lt: new Date(now - STALE_RUNNING_MS) } },
        { $set: { status: 'pending' }, $unset: { lockedAt: 1 } },
      )

      const horizon = new Date(now + HORIZON_MS)
      const tasks = await ScheduledTask.find({ status: 'pending', runAt: { $lte: horizon } })
        .select('_id runAt').limit(500).lean() as any[]

      for (const t of tasks) {
        const id = String(t._id)
        if (new Date(t.runAt).getTime() <= now) {
          void this.fire(id)
        } else {
          this.arm(id, t.runAt)
        }
      }
    } catch (err: any) {
      console.warn('[VisibilityScheduler] sweep error:', err?.message)
    }
  }

  private async fire(taskId: string): Promise<void> {
    this.clearTimer(taskId)
    await connectMongoose()

    // Verrou atomique : une seule exécution même en cas de double déclenchement.
    const task = await ScheduledTask.findOneAndUpdate(
      { _id: taskId, status: 'pending' },
      { $set: { status: 'running', lockedAt: new Date() }, $inc: { attempts: 1 } },
      { new: true },
    )
    if (!task) return

    const handler = this.handlers.get(task.type)
    if (!handler) {
      await ScheduledTask.updateOne({ _id: taskId }, { $set: { status: 'failed', lastError: `Aucun handler pour type ${task.type}` } })
      console.warn(`[VisibilityScheduler] aucun handler pour type=${task.type}`)
      return
    }

    try {
      await handler(task)
      await ScheduledTask.updateOne({ _id: taskId }, { $set: { status: 'done' }, $unset: { lockedAt: 1 } })
    } catch (err: any) {
      const msg = err?.message || String(err)
      if (task.attempts < task.maxAttempts) {
        const nextRun = new Date(Date.now() + BACKOFF_MS * task.attempts)
        await ScheduledTask.updateOne({ _id: taskId }, { $set: { status: 'pending', runAt: nextRun, lastError: msg }, $unset: { lockedAt: 1 } })
        this.arm(taskId, nextRun)
        console.warn(`[VisibilityScheduler] tâche ${taskId} (${task.type}) échouée, retry #${task.attempts}: ${msg}`)
      } else {
        await ScheduledTask.updateOne({ _id: taskId }, { $set: { status: 'failed', lastError: msg }, $unset: { lockedAt: 1 } })
        console.error(`[VisibilityScheduler] tâche ${taskId} (${task.type}) définitivement échouée: ${msg}`)
      }
    }
  }
}

/** Singleton stocké sur global pour survivre à la duplication de modules (Next/custom server). */
export function getScheduler(): IScheduler {
  const g = global as any
  if (!g.__visibilityScheduler) {
    g.__visibilityScheduler = new InProcessScheduler()
  }
  return g.__visibilityScheduler as IScheduler
}
