'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle, AlertCircle, ChevronRight, Loader2, Inbox, Filter, Trash2, Eye } from 'lucide-react'

type Notif = { _id: string; type: 'info'|'success'|'warning'|'error'; title: string; message: string; actionUrl?: string; createdAt: string; readBy: string[] }

const TYPE_CONFIG = {
  info:    { icon: Info,          iconBg: 'bg-blue-50 dark:bg-blue-900/30',    color: 'text-blue-600 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-800' },
  success: { icon: CheckCircle,   iconBg: 'bg-green-50 dark:bg-green-900/30',  color: 'text-green-600 dark:text-green-400', border: 'border-green-100 dark:border-green-800' },
  warning: { icon: AlertTriangle, iconBg: 'bg-amber-50 dark:bg-amber-900/30', color: 'text-amber-600 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-800' },
  error:   { icon: AlertCircle,   iconBg: 'bg-red-50 dark:bg-red-900/30',      color: 'text-red-600 dark:text-red-400', border: 'border-red-100 dark:border-red-800' },
}

const TABS = [{ id: 'all' as const, label: 'Toutes' }, { id: 'unread' as const, label: 'Non lues' }]

function timeAgo(d: string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (diff < 1) return "À l'instant"
  if (diff < 60) return `${diff} min`
  if (diff < 1440) return `${Math.floor(diff / 60)}h`
  if (diff < 10080) return `${Math.floor(diff / 1440)}j`
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function SkeletonRow() {
  return (
    <div className="flex gap-3 px-4 py-3.5 animate-pulse">
      <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-gray-100 dark:bg-slate-800" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-3.5 bg-gray-100 dark:bg-slate-800 rounded w-3/4" />
        <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded w-1/2" />
      </div>
    </div>
  )
}

export default function NotificationBell({ userId }: { userId?: string }) {
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [loading, setLoading] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const [filter, setFilter] = useState<'all'|'unread'>('all')
  const ref = useRef<HTMLDivElement>(null)

  const isUnread = useCallback((n: Notif) => userId ? !n.readBy.includes(userId) : n.readBy.length === 0, [userId])
  const unreadCount = notifs.filter(isUnread).length
  const filtered = filter === 'unread' ? notifs.filter(isUnread) : notifs

  const fetchNotifs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/client-enterprise/notifications')
      if (res.ok) setNotifs(await res.json())
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchNotifs(); const t = setInterval(fetchNotifs, 30000); return () => clearInterval(t) }, [fetchNotifs])

  useEffect(() => {
    function handleClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    function handleEsc(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    if (open) { document.addEventListener('mousedown', handleClick); document.addEventListener('keydown', handleEsc) }
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleEsc) }
  }, [open])

  async function markRead(id: string) {
    if (userId) {
      setNotifs(prev => prev.map(n => n._id === id ? { ...n, readBy: n.readBy.includes(userId) ? n.readBy : [...n.readBy, userId] } : n))
    }
    await fetch('/api/client-enterprise/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => {})
  }

  async function markAllRead() {
    setMarkingAll(true)
    try {
      await fetch('/api/client-enterprise/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) })
      if (userId) { setNotifs(prev => prev.map(n => ({ ...n, readBy: n.readBy.includes(userId) ? n.readBy : [...n.readBy, userId] }))) }
    } finally { setMarkingAll(false) }
  }

  async function dismiss(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setNotifs(prev => prev.filter(n => n._id !== id))
    await fetch('/api/client-enterprise/notifications', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => {})
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => { setOpen(v => !v); if (!open) fetchNotifs() }}
        className={`relative p-2 rounded-xl transition-all duration-200 ${open ? 'bg-green-50 dark:bg-green-900/20 text-green-600' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-700'}`}
        aria-label="Notifications">
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'animate-[ring_1.5s_ease-in-out_3]' : ''}`} />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 px-1 text-[10px] font-bold text-white leading-none ring-2 ring-white dark:ring-slate-900 shadow-sm">
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2.5 w-[400px] max-w-[calc(100vw-1.5rem)] z-50 rounded-2xl border border-gray-100 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.25)] dark:shadow-[0_20px_60px_-12px_rgba(0,0,0,0.5)] overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-violet-600 flex items-center justify-center shadow-sm">
                  <Bell className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">Notifications</span>
                  {unreadCount > 0 && <span className="ml-2 rounded-full bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold px-2 py-0.5">{unreadCount}</span>}
                </div>
              </div>
              {unreadCount > 0 && (
                <button onClick={markAllRead} disabled={markingAll}
                  className="flex items-center gap-1 text-[11px] text-green-600 hover:text-green-700 dark:text-green-400 font-semibold disabled:opacity-50 transition-colors px-2 py-1 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20">
                  {markingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCheck className="w-3 h-3" />}
                  Tout lire
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-1 px-5 py-2 border-b border-gray-50 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/20">
              <Filter className="w-3 h-3 text-gray-400 mr-1" />
              {TABS.map(t => (
                <button key={t.id} onClick={() => setFilter(t.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${filter === t.id ? 'bg-white dark:bg-slate-700 text-gray-800 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
                  {t.label}
                  {t.id === 'unread' && unreadCount > 0 && <span className="ml-1">({unreadCount})</span>}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="max-h-[420px] overflow-y-auto overscroll-contain">
              {loading && notifs.length === 0 ? (
                <div className="space-y-1 py-2">
                  <SkeletonRow /><SkeletonRow /><SkeletonRow />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center">
                    <Inbox className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                  </motion.div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Aucune notification</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Vous êtes à jour !</p>
                  </div>
                </div>
              ) : (
                <motion.ul initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.04 } } }}>
                  {filtered.map((n, i) => {
                    const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.info
                    const Icon = cfg.icon
                    const read = !isUnread(n)
                    return (
                      <motion.li key={n._id} variants={{ hidden: { opacity: 0, x: -12 }, visible: { opacity: 1, x: 0 } }}
                        className={`relative group cursor-pointer transition-all duration-150 ${i > 0 ? 'border-t border-gray-50 dark:border-slate-800/60' : ''} ${read ? 'hover:bg-gray-50/70 dark:hover:bg-slate-800/40' : 'bg-blue-50/30 dark:bg-blue-900/[0.03] hover:bg-blue-50/60 dark:hover:bg-blue-900/[0.06]'}`}
                        onClick={() => !read && markRead(n._id)}>
                        {!read && <span className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/30" />}
                        <div className="flex gap-3 px-4 py-3.5 pl-7">
                          <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${cfg.iconBg} border ${cfg.border}`}>
                            <Icon className={`w-4.5 h-4.5 ${cfg.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm font-bold leading-snug ${read ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>{n.title}</p>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className="text-[10px] text-gray-400 whitespace-nowrap font-medium">{timeAgo(n.createdAt)}</span>
                                <button onClick={e => dismiss(n._id, e)} title="Supprimer"
                                  className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">{n.message}</p>
                            {n.actionUrl && (
                              <Link href={n.actionUrl} onClick={() => { setOpen(false); markRead(n._id) }}
                                className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-green-600 dark:text-green-400 hover:text-green-700 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg transition-colors">
                                Voir le détail <ChevronRight className="w-3 h-3" />
                              </Link>
                            )}
                          </div>
                        </div>
                      </motion.li>
                    )
                  })}
                </motion.ul>
              )}
            </div>

            {/* Footer */}
            {notifs.length > 0 && (
              <div className="border-t border-gray-50 dark:border-slate-800 px-5 py-2.5 bg-gray-50/60 dark:bg-slate-800/20 flex items-center justify-between">
                <span className="text-[10px] text-gray-400">{filtered.length} sur {notifs.length}</span>
                <Link href="/portail-entreprise/activite" onClick={() => setOpen(false)}
                  className="text-[11px] text-gray-500 hover:text-green-600 dark:hover:text-green-400 font-semibold transition-colors flex items-center gap-1">
                  Voir toute l'activité <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
