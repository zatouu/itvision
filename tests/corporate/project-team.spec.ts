import { test, expect, APIRequestContext, request as pwRequest } from '@playwright/test'
import {
  ensureTestUsers,
  ensureTechnician,
  createTeamProjectFixture,
  cleanupTeamProjectFixture,
} from '../helpers/db'

/**
 * Équipe terrain d'un projet corporate (src/lib/projects/team.ts) :
 * - l'admin affecte un responsable et des membres, et garde tous les droits (y compris consigner pour un tech)
 * - le projet apparaît dans le portail du technicien ; un technicien hors équipe n'y a pas accès
 * - un membre fait avancer ses tâches (et les libres, qu'il prend), pas celles des autres
 * - la progression suit les tâches, le jalon suit ses tâches, le journal garde qui a fait quoi
 * - seul l'admin publie une entrée du journal au client (timeline du portail entreprise)
 */

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

let adminCtx: APIRequestContext
let leadCtx: APIRequestContext
let memberCtx: APIRequestContext
let outsiderCtx: APIRequestContext
let projectId: string
let leadId: string
let memberId: string

async function loginCtx(email: string, password: string): Promise<APIRequestContext> {
  const ctx = await pwRequest.newContext({ baseURL })
  const res = await ctx.post('/api/auth/login', { data: { email, password } })
  expect(res.ok(), `login ${email}: ${res.status()}`).toBeTruthy()
  return ctx
}

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  const { admin } = await ensureTestUsers()
  const lead = await ensureTechnician({ email: 'e2e-team-lead@itvision.sn', name: 'E2E Team Lead' })
  const member = await ensureTechnician({ email: 'e2e-team-member@itvision.sn', name: 'E2E Team Member' })
  const outsider = await ensureTechnician({ email: 'e2e-team-outsider@itvision.sn', name: 'E2E Team Outsider' })
  leadId = lead.techId
  memberId = member.techId
  projectId = await createTeamProjectFixture()
  adminCtx = await loginCtx(admin.email, admin.password)
  leadCtx = await loginCtx(lead.email, lead.password)
  memberCtx = await loginCtx(member.email, member.password)
  outsiderCtx = await loginCtx(outsider.email, outsider.password)
})

test.afterAll(async () => {
  await cleanupTeamProjectFixture()
  await Promise.all([adminCtx, leadCtx, memberCtx, outsiderCtx].map(c => c?.dispose()))
})

test('sans équipe, l’admin pilote seul : tâche et journal', async () => {
  const task = await adminCtx.post(`/api/projects/${projectId}/tasks`, { data: { title: 'E2E repérage du site', milestoneId: 'm-pose' } })
  expect(task.status()).toBe(201)
  const journal = await adminCtx.post(`/api/projects/${projectId}/journal`, { data: { kind: 'note', message: 'Visite de repérage faite par l’admin' } })
  expect(journal.status()).toBe(201)
})

test('l’admin affecte un responsable et un membre ; un tech ne peut pas modifier l’équipe', async () => {
  const forbidden = await leadCtx.put(`/api/projects/${projectId}/team`, { data: { leadTechnicianId: leadId, technicianIds: [] } })
  expect(forbidden.status()).toBe(403)

  const res = await adminCtx.put(`/api/projects/${projectId}/team`, { data: { leadTechnicianId: leadId, technicianIds: [memberId] } })
  expect(res.status()).toBe(200)
  const { team } = await res.json()
  expect(team.find((m: any) => m.id === leadId)?.role).toBe('lead')
  expect(team.find((m: any) => m.id === memberId)?.role).toBe('member')
})

test('le projet apparaît dans le portail du technicien, pas chez un technicien hors équipe', async () => {
  const mine = await (await leadCtx.get('/api/tech/projects')).json()
  expect(mine.projects.find((p: any) => p.id === projectId)?.role).toBe('lead')

  const others = await (await outsiderCtx.get('/api/tech/projects')).json()
  expect(others.projects.some((p: any) => p.id === projectId)).toBeFalsy()
  expect((await outsiderCtx.get(`/api/tech/projects/${projectId}`)).status()).toBe(403)
  expect((await outsiderCtx.get(`/api/projects/${projectId}/tasks`)).status()).toBe(403)

  // Liste générale : un technicien ne voit plus tous les projets
  const list = await (await outsiderCtx.get('/api/projects?limit=100')).json()
  expect((list.projects || []).some((p: any) => String(p._id) === projectId)).toBeFalsy()
})

