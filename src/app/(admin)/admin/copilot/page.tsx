'use client'

import { useEffect, useState } from 'react'
import Breadcrumb from '@/components/Breadcrumb'
import {
  Bot, Loader2, CheckCircle, XCircle, AlertTriangle, ShieldCheck,
  ImageIcon, RefreshCw, ChevronDown, Sparkles,
} from 'lucide-react'

interface Proposal {
  verdict: 'approve' | 'reject' | 'unsure'
  confidence: number
  reasons: string[]
  suggestedFixes: string[]
  riskFlags: string[]
  checks: {
    hasImage?: boolean
    priceAboveMin?: boolean
    forbiddenWord?: string | null
    duplicateName?: boolean
    priceVsMedian?: number | null
    hardViolation?: string | null
  }
  llmUnavailable?: boolean
  product?: { name: string; price: number; category?: string; image?: string; sellerName?: string }
  sourcingRequest?: {
    reference?: string
    description?: string
    qty?: number
    budgetMaxFCFA?: number
    candidates?: Array<{ name: string; url: string; image?: string; supplier?: string; price1688?: number; totalClientPrice?: number }>
    suggestedProposal?: { productName?: string; totalClientPrice?: number } | null
  }
}

interface Decision {
  id: string
  type: string
  refId: string
  status: 'pending' | 'approved' | 'rejected'
  proposal: Proposal
  decidedBy?: string
  decidedAt?: string
  adminNote?: string
  createdAt: string
}

