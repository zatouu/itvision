'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Home, CalendarDays, FileText, Building2, UserRound, Briefcase, Wrench, Wifi, WifiOff, LogOut, Loader2,
  AlertTriangle, ChevronRight, Star, Phone, Mail, Navigation, Search, RefreshCw, CheckCircle2, Clock, Sparkles,
} from 'lucide-react'
import NotificationCenter from '@/components/NotificationCenter'
import TechnicianMarketplace from '@/components/TechnicianMarketplace'
import InterventionCard, { type TechInterventionItem } from './InterventionCard'
import InterventionSheet, { type ReportDraftContext } from './InterventionSheet'
import ReportsTab from './ReportsTab'
import { dayKey, dayLabel, mapsUrl, shortDate, telUrl, todayStr } from './tech-ui'
import { OUTBOX_EVENT, flushOutbox, listOutbox, type FlushResult } from '@/lib/tech/offline-outbox'

type Tab = 'today' | 'planning' | 'rapports' | 'clients' | 'profil' | 'missions'

const NAV: Array<{ id: Tab; label: string; icon: typeof Home; mobile: boolean }> = [
  { id: 'today', label: 'Accueil', icon: Home, mobile: true },
  { id: 'planning', label: 'Planning', icon: CalendarDays, mobile: true },
  { id: 'rapports', label: 'Rapports', icon: FileText, mobile: true },
  { id: 'clients', label: 'Clients', icon: Building2, mobile: true },
  { id: 'missions', label: 'Missions', icon: Briefcase, mobile: false },
  { id: 'profil', label: 'Profil', icon: UserRound, mobile: true },
]

interface Me {
  technician: { id: string; name: string; email: string; phone: string; specialties: string[]; isAvailable: boolean; profilePhoto: string | null; workingHours: { start?: string; end?: string } | null }
  counts: { today: number; upcoming: number; inProgress: number; toClose: number; drafts: number; rejected: number; pendingValidation: number; published: number }
  rejectedReports: Array<{ id: string; reportId: string; site: string; date: string; comments: string }>
  rating: { average: number | null; count: number; recent: Array<{ title: string; rating: number; comment: string; date: string }> }
}

async function fetchJson(url: string) {
  const res = await fetch(url, { credentials: 'include' })
  const d = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(d.error || 'Erreur'), { status: res.status })
  return d
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir'
}