test('un membre fait avancer sa tâche, pas celle du responsable ; la progression suit', async () => {
  const forLead = await (await adminCtx.post(`/api/projects/${projectId}/tasks`, { data: { title: 'E2E pose baie', assigneeId: leadId } })).json()
  const forMember = await (await adminCtx.post(`/api/projects/${projectId}/tasks`, { data: { title: 'E2E tirage câbles', assigneeId: memberId, milestoneId: 'm-pose' } })).json()

  const denied = await memberCtx.patch(`/api/projects/${projectId}/tasks`, { data: { taskId: forLead.task.id, status: 'done' } })
  expect(denied.status()).toBe(403)

  // Un membre ne réattribue pas : seul le statut est pris en compte
  const own = await memberCtx.patch(`/api/projects/${projectId}/tasks`, { data: { taskId: forMember.task.id, status: 'done', assigneeId: leadId, title: 'Renommée' } })
  expect(own.status()).toBe(200)
  const body = await own.json()
  const updated = body.tasks.find((t: any) => t.id === forMember.task.id)
  expect(updated.status).toBe('done')
  expect(updated.assigneeId).toBe(memberId)
  expect(updated.title).toBe('E2E tirage câbles')
  expect(body.progress).toBe(33) // 1 terminée sur 3

  // Le journal garde la trace du changement, attribuée au membre
  const { journal } = await (await adminCtx.get(`/api/projects/${projectId}/journal`)).json()
  expect(journal.some((e: any) => e.kind === 'task' && e.technicianId === memberId)).toBeTruthy()
})

test('un membre consigne et coche une tâche libre, qui lui revient ; le jalon suit ses tâches', async () => {
  const tasks = (await (await memberCtx.get(`/api/projects/${projectId}/tasks`)).json()).tasks
  const free = tasks.find((t: any) => t.title === 'E2E repérage du site')
  const res = await memberCtx.post(`/api/projects/${projectId}/journal`, {
    data: { kind: 'progress', message: 'Repérage terminé, plans validés', hours: 2, taskUpdates: [{ taskId: free.id, status: 'done' }] },
  })
  expect(res.status()).toBe(201)
  const body = await res.json()
  expect(body.entry.technicianId).toBe(memberId)
  expect(body.tasks.find((t: any) => t.id === free.id).assigneeId).toBe(memberId)
  expect(body.progress).toBe(67)
  // Les deux tâches du jalon « Pose des caméras » sont terminées
  expect(body.milestones.find((m: any) => m.id === 'm-pose').status).toBe('completed')
})

test('le responsable organise (crée une tâche) ; un membre ne supprime pas', async () => {
  const created = await leadCtx.post(`/api/projects/${projectId}/tasks`, { data: { title: 'E2E réglages caméras', assigneeId: memberId } })
  expect(created.status()).toBe(201)
  const { task } = await created.json()
  expect((await memberCtx.delete(`/api/projects/${projectId}/tasks?taskId=${task.id}`)).status()).toBe(403)
  expect((await leadCtx.delete(`/api/projects/${projectId}/tasks?taskId=${task.id}`)).status()).toBe(200)
})

test('l’admin consigne pour le compte d’un membre et publie au client ; un tech ne publie pas', async () => {
  const res = await adminCtx.post(`/api/projects/${projectId}/journal`, {
    data: { kind: 'progress', message: 'Caméras du parking posées (saisi par l’admin)', technicianId: memberId },
  })
  expect(res.status()).toBe(201)
  const { entry } = await res.json()
  expect(entry.technicianId).toBe(memberId)
  expect(entry.onBehalfOf).toBe('E2E Team Member')
  expect(entry.authorRole).toBe('ADMIN')

  const denied = await memberCtx.patch(`/api/projects/${projectId}/journal`, { data: { entryId: entry.id, clientVisible: true } })
  expect(denied.status()).toBe(403)

  const published = await adminCtx.patch(`/api/projects/${projectId}/journal`, { data: { entryId: entry.id, clientVisible: true } })
  expect(published.status()).toBe(200)
  expect((await published.json()).entry.clientVisible).toBe(true)
})

test('un blocage signalé par un membre est levé par le responsable', async () => {
  const res = await memberCtx.post(`/api/projects/${projectId}/journal`, { data: { kind: 'blocker', message: 'Accès toiture refusé par le gardien' } })
  expect(res.status()).toBe(201)
  const { entry } = await res.json()
  expect(entry.resolvedAt).toBeNull()

  const lifted = await leadCtx.patch(`/api/projects/${projectId}/journal`, { data: { entryId: entry.id, resolved: true } })
  expect(lifted.status()).toBe(200)
  expect((await lifted.json()).entry.resolvedAt).toBeTruthy()
})
