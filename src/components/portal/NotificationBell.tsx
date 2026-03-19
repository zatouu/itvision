'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  Bell, CheckCheck, Info, AlertTriangle, CheckCircle,
  AlertCircle, ChevronRight, Loader2, Inbox
} from 'lucide-react'

type Notif = {
  _id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  actionUrl?: string
  createdAt: string
  readBy: string[]
}

const TYPE_CONFIG = {
  info:    { icon: Info,          iconBg: 'bg-blue-100 dark:bg-blue-900/40',    color: 'text-blue-600 dark:text-blue-400' },
  success: { icon: CheckCircle,   iconBg: 'bg-green-100 dark:bg-green-900/40',  color: 'text-green-600 dark:text-green-400' },
  warning: { icon: AlertTriangle, iconBg: 'bg-orange-100 dark:bg-orange-900/40',color: 'text-orange-600 dark:text-orange-400' },
  error:   { icon: AlertCircle,   iconBg: 'bg-red-100 dark:bg-red-900/40',      color: 'text-red-600 dark:text-red-400' },
}

function timeAgo(d: string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
  if (diff < 1) return "À l'instant"
  if (diff < 60) return `${diff} min`
  if (diff < 1440) return `${Math.floor(diff / 60)}h`
  if (diff < 10080) return `${Math.floor(diff / 1440)}j`
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export default function NotificationBell({ userId }: { userId?: string }) {
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [loading, setLoading] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const unreadCount = notifs.filter(n =>
    userId ? !n.readBy.includes(userId) : n.readBy.length === 0
  ).length

  const fetchNotifs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/client-enterprise/notifications')
      if (res.ok) setNotifs(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifs()
    const t = setInterval(fetchNotifs, 30000)
    return () => clearInterval(t)
  }, [fetchNotifs])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function markRead(id: string) {
    if (userId) {
      setNotifs(prev => prev.map(n =>
        n._id === id ? { ...n, readBy: n.readBy.includes(userId) ? n.readBy : [...n.readBy, userId] } : n
      ))
    }
    await fetch('/api/client-enterprise/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    }).catch(() => {})
  }

  async function markAllRead() {
    setMarkingAll(true)
    try {
      await fetch('/api/client-enterprise/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true })
      })
      if (userId) {
        setNotifs(prev => prev.map(n => ({
          ...n,
          readBy: n.readBy.includes(userId) ? n.readBy : [...n.readBy, userId]
        })))
      }
    } finally {
      setMarkingAll(false)
    }
  }

  async function dismiss(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setNotifs(prev => prev.filter(n => n._id !== id))
    await fetch('/api/client-enterprise/notifications', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    }).catch(() => {})
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen(v => !v); if (!open) fetchNotifs() }}
        className={`relative p-2 rounded-xl transition-all duration-150 ${
          open
            ? 'bg-green-50 dark:bg-green-900/20 text-green-600'
            : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'
        }`}
        aria-label="Notifications"
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'animate-[ring_1.5s_ease-in-out_3]' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none ring-2 ring-white dark:ring-slate-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] max-w-[calc(100vw-1.5rem)] z-50 rounded-2xl border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-500 to-violet-600 flex items-center justify-center">
                <Bell className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-[11px] font-semibold px-2 py-0.5">
                  {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={markingAll}
                className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 dark:text-green-400 font-medium disabled:opacity-50 transition-colors"
              >
                {markingAll
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <CheckCheck className="w-3 h-3" />
                }
                Tout marquer lu
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[440px] overflow-y-auto overscroll-contain">
            {loading && notifs.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
              </div>
            ) : notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                  <Inbox className="w-7 h-7 text-gray-300 dark:text-gray-600" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Aucune notification</p>
                  <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">Vous êtes à jour !</p>
                </div>
              </div>
            ) : (
              <ul>
                {notifs.map((n, i) => {
                  const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.info
                  const Icon = cfg.icon
                  const isRead = userId ? n.readBy.includes(userId) : n.readBy.length > 0

                  return (
                    <li
                      key={n._id}
                      className={`relative group cursor-pointer transition-colors ${
                        i > 0 ? 'border-t border-gray-50 dark:border-slate-800' : ''
                      } ${
                        isRead
                          ? 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
                          : 'bg-blue-50/40 dark:bg-blue-900/5 hover:bg-blue-50/70 dark:hover:bg-blue-900/10'
                      }`}
                      onClick={() => !isRead && markRead(n._id)}
                    >
                      {/* Unread indicator */}
                      {!isRead && (
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                      )}

                      <div className="flex gap-3 px-4 py-3.5 pl-6">
                        <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${cfg.iconBg}`}>
                          <Icon className={`w-4 h-4 ${cfg.color}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1.5">
                            <p className={`text-sm font-semibold leading-snug ${isRead ? 'text-gray-600 dark:text-gray-300' : 'text-gray-900 dark:text-white'}`}>
                              {n.title}
                            </p>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className="text-[10px] text-gray-400 whitespace-nowrap">{timeAgo(n.createdAt)}</span>
                              <button
                                onClick={e => dismiss(n._id, e)}
                                className="opacity-0 group-hover:opacity-100 w-4 h-4 rounded flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
                                title="Supprimer"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
                            {n.message}
                          </p>
                          {n.actionUrl && (
                            <Link
                              href={n.actionUrl}
                              onClick={() => { setOpen(false); markRead(n._id) }}
                              className="mt-1.5 inline-flex items-center gap-0.5 text-xs font-medium text-green-600 dark:text-green-400 hover:text-green-700"
                            >
                              Voir le détail <ChevronRight className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          {notifs.length > 0 && (
            <div className="border-t border-gray-100 dark:border-slate-800 px-4 py-2.5 bg-gray-50 dark:bg-slate-800/30">
              <Link
                href="/portail-entreprise/activite"
                onClick={() => setOpen(false)}
                className="text-xs text-gray-500 hover:text-green-600 dark:hover:text-green-400 font-medium transition-colors flex items-center gap-1"
              >
                Voir toute l'activité <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
