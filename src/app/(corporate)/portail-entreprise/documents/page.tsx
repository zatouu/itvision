'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Receipt, FileText, Calendar, ChevronRight, ShoppingCart, MessageSquare, Search, X, AlertCircle } from 'lucide-react'
import {
  CARD, INPUT, TONE,
  fmtNum, fmtDate,
  quoteStatus, quoteClientResponse, invoiceStatus,
  StatusBadge, Pill, PageHeader, BackLink, EmptyState, Skeleton,
} from '@/components/portal-ui'

type Tab = 'quotes' | 'invoices' | 'bons'
const TABS: Tab[] = ['quotes', 'invoices', 'bons']
const OPEN_INVOICE = ['sent', 'overdue', 'partial']
const OBJECT_ID = /^[a-f0-9]{24}$/i

const balanceOf = (i: any) => Math.max(0, (i.total || 0) - (i.amountPaid || 0) - (i.creditedAmount || 0))
const paidOf = (i: any) => i.amountPaid || (i.status === 'paid' ? i.total || 0 : 0)
const needsAnswer = (q: any) => q.status === 'sent' && (!q.clientResponse || q.clientResponse === 'pending')

const QUOTE_FILTERS = [
  { id: 'all', label: 'Tous' },
  { id: 'pending', label: 'À répondre' },
  { id: 'accepted', label: 'Acceptés' },
  { id: 'rejected', label: 'Refusés' },
]
const INVOICE_FILTERS = [
  { id: 'all', label: 'Toutes' },
  { id: 'due', label: 'À régler' },
  { id: 'overdue', label: 'En retard' },
  { id: 'paid', label: 'Payées' },
]

const pill = (active: boolean) =>
  `px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
    active ? 'border-emerald-700 bg-emerald-800 text-white' : 'border-stone-200 bg-white text-stone-500 hover:border-emerald-300 hover:text-emerald-800'
  }`

