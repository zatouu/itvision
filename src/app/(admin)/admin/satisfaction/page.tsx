import Link from 'next/link'
import { cookies } from 'next/headers'
import { Star, MessageSquare, Users, PhoneCall, TrendingUp } from 'lucide-react'
import { verifyAuthToken } from '@/lib/jwt'
import { connectMongoose } from '@/lib/mongoose'
import Intervention from '@/lib/models/Intervention'
import Technician from '@/lib/models/Technician'
import Client from '@/lib/models/Client'
import { ITV_DOMAINS, detectDomain, type ItvDomain } from '@/lib/portal/project-view'

export const dynamic = 'force-dynamic'

const PERIODS = [
  { key: '90', label: '3 mois', days: 90 },
  { key: '365', label: '12 mois', days: 365 },
  { key: 'all', label: 'Tout', days: 0 },
] as const

type Group = { label: string; count: number; sum: number }
const avg = (g: { count: number; sum: number }) => (g.count ? g.sum / g.count : 0)
const fmtAvg = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const fmtDay = (d: unknown) => d ? new Date(d as string).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : ''

function Stars({ value, size = 'w-3.5 h-3.5' }: { value: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${fmtAvg(value)} sur 5`}>
      {[1, 2, 3, 4, 5].map(n => <Star key={n} className={`${size} ${n <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-stone-200'}`} />)}
    </span>
  )
}

function Ranking({ title, icon: Icon, rows }: { title: string; icon: typeof Users; rows: Group[] }) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-900"><Icon className="h-4 w-4 text-blue-600" />{title}</h2>
      {rows.length === 0 ? <p className="text-sm text-stone-400">Pas encore d&apos;avis.</p> : (
        <ul className="divide-y divide-stone-100">
          {rows.map(r => (
            <li key={r.label} className="flex items-center gap-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate text-stone-700">{r.label}</span>
              <Stars value={avg(r)} />
              <span className={`w-10 text-right font-semibold tabular-nums ${avg(r) < 3.5 ? 'text-red-600' : 'text-stone-900'}`}>{fmtAvg(avg(r))}</span>
              <span className="w-12 text-right text-xs text-stone-400 tabular-nums">{r.count} avis</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default async function AdminSatisfactionPage({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth-token')?.value
  let allowed = false
  try {
    if (token) {
      const decoded = await verifyAuthToken(token)
      allowed = ['ADMIN', 'SUPER_ADMIN'].includes(String(decoded.role || '').toUpperCase())
    }
  } catch {}
  if (!allowed) {
    return (
      <div className="pt-24 pb-6">
        <div className="mx-auto max-w-3xl rounded-xl border bg-white p-8 text-center">
          <h2 className="mb-2 text-xl font-bold">Accès refusé</h2>
          <p className="text-stone-600">Cette section est réservée aux administrateurs.</p>
        </div>
      </div>
    )
  }

  const { periode } = await searchParams
  const period = PERIODS.find(p => p.key === periode) || PERIODS[0]
  const since = period.days ? new Date(Date.now() - period.days * 24 * 60 * 60 * 1000) : new Date(0)

  await connectMongoose()
  const [rated, completedCount] = await Promise.all([
    Intervention.find({ 'clientFeedback.rating': { $gte: 1 }, 'clientFeedback.submittedAt': { $gte: since } })
      .select('title interventionNumber service date technicienId clientId client.name clientFeedback')
      .sort({ 'clientFeedback.submittedAt': -1 }).limit(3000).lean() as Promise<any[]>,
    Intervention.countDocuments({ status: 'completed', date: { $gte: since } }),
  ])

  const techIds = [...new Set(rated.map(r => r.technicienId && String(r.technicienId)).filter(Boolean))]
  const clientIds = [...new Set(rated.map(r => r.clientId && String(r.clientId)).filter(Boolean))]
  const [techs, clients] = await Promise.all([
    Technician.find({ _id: { $in: techIds } }).select('name').lean() as Promise<any[]>,
    Client.find({ _id: { $in: clientIds } }).select('name company').lean() as Promise<any[]>,
  ])
  const techName = new Map(techs.map(t => [String(t._id), t.name]))
  const clientName = new Map(clients.map(c => [String(c._id), c.company || c.name]))
  const companyOf = (r: any) => clientName.get(String(r.clientId)) || r.client?.name || 'Client'

  const total = rated.reduce((s, r) => s + r.clientFeedback.rating, 0)
  const average = rated.length ? total / rated.length : 0
  const dist = [5, 4, 3, 2, 1].map(n => ({ n, count: rated.filter(r => r.clientFeedback.rating === n).length }))
  const satisfied = rated.filter(r => r.clientFeedback.rating >= 4).length
  const responseRate = completedCount ? Math.min(100, Math.round(rated.length / completedCount * 100)) : 0

  const group = (keyOf: (r: any) => string) => {
    const m = new Map<string, Group>()
    for (const r of rated) {
      const k = keyOf(r)
      const g = m.get(k) || { label: k, count: 0, sum: 0 }
      g.count++; g.sum += r.clientFeedback.rating
      m.set(k, g)
    }
    return [...m.values()].sort((a, b) => avg(a) - avg(b) || b.count - a.count)
  }
  const byTech = group(r => techName.get(String(r.technicienId)) || 'Technicien non renseigné')
  const byDomain = group(r => ITV_DOMAINS[detectDomain(r.service, r.title) as ItvDomain].label)
  const byClient = group(companyOf).slice(0, 10)

  const tagCounts = new Map<string, number>()
  for (const r of rated) for (const t of r.clientFeedback.tags || []) tagCounts.set(t, (tagCounts.get(t) || 0) + 1)
  const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)
  const toCall = rated.filter(r => r.clientFeedback.rating <= 3).slice(0, 15)
  const latest = rated.filter(r => r.clientFeedback.comment).slice(0, 15)

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-6xl space-y-6 px-4 pb-10 pt-20 sm:px-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">Satisfaction clients</h1>
            <p className="text-sm text-stone-500">Avis laissés par les clients B2B sur leur portail après chaque intervention.</p>
          </div>
          <nav className="flex gap-1 rounded-full border border-stone-200 bg-white p-1">
            {PERIODS.map(p => (
              <Link key={p.key} href={`/admin/satisfaction?periode=${p.key}`}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${p.key === period.key ? 'bg-blue-600 text-white' : 'text-stone-600 hover:bg-stone-100'}`}>{p.label}</Link>
            ))}
          </nav>
        </header>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Note moyenne', value: rated.length ? `${fmtAvg(average)} / 5` : '-', extra: <Stars value={average} size="w-4 h-4" /> },
            { label: 'Clients satisfaits (4-5)', value: rated.length ? `${Math.round(satisfied / rated.length * 100)} %` : '-' },
            { label: 'Avis reçus', value: String(rated.length) },
            { label: 'Taux de réponse', value: completedCount ? `${responseRate} %` : '-', hint: `${completedCount} interventions terminées` },
          ].map(k => (
            <div key={k.label} className="rounded-2xl border border-stone-200 bg-white p-4">
              <p className="text-xs text-stone-500">{k.label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-stone-900">{k.value}</p>
              {k.extra}
              {k.hint && <p className="text-[11px] text-stone-400">{k.hint}</p>}
            </div>
          ))}
        </section>

        <div className="grid gap-4 lg:grid-cols-3">
          <section className="rounded-2xl border border-stone-200 bg-white p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-900"><TrendingUp className="h-4 w-4 text-blue-600" />Répartition des notes</h2>
            <ul className="space-y-2">
              {dist.map(d => (
                <li key={d.n} className="flex items-center gap-2 text-sm">
                  <span className="w-6 tabular-nums text-stone-600">{d.n}</span>
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
                    <span className={`block h-full rounded-full ${d.n >= 4 ? 'bg-emerald-500' : d.n === 3 ? 'bg-amber-400' : 'bg-red-500'}`} style={{ width: `${rated.length ? d.count / rated.length * 100 : 0}%` }} />
                  </span>
                  <span className="w-8 text-right text-xs tabular-nums text-stone-500">{d.count}</span>
                </li>
              ))}
            </ul>
            {topTags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {topTags.map(([t, n]) => <span key={t} className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600">{t} <strong className="tabular-nums">{n}</strong></span>)}
              </div>
            )}
          </section>
          <Ranking title="Par technicien" icon={Users} rows={byTech} />
          <Ranking title="Par domaine" icon={Star} rows={byDomain} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-red-200 bg-white p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-900"><PhoneCall className="h-4 w-4 text-red-600" />Clients à rappeler (note de 3 ou moins)</h2>
            {toCall.length === 0 ? <p className="text-sm text-stone-400">Aucun avis négatif sur la période.</p> : (
              <ul className="divide-y divide-stone-100">
                {toCall.map(r => (
                  <li key={String(r._id)} className="py-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      <Stars value={r.clientFeedback.rating} />
                      <span className="min-w-0 flex-1 truncate font-medium text-stone-900">{companyOf(r)}</span>
                      <span className="text-xs text-stone-400">{fmtDay(r.clientFeedback.submittedAt)}</span>
                    </div>
                    <p className="truncate text-xs text-stone-500">{r.interventionNumber ? `${r.interventionNumber} · ` : ''}{r.title}{r.technicienId ? ` · ${techName.get(String(r.technicienId)) || ''}` : ''}</p>
                    {(r.clientFeedback.tags?.length || r.clientFeedback.comment) && (
                      <p className="mt-1 text-xs text-stone-700">{[r.clientFeedback.tags?.join(', '), r.clientFeedback.comment].filter(Boolean).join(' - ')}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="rounded-2xl border border-stone-200 bg-white p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-900"><MessageSquare className="h-4 w-4 text-blue-600" />Derniers commentaires</h2>
            {latest.length === 0 ? <p className="text-sm text-stone-400">Aucun commentaire sur la période.</p> : (
              <ul className="divide-y divide-stone-100">
                {latest.map(r => (
                  <li key={String(r._id)} className="py-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      <Stars value={r.clientFeedback.rating} />
                      <span className="min-w-0 flex-1 truncate text-xs text-stone-500">{companyOf(r)} · {r.title}</span>
                    </div>
                    <p className="mt-1 text-stone-700">{r.clientFeedback.comment}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <Ranking title="Par client (notes les plus basses d'abord)" icon={Users} rows={byClient} />
      </div>
    </div>
  )
}
