'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { initSocket, onSocketEvent } from '@/lib/socket-client'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import {
  Bell, BellRing, CheckCheck, Info, AlertTriangle, CheckCircle, AlertCircle, ChevronRight, Loader2, Inbox, X,
  FileSignature, Receipt, Wallet, FolderKanban, Wrench, ClipboardList, LifeBuoy, FileText, Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Notif = {
  _id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  actionUrl?: string
  createdAt: string
  readBy: string[]
  metadata?: { category?: string; requires?: string }
}

const TYPE_TONE = {
  info: { icon: Info, tone: 'bg-sky-50 text-sky-700' },
  success: { icon: CheckCircle, tone: 'bg-emerald-50 text-emerald-700' },
  warning: { icon: AlertTriangle, tone: 'bg-amber-50 text-amber-700' },
  error: { icon: AlertCircle, tone: 'bg-red-50 text-red-700' },
}

const CATEGORY_ICON: Record<string, LucideIcon> = {
  quote: FileSignature, invoice: Receipt, payment: Wallet, project: FolderKanban,
  intervention: Wrench, report: ClipboardList, ticket: LifeBuoy, contract: FileText, team: Users,
}

const CATEGORY_FILTERS = [
  { id: 'all', label: 'Toutes' },
  { id: 'unread', label: 'Non lues' },
  { id: 'project', label: 'Projets' },
  { id: 'finance', label: 'Devis et factures' },
  { id: 'service', label: 'Interventions' },
] as const
type Filter = (typeof CATEGORY_FILTERS)[number]['id']

const inFilter = (n: Notif, f: Filter, unread: boolean) => {
  const c = n.metadata?.category
  if (f === 'unread') return unread
  if (f === 'project') return c === 'project'
  if (f === 'finance') return c === 'quote' || c === 'invoice' || c === 'payment'
  if (f === 'service') return c === 'intervention' || c === 'report' || c === 'ticket' || c === 'contract'
  return true
}

