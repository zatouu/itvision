'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  X, Loader2, AlertCircle, Phone, Navigation, Building2, MapPin, Play, CheckCircle2, Camera,
  PenLine, FileText, History, FolderKanban, ShieldCheck, Star, Trash2, ChevronRight,
} from 'lucide-react'
import SignaturePad from '@/components/portal/SignaturePad'
import { INTERVENTION_STATUS, PRIORITY, REPORT_STATUS, TYPE_LABELS, clientLabel, dayLabel, dayKey, mapsUrl, shortDate, telUrl } from './tech-ui'
import { enqueueOutbox, flushOutbox, isNetworkError, outboxSupported } from '@/lib/tech/offline-outbox'

/** Photo du compte rendu : téléversée (`url`) ou encore sur l'appareil (`file`, faute de réseau). */
type PendingPhoto = { key: string; url?: string; file?: Blob; preview: string }

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false

export interface ReportDraftContext {
  interventionId: string
  clientId?: string | null
  projectId?: string | null
  site?: string
  clientName?: string
  interventionType?: string
  date?: string
  startTime?: string
  endTime?: string
}

interface Detail {
  intervention: any
  project: { id: string; name: string; domain: string | null; stage: string; progress: number } | null
  maintenanceReport: { id: string; reportId: string; status: string; comments: string; published: boolean } | null
  siteHistory: Array<{ id: string; title: string; date: string; type: string; observations: string }>
}

const hhmm = (d?: string | null) => (d ? new Date(d).toTimeString().slice(0, 5) : '')

/** Position de l'appareil pour le pointage ; jamais bloquant (refus ou délai = pas de position). */
function currentPosition(): Promise<{ lat: number; lng: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve(null)
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 60_000 }
    )
  })
}

