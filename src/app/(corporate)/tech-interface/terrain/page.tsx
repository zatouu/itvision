'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Wrench, Clock, MapPin, Building2, Phone, Loader2, AlertCircle,
  Play, CheckCircle2, Camera, PenLine, ChevronLeft, RefreshCw, X
} from 'lucide-react'
import SignaturePad from '@/components/portal/SignaturePad'

const STATUS: Record<string, { label: string; cls: string }> = {
  pending:     { label: 'À planifier', cls: 'bg-stone-100 text-stone-500' },
  scheduled:   { label: 'Planifiée',   cls: 'bg-sky-50 text-sky-700' },
  in_progress: { label: 'En cours',    cls: 'bg-amber-50 text-amber-700' },
  completed:   { label: 'Terminée',    cls: 'bg-emerald-50 text-emerald-700' },
  cancelled:   { label: 'Annulée',     cls: 'bg-red-50 text-red-600' },
}

const FILTERS = [
  { id: 'today', label: "Aujourd'hui" },
  { id: 'upcoming', label: 'À venir' },
  { id: 'all', label: 'Toutes' },
] as const

function todayStr() { return new Date().toISOString().split('T')[0] }

export default function TechTerrainPage() {
  const router = useRouter()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<'today' | 'upcoming' | 'all'>('today')
  const [sel, setSel] = useState<any | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      let url = '/api/tech/interventions?limit=50'
      if (filter === 'today') url += `&date=${todayStr()}`
      else if (filter === 'upcoming') url += `&from=${todayStr()}`
      const res = await fetch(url)
      if (res.status === 401 || res.status === 403) { router.push('/login'); return }
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Erreur')
      setItems(d.interventions || [])
    } catch (e: any) {
      setError(e.message || 'Impossible de charger les interventions.')
    } finally {
      setLoading(false)
    }
  }, [filter, router])

  useEffect(() => { load() }, [load])

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-emerald-900 text-white px-4 pt-4 pb-5">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => router.push('/tech-interface')} className="p-1.5 -ml-1.5 rounded-lg hover:bg-white/10">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h1 className="text-base font-bold flex items-center gap-2"><Wrench className="w-4 h-4" /> Terrain</h1>
            <button onClick={load} className="p-1.5 -mr-1.5 rounded-lg hover:bg-white/10" title="Rafraîchir">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="flex gap-1.5">
            {FILTERS.map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  filter === f.id ? 'bg-white text-emerald-900' : 'bg-white/10 text-emerald-100 hover:bg-white/20'
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-3 space-y-3">
        {loading && items.length === 0 ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-stone-300" /></div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
            <AlertCircle className="w-7 h-7 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center">
            <CheckCircle2 className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-stone-500">Aucune intervention</p>
            <p className="text-xs text-stone-400 mt-1">Rien de prévu sur cette période.</p>
          </div>
        ) : items.map(i => {
          const st = STATUS[i.status] || STATUS.pending
          return (
            <button key={i.id} onClick={() => setSel(i)}
              className="w-full text-left rounded-2xl border border-stone-200 bg-white p-4 shadow-sm active:scale-[0.99] transition-transform">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-stone-900 truncate">{i.title}</p>
                  <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {i.heureDebut || '—'}{i.heureFin ? ` → ${i.heureFin}` : ''}
                    <span className="text-stone-300">·</span>
                    {i.scheduledDate || (i.date ? new Date(i.date).toLocaleDateString('fr-FR') : '')}
                  </p>
                  {(i.client?.company || i.client?.name) && (
                    <p className="text-xs text-stone-500 mt-1 flex items-center gap-1 truncate">
                      <Building2 className="w-3 h-3 flex-shrink-0" />{i.client.company || i.client.name}
                    </p>
                  )}
                  {(i.client?.address || i.client?.city) && (
                    <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 flex-shrink-0" />{[i.client.address, i.client.city].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
                <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${st.cls}`}>{st.label}</span>
              </div>
              {(i.report.photosAvant + i.report.photosApres > 0 || i.report.signedByClient) && (
                <div className="mt-2 flex items-center gap-3 text-[10px] text-stone-400">
                  {(i.report.photosAvant + i.report.photosApres) > 0 && <span className="flex items-center gap-1"><Camera className="w-3 h-3" />{i.report.photosAvant + i.report.photosApres} photo(s)</span>}
                  {i.report.signedByClient && <span className="flex items-center gap-1"><PenLine className="w-3 h-3" />Signé</span>}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {sel && <InterventionSheet item={sel} onClose={() => setSel(null)} onDone={() => { setSel(null); load() }} />}
    </div>
  )
}

// ─── Fiche intervention + rapport terrain ────────────────────────────────────
function InterventionSheet({ item, onClose, onDone }: { item: any; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [observations, setObservations] = useState('')
  const [photosAvant, setPhotosAvant] = useState<string[]>([])
  const [photosApres, setPhotosApres] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [sigClient, setSigClient] = useState<string | null>(null)
  const [sigName, setSigName] = useState('')

  const st = STATUS[item.status] || STATUS.pending

  async function setStatus(status: 'in_progress' | 'completed') {
    setBusy(true); setErr('')
    try {
      const res = await fetch('/api/interventions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interventionId: item.id, status }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Erreur')
      onDone()
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function uploadPhotos(files: FileList | null, target: 'photosAvant' | 'photosApres') {
    if (!files?.length) return
    setUploading(true); setErr('')
    try {
      const urls: string[] = []
      for (const file of Array.from(files).slice(0, 8)) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('type', 'interventions')
        const res = await fetch('/api/upload', { method: 'POST', body: fd })
        const d = await res.json()
        if (res.ok && d.url) urls.push(d.url)
      }
      if (target === 'photosAvant') setPhotosAvant(p => [...p, ...urls])
      else setPhotosApres(p => [...p, ...urls])
    } catch {
      setErr("Échec de l'upload photo")
    } finally {
      setUploading(false)
    }
  }

  async function saveReport() {
    setBusy(true); setErr(''); setOk('')
    try {
      const res = await fetch('/api/tech/interventions/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interventionId: item.id,
          photosAvant: photosAvant.map(url => ({ url })),
          photosApres: photosApres.map(url => ({ url })),
          observations: observations || undefined,
          signatureClient: sigClient ? { name: sigName, signature: sigClient } : undefined,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Erreur')
      setOk('Rapport enregistré — le client est notifié.')
      setPhotosAvant([]); setPhotosApres([]); setObservations(''); setSigClient(null); setSigName('')
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  const hasReportData = photosAvant.length + photosApres.length > 0 || !!observations.trim() || !!sigClient

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-stone-100 px-5 py-4 flex items-start justify-between rounded-t-3xl sm:rounded-t-2xl">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-stone-900 truncate">{item.title}</h2>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.cls}`}>{st.label}</span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              {item.heureDebut || '—'}{item.heureFin ? ` → ${item.heureFin}` : ''} · {item.scheduledDate || ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100"><X className="w-5 h-5 text-stone-400" /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Client */}
          {item.client && (
            <div className="rounded-xl bg-stone-50 p-4 space-y-1.5">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Client</p>
              <p className="text-sm font-semibold text-stone-900">{item.client.company || item.client.name}</p>
              {item.client.address && <p className="text-xs text-stone-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{[item.client.address, item.client.city].filter(Boolean).join(', ')}</p>}
              {item.client.phone && <a href={`tel:${item.client.phone}`} className="text-xs text-emerald-700 font-medium flex items-center gap-1"><Phone className="w-3 h-3" />{item.client.phone}</a>}
            </div>
          )}

          {item.description && <p className="text-sm text-stone-600">{item.description}</p>}

          {/* Actions de statut */}
          <div className="flex gap-2">
            {item.status === 'scheduled' && (
              <button onClick={() => setStatus('in_progress')} disabled={busy}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 text-white py-3 text-sm font-bold disabled:opacity-50">
                <Play className="w-4 h-4" /> Démarrer
              </button>
            )}
            {item.status === 'in_progress' && (
              <button onClick={() => setStatus('completed')} disabled={busy}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white py-3 text-sm font-bold disabled:opacity-50">
                <CheckCircle2 className="w-4 h-4" /> Terminer
              </button>
            )}
          </div>

          {/* Photos */}
          <div className="grid grid-cols-2 gap-3">
            {(['photosAvant', 'photosApres'] as const).map(k => (
              <div key={k}>
                <label className="block text-xs font-semibold text-stone-500 mb-1.5">
                  Photos {k === 'photosAvant' ? 'avant' : 'après'}
                </label>
                <label className="flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-stone-200 py-5 text-stone-400 cursor-pointer hover:border-emerald-400 hover:text-emerald-600 transition-colors">
                  <Camera className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{uploading ? 'Envoi…' : 'Ajouter'}</span>
                  <input type="file" accept="image/*" multiple capture="environment" className="hidden"
                    onChange={e => { uploadPhotos(e.target.files, k); e.target.value = '' }} />
                </label>
                {(k === 'photosAvant' ? photosAvant : photosApres).length > 0 && (
                  <p className="text-[10px] text-emerald-700 font-semibold mt-1 text-center">
                    {(k === 'photosAvant' ? photosAvant : photosApres).length} photo(s) prête(s)
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Observations */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1.5">Observations</label>
            <textarea rows={3} value={observations} onChange={e => setObservations(e.target.value)}
              placeholder="Travaux réalisés, anomalies, recommandations…"
              className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm resize-none focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
          </div>

          {/* Signature client */}
          <div className="rounded-xl border border-stone-200 p-4 space-y-3">
            <p className="text-xs font-semibold text-stone-500">Signature du client (fin d'intervention)</p>
            <input value={sigName} onChange={e => setSigName(e.target.value)} placeholder="Nom du signataire"
              className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            <SignaturePad onChange={setSigClient} height={140} />
          </div>

          {err && <p className="text-xs font-medium text-red-600">{err}</p>}
          {ok && <p className="text-xs font-medium text-emerald-700">{ok}</p>}

          <button onClick={saveReport} disabled={busy || uploading || !hasReportData}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-800 text-white py-3 text-sm font-bold disabled:opacity-40">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            Enregistrer le rapport
          </button>
        </div>
      </div>
    </div>
  )
}
