'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, ExternalLink, FileText, Link2, Loader2, Plus, Receipt, Unlink, X } from 'lucide-react'
import { useToastContext } from '@/components/ToastProvider'
import { apiErrorMessage, readJsonResponse } from '@/lib/http/read-json'

interface FinanceQuote { id: string; numero: string; title?: string; status: string; version: number; date?: string; total: number; invoiced: number }
interface FinanceInvoice { id: string; numero: string; status: string; date?: string; dueDate?: string; quoteId?: string; total: number; credited: number; paid: number; balance: number }
interface Finance {
  quotes: FinanceQuote[]
  invoices: FinanceInvoice[]
  contracted: number
  pipeline: number
  invoiced: number
  draftInvoiced: number
  paid: number
  outstanding: number
  remainingToInvoice: number
  overInvoiced: number
  projectValue: number
  coherent: boolean
  warnings: string[]
}
interface Candidate { id: string; numero: string; title?: string; status: string; total: number; date?: string; clientName?: string }

const fmt = (n: number) => `${Math.round(n || 0).toLocaleString('fr-FR')} FCFA`
const fd = (d?: string) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—')

const QUOTE_STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Brouillon', cls: 'bg-stone-100 text-stone-600' },
  sent: { label: 'Envoyé', cls: 'bg-blue-100 text-blue-700' },
  accepted: { label: 'Accepté', cls: 'bg-emerald-100 text-emerald-800' },
  rejected: { label: 'Refusé', cls: 'bg-red-100 text-red-700' },
  superseded: { label: 'Remplacé', cls: 'bg-stone-100 text-stone-400 line-through' },
}
const INVOICE_STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Brouillon', cls: 'bg-stone-100 text-stone-600' },
  sent: { label: 'Émise', cls: 'bg-blue-100 text-blue-700' },
  partial: { label: 'Partielle', cls: 'bg-amber-100 text-amber-800' },
  paid: { label: 'Payée', cls: 'bg-emerald-100 text-emerald-800' },
  overdue: { label: 'En retard', cls: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Annulée', cls: 'bg-stone-100 text-stone-400 line-through' },
}

