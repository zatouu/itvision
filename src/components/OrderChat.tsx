'use client'

import { useEffect, useState, useRef, FormEvent } from 'react'
import { Send, MessageCircle, Loader2, User, Headphones } from 'lucide-react'

interface ChatMessage {
  _id: string
  senderRole: 'client' | 'admin' | 'system'
  senderName?: string
  text: string
  createdAt: string
}

interface OrderChatProps {
  orderReference: string
  token?: string | null
}

export default function OrderChat({ orderReference, token }: OrderChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const fetchMessages = async () => {
    try {
      const url = `/api/order-chat?orderReference=${encodeURIComponent(orderReference)}${token ? `&token=${encodeURIComponent(token)}` : ''}`
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setMessages(data.messages || [])
      setError(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 8000)
    return () => clearInterval(interval)
  }, [orderReference, token])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/order-chat${token ? `?token=${encodeURIComponent(token)}` : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderReference, text: text.trim(), token })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setMessages(prev => [...prev, data.message])
      setText('')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-emerald-600" />
        <h3 className="font-semibold text-gray-900">Discussion avec le support</h3>
      </div>

      <div className="h-80 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {loading && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            Aucun message. Posez votre question ici.
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderRole === 'client'
          return (
            <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${isMe ? 'bg-emerald-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  {msg.senderRole === 'admin' ? <Headphones className="h-3 w-3" /> : <User className="h-3 w-3" />}
                  <span className="text-xs font-medium opacity-90">{msg.senderName || (isMe ? 'Vous' : 'Support')}</span>
                </div>
                <p className="whitespace-pre-line">{msg.text}</p>
                <span className={`text-[10px] block mt-1 ${isMe ? 'text-emerald-100' : 'text-gray-400'}`}>
                  {formatTime(msg.createdAt)}
                </span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="px-4 py-2 text-xs text-red-600 bg-red-50">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-100 bg-white flex gap-2">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Écrire un message..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          maxLength={2000}
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="bg-emerald-600 text-white rounded-lg px-3 py-2 hover:bg-emerald-700 disabled:bg-gray-300 transition"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  )
}