const VERDICT_META: Record<string, { label: string; cls: string; icon: typeof CheckCircle }> = {
  approve: { label: 'Publier', cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  reject: { label: 'Rejeter', cls: 'bg-red-100 text-red-700', icon: XCircle },
  unsure: { label: 'Revue manuelle', cls: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
}

const TYPE_LABELS: Record<string, string> = {
  product_moderation: 'Modération produit',
  sourcing_request: 'Trouvez-moi (sourcing)',
}

export default function AdminCopilotPage() {
  const [decisions, setDecisions] = useState<Decision[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'pending' | 'all'>('pending')
  const [acting, setActing] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const load = async () => {
    try {
      const res = await fetch(`/api/admin/agent-decisions?status=${statusFilter}`, { credentials: 'include' })
      const data = await res.json()
      if (res.ok) {
        setDecisions(data.decisions || [])
        setPendingCount(data.pendingCount || 0)
      }
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => { setLoading(true); void load() }, [statusFilter])

  const decide = async (id: string, action: 'approve' | 'reject') => {
    try {
      setActing(id)
      const res = await fetch(`/api/admin/agent-decisions/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action, note: notes[id] || undefined }),
      })
      if (res.ok) await load()
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <Breadcrumb items={[{ label: 'Admin', href: '/admin' }, { label: 'Copilote IA' }]} />

      <div className="flex items-center gap-3 mb-5">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-700">
          <Bot size={20} />
        </span>
        <div>
          <h1 className="text-xl font-extrabold text-stone-900">Copilote IA</h1>
          <p className="text-[12px] text-stone-500">
            Les agents analysent et proposent — vous décidez. {pendingCount > 0 && <b className="text-violet-700">{pendingCount} en attente</b>}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="h-9 rounded-lg border border-stone-200 bg-white px-2 text-[12px] font-semibold text-stone-700"
          >
            <option value="pending">En attente</option>
            <option value="all">Toutes</option>
          </select>
          <button onClick={() => void load()} className="grid h-9 w-9 place-items-center rounded-lg border border-stone-200 text-stone-600 hover:bg-stone-100" title="Rafraîchir">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-violet-600" /></div>
      ) : decisions.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center">
          <ShieldCheck size={28} className="mx-auto text-emerald-500 mb-2" />
          <p className="text-[14px] font-bold text-stone-900">Aucune décision en attente</p>
          <p className="text-[12px] text-stone-500 mt-1">Les propositions des agents apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {decisions.map(d => {
            const v = VERDICT_META[d.proposal?.verdict || 'unsure']
            const VIcon = v.icon
            const prod = d.proposal?.product
            const checks = d.proposal?.checks || {}
            const isOpen = expanded[d.id]
            const done = d.status !== 'pending'
            return (
              <div key={d.id} className="rounded-2xl border border-stone-200 bg-white p-4">
                <div className="flex items-start gap-3">
                  {prod?.image ? (
                    <img src={prod.image} alt="" className="h-14 w-14 rounded-xl object-cover border border-stone-200 flex-shrink-0" />
                  ) : (
                    <span className="grid h-14 w-14 place-items-center rounded-xl bg-stone-100 text-stone-400 flex-shrink-0"><ImageIcon size={18} /></span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${v.cls}`}>
                        <VIcon size={11} /> IA : {v.label}{d.proposal?.confidence ? ` ${Math.round(d.proposal.confidence * 100)}%` : ''}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">{TYPE_LABELS[d.type] || d.type}</span>
                      {d.proposal?.llmUnavailable && (
                        <span className="text-[10px] font-semibold text-stone-400">analyse IA indisponible — checks seuls</span>
                      )}
                    </div>
                    <p className="mt-1 text-[14px] font-bold text-stone-900 truncate">{prod?.name || d.refId}</p>
                    <p className="text-[12px] text-stone-500">
                      {prod?.sellerName && <>{prod.sellerName} · </>}
                      {prod?.price != null && <b className="tabular-nums">{Number(prod.price).toLocaleString('fr-FR')} F</b>}
                      {prod?.category && <> · {prod.category}</>}
                    </p>
                  </div>
                  {done && (
                    <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${d.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {d.status === 'approved' ? 'Approuvé' : 'Rejeté'}
                    </span>
                  )}
                </div>

                {/* Raisons + checks */}
                <button
                  onClick={() => setExpanded(e => ({ ...e, [d.id]: !e[d.id] }))}
                  className="mt-2 flex items-center gap-1 text-[11px] font-bold text-violet-600 hover:text-violet-700"
                >
                  <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  Détails de l'analyse
                </button>
                {isOpen && (
                  <div className="mt-2 rounded-xl bg-stone-50 p-3 space-y-2 text-[12px]">
                    <div className="flex flex-wrap gap-1.5">
                      {checks.hasImage === false && <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-bold">sans photo</span>}
                      {checks.duplicateName && <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-bold">doublon</span>}
                      {checks.forbiddenWord && <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-bold">mot interdit : {checks.forbiddenWord}</span>}
                      {checks.priceVsMedian != null && (checks.priceVsMedian < 0.1 || checks.priceVsMedian > 20) && (
                        <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-bold">prix ×{checks.priceVsMedian.toFixed(2)} vs médiane</span>
                      )}
                      {checks.hardViolation && <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-bold">{checks.hardViolation}</span>}
                    </div>
                    {!!d.proposal?.reasons?.length && (
                      <ul className="list-disc pl-4 space-y-0.5 text-stone-700">
                        {d.proposal.reasons.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    )}
                    {!!d.proposal?.riskFlags?.length && (
                      <p className="text-amber-700 font-semibold">Risques : {d.proposal.riskFlags.join(', ')}</p>
                    )}
                    {!!d.proposal?.suggestedFixes?.length && (
                      <p className="text-stone-600"><b className="text-stone-700">Fixes suggérés :</b> {d.proposal.suggestedFixes.join(' · ')}</p>
                    )}
                    {d.proposal?.sourcingRequest && (
                      <div className="rounded-lg border border-stone-200 bg-white p-2.5 space-y-1.5">
                        <p className="font-bold text-stone-700">
                          Demande {d.proposal.sourcingRequest.reference}
                          {d.proposal.sourcingRequest.qty ? ` · qté ${d.proposal.sourcingRequest.qty}` : ''}
                          {d.proposal.sourcingRequest.budgetMaxFCFA ? ` · budget max ${d.proposal.sourcingRequest.budgetMaxFCFA.toLocaleString('fr-FR')} F` : ''}
                        </p>
                        {!!d.proposal.sourcingRequest.candidates?.length && (
                          <div className="space-y-1">
                            {d.proposal.sourcingRequest.candidates.map((c, i) => (
                              <div key={i} className="flex items-center gap-2 text-[11px]">
                                {c.image && <img src={c.image} alt="" className="h-8 w-8 rounded-md object-cover border border-stone-200" />}
                                <a href={c.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-violet-700 hover:underline">{c.name}</a>
                                {c.totalClientPrice != null && <b className="flex-shrink-0 tabular-nums">{c.totalClientPrice.toLocaleString('fr-FR')} F</b>}
                              </div>
                            ))}
                          </div>
                        )}
                        <a href="/admin/market/sourcing-requests" className="inline-block text-[11px] font-bold text-violet-600 hover:underline">
                          Ouvrir les demandes sourcing →
                        </a>
                      </div>
                    )}
                    {d.adminNote && <p className="text-stone-500 italic">Note admin : {d.adminNote}</p>}
                    {d.decidedBy && <p className="text-stone-400 text-[10px]">par {d.decidedBy} {d.decidedAt ? `· ${new Date(d.decidedAt).toLocaleString('fr-FR')}` : ''}</p>}
                  </div>
                )}

                {/* Actions */}
                {!done && (
                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <input
                      value={notes[d.id] || ''}
                      onChange={e => setNotes(n => ({ ...n, [d.id]: e.target.value }))}
                      placeholder="Note / motif (optionnel — transmis au vendeur si rejet)"
                      className="flex-1 h-9 rounded-lg border border-stone-200 px-3 text-[12px] outline-none focus:border-violet-400"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => decide(d.id, 'approve')}
                        disabled={acting === d.id}
                        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-emerald-600 text-white text-[12px] font-bold hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {acting === d.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />} Approuver
                      </button>
                      <button
                        onClick={() => decide(d.id, 'reject')}
                        disabled={acting === d.id}
                        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-red-50 border border-red-200 text-red-600 text-[12px] font-bold hover:bg-red-100 disabled:opacity-60"
                      >
                        <XCircle size={13} /> Rejeter
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <p className="mt-6 flex items-start gap-1.5 text-[11px] text-stone-400 leading-relaxed">
        <Sparkles size={12} className="flex-shrink-0 mt-0.5" />
        Les agents LangGraph recommandent — chaque publication/rejet reste une décision humaine tracée (qui, quand, pourquoi).
      </p>
    </div>
  )
}
