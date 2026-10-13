'use client'

import { useCallback, useEffect, useState } from 'react'
import { Activity, ChevronDown, Loader2, RefreshCw } from 'lucide-react'

type Level = 'ok' | 'warn' | 'down'

interface Health {
  level: Level
  alerts: string[]
  worker: { level: Level; lastProcessedAt: string | null; lastError: string | null; stuckJobs: number }
  platforms: Array<{ platform: string; total: number; counts: Record<string, number>; successRate: number | null; lastSuccessAt: string | null; level: Level }>
  config: { llm: boolean; vision: boolean; proxy: boolean; workerOnThisServer: boolean; autoSend: { enabled: boolean; minRelevance: number } }
  requests: { total30d: number; proposalsSent30d: number; medianDelayHours: number | null; overdue: number }
  decisions: { autoSent: number; approved: number; rejected: number; pending: number; approvalRate: number | null }
}

const LEVEL_STYLE: Record<Level, { dot: string; label: string; box: string }> = {
  ok: { dot: 'bg-emerald-500', label: 'Opérationnelle', box: 'border-emerald-200 bg-emerald-50' },
  warn: { dot: 'bg-amber-500', label: 'À surveiller', box: 'border-amber-200 bg-amber-50' },
  down: { dot: 'bg-red-500', label: 'Intervention requise', box: 'border-red-200 bg-red-50' },
}
const PLATFORM_LABEL: Record<string, string> = { '1688': '1688', aliexpress: 'AliExpress', alibaba: 'Alibaba' }

function ago(d: string | null) {
  if (!d) return 'jamais'
  const h = (Date.now() - new Date(d).getTime()) / 3600000
  if (h < 1) return `il y a ${Math.max(1, Math.round(h * 60))} min`
  if (h < 48) return `il y a ${Math.round(h)} h`
  return `il y a ${Math.round(h / 24)} j`
}

function Flag({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${ok ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-stone-400'}`} />
      {label}
    </span>
  )
}

/** Santé de la recherche automatique « Trouvez-moi » (worker, sources, config, délais). */
export default function SourcingHealthPanel() {
  const [data, setData] = useState<Health | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/admin/market/sourcing-health', { credentials: 'include', cache: 'no-store' })
      const json = await res.json()
      if (!res.ok || !json?.success) throw new Error('Diagnostic indisponible')
      if (json?.success) {
        setData(json)
        if (json.level !== 'ok') setOpen(true)
      }
    } catch { setError(true) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading && !data) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Vérification de la recherche automatique…
      </div>
    )
  }
  if (error) {
    return (
      <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 border-y border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <span>Diagnostic indisponible. L&apos;état de la recherche ne peut pas être confirmé.</span>
        <button type="button" onClick={load} disabled={loading} className="inline-flex min-h-11 items-center gap-2 font-semibold disabled:opacity-50">
          <RefreshCw size={16} /> Réessayer
        </button>
      </div>
    )
  }
  if (!data) return null

  const style = LEVEL_STYLE[data.level]
  return (
    <div className={`mt-4 rounded-xl border ${style.box}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left"
      >
        <Activity className="h-4 w-4 text-stone-600" />
        <span className="text-sm font-semibold text-stone-900">Recherche automatique</span>
        <span className="inline-flex items-center gap-1.5 text-sm text-stone-700">
          <span className={`h-2 w-2 rounded-full ${style.dot}`} /> {style.label}
        </span>
        <span className="text-xs text-stone-500">Dernier traitement {ago(data.worker.lastProcessedAt)}</span>
        <ChevronDown className={`ml-auto h-4 w-4 text-stone-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-stone-200/70 px-4 py-4">
          {data.alerts.length > 0 && (
            <ul className="space-y-1.5">
              {data.alerts.map((a) => (
                <li key={a} className="text-sm text-stone-800">• {a}</li>
              ))}
            </ul>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {data.platforms.map((p) => (
              <div key={p.platform} className="rounded-lg border border-stone-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-stone-900">{PLATFORM_LABEL[p.platform] || p.platform}</span>
                  <span className={`h-2 w-2 rounded-full ${LEVEL_STYLE[p.level].dot}`} />
                </div>
                <p className="mt-1 text-2xl font-bold tabular-nums text-stone-900">
                  {p.successRate === null ? '—' : `${Math.round(p.successRate * 100)} %`}
                </p>
                <p className="text-xs text-stone-500">
                  de réussite sur 7 j ({p.total} essai{p.total > 1 ? 's' : ''}
                  {p.counts.blocked ? `, ${p.counts.blocked} bloqué${p.counts.blocked > 1 ? 's' : ''}` : ''})
                </p>
                <p className="mt-1 text-xs text-stone-500">Dernier succès {ago(p.lastSuccessAt)}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-white p-3">
              <p className="text-xs text-stone-500">Demandes (30 j)</p>
              <p className="text-lg font-bold tabular-nums text-stone-900">{data.requests.total30d}</p>
            </div>
            <div className="rounded-lg bg-white p-3">
              <p className="text-xs text-stone-500">Délai médian de proposition</p>
              <p className="text-lg font-bold tabular-nums text-stone-900">
                {data.requests.medianDelayHours === null ? '—' : `${data.requests.medianDelayHours} h`}
              </p>
            </div>
            <div className="rounded-lg bg-white p-3">
              <p className="text-xs text-stone-500">Envoyées sans intervention</p>
              <p className="text-lg font-bold tabular-nums text-stone-900">{data.decisions.autoSent}</p>
            </div>
            <div className="rounded-lg bg-white p-3">
              <p className="text-xs text-stone-500">Propositions agent validées</p>
              <p className="text-lg font-bold tabular-nums text-stone-900">
                {data.decisions.approvalRate === null ? '—' : `${data.decisions.approvalRate} %`}
              </p>
              <p className="text-[11px] text-stone-500">{data.decisions.approved} oui · {data.decisions.rejected} non</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Flag ok={data.config.llm} label="Modèle de langage" />
            <Flag ok={data.config.vision} label="Lecture des photos" />
            <Flag ok={data.config.proxy} label="Proxy configuré sur le serveur web" />
            <Flag ok={data.config.workerOnThisServer} label="Worker activé sur le serveur web" />
            <Flag ok={data.config.autoSend.enabled} label={`Envoi auto (≥ ${Math.round(data.config.autoSend.minRelevance * 100)} %)`} />
          </div>

          {data.decisions.approvalRate !== null && data.decisions.approvalRate >= 90 && data.decisions.approved >= 20 && !data.config.autoSend.enabled && (
            <p className="text-sm text-stone-700">
              Propositions validées : {data.decisions.approvalRate} %. Ce taux seul ne confirme ni la marge réelle ni la fiabilité des délais.
            </p>
          )}

          <button type="button" onClick={load} disabled={loading} className="inline-flex min-h-11 items-center gap-2 text-xs font-medium text-violet-700 hover:underline disabled:opacity-50">
            <RefreshCw size={16} />
            {loading ? 'Actualisation…' : 'Actualiser'}
          </button>
        </div>
      )}
    </div>
  )
}
