import { qwenChat } from '@/lib/ai/qwen'
import { loadProjectState } from '@/lib/projects/tasks'
import { TASK_STATUS_META, isTaskStatus, type TaskStatus } from '@/lib/projects/workflow'
import { requestApproval } from '@/lib/workflow/approvals'

type Update = { taskId: string; status: TaskStatus; reason?: string }
type NewTask = { title: string; status: TaskStatus }

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]+/g, ' ')
const DONE = /\b(fait|faits|faite|faites|termine|terminee|termines|terminees|fini|finie|finis|acheve|realise|realisee|effectue|effectuee|pose|posee|poses|posees|installe|installee|installes|installees|tire|tires|raccorde|raccordes|configure|configuree|ok|livre|livree|teste|testes|valide)\b/
const STARTED = /\b(en cours|commence|commencee|demarre|demarree|entame|entamee|debut|partiellement|avance)\b/
const STOP = new Set(['des', 'les', 'une', 'pour', 'avec', 'dans', 'sur', 'aux', 'et', 'du', 'de', 'la', 'le', 'un', 'en', 'au', 'par'])

/**
 * Repli sans IA : une tâche dont les mots-clés apparaissent dans la note passe « en cours »,
 * ou « terminée » si un verbe d'achèvement est présent — sauf quantité partielle (« 5 caméras » sur une tâche de 32).
 */
function heuristic(note: string, tasks: Array<{ id: string; title: string; status: TaskStatus }>): Update[] {
  const text = norm(note)
  const clauses = text.split(/[.,;\n]| et /).map(c => c.trim()).filter(Boolean)
  const updates: Update[] = []
  for (const t of tasks) {
    if (t.status === 'done') continue
    // Radicaux : « configuration » ≈ « configuré », sigles de 3 lettres gardés (NVR, DVR, PoE)
    const words = norm(t.title).split(/\s+/).filter(w => w.length >= 3 && !STOP.has(w) && !/^\d+$/.test(w)).map(w => w.replace(/s$/, '').slice(0, 6))
    if (!words.length) continue
    const clause = clauses.find(c => words.some(w => c.includes(w)))
    if (!clause) continue
    const doneVerb = DONE.test(clause)
    const qtyNote = Number((clause.match(/\b(\d{1,4})\b/) || [])[1])
    const qtyTask = Number((norm(t.title).match(/\b(\d{1,4})\b/) || [])[1])
    const partial = qtyNote > 0 && qtyTask > 0 && qtyNote < qtyTask
    const status: TaskStatus | null = doneVerb && !partial ? 'done' : (doneVerb || STARTED.test(clause)) ? 'in_progress' : null
    if (status && status !== t.status && !(status === 'in_progress' && t.status === 'review')) {
      updates.push({ taskId: t.id, status, reason: partial ? `${qtyNote}/${qtyTask}` : undefined })
    }
  }
  return updates
}

async function withAi(note: string, tasks: Array<{ id: string; title: string; status: TaskStatus }>): Promise<{ updates: Update[]; newTasks: NewTask[] } | null> {
  try {
    const list = tasks.map(t => `${t.id} | ${t.title} | ${t.status}`).join('\n')
    const r = await qwenChat([
      {
        role: 'system',
        content: 'Tu suis un chantier (vidéosurveillance, réseau, électricité). À partir d’une note de terrain, indique quelles tâches existantes avancent. '
          + 'Statuts possibles : todo, in_progress, review, done. « done » seulement si la note dit clairement que la tâche ENTIÈRE est finie ; '
          + 'une quantité partielle (ex. 5 caméras posées sur 32) = in_progress. N’invente rien. '
          + 'Réponds UNIQUEMENT en JSON : {"updates":[{"taskId":"…","status":"…","reason":"…"}],"newTasks":[{"title":"…","status":"done|in_progress"}]}. '
          + 'newTasks seulement pour un travail réalisé qui ne correspond à aucune tâche.',
      },
      { role: 'user', content: `Tâches (id | titre | statut) :\n${list || '(aucune)'}\n\nNote de terrain :\n${note}` },
    ], 600)
    const json = JSON.parse((r.text.match(/\{[\s\S]*\}/) || ['{}'])[0])
    const ids = new Map(tasks.map(t => [t.id, t]))
    const updates = (Array.isArray(json.updates) ? json.updates : [])
      .filter((u: any) => ids.has(String(u?.taskId)) && isTaskStatus(u?.status) && ids.get(String(u.taskId))!.status !== u.status)
      .map((u: any) => ({ taskId: String(u.taskId), status: u.status, reason: String(u.reason || '').slice(0, 120) || undefined }))
    const newTasks = (Array.isArray(json.newTasks) ? json.newTasks : [])
      .filter((n: any) => String(n?.title || '').trim())
      .slice(0, 5)
      .map((n: any) => ({ title: String(n.title).trim().slice(0, 120), status: n.status === 'done' ? 'done' : 'in_progress' as TaskStatus }))
    return { updates, newTasks }
  } catch (e) {
    console.warn('[journal-progress] IA indisponible, repli mots-clés:', (e as Error)?.message)
    return null
  }
}

/**
 * Note de journal → avancement proposé au pilote (mail de validation).
 * Ex. « câblage fait et 5 caméras posées » : Câblage → terminé, Pose des caméras → en cours.
 */
export async function proposeProgressFromNote(projectId: string, entryId: string, note: string, authorName: string) {
  try {
    if (note.trim().length < 6) return
    const state = await loadProjectState(projectId)
    if (!state) return
    const tasks = state.tasks.map(t => ({ id: t.id, title: t.title, status: t.status }))
    const ai = await withAi(note, tasks)
    const updates = ai?.updates.length ? ai.updates : heuristic(note, tasks)
    const newTasks = ai?.newTasks || []
    if (!updates.length && !newTasks.length) return

    const byId = new Map(tasks.map(t => [t.id, t]))
    await requestApproval({
      type: 'journal_progress',
      dedupeKey: `journal:${entryId}`,
      projectId,
      title: `Mettre à jour « ${state.name || 'le projet'} » d’après la note de ${authorName}`,
      summary: `Note : « ${note.slice(0, 400)} »\nValider applique l’avancement ci-dessous (progression, jalons et client mis à jour).`,
      lines: [
        ...updates.map(u => ({
          label: byId.get(u.taskId)?.title || 'Tâche',
          value: `${TASK_STATUS_META[byId.get(u.taskId)!.status].label} → ${TASK_STATUS_META[u.status].label}${u.reason ? ` (${u.reason})` : ''}`,
        })),
        ...newTasks.map(n => ({ label: `Nouvelle tâche : ${n.title}`, value: TASK_STATUS_META[n.status].label })),
      ],
      payload: { projectId, note: note.slice(0, 1000), updates, newTasks, source: ai?.updates.length ? 'ai' : 'keywords' },
    })
  } catch (e) {
    console.error('[journal-progress]', e)
  }
}
