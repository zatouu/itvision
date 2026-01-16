'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, MessageCircle, Send, ShieldAlert } from 'lucide-react'

type ChatMessage = {
  id: string
  groupId: string
  authorType: 'participant' | 'admin'
  authorParticipantId: string | null
  authorName: string
  text: string
  createdAt: string
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

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [text, setText] = useState('')

  const bottomRef = useRef<HTMLDivElement | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const pollingRef = useRef<number | null>(null)
  const lastCreatedAtRef = useRef<string | null>(null)
  const seenIdsRef = useRef<Set<string>>(new Set())
  const [liveMode, setLiveMode] = useState<'sse' | 'polling'>('polling')

  const canChat = useMemo(() => !!token, [token])

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

      const nextMessages: ChatMessage[] = Array.isArray(data.messages) ? data.messages : []
      setMessages(nextMessages)
      seenIdsRef.current = new Set(nextMessages.map(m => m.id))
      lastCreatedAtRef.current = nextMessages.length ? nextMessages[nextMessages.length - 1].createdAt : null
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
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
    setLiveMode('polling')
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
    setLiveMode('sse')

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
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      } catch {
        // ignore malformed events
      }
    }

    es.addEventListener('ready', onReady)
    es.addEventListener('chat-message', onChatMessage as any)

    es.onerror = () => {
      // If SSE fails (proxy buffering, network, 403, etc), fallback to polling
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
    if (!token) return
    const trimmed = text.trim()
    if (!trimmed) return

    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/group-orders/${encodeURIComponent(groupId)}/chat/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed, token })
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Impossible d\'envoyer le message')
      }

      if (data.message) {
        setMessages(prev => [...prev, data.message])
      }
      setText('')
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } catch (e: any) {
      setError(e?.message || 'Erreur envoi')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-emerald-600" />
          Chat du groupe
        </h3>
        <div className="text-xs text-gray-500">{liveMode === 'sse' ? 'Temps réel (SSE)' : 'Rafraîchi automatiquement'}</div>
      </div>

      {!canChat && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
          <ShieldAlert className="w-5 h-5 mt-0.5" />
          <div>
            <div className="font-semibold">Accès au chat</div>
            <div>Rejoignez cet achat groupé pour activer le chat sur cet appareil.</div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="h-72 overflow-auto rounded-xl border bg-gray-50 p-3">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-600">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement…
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-gray-600">
            Aucun message pour le moment.
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map(m => {
              const mine = !!myParticipantId && m.authorParticipantId === myParticipantId
              return (
                <div key={m.id} className={mine ? 'flex justify-end' : 'flex justify-start'}>
                  <div className={mine ? 'max-w-[85%] rounded-2xl bg-emerald-600 px-3 py-2 text-sm text-white' : 'max-w-[85%] rounded-2xl bg-white px-3 py-2 text-sm text-gray-900 border'}>
                    <div className={mine ? 'text-xs text-emerald-100' : 'text-xs text-gray-500'}>
                      {m.authorName}{m.authorType === 'admin' ? ' (Admin)' : ''}
                    </div>
                    <div className="whitespace-pre-wrap">{m.text}</div>
                    <div className={mine ? 'mt-1 text-[10px] text-emerald-100' : 'mt-1 text-[10px] text-gray-500'}>
                      {new Date(m.createdAt).toLocaleString('fr-FR')}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
          placeholder={canChat ? 'Écrire un message…' : 'Rejoignez le groupe pour écrire…'}
          className="w-full rounded-lg border px-3 py-2 text-sm"
          disabled={!canChat || sending}
        />
        <button
          onClick={send}
          disabled={!canChat || sending}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          Envoyer
        </button>
      </div>
      <div className="mt-1 text-xs text-gray-500">Entrée pour envoyer · Shift+Entrée pour sauter une ligne</div>
    </div>
  )
}
