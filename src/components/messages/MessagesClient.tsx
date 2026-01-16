'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { initSocket, onConversationNewMessage } from '@/lib/socket-client'
import { useCsrf } from '@/hooks/useCsrf'
import { decodeJwtPayload } from './jwt'

type ConversationSummary = {
  id: string
  type: 'direct' | 'group'
  title?: string
  participants: Array<{ id: string; name: string; role: string; avatarUrl?: string }>
  lastMessageAt: string | null
  lastMessageText: string | null
  lastMessageSenderId: string | null
  updatedAt: string
  createdAt: string
}

type UserSearchResult = {
  id: string
  name: string
  role: string
  email: string
  avatarUrl?: string
}

function normalizeRole(role: string | undefined): string {
  return String(role || '').toUpperCase()
}

function getConversationTitle(convo: ConversationSummary, currentUserId: string | null): string {
  if (convo.title) return convo.title
  const others = convo.participants.filter(p => p.id !== currentUserId)
  if (others.length === 1) return others[0].name
  if (others.length > 1) return others.map(o => o.name).join(', ')
  return 'Conversation'
}

export default function MessagesClient() {
  const router = useRouter()
  const { fetchWithCsrf } = useCsrf()

  const [token, setToken] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string>('')

  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const searchAbortRef = useRef<AbortController | null>(null)

  const isAdmin = useMemo(() => ['ADMIN', 'SUPER_ADMIN'].includes(normalizeRole(currentUserRole)), [currentUserRole])

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null
    if (!t) {
      setLoading(false)
      setError('Vous devez être connecté pour accéder à la messagerie.')
      return
    }
    setToken(t)
    const payload = decodeJwtPayload(t)
    const uid = payload?.userId || payload?.id
    setCurrentUserId(uid ? String(uid) : null)
    setCurrentUserRole(normalizeRole(payload?.role))

    try {
      initSocket(t)
    } catch {
      // ignore; UI can still function without realtime
    }
  }, [])

  async function loadConversations(authToken: string) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/messages/conversations', {
        method: 'GET',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Impossible de charger les conversations')
      }

      const data = await res.json()
      setConversations(Array.isArray(data.conversations) ? data.conversations : [])
    } catch (e: any) {
      setError(e?.message || 'Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!token) return
    loadConversations(token)

    const cleanup = onConversationNewMessage((evt) => {
      // Update list ordering + preview on incoming message
      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === evt.conversationId)
        if (idx === -1) return prev
        const updated = {
          ...prev[idx],
          lastMessageAt: String(evt.message.createdAt),
          lastMessageText: evt.message.text,
          lastMessageSenderId: evt.message.senderId,
          updatedAt: String(evt.timestamp)
        }
        const next = prev.slice()
        next.splice(idx, 1)
        return [updated, ...next]
      })
    })

    return () => cleanup()
  }, [token])

  useEffect(() => {
    if (!isAdmin || !token) return

    const q = search.trim()
    if (q.length < 2) {
      setSearchResults([])
      return
    }

    setSearchLoading(true)
    searchAbortRef.current?.abort()
    const controller = new AbortController()
    searchAbortRef.current = controller

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/messages/users/search?q=${encodeURIComponent(q)}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${token}`
          },
          signal: controller.signal
        })

        if (!res.ok) {
          setSearchResults([])
          return
        }

        const data = await res.json().catch(() => ({}))
        setSearchResults(Array.isArray(data.users) ? data.users : [])
      } catch {
        // ignore
      } finally {
        setSearchLoading(false)
      }
    }, 250)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [search, isAdmin, token])

  async function startDirectConversation(otherUserId: string) {
    if (!token) return
    setError(null)
    try {
      const res = await fetchWithCsrf('/api/messages/conversations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ type: 'direct', participantIds: [otherUserId] })
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Impossible de créer la conversation')
      }

      const conversationId = data?.conversation?.id
      if (conversationId) {
        await loadConversations(token)
        router.push(`/messages/${conversationId}`)
      }
    } catch (e: any) {
      setError(e?.message || 'Erreur lors de la création')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Messagerie</h1>
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
            Retour
          </Link>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {isAdmin && (
          <div className="mt-6 rounded-xl border bg-white p-4">
            <div className="text-sm font-medium text-gray-900">Démarrer une conversation</div>
            <div className="mt-3 flex gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un utilisateur (nom / email)"
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            {searchLoading && (
              <div className="mt-2 text-xs text-gray-500">Recherche…</div>
            )}
            {searchResults.length > 0 && (
              <div className="mt-3 divide-y rounded-lg border">
                {searchResults.map(u => (
                  <button
                    key={u.id}
                    onClick={() => startDirectConversation(u.id)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900">{u.name}</div>
                      <div className="text-xs text-gray-500">{u.email} · {u.role}</div>
                    </div>
                    <div className="text-xs text-blue-600">Ouvrir</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 rounded-xl border bg-white">
          <div className="border-b px-4 py-3 text-sm font-medium text-gray-900">Conversations</div>

          {loading ? (
            <div className="px-4 py-6 text-sm text-gray-600">Chargement…</div>
          ) : conversations.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-600">Aucune conversation.</div>
          ) : (
            <div className="divide-y">
              {conversations.map(c => (
                <Link
                  key={c.id}
                  href={`/messages/${c.id}`}
                  className="block px-4 py-3 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-gray-900">
                        {getConversationTitle(c, currentUserId)}
                      </div>
                      <div className="truncate text-xs text-gray-500">
                        {c.lastMessageText ? c.lastMessageText : '—'}
                      </div>
                    </div>
                    <div className="shrink-0 text-xs text-gray-500">
                      {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleString() : ''}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