function timeAgo(d: string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (diff < 1) return "À l'instant"
  if (diff < 60) return `${diff} min`
  if (diff < 1440) return `${Math.floor(diff / 60)} h`
  if (diff < 10080) return `${Math.floor(diff / 1440)} j`
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export default function NotificationBell({ userId, capabilities }: { userId?: string; capabilities?: string[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [loading, setLoading] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [pushHidden, setPushHidden] = useState(true)
  const ref = useRef<HTMLDivElement>(null)
  const push = usePushNotifications()

  const isUnread = useCallback((n: Notif) => userId ? !n.readBy.includes(userId) : n.readBy.length === 0, [userId])
  const unreadCount = notifs.filter(isUnread).length
  const filtered = notifs.filter(n => inFilter(n, filter, isUnread(n)))

  const fetchNotifs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/client-enterprise/notifications')
      if (res.ok) setNotifs(await res.json())
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchNotifs()
    const t = setInterval(() => { if (document.visibilityState === 'visible') fetchNotifs() }, 60000)
    return () => clearInterval(t)
  }, [fetchNotifs])

  useEffect(() => { setPushHidden(localStorage.getItem('portal-push-dismissed') === '1') }, [])

  // Temps réel : `corp:notification` (room company-*) et `notification` (room user-*)
  useEffect(() => {
    try {
      initSocket()
      const onPush = (n: any) => {
        if (!n?.title) return
        // Notification réservée à un droit que ce membre n'a pas (ex. factures)
        if (n.metadata?.requires && capabilities && !capabilities.includes(n.metadata.requires)) return
        setNotifs(prev => prev.some(x => x._id === n._id) ? prev : [{ readBy: [], ...n }, ...prev])
      }
      const off1 = onSocketEvent('corp:notification', onPush)
      const off2 = onSocketEvent('notification', onPush)
      return () => { off1(); off2() }
    } catch {
      return undefined
    }
  }, [capabilities])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => { if (window.innerWidth >= 640 && ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onEsc)
    // Panneau plein écran sur mobile : la page derrière ne défile pas
    const prevOverflow = document.body.style.overflow
    if (window.innerWidth < 640) document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onEsc)
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  async function markRead(id: string) {
    if (userId) setNotifs(prev => prev.map(n => n._id === id && !n.readBy.includes(userId) ? { ...n, readBy: [...n.readBy, userId] } : n))
    await fetch('/api/client-enterprise/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => {})
  }

  async function markAllRead() {
    setMarkingAll(true)
    try {
      await fetch('/api/client-enterprise/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) })
      if (userId) setNotifs(prev => prev.map(n => n.readBy.includes(userId) ? n : { ...n, readBy: [...n.readBy, userId] }))
    } finally { setMarkingAll(false) }
  }

  async function dismiss(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setNotifs(prev => prev.filter(n => n._id !== id))
    await fetch('/api/client-enterprise/notifications', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => {})
  }

  function openNotif(n: Notif) {
    if (isUnread(n)) void markRead(n._id)
    if (n.actionUrl) {
      setOpen(false)
      router.push(n.actionUrl)
    }
  }

  const showPushOffer = push.supported && push.permission === 'default' && !pushHidden

  return (
    <div ref={ref} className="relative">
      <button onClick={() => { setOpen(v => !v); if (!open) fetchNotifs() }}
        className={`relative p-2 rounded-xl transition-colors ${open ? 'bg-emerald-50 text-emerald-700' : 'text-current opacity-80 hover:opacity-100 hover:bg-black/5'}`}
        aria-label={unreadCount ? `Notifications, ${unreadCount} non lues` : 'Notifications'} aria-expanded={open}>
        <Bell className="w-5 h-5" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="sm:hidden fixed inset-0 z-50 bg-stone-950/40" onClick={() => setOpen(false)} />
            <motion.div
              role="dialog" aria-label="Notifications"
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] flex flex-col rounded-t-3xl bg-white text-stone-900 shadow-2xl pb-[env(safe-area-inset-bottom)]
                sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-full sm:mt-2.5 sm:w-[400px] sm:max-h-[min(560px,80vh)] sm:rounded-2xl sm:border sm:border-stone-200">
              <div className="sm:hidden mx-auto mt-2 h-1 w-10 rounded-full bg-stone-300" />

              <div className="flex items-center justify-between px-5 pt-3 pb-3 sm:py-4 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold">Notifications</span>
                  {unreadCount > 0 && <span className="rounded-full bg-red-50 text-red-600 text-[11px] font-bold px-2 py-0.5">{unreadCount}</span>}
                </div>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} disabled={markingAll}
                      className="flex items-center gap-1 text-xs font-semibold text-emerald-700 px-2 py-1.5 rounded-lg hover:bg-emerald-50 disabled:opacity-50">
                      {markingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}Tout lire
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} aria-label="Fermer" className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100"><X className="w-5 h-5" /></button>
                </div>
              </div>

              <div className="flex gap-1.5 px-4 py-2.5 overflow-x-auto border-b border-stone-100 [scrollbar-width:none]">
                {CATEGORY_FILTERS.map(f => {
                  const n = f.id === 'all' ? 0 : notifs.filter(x => inFilter(x, f.id, isUnread(x)) && isUnread(x)).length
                  return (
                    <button key={f.id} onClick={() => setFilter(f.id)} aria-pressed={filter === f.id}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter === f.id ? 'bg-emerald-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
                      {f.label}{n > 0 && f.id !== 'unread' ? ` · ${n}` : ''}
                    </button>
                  )
                })}
              </div>

              {showPushOffer && (
                <div className="mx-4 mt-3 rounded-xl bg-emerald-50 px-3 py-2.5 flex items-center gap-3">
                  <BellRing className="w-5 h-5 text-emerald-700 flex-shrink-0" />
                  <p className="text-xs text-emerald-900 flex-1">Être prévenu sur cet appareil, même portail fermé (étape franchie, facture, intervention).</p>
                  <button onClick={() => push.requestPermission()} disabled={push.subscribing}
                    className="text-xs font-semibold text-white bg-emerald-700 rounded-lg px-2.5 py-1.5 disabled:opacity-50">
                    {push.subscribing ? '…' : 'Activer'}
                  </button>
                  <button onClick={() => { localStorage.setItem('portal-push-dismissed', '1'); setPushHidden(true) }} aria-label="Plus tard" className="text-emerald-700/60"><X className="w-4 h-4" /></button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto overscroll-contain">
                {loading && notifs.length === 0 ? (
                  <div className="py-12 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-stone-300" /></div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 gap-2 text-center px-6">
                    <Inbox className="w-10 h-10 text-stone-300" />
                    <p className="text-sm font-semibold text-stone-600">{filter === 'unread' ? 'Tout est lu' : 'Rien de nouveau'}</p>
                    <p className="text-xs text-stone-400">Les avancées de vos projets, devis, factures et interventions s&apos;afficheront ici.</p>
                  </div>
                ) : (
                  <ul>
                    {filtered.map(n => {
                      const tone = TYPE_TONE[n.type] ?? TYPE_TONE.info
                      const Icon = CATEGORY_ICON[n.metadata?.category || ''] || tone.icon
                      const unread = isUnread(n)
                      return (
                        <li key={n._id} className="border-t border-stone-100 first:border-t-0">
                          <div role="button" tabIndex={0}
                            onClick={() => openNotif(n)}
                            onKeyDown={e => { if (e.key === 'Enter') openNotif(n) }}
                            className={`group relative flex gap-3 px-4 py-3.5 cursor-pointer transition-colors ${unread ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'hover:bg-stone-50'}`}>
                            <span className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${tone.tone}`}><Icon className="w-[18px] h-[18px]" /></span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-sm leading-snug ${unread ? 'font-bold text-stone-900' : 'font-medium text-stone-600'}`}>{n.title}</p>
                                <span className="flex-shrink-0 text-[11px] text-stone-400 tabular-nums">{timeAgo(n.createdAt)}</span>
                              </div>
                              <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{n.message}</p>
                              {n.actionUrl && <span className="mt-1.5 inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-700">Ouvrir <ChevronRight className="w-3 h-3" /></span>}
                            </div>
                            {unread && <span className="absolute left-1.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden />}
                            <button onClick={e => dismiss(n._id, e)} aria-label="Supprimer la notification"
                              className="self-start p-1 rounded-lg text-stone-300 hover:text-red-500 hover:bg-red-50 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              <div className="border-t border-stone-100 px-5 py-3 flex items-center justify-between">
                <span className="text-[11px] text-stone-400">{filtered.length} notification{filtered.length > 1 ? 's' : ''}</span>
                <button onClick={() => { setOpen(false); router.push('/portail-entreprise/activite') }}
                  className="text-xs font-semibold text-stone-600 hover:text-emerald-700 flex items-center gap-1">
                  Toute l&apos;activité <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
