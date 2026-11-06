'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Loader2, MessageCircle, RefreshCw, Send, ShieldAlert } from 'lucide-react'

type ChatMessage = {
  id: string
  groupId: string
  authorType: 'participant' | 'admin'
  authorParticipantId: string | null
  authorName: string
  text: string
  createdAt: string
}

type ChatMode = 'participant' | 'admin' | 'none'

type ConnectionState =
  | { mode: 'sse'; state: 'connecting' | 'live' | 'error' }
  | { mode: 'polling'; state: 'live' }
  | { mode: 'idle'; state: 'idle' }

function formatTime(date: string) {
  try {
    return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(date))
  } catch {
    return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }
}

function formatDay(date: string) {
  try {
    return new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(date))
  } catch {
    return new Date(date).toLocaleDateString('fr-FR')
  }
}

function sameDay(a: string, b: string) {
  const da = new Date(a)
  const db = new Date(b)
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  )
}

function getTokenKey(groupId: string) {
  return `group-chat-token:${groupId}`
}

function getParticipantIdKey(groupId: string) {
  return `group-chat-participant-id:${groupId}`
}

export function saveGroupChatAccess(groupId: string, token: string, participantId: string | null) {
  try {
    localStorage.setItem(getTokenKey(groupId), token)
    if (participantId) localStorage.setItem(getParticipantIdKey(groupId), participantId)
  } catch {
    // ignore
  }
}

