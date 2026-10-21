import mongoose from 'mongoose'
import { legacyProjectStatus, normalizeProjectStatus } from './workflow'

/**
 * Écriture native sur la collection `projects`. La base de production peut encore porter
 * l'ancien validateur $jsonSchema (statut pending|in_progress|completed|cancelled, value en chaîne) :
 * en cas de rejet (code 121), l'écriture est rejouée au format historique et `legacy` vaut true —
 * il faut alors lancer la migration `migrate-projects-workflow`.
 */

const DOCUMENT_VALIDATION_FAILURE = 121

function toLegacy(set: Record<string, any>) {
  const out: Record<string, any> = { ...set }
  if ('status' in out) out.status = legacyProjectStatus(normalizeProjectStatus(out.status))
  if ('value' in out) out.value = String(Math.round(Number(out.value) || 0))
  if ('progress' in out) out.progress = Math.max(0, Math.min(100, Math.round(Number(out.progress) || 0)))
  if (Array.isArray(out.statusHistory)) {
    out.statusHistory = out.statusHistory.map((h: any) => ({ ...h, status: legacyProjectStatus(normalizeProjectStatus(h?.status)) }))
  }
  return out
}

export function projectsCollection() {
  return mongoose.connection.collection('projects')
}

export async function updateProjectFields(
  projectId: string | mongoose.Types.ObjectId,
  set: Record<string, any>,
  extra: { push?: Record<string, any>; unset?: Record<string, any> } = {}
): Promise<{ legacy: boolean }> {
  const _id = typeof projectId === 'string' ? new mongoose.Types.ObjectId(projectId) : projectId
  const update = (s: Record<string, any>) => ({
    $set: { ...s, updatedAt: new Date() },
    ...(extra.push ? { $push: extra.push } : {}),
    ...(extra.unset ? { $unset: extra.unset } : {}),
  })
  try {
    await projectsCollection().updateOne({ _id }, update(set))
    return { legacy: false }
  } catch (err: any) {
    if (err?.code !== DOCUMENT_VALIDATION_FAILURE) throw err
    const push = extra.push ? Object.fromEntries(Object.entries(extra.push).map(([k, v]) => [k, k === 'statusHistory' ? toLegacy({ statusHistory: [v] }).statusHistory[0] : v])) : undefined
    await projectsCollection().updateOne({ _id }, { ...update(toLegacy(set)), ...(push ? { $push: push } : {}) })
    return { legacy: true }
  }
}

export const MIGRATION_REQUIRED_MESSAGE =
  'Base non migrée : le statut a été enregistré au format historique. Lancez la migration « migrate-projects-workflow » (voir docs/WORKFLOW_PROJETS.md).'