export default function ProjectFinancePanel({ projectId, onChanged }: { projectId: string; onChanged?: () => void }) {
  const toast = useToastContext()
  const [finance, setFinance] = useState<Finance | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [linking, setLinking] = useState<{ quotes: Candidate[]; invoices: Candidate[] } | null>(null)
  const [invoiceFor, setInvoiceFor] = useState<{ quote: FinanceQuote; mode: 'full' | 'deposit' | 'balance'; percent: number } | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/finance`, { credentials: 'include', cache: 'no-store' })
      const data = await readJsonResponse(res)
      if (res.ok && data.success) setFinance(data.finance)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  const openLinking = async () => {
    setBusy('candidates')
    try {
      const res = await fetch(`/api/projects/${projectId}/finance?candidates=1`, { credentials: 'include', cache: 'no-store' })
      const data = await readJsonResponse(res)
      if (!res.ok) throw new Error(apiErrorMessage(res, data))
      setLinking(data.candidates || { quotes: [], invoices: [] })
    } catch (e: any) {
      toast.error(e?.message || 'Chargement impossible')
    } finally {
      setBusy(null)
    }
  }

  const link = async (action: 'link-quote' | 'unlink-quote' | 'link-invoice' | 'unlink-invoice', id: string) => {
    if (action.startsWith('unlink') && !confirm('Retirer ce document du projet ? Les montants du projet seront recalculés.')) return
    setBusy(`${action}:${id}`)
    try {
      const res = await fetch(`/api/projects/${projectId}/finance`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, quoteId: action.includes('quote') ? id : undefined, invoiceId: action.includes('invoice') ? id : undefined }),
      })
      const data = await readJsonResponse(res)
      if (!res.ok || !data.success) throw new Error(apiErrorMessage(res, data))
      setFinance(data.finance)
      setLinking(prev => prev && {
        quotes: prev.quotes.filter(q => q.id !== id),
        invoices: prev.invoices.filter(i => i.id !== id),
      })
      toast.success(action.startsWith('link') ? 'Document lié au projet' : 'Document retiré du projet')
      onChanged?.()
    } catch (e: any) {
      toast.error(e?.message || 'Opération impossible')
    } finally {
      setBusy(null)
    }
  }

  const createInvoice = async () => {
    if (!invoiceFor) return
    setBusy('invoice')
    try {
      const res = await fetch('/api/admin/invoices/from-quote', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId: invoiceFor.quote.id, mode: invoiceFor.mode, percent: invoiceFor.percent }),
      })
      const data = await readJsonResponse(res)
      if (!res.ok || !data.success) throw new Error(apiErrorMessage(res, data))
      toast.success(`Facture ${data.numero} créée (brouillon)`, { description: data.remaining > 0 ? `Reste à facturer sur ce devis : ${fmt(data.remaining)}` : 'Devis entièrement facturé' })
      setInvoiceFor(null)
      await load()
      onChanged?.()
    } catch (e: any) {
      toast.error(e?.message || 'Création impossible')
    } finally {
      setBusy(null)
    }
  }

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-stone-400" /></div>
  if (!finance) return <p className="py-6 text-center text-sm text-stone-500">Finances indisponibles.</p>

  const cards = [
    { label: 'Contrat (devis acceptés)', value: finance.contracted, cls: 'text-stone-900' },
    { label: 'Devis en cours', value: finance.pipeline, cls: 'text-blue-700' },
    { label: 'Facturé', value: finance.invoiced, cls: 'text-stone-900', sub: finance.draftInvoiced ? `+ ${fmt(finance.draftInvoiced)} en brouillon` : undefined },
    { label: 'Encaissé', value: finance.paid, cls: 'text-emerald-700' },
    { label: 'Reste à encaisser', value: finance.outstanding, cls: finance.outstanding ? 'text-amber-700' : 'text-stone-900' },
    { label: 'Reste à facturer', value: finance.remainingToInvoice, cls: 'text-blue-700' },
  ]
  const invoicedPct = finance.contracted > 0 ? Math.min(100, Math.round((finance.invoiced / finance.contracted) * 100)) : 0
  const paidPct = finance.contracted > 0 ? Math.min(100, Math.round((finance.paid / finance.contracted) * 100)) : 0

  return (
    <div className="space-y-4">
      <div className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${finance.coherent ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
        {finance.coherent ? <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />}
        <div className="min-w-0">
          {finance.coherent
            ? 'Montants cohérents : le montant du projet est celui des devis acceptés, les factures ne le dépassent pas.'
            : <ul className="space-y-0.5">{finance.warnings.map(w => <li key={w}>{w}</li>)}</ul>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
        {cards.map(c => (
          <div key={c.label} className="rounded-xl border border-stone-200 bg-white p-3">
            <p className="text-[11px] text-stone-500">{c.label}</p>
            <p className={`mt-0.5 text-sm font-bold sm:text-base ${c.cls}`}>{fmt(c.value)}</p>
            {c.sub && <p className="text-[10px] text-stone-400">{c.sub}</p>}
          </div>
        ))}
      </div>

      {finance.contracted > 0 && (
        <div className="rounded-xl border border-stone-200 bg-white p-3">
          <div className="mb-1 flex justify-between text-xs text-stone-500"><span>Facturé {invoicedPct} %</span><span>Encaissé {paidPct} %</span></div>
          <div className="relative h-2.5 overflow-hidden rounded-full bg-stone-100">
            <div className="absolute inset-y-0 left-0 bg-blue-200" style={{ width: `${invoicedPct}%` }} />
            <div className="absolute inset-y-0 left-0 bg-emerald-500" style={{ width: `${paidPct}%` }} />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link href={`/admin/devis?projectId=${projectId}`} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" />Nouveau devis pour ce projet
        </Link>
        <button type="button" onClick={openLinking} disabled={busy === 'candidates'} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60">
          {busy === 'candidates' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}Lier un devis ou une facture existant
        </button>
      </div>

      {/* Devis */}
      <section className="rounded-2xl border border-stone-200 bg-white">
        <h3 className="flex items-center gap-2 border-b border-stone-100 px-4 py-3 text-sm font-semibold text-stone-900"><FileText className="h-4 w-4 text-blue-600" />Devis ({finance.quotes.length})</h3>
        {finance.quotes.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-stone-500">Aucun devis lié. Créez-en un ou liez un devis existant.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {finance.quotes.map(q => {
              const remaining = Math.max(0, q.total - q.invoiced)
              return (
                <li key={q.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-stone-900">
                      {q.numero}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${QUOTE_STATUS[q.status]?.cls || 'bg-stone-100'}`}>{QUOTE_STATUS[q.status]?.label || q.status}</span>
                    </p>
                    <p className="truncate text-xs text-stone-500">{q.title || 'Sans titre'} · {fd(q.date)}</p>
                    {q.status === 'accepted' && <p className="text-xs text-stone-500">Facturé {fmt(q.invoiced)} · reste {fmt(remaining)}</p>}
                  </div>
                  <p className="text-sm font-semibold text-stone-900 sm:w-36 sm:text-right">{fmt(q.total)}</p>
                  <div className="flex flex-wrap gap-1.5 sm:justify-end">
                    {q.status === 'accepted' && remaining > 0 && (
                      <button type="button" onClick={() => setInvoiceFor({ quote: q, mode: q.invoiced > 0 ? 'balance' : 'full', percent: 30 })}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                        <Receipt className="h-3.5 w-3.5" />Facturer
                      </button>
                    )}
                    <Link href={`/admin/devis?search=${encodeURIComponent(q.numero)}`} className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs text-stone-600 hover:bg-stone-50"><ExternalLink className="h-3.5 w-3.5" />Ouvrir</Link>
                    <button type="button" onClick={() => link('unlink-quote', q.id)} disabled={!!busy} aria-label={`Délier ${q.numero}`} className="rounded-lg border border-stone-200 p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600"><Unlink className="h-3.5 w-3.5" /></button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Factures */}
      <section className="rounded-2xl border border-stone-200 bg-white">
        <h3 className="flex items-center gap-2 border-b border-stone-100 px-4 py-3 text-sm font-semibold text-stone-900"><Receipt className="h-4 w-4 text-amber-600" />Factures ({finance.invoices.length})</h3>
        {finance.invoices.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-stone-500">Aucune facture liée.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {finance.invoices.map(inv => (
              <li key={inv.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-stone-900">
                    {inv.numero}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${INVOICE_STATUS[inv.status]?.cls || 'bg-stone-100'}`}>{INVOICE_STATUS[inv.status]?.label || inv.status}</span>
                  </p>
                  <p className="text-xs text-stone-500">Émise {fd(inv.date)}{inv.dueDate ? ` · échéance ${fd(inv.dueDate)}` : ''}{inv.credited ? ` · avoirs ${fmt(inv.credited)}` : ''}</p>
                </div>
                <div className="text-sm sm:w-48 sm:text-right">
                  <p className="font-semibold text-stone-900">{fmt(inv.total)}</p>
                  {inv.status !== 'draft' && inv.status !== 'cancelled' && <p className="text-xs text-stone-500">payé {fmt(inv.paid)} · dû {fmt(inv.balance)}</p>}
                </div>
                <div className="flex gap-1.5 sm:justify-end">
                  <Link href={`/admin/factures?search=${encodeURIComponent(inv.numero)}`} className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs text-stone-600 hover:bg-stone-50"><ExternalLink className="h-3.5 w-3.5" />Ouvrir</Link>
                  <button type="button" onClick={() => link('unlink-invoice', inv.id)} disabled={!!busy} aria-label={`Délier ${inv.numero}`} className="rounded-lg border border-stone-200 p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600"><Unlink className="h-3.5 w-3.5" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Liaison de documents existants */}
      {linking && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center" role="dialog" aria-modal="true" onClick={() => setLinking(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-stone-900">Lier un document existant</p>
              <button type="button" onClick={() => setLinking(null)} aria-label="Fermer" className="rounded-lg p-1 text-stone-500 hover:bg-stone-100"><X className="h-4 w-4" /></button>
            </div>
            <p className="mb-3 text-xs text-stone-500">Devis et factures sans projet (ceux du même client en priorité). Lier un devis rattache aussi ses factures.</p>
            {[{ key: 'quotes' as const, title: 'Devis', action: 'link-quote' as const, labels: QUOTE_STATUS }, { key: 'invoices' as const, title: 'Factures', action: 'link-invoice' as const, labels: INVOICE_STATUS }].map(group => (
              <div key={group.key} className="mb-4">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone-400">{group.title}</p>
                {linking[group.key].length === 0 ? <p className="text-sm text-stone-500">Aucun.</p> : (
                  <ul className="divide-y divide-stone-100 rounded-xl border border-stone-200">
                    {linking[group.key].map(c => (
                      <li key={c.id} className="flex items-center gap-2 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-stone-900">{c.numero} <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${group.labels[c.status]?.cls || ''}`}>{group.labels[c.status]?.label || c.status}</span></p>
                          <p className="truncate text-xs text-stone-500">{c.clientName || '—'} · {fd(c.date)} · {fmt(c.total)}</p>
                        </div>
                        <button type="button" onClick={() => link(group.action, c.id)} disabled={!!busy} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                          {busy === `${group.action}:${c.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />}Lier
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Facturation depuis un devis */}
      {invoiceFor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center" role="dialog" aria-modal="true" onClick={() => setInvoiceFor(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-stone-900">Facturer le devis {invoiceFor.quote.numero}</p>
            <p className="mt-0.5 text-xs text-stone-500">Montant accepté {fmt(invoiceFor.quote.total)} · déjà facturé {fmt(invoiceFor.quote.invoiced)}</p>
            <fieldset className="mt-3 space-y-2">
              {invoiceFor.quote.invoiced === 0 && (
                <label className="flex items-start gap-2 rounded-xl border border-stone-200 p-2.5 text-sm">
                  <input type="radio" checked={invoiceFor.mode === 'full'} onChange={() => setInvoiceFor({ ...invoiceFor, mode: 'full' })} className="mt-0.5" />
                  <span><span className="font-medium">Totalité</span><span className="block text-xs text-stone-500">Toutes les lignes du devis</span></span>
                </label>
              )}
              <label className="flex items-start gap-2 rounded-xl border border-stone-200 p-2.5 text-sm">
                <input type="radio" checked={invoiceFor.mode === 'deposit'} onChange={() => setInvoiceFor({ ...invoiceFor, mode: 'deposit' })} className="mt-0.5" />
                <span className="flex-1"><span className="font-medium">Acompte</span>
                  <span className="mt-1 flex items-center gap-2 text-xs text-stone-500">
                    <input type="number" min={1} max={90} value={invoiceFor.percent} onChange={e => setInvoiceFor({ ...invoiceFor, mode: 'deposit', percent: Number(e.target.value) })} className="w-16 rounded-lg border border-stone-200 px-2 py-1 text-sm" /> %
                    = {fmt(Math.round(invoiceFor.quote.total * (invoiceFor.percent || 0) / 100))}
                  </span>
                </span>
              </label>
              {invoiceFor.quote.invoiced > 0 && (
                <label className="flex items-start gap-2 rounded-xl border border-stone-200 p-2.5 text-sm">
                  <input type="radio" checked={invoiceFor.mode === 'balance'} onChange={() => setInvoiceFor({ ...invoiceFor, mode: 'balance' })} className="mt-0.5" />
                  <span><span className="font-medium">Solde</span><span className="block text-xs text-stone-500">{fmt(Math.max(0, invoiceFor.quote.total - invoiceFor.quote.invoiced))}</span></span>
                </label>
              )}
            </fieldset>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setInvoiceFor(null)} className="rounded-xl border border-stone-200 px-4 py-2 text-sm">Annuler</button>
              <button type="button" onClick={createInvoice} disabled={busy === 'invoice'} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                {busy === 'invoice' && <Loader2 className="h-4 w-4 animate-spin" />}Créer la facture brouillon
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