export default function TechApp() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('today')
  const [me, setMe] = useState<Me | null>(null)
  const [meError, setMeError] = useState('')
  const [online, setOnline] = useState(true)
  const [sheetId, setSheetId] = useState<string | null>(null)
  const [compose, setCompose] = useState<ReportDraftContext | null>(null)
  const [openReportId, setOpenReportId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [clients, setClients] = useState<any[]>([])
  const [outboxCount, setOutboxCount] = useState(0)
  const [syncInfo, setSyncInfo] = useState<FlushResult | null>(null)

  const loadMe = useCallback(async () => {
    try {
      setMe(await fetchJson('/api/tech/me'))
      setMeError('')
    } catch (e: any) {
      if (e.status === 401) router.replace('/login')
      else setMeError(e.message)
    }
  }, [router])

  const refreshAll = useCallback(() => { loadMe(); setRefreshKey(k => k + 1) }, [loadMe])

  // File hors ligne : envoyée au démarrage, au retour du réseau et au retour sur l'application
  const syncOutbox = useCallback(async () => {
    if (!navigator.onLine) return
    const before = (await listOutbox().catch(() => [])).length
    if (!before) return
    const result = await flushOutbox().catch(() => null)
    if (!result) return
    setSyncInfo(result)
    if (result.sent || result.rejected.length) refreshAll()
    if (result.stopped === 'auth') router.replace('/login')
  }, [refreshAll, router])

  useEffect(() => {
    const count = () => { listOutbox().then(items => setOutboxCount(items.length)).catch(() => {}) }
    count()
    syncOutbox()
    window.addEventListener(OUTBOX_EVENT, count)
    return () => window.removeEventListener(OUTBOX_EVENT, count)
  }, [syncOutbox])

  useEffect(() => { loadMe() }, [loadMe])

  // Liens profonds : ?tab=, ?intervention=, ?rapport= (notifications) et ancien ?view=
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const t = p.get('tab') as Tab | null
    if (t && NAV.some(n => n.id === t)) setTab(t)
    if (p.get('view') === 'reports') setTab('rapports')
    if (p.get('intervention')) setSheetId(p.get('intervention'))
    if (p.get('rapport')) { setTab('rapports'); setOpenReportId(p.get('rapport')) }
  }, [])

  useEffect(() => {
    const url = new URL(window.location.href)
    url.search = tab === 'today' ? '' : `?tab=${tab}`
    window.history.replaceState(null, '', url.toString())
  }, [tab])

  useEffect(() => {
    const up = () => { setOnline(true); syncOutbox() }
    const down = () => setOnline(false)
    setOnline(navigator.onLine)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    // Retour sur l'application (téléphone sorti de veille) : données fraîches
    const onVisible = () => { if (document.visibilityState === 'visible') { refreshAll(); syncOutbox() } }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refreshAll, syncOutbox])

  useEffect(() => {
    fetchJson('/api/tech/clients?limit=50').then(d => setClients(d.clients || [])).catch(() => {})
  }, [refreshKey])

  const logout = async () => {
    try { await fetch('/api/auth/logout', { credentials: 'include' }) } catch {}
    router.replace('/login')
  }

  const writeReport = useCallback((ctx: ReportDraftContext) => { setSheetId(null); setCompose(ctx); setTab('rapports') }, [])
  const openReport = useCallback((reportId: string) => { setSheetId(null); setOpenReportId(reportId); setTab('rapports') }, [])
  const consumed = useCallback(() => { setCompose(null); setOpenReportId(null) }, [])

  const badges: Partial<Record<Tab, number>> = { rapports: me?.counts.rejected || 0, today: me?.counts.inProgress || 0 }
  const tech = me?.technician

  return (
    <div className="min-h-screen bg-stone-100/70 pb-24 md:pb-10">
      {/* En-tête */}
      <header className="sticky top-0 z-40 bg-emerald-950 text-white shadow-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <Wrench className="h-4 w-4 text-emerald-300" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-tight">{tech?.name || 'Espace technicien'}</p>
              <p className="flex items-center gap-1 text-[11px] text-emerald-300/80">
                {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3 text-red-300" />}
                {online ? (tech ? (tech.isAvailable ? 'Disponible' : 'Indisponible') : 'En ligne') : 'Hors ligne'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={refreshAll} className="rounded-lg p-2 text-emerald-100/80 hover:bg-white/10" aria-label="Actualiser"><RefreshCw className="h-4 w-4" /></button>
            <NotificationCenter />
          </div>
        </div>
        {/* Onglets bureau */}
        <nav className="hidden border-t border-white/10 md:block">
          <div className="mx-auto flex max-w-5xl gap-1 px-4">
            {NAV.map(n => {
              const Icon = n.icon
              const active = tab === n.id
              return (
                <button key={n.id} onClick={() => setTab(n.id)}
                  className={`relative flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition ${active ? 'text-white' : 'text-emerald-200/70 hover:text-white'}`}>
                  <Icon className="h-4 w-4" />{n.label}
                  {!!badges[n.id] && <span className="rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-emerald-950">{badges[n.id]}</span>}
                  {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-emerald-300" />}
                </button>
              )
            })}
          </div>
        </nav>
      </header>

      {!online && (
        <div className="bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-900">
          Hors connexion : photos, comptes rendus et changements de statut sont gardés sur l’appareil et partiront au retour du réseau.
        </div>
      )}
      {outboxCount > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900" role="status">
          <span>{outboxCount} envoi{outboxCount > 1 ? 's' : ''} en attente sur l’appareil{syncInfo?.stopped === 'rate-limit' ? ' (trop d’envois, nouvel essai plus tard)' : ''}</span>
          {online && <button onClick={syncOutbox} className="font-semibold underline">Envoyer maintenant</button>}
        </div>
      )}
      {!!syncInfo?.rejected.length && (
        <div className="bg-red-50 px-4 py-2 text-xs text-red-800" role="alert">
          <p className="font-semibold">Envois refusés par le serveur :</p>
          <ul className="list-inside list-disc">{syncInfo.rejected.map((r, n) => <li key={n}>{r}</li>)}</ul>
          <button onClick={() => setSyncInfo(null)} className="mt-1 font-semibold underline">Fermer</button>
        </div>
      )}

      <main className="mx-auto max-w-5xl px-4 py-5">
        {meError && !me && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {meError === 'Fiche technicien introuvable'
              ? 'Votre compte n’est relié à aucune fiche technicien. Contactez le responsable planning.'
              : meError}
          </div>
        )}
        {tab === 'today' && <TodayTab me={me} refreshKey={refreshKey} onOpen={setSheetId} onTab={setTab} onOpenReport={openReport} onAvailability={loadMe} />}
        {tab === 'planning' && <PlanningTab refreshKey={refreshKey} onOpen={setSheetId} />}
        {tab === 'rapports' && <ReportsTab compose={compose} openReportId={openReportId} clients={clients} onConsumed={consumed} onChanged={loadMe} />}
        {tab === 'clients' && <ClientsTab initial={clients} />}
        {tab === 'missions' && <TechnicianMarketplace technicianId={tech?.id} />}
        {tab === 'profil' && <ProfileTab me={me} onAvailability={loadMe} onLogout={logout} onMissions={() => setTab('missions')} />}
      </main>

      {/* Barre d'onglets mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {NAV.filter(n => n.mobile).map(n => {
            const Icon = n.icon
            const active = tab === n.id
            return (
              <button key={n.id} onClick={() => setTab(n.id)} className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold ${active ? 'text-emerald-800' : 'text-stone-400'}`}>
                <Icon className={`h-5 w-5 ${active ? 'stroke-[2.4]' : ''}`} />
                {n.label}
                {!!badges[n.id] && <span className="absolute right-[calc(50%-18px)] top-1.5 min-w-[16px] rounded-full bg-red-500 px-1 text-center text-[9px] font-bold leading-4 text-white">{badges[n.id]}</span>}
              </button>
            )
          })}
        </div>
      </nav>

      {sheetId && (
        <InterventionSheet
          id={sheetId}
          techName={tech?.name}
          onClose={() => setSheetId(null)}
          onChanged={refreshAll}
          onWriteReport={writeReport}
          onOpenReport={openReport}
        />
      )}
    </div>
  )
}

// ─── Disponibilité ───────────────────────────────────────────────────────────
function AvailabilityToggle({ value, onChanged }: { value: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const toggle = async () => {
    setBusy(true)
    try {
      await fetch('/api/tech/me', {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: !value }),
      })
      onChanged()
    } finally { setBusy(false) }
  }
  return (
    <button onClick={toggle} disabled={busy} role="switch" aria-checked={value}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${value ? 'bg-emerald-400/20 text-emerald-100 ring-1 ring-emerald-300/40' : 'bg-white/10 text-stone-200 ring-1 ring-white/20'}`}>
      <span className={`relative h-4 w-7 rounded-full transition ${value ? 'bg-emerald-400' : 'bg-stone-500'}`}>
        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${value ? 'left-3.5' : 'left-0.5'}`} />
      </span>
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : value ? 'Disponible' : 'Indisponible'}
    </button>
  )
}

// ─── Accueil ─────────────────────────────────────────────────────────────────
function TodayTab({ me, refreshKey, onOpen, onTab, onOpenReport, onAvailability }: {
  me: Me | null
  refreshKey: number
  onOpen: (id: string) => void
  onTab: (t: Tab) => void
  onOpenReport: (id: string) => void
  onAvailability: () => void
}) {
  const [items, setItems] = useState<TechInterventionItem[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetchJson(`/api/tech/interventions?date=${todayStr()}&limit=50`),
      fetchJson('/api/tech/interventions?status=in_progress&limit=20'),
    ]).then(([day, running]) => {
      if (cancelled) return
      const map = new Map<string, TechInterventionItem>()
      for (const i of [...(running.interventions || []), ...(day.interventions || [])]) map.set(i.id, i)
      setItems(Array.from(map.values()).filter(i => i.status !== 'cancelled'))
      setError('')
    }).catch(e => { if (!cancelled) setError(e.message) })
    return () => { cancelled = true }
  }, [refreshKey])

  const running = useMemo(() => (items || []).filter(i => i.status === 'in_progress'), [items])
  const next = useMemo(() => (items || []).find(i => i.status === 'scheduled'), [items])
  const rest = useMemo(() => (items || []).filter(i => i.status !== 'in_progress' && i !== next), [items, next])
  const done = (items || []).filter(i => i.status === 'completed').length
  const total = (items || []).length

  return (
    <div className="space-y-5">
      {/* Bandeau du jour */}
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 to-emerald-700 p-5 text-white shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-emerald-200">{greeting()}{me ? `, ${me.technician.name.split(' ')[0]}` : ''}</p>
            <p className="mt-0.5 text-lg font-bold capitalize">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          {me && <AvailabilityToggle value={me.technician.isAvailable} onChanged={onAvailability} />}
        </div>
        <div className="mt-4">
          <div className="flex items-end justify-between text-xs text-emerald-100">
            <span>{total === 0 ? 'Aucune intervention prévue' : `${done} sur ${total} terminée${done > 1 ? 's' : ''}`}</span>
            {me && me.technician.workingHours?.start && <span>{me.technician.workingHours.start} – {me.technician.workingHours.end}</span>}
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-emerald-300 transition-all" style={{ width: `${total ? Math.round((done / total) * 100) : 0}%` }} />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { v: me?.counts.inProgress ?? '–', l: 'En cours', t: 'today' as Tab },
            { v: me?.counts.upcoming ?? '–', l: '7 prochains jours', t: 'planning' as Tab },
            { v: me?.rating.average ?? '–', l: me?.rating.count ? `Note (${me.rating.count} avis)` : 'Note clients', t: 'profil' as Tab },
          ].map(k => (
            <button key={k.l} onClick={() => onTab(k.t)} className="rounded-2xl bg-white/10 px-3 py-2.5 text-left ring-1 ring-white/10 transition hover:bg-white/15">
              <p className="text-lg font-bold tabular-nums">{k.v}</p>
              <p className="text-[10px] leading-tight text-emerald-100/80">{k.l}</p>
            </button>
          ))}
        </div>
      </section>

      {/* À traiter */}
      {me && (me.rejectedReports.length > 0 || me.counts.toClose > 0 || me.counts.drafts > 0) && (
        <section className="space-y-2">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-stone-400">À traiter</h2>
          {me.rejectedReports.map(r => (
            <button key={r.id} onClick={() => onOpenReport(r.id)}
              className="flex w-full items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-left">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-red-900">Rapport à corriger : {r.reportId}</p>
                <p className="line-clamp-2 text-xs text-red-700">{r.comments || r.site}</p>
              </div>
              <ChevronRight className="mt-0.5 h-4 w-4 text-red-300" />
            </button>
          ))}
          {me.counts.toClose > 0 && (
            <button onClick={() => onTab('planning')} className="flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left">
              <Clock className="h-4 w-4 flex-shrink-0 text-amber-600" />
              <p className="flex-1 text-sm text-amber-900"><span className="font-semibold">{me.counts.toClose}</span> intervention{me.counts.toClose > 1 ? 's' : ''} terminée{me.counts.toClose > 1 ? 's' : ''} sans compte rendu (photos ou observations)</p>
              <ChevronRight className="h-4 w-4 text-amber-300" />
            </button>
          )}
          {me.counts.drafts > 0 && (
            <button onClick={() => onTab('rapports')} className="flex w-full items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 text-left">
              <FileText className="h-4 w-4 flex-shrink-0 text-stone-400" />
              <p className="flex-1 text-sm text-stone-700"><span className="font-semibold">{me.counts.drafts}</span> brouillon{me.counts.drafts > 1 ? 's' : ''} de rapport à soumettre</p>
              <ChevronRight className="h-4 w-4 text-stone-300" />
            </button>
          )}
        </section>
      )}

      {/* Interventions */}
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : items === null ? (
        <div className="space-y-2">{[0, 1].map(n => <div key={n} className="h-24 animate-pulse rounded-2xl bg-stone-200/60" />)}</div>
      ) : (
        <>
          {running.length > 0 && (
            <section className="space-y-2">
              <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-amber-600">En cours</h2>
              {running.map(i => <InterventionCard key={i.id} item={i} onOpen={onOpen} highlight />)}
            </section>
          )}
          {next && (
            <section className="space-y-2">
              <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-stone-400">Prochaine intervention</h2>
              <InterventionCard item={next} onOpen={onOpen} highlight={running.length === 0} />
              {(next.client?.address || next.site || next.client?.phone) && (
                <div className="grid grid-cols-2 gap-2">
                  <a href={mapsUrl([next.client?.address, next.client?.city].filter(Boolean).join(', ') || next.site) || undefined} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-xs font-semibold text-stone-700 ring-1 ring-stone-200 hover:ring-emerald-300">
                    <Navigation className="h-4 w-4" /> Itinéraire
                  </a>
                  <a href={telUrl(next.client?.phone) || undefined}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-xs font-semibold ring-1 ring-stone-200 ${next.client?.phone ? 'text-stone-700 hover:ring-emerald-300' : 'pointer-events-none text-stone-300'}`}>
                    <Phone className="h-4 w-4" /> Prévenir le client
                  </a>
                </div>
              )}
            </section>
          )}
          {rest.length > 0 && (
            <section className="space-y-2">
              <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-stone-400">Reste de la journée</h2>
              {rest.map(i => <InterventionCard key={i.id} item={i} onOpen={onOpen} />)}
            </section>
          )}
          {items.length === 0 && (
            <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center">
              <Sparkles className="mx-auto mb-2 h-7 w-7 text-emerald-400" />
              <p className="text-sm font-semibold text-stone-700">Rien de prévu aujourd’hui</p>
              <button onClick={() => onTab('planning')} className="mt-2 text-xs font-semibold text-emerald-700 hover:underline">Voir le planning</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Planning ────────────────────────────────────────────────────────────────
function PlanningTab({ refreshKey, onOpen }: { refreshKey: number; onOpen: (id: string) => void }) {
  const [range, setRange] = useState<'upcoming' | 'past'>('upcoming')
  const [items, setItems] = useState<TechInterventionItem[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setItems(null)
    const url = range === 'upcoming'
      ? `/api/tech/interventions?from=${todayStr()}&status=pending,scheduled,in_progress&limit=100`
      : `/api/tech/interventions?to=${todayStr(-1)}&sort=desc&limit=60`
    fetchJson(url)
      .then(d => { if (!cancelled) { setItems(d.interventions || []); setError('') } })
      .catch(e => { if (!cancelled) setError(e.message) })
    return () => { cancelled = true }
  }, [range, refreshKey])

  const groups = useMemo(() => {
    const map = new Map<string, TechInterventionItem[]>()
    for (const i of items || []) {
      const k = dayKey(i)
      map.set(k, [...(map.get(k) || []), i])
    }
    return Array.from(map.entries())
  }, [items])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-stone-900">Planning</h2>
        <div className="flex rounded-xl bg-white p-1 ring-1 ring-stone-200">
          {([['upcoming', 'À venir'], ['past', 'Historique']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setRange(id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${range === id ? 'bg-emerald-800 text-white' : 'text-stone-500 hover:text-stone-800'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : items === null ? (
        <div className="space-y-2">{[0, 1, 2].map(n => <div key={n} className="h-24 animate-pulse rounded-2xl bg-stone-200/60" />)}</div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center">
          <CalendarDays className="mx-auto mb-2 h-7 w-7 text-stone-300" />
          <p className="text-sm font-semibold text-stone-600">{range === 'upcoming' ? 'Aucune intervention planifiée' : 'Aucune intervention passée'}</p>
        </div>
      ) : (
        groups.map(([k, list]) => (
          <section key={k} className="space-y-2">
            <h3 className="sticky top-14 z-10 -mx-4 bg-stone-100/90 px-5 py-1.5 text-xs font-semibold capitalize text-stone-500 backdrop-blur md:top-24">
              {dayLabel(k)} <span className="font-normal text-stone-400">· {list.length}</span>
            </h3>
            {list.map(i => <InterventionCard key={i.id} item={i} onOpen={onOpen} />)}
          </section>
        ))
      )}
    </div>
  )
}

// ─── Clients ─────────────────────────────────────────────────────────────────
function ClientsTab({ initial }: { initial: any[] }) {
  const [q, setQ] = useState('')
  const [list, setList] = useState<any[]>(initial)
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (!q) setList(initial) }, [initial, q])

  useEffect(() => {
    if (!q.trim()) return
    const t = setTimeout(() => {
      setLoading(true)
      fetchJson(`/api/tech/clients?limit=50&q=${encodeURIComponent(q.trim())}`)
        .then(d => setList(d.clients || []))
        .catch(() => {})
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-stone-900">Mes clients</h2>
        <p className="text-xs text-stone-500">Les clients chez qui vous êtes intervenu ou allez intervenir.</p>
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Nom, société, téléphone"
          className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-9 pr-9 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
        {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-stone-300" />}
      </div>
      {list.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">Aucun client.</div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {list.map(c => {
            const address = [c.address, c.city].filter(Boolean).join(', ')
            return (
              <li key={c.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-stone-900">{c.company || c.name}</p>
                    {c.contactPerson && <p className="truncate text-xs text-stone-500">{c.contactPerson}</p>}
                  </div>
                  {c.activeContracts?.length > 0 && (
                    <span className="flex-shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Sous contrat</span>
                  )}
                </div>
                {c.visits && (
                  <p className="mt-1.5 text-[11px] text-stone-400">
                    {c.visits.count} intervention{c.visits.count > 1 ? 's' : ''}
                    {c.visits.last ? ` · dernière le ${shortDate(c.visits.last)}` : ''}
                    {c.visits.next ? ` · prochaine le ${shortDate(c.visits.next)}` : ''}
                  </p>
                )}
                {address && <p className="mt-1 truncate text-xs text-stone-500">{address}</p>}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <a href={telUrl(c.phone) || undefined} className={`inline-flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-semibold ring-1 ring-stone-200 ${c.phone ? 'text-stone-700 hover:bg-stone-50' : 'pointer-events-none text-stone-300'}`}><Phone className="h-3.5 w-3.5" />Appeler</a>
                  <a href={c.email ? `mailto:${c.email}` : undefined} className={`inline-flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-semibold ring-1 ring-stone-200 ${c.email ? 'text-stone-700 hover:bg-stone-50' : 'pointer-events-none text-stone-300'}`}><Mail className="h-3.5 w-3.5" />Email</a>
                  <a href={mapsUrl(address) || undefined} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-semibold ring-1 ring-stone-200 ${address ? 'text-stone-700 hover:bg-stone-50' : 'pointer-events-none text-stone-300'}`}><Navigation className="h-3.5 w-3.5" />Y aller</a>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ─── Profil ──────────────────────────────────────────────────────────────────
function ProfileTab({ me, onAvailability, onLogout, onMissions }: { me: Me | null; onAvailability: () => void; onLogout: () => void; onMissions: () => void }) {
  if (!me) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-stone-300" /></div>
  const t = me.technician
  const initials = t.name.split(/\s+/).map(s => s[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-emerald-900 p-5 text-white">
        <div className="flex items-center gap-4">
          {t.profilePhoto
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={t.profilePhoto} alt="" className="h-14 w-14 rounded-2xl object-cover" />
            : <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-lg font-bold">{initials}</div>}
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold">{t.name}</p>
            <p className="truncate text-xs text-emerald-200">{t.email}{t.phone ? ` · ${t.phone}` : ''}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-emerald-100/80">Le planning n’affecte de nouvelles interventions qu’aux techniciens disponibles.</p>
          <AvailabilityToggle value={t.isAvailable} onChanged={onAvailability} />
        </div>
        {t.specialties.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {t.specialties.map(s => <span key={s} className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium">{s}</span>)}
          </div>
        )}
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { v: me.counts.published, l: 'Rapports validés', icon: CheckCircle2, c: 'text-emerald-600' },
          { v: me.counts.pendingValidation, l: 'En validation', icon: Clock, c: 'text-amber-600' },
          { v: me.counts.drafts, l: 'Brouillons', icon: FileText, c: 'text-stone-500' },
          { v: me.rating.average ?? '–', l: `Note moyenne (${me.rating.count})`, icon: Star, c: 'text-amber-500' },
        ].map(k => {
          const Icon = k.icon
          return (
            <div key={k.l} className="rounded-2xl border border-stone-200 bg-white p-4">
              <Icon className={`h-4 w-4 ${k.c}`} />
              <p className="mt-2 text-xl font-bold tabular-nums text-stone-900">{k.v}</p>
              <p className="text-[11px] text-stone-400">{k.l}</p>
            </div>
          )
        })}
      </section>

      {me.rating.recent.length > 0 && (
        <section className="rounded-2xl border border-stone-200 bg-white p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400">Derniers avis clients</h3>
          <ul className="space-y-3">
            {me.rating.recent.map((r, n) => (
              <li key={n}>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-stone-800">{r.title}</p>
                  <span className="flex flex-shrink-0">{Array.from({ length: 5 }).map((_, s) => <Star key={s} className={`h-3.5 w-3.5 ${s < r.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-200'}`} />)}</span>
                </div>
                {r.comment && <p className="mt-0.5 text-xs text-stone-500">« {r.comment} »</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white">
        <button onClick={onMissions} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium text-stone-700 hover:bg-stone-50">
          <Briefcase className="h-4 w-4 text-stone-400" /><span className="flex-1">Missions ouvertes</span><ChevronRight className="h-4 w-4 text-stone-300" />
        </button>
        <button onClick={onLogout} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-sm font-medium text-red-600 hover:bg-red-50">
          <LogOut className="h-4 w-4" /><span className="flex-1">Se déconnecter</span>
        </button>
      </section>
    </div>
  )
}
