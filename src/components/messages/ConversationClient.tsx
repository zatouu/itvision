'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { initSocket, onConversationNewMessage } from '@/lib/socket-client'
import { useCsrf } from '@/hooks/useCsrf'
import { decodeJwtPayload } from './jwt'

type Conversation = {
  id: string
  type: 'direct' | 'group'
  title?: string
  participants: Array<{ id: string; name: string; role: string; avatarUrl?: string }>
}

type Message = {
  id: string
  conversationId: string
  senderId: string
  senderRole: string
  text: string
  createdAt: string
}

function getConversationTitle(convo: Conversation | null, currentUserId: string | null): string {
  if (!convo) return 'Conversation'
  if (convo.title) return convo.title
  const others = convo.participants.filter(p => p.id !== currentUserId)
  if (others.length === 1) return others[0].name
  if (others.length > 1) return others.map(o => o.name).join(', ')
  return 'Conversation'
}

export default function ConversationClient({ conversationId }: { conversationId: string }) {
  const router = useRouter()
  const { fetchWithCsrf } = useCsrf()

  const [token, setToken] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const title = useMemo(() => getConversationTitle(conversation, currentUserId), [conversation, currentUserId])

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null
    if (!t) {
      setLoading(false)
      setError('Vous devez être connecté.')
      return
    }
    setToken(t)
    const payload = decodeJwtPayload(t)
    const uid = payload?.userId || payload?.id
    setCurrentUserId(uid ? String(uid) : null)

    try {
      initSocket(t)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (!token) return

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const convoRes = await fetch(`/api/messages/conversations/${conversationId}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        const convoData = await convoRes.json().catch(() => ({}))
        if (!convoRes.ok) throw new Error(convoData.error || 'Conversation introuvable')
        setConversation(convoData.conversation)

        const msgRes = await fetch(`/api/messages/conversations/${conversationId}/messages?limit=100`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        const msgData = await msgRes.json().catch(() => ({}))
        if (!msgRes.ok) throw new Error(msgData.error || 'Impossible de charger les messages')
        setMessages(Array.isArray(msgData.messages) ? msgData.messages : [])
      } catch (e: any) {
        setError(e?.message || 'Erreur')
      } finally {
        setLoading(false)
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      }
    }

    load()
  }, [token, conversationId])

  useEffect(() => {
    const cleanup = onConversationNewMessage((evt) => {
      if (evt.conversationId !== conversationId) return
      setMessages(prev => {
        if (prev.some(m => m.id === evt.message.id)) return prev
        return [...prev, {
          id: evt.message.id,
          conversationId: evt.conversationId,
          senderId: evt.message.senderId,
          senderRole: evt.message.senderRole,
          text: evt.message.text,
          createdAt: String(evt.message.createdAt)
        }]
      })
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    })

    return () => cleanup()
  }, [conversationId])

  async function send() {
    if (!token) return
    const trimmed = text.trim()
    if (!trimmed) return

    setSending(true)
    setError(null)
    try {
      const res = await fetchWithCsrf(`/api/messages/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text: trimmed })
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Impossible d\'envoyer le message')

      const created = data.message
      setMessages(prev => [...prev, created])
      setText('')
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } catch (e: any) {
      setError(e?.message || 'Erreur envoi')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto flex max-w-5xl flex-col px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500">
              <button onClick={() => router.push('/messages')} className="hover:underline">Messagerie</button>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          </div>
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">Retour</Link>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="mt-4 flex-1 rounded-xl border bg-white">
          {loading ? (
            <div className="px-4 py-6 text-sm text-gray-600">Chargement…</div>
          ) : (
            <div className="max-h-[70vh] overflow-auto px-4 py-4">
              {messages.length === 0 ? (
                <div className="text-sm text-gray-600">Aucun message.</div>
              ) : (
                <div className="space-y-2">
                  {messages.map(m => {
                    const mine = currentUserId && m.senderId === currentUserId
                    return (
                      <div key={m.id} className={mine ? 'flex justify-end' : 'flex justify-start'}>
                        <div className={
                          mine
                            ? 'max-w-[80%] rounded-2xl bg-blue-600 px-3 py-2 text-sm text-white'
                            : 'max-w-[80%] rounded-2xl bg-gray-100 px-3 py-2 text-sm text-gray-900'
                        }>
                          <div className="whitespace-pre-wrap">{m.text}</div>
                          <div className={mine ? 'mt-1 text-[10px] text-blue-100' : 'mt-1 text-[10px] text-gray-500'}>
                            {new Date(m.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>
          )}

          <div className="border-t p-3">
            <div className="flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
                placeholder="Écrire un message…"
                className="w-full rounded-lg border px-3 py-2 text-sm"
                disabled={sending}
              />
              <button
                onClick={send}
                disabled={sending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Envoyer
              </button>
            </div>
            <div className="mt-1 text-xs text-gray-500">Entrée pour envoyer · Shift+Entrée pour sauter une ligne</div>
          </div>
        </div>
      </div>
    </div>
  )
}