export default function InterventionSheet({ id, techName = 'Technicien', onClose, onChanged, onWriteReport, onOpenReport }: {
  id: string
  techName?: string
  onClose: () => void
  onChanged: () => void
  onWriteReport: (ctx: ReportDraftContext) => void
  onOpenReport: (reportId: string) => void
}) {
  const [data, setData] = useState<Detail | null>(null)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [observations, setObservations] = useState('')
  const [pendingAvant, setPendingAvant] = useState<PendingPhoto[]>([])
  const [pendingApres, setPendingApres] = useState<PendingPhoto[]>([])
  const [sigClient, setSigClient] = useState<string | null>(null)
  const [sigName, setSigName] = useState('')
  const [sigTitle, setSigTitle] = useState('')
  const [sigTech, setSigTech] = useState<string | null>(null)
  const [confirmEmpty, setConfirmEmpty] = useState(false)

  const load = useCallback(async () => {
    setLoadError('')
    try {
      const res = await fetch(`/api/tech/interventions/${id}`, { credentials: 'include' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Erreur')
      setData(d)
      setObservations(d.intervention.report.observations || '')
    } catch (e: any) {
      setLoadError(e.message || 'Impossible de charger la fiche.')
    }
  }, [id])

  useEffect(() => { load() }, [load])

  // Fermeture au clavier et blocage du défilement de la page
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  const i = data?.intervention
  const saved = i?.report
  const observationsChanged = !!i && observations.trim() !== (saved?.observations || '').trim() && !!observations.trim()
  const hasPending = pendingAvant.length + pendingApres.length > 0 || observationsChanged || !!sigClient || !!sigTech
  const canReport = !!i && ['scheduled', 'in_progress', 'completed'].includes(i.status)
  const canSignClient = !!i && ['in_progress', 'completed'].includes(i.status) && !saved?.clientSignature
  const hasLocalPhotos = [...pendingAvant, ...pendingApres].some(p => p.file)

  async function uploadPhotos(files: FileList | null, target: 'avant' | 'apres') {
    if (!files?.length) return
    setUploading(true); setErr(''); setConfirmEmpty(false)
    const added: PendingPhoto[] = []
    let refused = 0
    for (const file of Array.from(files).slice(0, 8)) {
      const local: PendingPhoto = { key: crypto.randomUUID(), file, preview: URL.createObjectURL(file) }
      if (isOffline()) { added.push(local); continue }
      try {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('type', 'interventions')
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        const d = await res.json().catch(() => ({}))
        if (res.ok && d.url) {
          URL.revokeObjectURL(local.preview)
          added.push({ key: local.key, url: d.url, preview: d.url })
        } else if (res.status === 429 || res.status >= 500) {
          added.push(local)
        } else {
          URL.revokeObjectURL(local.preview)
          refused++
        }
      } catch {
        added.push(local)
      }
    }
    if (target === 'avant') setPendingAvant(p => [...p, ...added])
    else setPendingApres(p => [...p, ...added])
    if (refused) setErr(`${refused} photo${refused > 1 ? 's' : ''} refusée${refused > 1 ? 's' : ''} (format ou taille).`)
    setUploading(false)
  }

  function clearPending() {
    setPendingAvant([]); setPendingApres([]); setSigClient(null); setSigName(''); setSigTitle(''); setSigTech(null)
  }

  /** Sans réseau : tout ce qui est en cours part dans la file de l'appareil, la fiche reflète l'état attendu. */
  async function queueLocally(action?: { status: 'in_progress' | 'completed'; gps?: { lat: number; lng: number } | null }): Promise<boolean> {
    if (!i) return false
    if (!outboxSupported()) { setErr('Pas de réseau : réessayez au retour de la connexion.'); return false }
    try {
      await enqueueOutbox({
        interventionId: i.id,
        title: i.title,
        photosAvant: pendingAvant.map(p => p.url || p.file!),
        photosApres: pendingApres.map(p => p.url || p.file!),
        observations: observationsChanged ? observations : undefined,
        signatureClient: sigClient ? { name: sigName, title: sigTitle, signature: sigClient } : undefined,
        signatureTechnicien: sigTech ? { name: techName, signature: sigTech } : undefined,
        status: action?.status,
        gps: action?.gps,
      })
    } catch {
      setErr('Enregistrement sur l’appareil impossible (espace insuffisant ?).')
      return false
    }
    setData(d => d && {
      ...d,
      intervention: {
        ...d.intervention,
        status: action?.status || d.intervention.status,
        report: {
          ...d.intervention.report,
          observations: observationsChanged ? observations : d.intervention.report.observations,
          photosAvant: [...d.intervention.report.photosAvant, ...pendingAvant.map(p => ({ url: p.preview }))],
          photosApres: [...d.intervention.report.photosApres, ...pendingApres.map(p => ({ url: p.preview }))],
          clientSignature: sigClient ? { name: sigName, at: new Date().toISOString() } : d.intervention.report.clientSignature,
          technicianSigned: d.intervention.report.technicianSigned || !!sigTech,
        },
      },
    })
    clearPending()
    setConfirmEmpty(false)
    setOk('Enregistré sur l’appareil : envoi automatique au retour du réseau.')
    if (!isOffline()) void flushOutbox()
    return true
  }

  async function saveReport(): Promise<boolean> {
    if (!i) return false
    if (sigClient && !sigName.trim()) { setErr('Indiquez le nom du signataire.'); return false }
    if (isOffline() || hasLocalPhotos) return queueLocally()
    setBusy(true); setErr(''); setOk('')
    try {
      const res = await fetch('/api/tech/interventions/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          interventionId: i.id,
          photosAvant: pendingAvant.map(p => ({ url: p.url })),
          photosApres: pendingApres.map(p => ({ url: p.url })),
          observations: observationsChanged ? observations : undefined,
          signatureClient: sigClient ? { name: sigName, title: sigTitle, signature: sigClient } : undefined,
          signatureTechnicien: sigTech ? { name: techName, signature: sigTech } : undefined,
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'Erreur')
      setOk(sigClient ? 'Compte rendu enregistré, bon signé : le client est prévenu.' : 'Compte rendu enregistré.')
      clearPending()
      await load()
      onChanged()
      return true
    } catch (e: any) {
      if (isNetworkError(e)) return queueLocally()
      setErr(e.message)
      return false
    } finally {
      setBusy(false)
    }
  }

  async function setStatus(status: 'in_progress' | 'completed') {
    if (!i) return
    setErr('')
    if (status === 'completed') {
      const hasCompteRendu = saved.photosApres.length > 0 || !!saved.observations || pendingApres.length > 0 || !!observations.trim()
      if (!hasCompteRendu && !confirmEmpty) { setConfirmEmpty(true); return }
      if (sigClient && !sigName.trim()) { setErr('Indiquez le nom du signataire.'); return }
      // Sans réseau, compte rendu et clôture partent ensemble, dans cet ordre
      if (isOffline() || hasLocalPhotos) { await queueLocally({ status }); return }
      // Le compte rendu en cours part avant la clôture : le client reçoit un dossier complet
      if (hasPending && !(await saveReport())) return
    }
    setBusy(true)
    const gps = status === 'in_progress' ? await currentPosition() : null
    try {
      if (isOffline()) { await queueLocally({ status, gps }); return }
      const res = await fetch('/api/interventions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ interventionId: i.id, status, ...(gps ? { gps } : {}) }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(d.error || 'Erreur')
      setConfirmEmpty(false)
      setOk(status === 'in_progress' ? 'Intervention démarrée : le client est prévenu.' : 'Intervention terminée.')
      await load()
      onChanged()
    } catch (e: any) {
      if (isNetworkError(e)) await queueLocally({ status, gps })
      else setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  const st = i ? (INTERVENTION_STATUS[i.status] || INTERVENTION_STATUS.pending) : null
  const prio = i?.priority ? PRIORITY[i.priority] : undefined

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose} role="dialog" aria-modal="true">
      <div className="relative flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-3xl bg-stone-50 sm:max-w-xl sm:rounded-2xl" onClick={e => e.stopPropagation()}>
        {/* En-tête */}
        <div className="flex items-start justify-between gap-3 border-b border-stone-200 bg-white px-5 pb-4 pt-3">
          <div className="min-w-0">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-stone-200 sm:hidden" />
            {i ? (
              <>
                <div className="flex flex-wrap items-center gap-1.5">
                  {st && <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.chip}`}>{st.label}</span>}
                  {prio && <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${prio.chip}`}>{prio.label}</span>}
                  {i.number && <span className="text-[10px] font-medium text-stone-400">{i.number}</span>}
                </div>
                <h2 className="mt-1 text-base font-bold leading-snug text-stone-900">{i.title}</h2>
                <p className="mt-0.5 text-xs text-stone-500">
                  {dayLabel(dayKey(i))} · {i.heureDebut || '--:--'}{i.heureFin ? ` → ${i.heureFin}` : ''}
                  {i.type ? ` · ${TYPE_LABELS[i.type] || i.type}` : ''}
                </p>
              </>
            ) : <div className="h-12" />}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-stone-100" aria-label="Fermer"><X className="h-5 w-5 text-stone-400" /></button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-28 sm:pb-6">
          {!data && !loadError && <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-stone-300" /></div>}
          {loadError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
              <AlertCircle className="mx-auto mb-2 h-6 w-6 text-red-500" />
              <p className="text-sm text-red-700">{loadError}</p>
            </div>
          )}

          {i && (
            <>
              {/* Raccourcis terrain */}
              <div className="grid grid-cols-3 gap-2">
                <a href={telUrl(i.client?.phone) || undefined}
                  className={`flex flex-col items-center gap-1 rounded-xl border border-stone-200 bg-white py-3 text-xs font-semibold ${i.client?.phone ? 'text-stone-700 hover:border-emerald-300' : 'pointer-events-none text-stone-300'}`}>
                  <Phone className="h-4 w-4" /> Appeler
                </a>
                <a href={mapsUrl(i.address) || undefined} target="_blank" rel="noopener noreferrer"
                  className={`flex flex-col items-center gap-1 rounded-xl border border-stone-200 bg-white py-3 text-xs font-semibold ${i.address ? 'text-stone-700 hover:border-emerald-300' : 'pointer-events-none text-stone-300'}`}>
                  <Navigation className="h-4 w-4" /> Itinéraire
                </a>
                <button
                  onClick={() => data!.maintenanceReport
                    ? onOpenReport(data!.maintenanceReport.id)
                    : onWriteReport({ interventionId: i.id, clientId: i.clientId, projectId: i.projectId, site: i.site || i.address, clientName: clientLabel(i.client), interventionType: i.type, date: dayKey(i), startTime: hhmm(i.startedAt) || i.heureDebut, endTime: hhmm(i.completedAt) || undefined })}
                  disabled={i.status === 'cancelled'}
                  className="flex flex-col items-center gap-1 rounded-xl border border-stone-200 bg-white py-3 text-xs font-semibold text-stone-700 hover:border-emerald-300 disabled:text-stone-300">
                  <FileText className="h-4 w-4" /> Rapport
                </button>
              </div>

              {/* Client et lieu */}
              {(i.client || i.address) && (
                <section className="rounded-2xl border border-stone-200 bg-white p-4">
                  {i.client && (
                    <p className="flex items-center gap-2 text-sm font-semibold text-stone-900">
                      <Building2 className="h-4 w-4 text-stone-400" />{clientLabel(i.client)}
                    </p>
                  )}
                  {i.client?.contact && <p className="ml-6 text-xs text-stone-500">Contact : {i.client.contact}</p>}
                  {i.address && <p className="mt-1.5 flex items-start gap-2 text-xs text-stone-500"><MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-stone-400" />{i.address}</p>}
                  {i.coveredByContract && (
                    <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                      <ShieldCheck className="h-3 w-3" /> Couverte par le contrat de maintenance
                    </p>
                  )}
                  {i.startedAt && (
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] text-stone-500">
                      <Navigation className="h-3 w-3" />
                      Arrivée {hhmm(i.startedAt)}{i.completedAt ? ` · fin ${hhmm(i.completedAt)}` : ''}{i.checkedIn ? ' · position enregistrée' : ''}
                    </p>
                  )}
                  {i.description && <p className="mt-3 whitespace-pre-wrap border-t border-stone-100 pt-3 text-sm text-stone-600">{i.description}</p>}
                </section>
              )}

              {/* Projet */}
              {data!.project && (
                <section className="rounded-2xl border border-stone-200 bg-white p-4">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-400"><FolderKanban className="h-3.5 w-3.5" /> Projet</p>
                  <p className="mt-1 text-sm font-semibold text-stone-900">{data!.project.name}</p>
                  <p className="text-xs text-stone-500">{[data!.project.domain, `Étape : ${data!.project.stage}`].filter(Boolean).join(' · ')}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, data!.project.progress)}%` }} />
                  </div>
                </section>
              )}

              {/* Compte rendu terrain */}
              {canReport && (
                <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-stone-900">Compte rendu terrain</p>
                    <span className="text-[11px] text-stone-400">Visible par le client</span>
                  </div>

                  {(['avant', 'apres'] as const).map(k => {
                    const savedList = k === 'avant' ? saved.photosAvant : saved.photosApres
                    const pending = k === 'avant' ? pendingAvant : pendingApres
                    const setPending = k === 'avant' ? setPendingAvant : setPendingApres
                    return (
                      <div key={k}>
                        <p className="mb-1.5 text-xs font-semibold text-stone-500">Photos {k === 'avant' ? 'avant' : 'après'} ({savedList.length + pending.length})</p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          <label className="flex h-20 w-20 flex-shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-stone-200 text-stone-400 transition hover:border-emerald-400 hover:text-emerald-600">
                            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                            <span className="text-[10px] font-medium">Ajouter</span>
                            <input type="file" accept="image/*" multiple capture="environment" className="hidden" disabled={uploading}
                              onChange={e => { uploadPhotos(e.target.files, k); e.target.value = '' }} />
                          </label>
                          {pending.map(p => (
                            <div key={p.key} className="relative h-20 w-20 flex-shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={p.preview} alt="" className={`h-full w-full rounded-xl object-cover ring-2 ${p.file ? 'ring-stone-400' : 'ring-amber-300'}`} />
                              <button onClick={() => setPending(list => list.filter(x => x.key !== p.key))} aria-label="Retirer la photo"
                                className="absolute -right-1 -top-1 rounded-full bg-white p-1 shadow"><Trash2 className="h-3 w-3 text-red-500" /></button>
                            </div>
                          ))}
                          {savedList.map((p: any) => (
                            <a key={p.url} href={p.url} target="_blank" rel="noopener noreferrer" className="h-20 w-20 flex-shrink-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={p.url} alt="" className="h-full w-full rounded-xl object-cover" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                  {pendingAvant.length + pendingApres.length > 0 && (
                    <p className="-mt-2 text-[11px] text-amber-700">
                      Les photos entourées ne sont pas encore enregistrées{hasLocalPhotos ? ' ; celles en gris attendent le réseau et partiront automatiquement' : ''}.
                    </p>
                  )}

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-stone-500" htmlFor="tech-obs">Travaux réalisés et observations</label>
                    <textarea id="tech-obs" rows={4} value={observations}
                      onChange={e => { setObservations(e.target.value); setConfirmEmpty(false) }}
                      placeholder="Travaux réalisés, anomalies constatées, recommandations…"
                      className="w-full resize-none rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                  </div>

                  {saved.clientSignature ? (
                    <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-800">
                      <PenLine className="h-4 w-4" /> Bon signé par {saved.clientSignature.name || 'le client'} le {shortDate(saved.clientSignature.at)}
                    </p>
                  ) : canSignClient ? (
                    <div className="space-y-2 rounded-xl border border-stone-200 p-3">
                      <p className="text-xs font-semibold text-stone-500">Signature du client sur place</p>
                      <div className="grid grid-cols-2 gap-2">
                        <input value={sigName} onChange={e => setSigName(e.target.value)} placeholder="Nom du signataire *"
                          className="rounded-xl border border-stone-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
                        <input value={sigTitle} onChange={e => setSigTitle(e.target.value)} placeholder="Fonction"
                          className="rounded-xl border border-stone-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
                      </div>
                      <SignaturePad onChange={setSigClient} height={130} />
                      <p className="text-[11px] text-stone-400">Sans signature sur place, le client validera le bon depuis son espace.</p>
                    </div>
                  ) : null}

                  {!saved.technicianSigned && i.status !== 'scheduled' && (
                    <details className="rounded-xl border border-stone-200 p-3">
                      <summary className="cursor-pointer text-xs font-semibold text-stone-500">Ma signature (technicien)</summary>
                      <div className="mt-2"><SignaturePad onChange={setSigTech} height={110} /></div>
                    </details>
                  )}

                  <button onClick={saveReport} disabled={busy || uploading || !hasPending}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-700 py-2.5 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50 disabled:border-stone-200 disabled:text-stone-300">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Enregistrer le compte rendu
                  </button>
                </section>
              )}

              {/* Rapport détaillé (validation IT Vision puis publication au client) */}
              {data!.maintenanceReport && (
                <button onClick={() => onOpenReport(data!.maintenanceReport!.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4 text-left hover:border-stone-300">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Rapport détaillé</p>
                    <p className="mt-0.5 text-sm font-semibold text-stone-900">{data!.maintenanceReport.reportId}</p>
                    {data!.maintenanceReport.status === 'rejected' && data!.maintenanceReport.comments && (
                      <p className="mt-1 line-clamp-2 text-xs text-red-600">{data!.maintenanceReport.comments}</p>
                    )}
                  </div>
                  <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${(REPORT_STATUS[data!.maintenanceReport.status] || REPORT_STATUS.draft).chip}`}>
                    {(REPORT_STATUS[data!.maintenanceReport.status] || REPORT_STATUS.draft).label}
                  </span>
                </button>
              )}

              {i.feedback && (
                <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="flex items-center gap-1 text-sm font-semibold text-amber-900">
                    {Array.from({ length: 5 }).map((_, n) => <Star key={n} className={`h-4 w-4 ${n < i.feedback.rating ? 'fill-amber-400 text-amber-400' : 'text-amber-200'}`} />)}
                    <span className="ml-1">Avis du client</span>
                  </p>
                  {i.feedback.comment && <p className="mt-1 text-sm text-amber-900/80">« {i.feedback.comment} »</p>}
                </section>
              )}

              {/* Historique du site */}
              {data!.siteHistory.length > 0 && (
                <section className="rounded-2xl border border-stone-200 bg-white p-4">
                  <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-400"><History className="h-3.5 w-3.5" /> Dernières interventions chez ce client</p>
                  <ul className="space-y-2.5">
                    {data!.siteHistory.map(h => (
                      <li key={h.id} className="text-sm">
                        <p className="flex items-center justify-between gap-2"><span className="truncate font-medium text-stone-800">{h.title}</span><span className="flex-shrink-0 text-[11px] text-stone-400">{shortDate(h.date)}</span></p>
                        {h.observations && <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">{h.observations}</p>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {i.history.length > 0 && (
                <details className="rounded-2xl border border-stone-200 bg-white p-4">
                  <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-stone-400">Journal</summary>
                  <ul className="mt-2 space-y-1.5">
                    {i.history.map((h: any, n: number) => (
                      <li key={n} className="flex items-center justify-between gap-2 text-xs text-stone-600">
                        <span>{h.label}{h.status ? ` → ${(INTERVENTION_STATUS[h.status] || { label: h.status }).label}` : ''}</span>
                        <span className="text-stone-400">{h.at ? new Date(h.at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : ''}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </div>

        {/* Barre d'action fixe */}
        {i && (i.status === 'scheduled' || i.status === 'in_progress' || err || ok) && (
          <div className="absolute inset-x-0 bottom-0 border-t border-stone-200 bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 backdrop-blur sm:static">
            {err && <p className="mb-2 text-xs font-medium text-red-600">{err}</p>}
            {ok && !err && <p className="mb-2 text-xs font-medium text-emerald-700">{ok}</p>}
            {confirmEmpty && (
              <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Aucune photo après ni observation : le client sera invité à consulter un compte rendu vide.
              </p>
            )}
            {i.status === 'scheduled' && (
              <button onClick={() => setStatus('in_progress')} disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3.5 text-sm font-bold text-white shadow-sm disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Je suis sur place, démarrer
              </button>
            )}
            {i.status === 'in_progress' && (
              <button onClick={() => setStatus('completed')} disabled={busy || uploading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3.5 text-sm font-bold text-white shadow-sm disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {confirmEmpty ? 'Terminer sans compte rendu' : hasPending ? 'Enregistrer et terminer' : 'Terminer l’intervention'}
                {!confirmEmpty && <ChevronRight className="h-4 w-4 opacity-60" />}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