export default function DocumentsPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('quotes')
  const [quotes, setQuotes] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [quoteFilter, setQuoteFilter] = useState('all')
  const [invoiceFilter, setInvoiceFilter] = useState('all')
  const [search, setSearch] = useState('')

  // Anciens liens (?quote=, ?invoice=) : redirection vers la fiche ; ?tab= ouvre l'onglet
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const quote = params.get('quote')
    const invoice = params.get('invoice')
    if (quote && OBJECT_ID.test(quote)) { router.replace(`/portail-entreprise/documents/devis/${quote}?repondre=1`); return }
    if (invoice && OBJECT_ID.test(invoice)) { router.replace(`/portail-entreprise/documents/factures/${invoice}`); return }
    const t = params.get('tab') as Tab
    if (TABS.includes(t)) setTab(t)
    const f = params.get('filtre') || ''
    if (t === 'invoices' && INVOICE_FILTERS.some(x => x.id === f)) setInvoiceFilter(f)
    if (t === 'quotes' && QUOTE_FILTERS.some(x => x.id === f)) setQuoteFilter(f)
  }, [router])

  useEffect(() => {
    fetch('/api/client-enterprise/documents')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => { setQuotes(d.quotes || []); setInvoices(d.invoices || []) })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [])

  const go = (t: Tab, filter?: string) => {
    setTab(t)
    if (filter) (t === 'invoices' ? setInvoiceFilter : setQuoteFilter)(filter)
    window.history.replaceState(null, '', `?tab=${t}${filter ? `&filtre=${filter}` : ''}`)
  }

  const openInvoices = invoices.filter(i => OPEN_INVOICE.includes(i.status))
  const totalBilled = invoices.reduce((s, i) => s + (i.total || 0), 0)
  const totalPaid = invoices.reduce((s, i) => s + paidOf(i), 0)
  const totalDue = openInvoices.reduce((s, i) => s + balanceOf(i), 0)
  const totalOverdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + balanceOf(i), 0)
  const pendingQuotes = quotes.filter(needsAnswer)
  const bonsDeCommande = quotes.filter(q => q.clientResponse === 'accepted' || q.status === 'accepted' || !!q.bonCommande)

  const term = search.trim().toLowerCase()
  const matches = (...fields: unknown[]) => !term || fields.some(f => String(f || '').toLowerCase().includes(term))

  const filteredQuotes = useMemo(() => quotes.filter(q => {
    if (quoteFilter === 'pending' && !needsAnswer(q)) return false
    if (['accepted', 'rejected'].includes(quoteFilter) && q.status !== quoteFilter) return false
    return matches(q.numero, q.title, q.bonCommande)
  }), [quotes, quoteFilter, term])

  const filteredInvoices = useMemo(() => invoices.filter(i => {
    if (invoiceFilter === 'due' && !OPEN_INVOICE.includes(i.status)) return false
    if (['overdue', 'paid'].includes(invoiceFilter) && i.status !== invoiceFilter) return false
    return matches(i.numero, i.quoteId)
  }), [invoices, invoiceFilter, term])

  const filteredBons = useMemo(() => bonsDeCommande.filter(q => matches(q.numero, q.title, q.bonCommande)), [bonsDeCommande, term])

  const kpis = [
    { label: 'Total facturé', value: `${fmtNum(totalBilled)} F`, sub: `${invoices.length} factures`, color: 'text-stone-900', onClick: () => go('invoices', 'all') },
    { label: 'Réglé', value: `${fmtNum(totalPaid)} F`, sub: `${invoices.filter(i => i.status === 'paid').length} factures soldées`, color: 'text-emerald-700', onClick: () => go('invoices', 'paid') },
    { label: 'Reste à régler', value: `${fmtNum(totalDue)} F`, sub: totalOverdue > 0 ? `dont ${fmtNum(totalOverdue)} F en retard` : `${openInvoices.length} factures`, color: totalOverdue > 0 ? 'text-red-600' : 'text-amber-600', onClick: () => go('invoices', totalOverdue > 0 ? 'overdue' : 'due') },
    { label: 'Devis à répondre', value: String(pendingQuotes.length), sub: pendingQuotes.length ? `${fmtNum(pendingQuotes.reduce((s, q) => s + (q.total || 0), 0))} F en jeu` : 'Aucune action requise', color: pendingQuotes.length ? 'text-sky-700' : 'text-stone-400', onClick: () => go('quotes', 'pending') },
  ]

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      <PageHeader
        icon={Receipt}
        eyebrow="Facturation"
        title="Documents financiers"
        subtitle={loading ? 'Chargement…' : `${quotes.length} devis · ${invoices.length} factures · ${bonsDeCommande.length} bons de commande`}
      >
        <BackLink />
      </PageHeader>

      {loadError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          Impossible de charger vos documents. Réessayez dans un instant ; si le problème persiste, contactez le support.
        </div>
      )}

      <section className={`overflow-hidden ${CARD}`}>
        <div className="grid grid-cols-2 gap-px bg-stone-200/70 lg:grid-cols-4">
          {kpis.map(k => (
            <button key={k.label} type="button" onClick={k.onClick} disabled={loading}
              className="bg-white px-4 sm:px-5 py-4 text-left hover:bg-emerald-50/40 transition-colors group">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-stone-400 group-hover:text-emerald-700">{k.label}</p>
              {loading ? <Skeleton className="h-6 w-24 mt-2" /> : <p className={`text-xl font-bold tracking-tight mt-1.5 tabular-nums ${k.color}`}>{k.value}</p>}
              <p className="text-[11px] text-stone-400 mt-0.5">{loading ? '\u00a0' : k.sub}</p>
            </button>
          ))}
        </div>
      </section>

      {!loading && pendingQuotes.length > 0 && !(tab === 'quotes' && quoteFilter === 'pending') && (
        <button type="button" onClick={() => go('quotes', 'pending')}
          className="w-full rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-amber-50 transition-colors">
          <span className="text-sm text-amber-900">
            <strong>{pendingQuotes.length} devis</strong> attend{pendingQuotes.length > 1 ? 'ent' : ''} votre réponse
          </span>
          <span className="text-xs font-semibold text-amber-800 inline-flex items-center gap-1">Voir <ChevronRight className="w-3.5 h-3.5" /></span>
        </button>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:items-end sm:justify-between gap-3 border-b border-stone-200">
        <div className="flex gap-1 overflow-x-auto" role="tablist">
          {[
            { id: 'quotes' as const, label: 'Devis', count: quotes.length },
            { id: 'invoices' as const, label: 'Factures', count: invoices.length },
            { id: 'bons' as const, label: 'Bons de commande', count: bonsDeCommande.length },
          ].map(t => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => go(t.id)}
              className={`px-4 sm:px-5 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                tab === t.id ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}>
              {t.label} <span className="text-stone-400 tabular-nums">({t.count})</span>
            </button>
          ))}
        </div>
        <div className="relative sm:w-64 sm:mb-2">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="N° ou intitulé…" aria-label="Rechercher un document"
            className={`${INPUT} pl-9 pr-8 py-2`} />
          {search && (
            <button type="button" onClick={() => setSearch('')} aria-label="Effacer la recherche" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className={`${CARD} divide-y divide-stone-100`}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 px-5 py-4">
              <Skeleton className="w-9 h-9 rounded-xl" />
              <div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-1/4" /></div>
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      )}

      {!loading && tab === 'quotes' && (
        <div className="space-y-4">
          <div className="flex gap-1.5 flex-wrap">
            {QUOTE_FILTERS.map(f => (
              <button key={f.id} onClick={() => go('quotes', f.id)} className={pill(quoteFilter === f.id)}>
                {f.label}{f.id === 'pending' && pendingQuotes.length > 0 ? ` (${pendingQuotes.length})` : ''}
              </button>
            ))}
          </div>
          {filteredQuotes.length === 0 ? (
            <EmptyState icon={FileText} title={term ? 'Aucun devis ne correspond à la recherche' : quoteFilter === 'pending' ? 'Aucun devis en attente de réponse' : 'Aucun devis'} />
          ) : (
            <ul className={`divide-y divide-stone-100 overflow-hidden ${CARD}`}>
              {filteredQuotes.map(q => {
                const pending = needsAnswer(q)
                return (
                  <li key={q._id} className={pending ? 'bg-amber-50/40' : ''}>
                    <Link href={`/portail-entreprise/documents/devis/${String(q._id)}${pending ? '?repondre=1' : ''}`}
                      className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 group transition-colors hover:bg-emerald-50/40">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${pending ? 'bg-amber-50' : 'bg-stone-50'}`}>
                          <FileText className={`w-4 h-4 ${pending ? 'text-amber-600' : 'text-stone-400'}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-stone-900 group-hover:text-emerald-800 transition-colors truncate">{q.title || 'Devis'}</span>
                            <span className="font-mono text-xs text-stone-400">#{q.numero}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-stone-400">
                            <Calendar className="w-3 h-3" />{fmtDate(q.date)}
                            {q.clientComments?.length > 0 && <span className="flex items-center gap-0.5"><MessageSquare className="w-3 h-3" />{q.clientComments.length}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                        {pending
                          ? <span className="hidden sm:inline-flex rounded-full bg-emerald-800 text-white px-3 py-1 text-[11px] font-semibold">Répondre</span>
                          : q.clientResponse
                            ? <StatusBadge status={q.clientResponse} map={quoteClientResponse} className="hidden sm:inline-flex" />
                            : <StatusBadge status={q.status} map={quoteStatus} fallback="draft" />}
                        <span className="text-sm font-bold text-emerald-800 tabular-nums">{fmtNum(q.total)} F</span>
                        <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {!loading && tab === 'invoices' && (
        <div className="space-y-4">
          <div className="flex gap-1.5 flex-wrap">
            {INVOICE_FILTERS.map(f => (
              <button key={f.id} onClick={() => go('invoices', f.id)} className={pill(invoiceFilter === f.id)}>{f.label}</button>
            ))}
          </div>
          {filteredInvoices.length === 0 ? (
            <EmptyState icon={Receipt} title={term ? 'Aucune facture ne correspond à la recherche' : invoiceFilter === 'all' ? 'Aucune facture' : 'Aucune facture dans cette catégorie'} />
          ) : (
            <>
              <ul className={`divide-y divide-stone-100 overflow-hidden ${CARD}`}>
                {filteredInvoices.map(inv => {
                  const isOverdue = inv.status === 'overdue'
                  const balance = balanceOf(inv)
                  const open = OPEN_INVOICE.includes(inv.status)
                  return (
                    <li key={inv._id} className={isOverdue ? 'bg-red-50/40' : ''}>
                      <Link href={`/portail-entreprise/documents/factures/${String(inv._id)}`}
                        className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 group transition-colors hover:bg-emerald-50/40">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${isOverdue ? 'bg-red-50' : 'bg-stone-50'}`}>
                            <Receipt className={`w-4 h-4 ${isOverdue ? 'text-red-600' : 'text-stone-400'}`} />
                          </div>
                          <div className="min-w-0">
                            <span className="text-sm font-semibold text-stone-900 group-hover:text-emerald-800 transition-colors">Facture #{inv.numero}</span>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-stone-400 flex-wrap">
                              <span>Émise {fmtDate(inv.date)}</span>
                              {inv.dueDate && open && <span className={isOverdue ? 'text-red-500 font-medium' : ''}>· Échéance {fmtDate(inv.dueDate)}</span>}
                              {inv.paidAt && inv.status === 'paid' && <span>· Réglée le {fmtDate(inv.paidAt)}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <StatusBadge status={inv.status} map={invoiceStatus} fallback="sent" className="hidden sm:inline-flex" />
                          <div className="text-right">
                            <p className={`text-sm font-bold tabular-nums ${isOverdue ? 'text-red-600' : inv.status === 'paid' ? 'text-emerald-700' : 'text-stone-900'}`}>
                              {fmtNum(open ? balance : inv.total)} F
                            </p>
                            {open && balance !== inv.total && <p className="text-[11px] text-stone-400 tabular-nums">reste sur {fmtNum(inv.total)} F</p>}
                          </div>
                          <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
              <div className={`${CARD} p-4 flex flex-wrap justify-between items-center gap-2`}>
                <span className="text-sm font-medium text-stone-500">{filteredInvoices.length} facture(s) affichée(s)</span>
                <span className="text-sm text-stone-500">
                  Total <strong className="text-stone-900 tabular-nums">{fmtNum(filteredInvoices.reduce((s, i) => s + (i.total || 0), 0))} F</strong>
                  {' · '}Reste à régler <strong className="text-amber-700 tabular-nums">{fmtNum(filteredInvoices.filter(i => OPEN_INVOICE.includes(i.status)).reduce((s, i) => s + balanceOf(i), 0))} F</strong>
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {!loading && tab === 'bons' && (
        <div className="space-y-4">
          {filteredBons.length === 0 ? (
            <EmptyState icon={ShoppingCart} title={term ? 'Aucun bon de commande ne correspond à la recherche' : 'Aucun bon de commande'} message={term ? undefined : 'Les devis acceptés apparaîtront ici'} />
          ) : (
            <>
              <ul className={`divide-y divide-stone-100 overflow-hidden ${CARD}`}>
                {filteredBons.map(q => (
                  <li key={q._id}>
                    <Link href={`/portail-entreprise/documents/devis/${String(q._id)}`}
                      className="flex items-start justify-between gap-3 px-4 sm:px-5 py-3.5 group transition-colors hover:bg-emerald-50/40">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                          <ShoppingCart className="w-4 h-4 text-emerald-700" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-stone-900 group-hover:text-emerald-800 transition-colors">
                            BC lié au devis #{q.numero}
                            {q.bonCommande && <span className="ml-2 font-mono text-xs bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded">{q.bonCommande}</span>}
                          </p>
                          {q.title && <p className="text-xs text-stone-400 mt-0.5 truncate">{q.title}</p>}
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <span className="text-xs text-stone-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />{fmtDate(q.clientRespondedAt || q.acceptedAt || q.updatedAt)}
                            </span>
                            <Pill color={TONE.emerald}>{q.status === 'accepted' ? 'Confirmé' : 'Votre accord'}</Pill>
                            {q.dateLivraison && <span className="text-xs text-stone-400">Livraison : {q.dateLivraison}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 flex items-center gap-2">
                        <div>
                          <p className="text-base font-bold text-stone-900 tabular-nums">{fmtNum(q.clientCounterAmount || q.total || 0)} F</p>
                          {q.clientCounterAmount && q.clientCounterAmount !== q.total && (
                            <p className="text-[11px] text-stone-400 line-through tabular-nums">{fmtNum(q.total)} F</p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-emerald-600 transition-colors" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 flex justify-between items-center">
                <span className="text-sm font-medium text-emerald-800">{filteredBons.length} bon{filteredBons.length > 1 ? 's' : ''} de commande</span>
                <span className="text-base font-bold text-emerald-800 tabular-nums">
                  {fmtNum(filteredBons.reduce((s, q) => s + (q.clientCounterAmount || q.total || 0), 0))} FCFA
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