export default function GroupOrderChat({ groupId }: { groupId: string }) {
  const [token, setToken] = useState<string | null>(null)
  const [myParticipantId, setMyParticipantId] = useState<string | null>(null)

  const [chatMode, setChatMode] = useState<ChatMode>('none')

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [text, setText] = useState('')

  const [connection, setConnection] = useState<ConnectionState>({ mode: 'idle', state: 'idle' })
  const [hasNewWhileScrolledUp, setHasNewWhileScrolledUp] = useState(false)

  const listRef = useRef<HTMLDivElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const pollingRef = useRef<number | null>(null)
  const lastCreatedAtRef = useRef<string | null>(null)
  const seenIdsRef = useRef<Set<string>>(new Set())

  const isNearBottomRef = useRef(true)

  const canChat = useMemo(() => chatMode === 'participant' || chatMode === 'admin', [chatMode])

  useEffect(() => {
    try {
      const t = localStorage.getItem(getTokenKey(groupId))
      const pid = localStorage.getItem(getParticipantIdKey(groupId))
      setToken(t)
      setMyParticipantId(pid)
    } catch {
      setToken(null)
      setMyParticipantId(null)
    }
  }, [groupId])

  useEffect(() => {
    if (token) {
      setChatMode('participant')
      return
    }
    // No token: might still be admin via cookies.
    setChatMode('none')
  }, [token])

  function scrollToBottom(behavior: ScrollBehavior = 'smooth') {
    setHasNewWhileScrolledUp(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior }), 10)
  }

  function updateIsNearBottom() {
    const el = listRef.current
    if (!el) return
    const thresholdPx = 80
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < thresholdPx
    isNearBottomRef.current = near
    if (near) setHasNewWhileScrolledUp(false)
  }

  async function fetchMessages(currentToken: string | null) {
    try {
      setError(null)
      const url = currentToken
        ? `/api/group-orders/${encodeURIComponent(groupId)}/chat/messages?token=${encodeURIComponent(currentToken)}&limit=200`
        : `/api/group-orders/${encodeURIComponent(groupId)}/chat/messages?limit=200`

      const res = await fetch(url, { method: 'GET', credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Impossible de charger le chat')
      }

      // If we can read without token, assume admin session.
      if (!currentToken && chatMode !== 'participant') {
        setChatMode('admin')
      }

      const nextMessages: ChatMessage[] = Array.isArray(data.messages) ? data.messages : []
      setMessages(nextMessages)
      seenIdsRef.current = new Set(nextMessages.map(m => m.id))
      lastCreatedAtRef.current = nextMessages.length ? nextMessages[nextMessages.length - 1].createdAt : null
      scrollToBottom('auto')
    } catch (e: any) {
      setError(e?.message || 'Erreur chargement chat')
    } finally {
      setLoading(false)
    }
  }

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  function startPolling(currentToken: string | null) {
    stopPolling()
    setConnection({ mode: 'polling', state: 'live' })
    pollingRef.current = window.setInterval(() => {
      fetchMessages(currentToken)
    }, 2500)
  }

  function stopSse() {
    if (eventSourceRef.current) {
      try {
        eventSourceRef.current.close()
      } catch {
        // ignore
      }
      eventSourceRef.current = null
    }
  }

  function startSse(currentToken: string | null) {
    stopSse()

    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      startPolling(currentToken)
      return
    }

    const since = lastCreatedAtRef.current || new Date().toISOString()
    const base = `/api/group-orders/${encodeURIComponent(groupId)}/chat/stream?since=${encodeURIComponent(since)}`
    const url = currentToken ? `${base}&token=${encodeURIComponent(currentToken)}` : base

    const es = new EventSource(url)
    eventSourceRef.current = es
    setConnection({ mode: 'sse', state: 'connecting' })

    es.onopen = () => {
      setConnection({ mode: 'sse', state: 'live' })
    }

    const onReady = () => {
      stopPolling()
    }

    const onChatMessage = (evt: MessageEvent) => {
      try {
        const msg = JSON.parse(String(evt.data || 'null')) as ChatMessage
        if (!msg || !msg.id) return

        if (seenIdsRef.current.has(msg.id)) return
        seenIdsRef.current.add(msg.id)
        lastCreatedAtRef.current = msg.createdAt

        setMessages(prev => [...prev, msg])
        if (isNearBottomRef.current) {
          scrollToBottom('smooth')
        } else {
          setHasNewWhileScrolledUp(true)
        }
      } catch {
        // ignore malformed events
      }
    }

    es.addEventListener('ready', onReady)
    es.addEventListener('chat-message', onChatMessage as any)

    es.onerror = () => {
      // If SSE fails (proxy buffering, network, 403, etc), fallback to polling
      setConnection({ mode: 'sse', state: 'error' })
      stopSse()
      startPolling(currentToken)
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchMessages(token)

    // Prefer SSE, fallback to polling
    startSse(token)

    return () => {
      stopSse()
      stopPolling()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, token])

  async function send() {
    if (!canChat) return
    const trimmed = text.trim()
    if (!trimmed) return

    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/group-orders/${encodeURIComponent(groupId)}/chat/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatMode === 'participant' ? { text: trimmed, token } : { text: trimmed })
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Impossible d\'envoyer le message')
      }

      if (data.message) {
        setMessages(prev => [...prev, data.message])
      }
      setText('')
      scrollToBottom('smooth')
    } catch (e: any) {
      setError(e?.message || 'Erreur envoi')
    } finally {
      setSending(false)
    }
  }

  const grouped = useMemo(() => {
    const result: Array<{ type: 'day'; day: string } | { type: 'msg'; msg: ChatMessage }> = []
    let lastDay: string | null = null
    for (const m of messages) {
      const day = m.createdAt
      if (!lastDay || !sameDay(lastDay, day)) {
        result.push({ type: 'day', day })
        lastDay = day
      }
      result.push({ type: 'msg', msg: m })
    }
    return result
  }, [messages])

  const connectionLabel = useMemo(() => {
    if (connection.mode === 'idle') return 'Hors ligne'
    if (connection.mode === 'polling') return 'Rafraîchissement auto'
    if (connection.state === 'connecting') return 'Connexion…'
    if (connection.state === 'error') return 'Connexion instable'
    return 'Temps réel'
  }, [connection])

  const connectionDot = useMemo(() => {
    if (connection.mode === 'idle') return 'bg-gray-300'
    if (connection.mode === 'polling') return 'bg-amber-400'
    if (connection.state === 'connecting') return 'bg-blue-300'
    if (connection.state === 'error') return 'bg-red-400'
    return 'bg-emerald-400'
  }, [connection])

  return (
    <div className="bg-white rounded-2xl border shadow-lg overflow-hidden">
      <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-blue-600 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Chat du groupe
            </h3>
            <div className="mt-1 flex items-center gap-2 text-xs text-white/90">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${connectionDot}`} />
              <span>{connectionLabel}</span>
              {chatMode === 'admin' && <span className="rounded-full bg-white/20 px-2 py-0.5 font-semibold">Admin</span>}
            </div>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-xs font-semibold hover:bg-white/20"
            onClick={() => {
              setLoading(true)
              fetchMessages(token)
              startSse(token)
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Reconnecter
          </button>
        </div>
      </div>

      {!canChat && (
        <div className="m-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
          <ShieldAlert className="w-5 h-5 mt-0.5" />
          <div>
            <div className="font-semibold">Accès au chat</div>
            <div>Rejoignez cet achat groupé pour activer le chat sur cet appareil.</div>
          </div>
        </div>
      )}

      {error && (
        <div className="mx-6 mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 mt-0.5" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      <div
        ref={listRef}
        onScroll={updateIsNearBottom}
        className="relative h-80 overflow-auto bg-gradient-to-b from-gray-50 to-white px-4 py-4"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-600">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement…
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-600">
            Aucun message pour le moment.
          </div>
        ) : (
          <div className="space-y-3">
            {grouped.map((item, idx) => {
              if (item.type === 'day') {
                return (
                  <div key={`day-${idx}`} className="flex items-center justify-center">
                    <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-700">
                      {formatDay(item.day)}
                    </span>
                  </div>
                )
              }

              const m = item.msg
              const mine = chatMode === 'participant' && !!myParticipantId && m.authorParticipantId === myParticipantId
              const isAdminAuthor = m.authorType === 'admin'
              const align = mine ? 'justify-end' : 'justify-start'

              const bubbleBase = 'max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm'
              const bubble = mine
                ? `${bubbleBase} bg-emerald-600 text-white`
                : isAdminAuthor
                ? `${bubbleBase} bg-purple-600 text-white`
                : `${bubbleBase} bg-white text-gray-900 border`

              return (
                <div key={m.id} className={`flex ${align}`}>
                  <div className={bubble}>
                    <div className="flex items-center justify-between gap-3">
                      <div className={mine || isAdminAuthor ? 'text-xs text-white/80' : 'text-xs text-gray-500'}>
                        <span className="font-semibold">{m.authorName}</span>
                        {isAdminAuthor && <span className="ml-2 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold">ADMIN</span>}
                      </div>
                      <div className={mine || isAdminAuthor ? 'text-[10px] text-white/70' : 'text-[10px] text-gray-400'}>
                        {formatTime(m.createdAt)}
                      </div>
                    </div>
                    <div className="mt-1 whitespace-pre-wrap leading-relaxed">{m.text}</div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}

        {hasNewWhileScrolledUp && (
          <div className="sticky bottom-3 flex justify-center">
            <button
              type="button"
              onClick={() => scrollToBottom('smooth')}
              className="rounded-full bg-gray-900 px-4 py-2 text-xs font-semibold text-white shadow-lg"
            >
              Nouveaux messages
            </button>
          </div>
        )}
      </div>

      <div className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder={canChat ? 'Écrire un message…' : 'Rejoignez le groupe pour écrire…'}
            className="w-full resize-none rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
            rows={2}
            disabled={!canChat || sending}
          />
        <button
          onClick={send}
          disabled={!canChat || sending}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? 'Envoi…' : 'Envoyer'}
        </button>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <div>Entrée pour envoyer · Shift+Entrée pour sauter une ligne</div>
          {connection.mode === 'polling' && (
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              Mode dégradé
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
