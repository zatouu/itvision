import Link from 'next/link'
import { ArrowRight, CheckCircle2, ClipboardCheck, FileSignature, LifeBuoy, PenLine, Receipt, Star } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { CARD } from './tokens'

export interface ActionCenterCounts {
  quotesToAnswer: number
  invoicesOverdue: number
  invoicesDue: number
  reportsToAcknowledge: number
  ticketsAwaitingReply: number
  interventionsToSign: number
  receptionsToSign?: number
  interventionsToRate?: number
}

interface ActionDef {
  key: string
  count: number
  label: (n: number) => string
  cta: string
  href: string
  icon: LucideIcon
  tone: string
}

const plural = (n: number, s: string, p = `${s}s`) => (n > 1 ? p : s)

// Ordre = priorité : ce qui bloque ou coûte d'abord
function buildActions(c: ActionCenterCounts): ActionDef[] {
  return [
    { key: 'overdue', count: c.invoicesOverdue, label: n => `${plural(n, 'facture')} en retard`, cta: 'Régler', href: '/portail-entreprise/documents', icon: Receipt, tone: 'bg-red-50 text-red-700' },
    { key: 'quotes', count: c.quotesToAnswer, label: n => `${plural(n, 'devis', 'devis')} à valider`, cta: 'Répondre', href: '/portail-entreprise/documents', icon: FileSignature, tone: 'bg-emerald-50 text-emerald-700' },
    { key: 'tickets', count: c.ticketsAwaitingReply, label: n => `${plural(n, 'ticket')} en attente de votre réponse`, cta: 'Répondre', href: '/portail-entreprise/support', icon: LifeBuoy, tone: 'bg-orange-50 text-orange-700' },
    { key: 'reports', count: c.reportsToAcknowledge, label: n => `${plural(n, 'rapport')} à valider`, cta: 'Consulter', href: '/portail-entreprise/rapports', icon: ClipboardCheck, tone: 'bg-sky-50 text-sky-700' },
    { key: 'reception', count: c.receptionsToSign || 0, label: n => `${plural(n, 'PV de réception', 'PV de réception')} à signer`, cta: 'Signer', href: '/portail-entreprise/projets', icon: ClipboardCheck, tone: 'bg-emerald-50 text-emerald-700' },
    { key: 'sign', count: c.interventionsToSign, label: n => `${plural(n, 'intervention')} à signer`, cta: 'Signer', href: '/portail-entreprise/interventions', icon: PenLine, tone: 'bg-teal-50 text-teal-700' },
    { key: 'due', count: c.invoicesDue, label: n => `${plural(n, 'facture')} à échéance`, cta: 'Voir', href: '/portail-entreprise/documents', icon: Receipt, tone: 'bg-amber-50 text-amber-700' },
    { key: 'rate', count: c.interventionsToRate || 0, label: n => `${plural(n, 'intervention')} à noter`, cta: 'Donner mon avis', href: '/portail-entreprise/interventions', icon: Star, tone: 'bg-amber-50 text-amber-700' },
  ].filter(a => a.count > 0)
}

/** « À traiter » : tout ce qui attend une action du client, en un coup d'œil. */
export function ActionCenter({ counts }: { counts: ActionCenterCounts }) {
  const actions = buildActions(counts)

  if (actions.length === 0) {
    return (
      <section className={`${CARD} flex items-center gap-3 px-5 py-4`}>
        <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" />
        <p className="text-sm text-stone-600">
          <span className="font-semibold text-stone-900">Tout est à jour.</span> Aucune action ne vous attend pour le moment.
        </p>
      </section>
    )
  }

  return (
    <section className={`${CARD} p-4 sm:p-5`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-400">À traiter</h2>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-stone-600">
          {actions.reduce((s, a) => s + a.count, 0)}
        </span>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map(a => {
          const Icon = a.icon
          return (
            <Link key={a.key} href={a.href}
              className="group flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50/50 px-3.5 py-3 transition-colors hover:border-emerald-200 hover:bg-emerald-50/40">
              <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${a.tone}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-bold leading-tight tabular-nums text-stone-900">{a.count}</span>
                <span className="block truncate text-xs text-stone-500">{a.label(a.count)}</span>
              </span>
              <span className="inline-flex flex-shrink-0 items-center gap-1 text-xs font-semibold text-emerald-700 opacity-80 group-hover:opacity-100">
                {a.cta} <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
