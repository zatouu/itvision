'use client'

import { useState, useEffect, useRef } from 'react'
import {
  X, Send, Paperclip, User, Clock, CheckCircle2, Loader2,
  AlertCircle, FileText, Wifi
} from 'lucide-react'
import { 
  joinTicket, 
  leaveTicket, 
  startTyping, 
  stopTyping, 
  onNewMessage, 
  onUserTyping,
  isConnected 
} from '@/lib/socket-client'

interface Message {
  authorId: string
  authorName?: string
  authorRole: string
  message: string
  createdAt: string
  isStaff?: boolean
  internal?: boolean
}

interface Ticket {
  _id: string
  ticketNumber: string
  title: string
  description: string
  status: string
  priority: string
  category: string
  messages: Message[]
  createdAt: string
}

interface TicketChatModalProps {
  ticket: Ticket | null
  isOpen: boolean
  onClose: () => void
  onRefresh?: () => void
}

export default function TicketChatModal({ ticket, isOpen, onClose, onRefresh }: TicketChatModalProps) {
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userTyping, setUserTyping] = useState<string | null>(null)
  const [liveMessages, setLiveMessages] = useState<Message[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [isOpen, ticket?.messages, liveMessages])

  // 🔌 Socket.io - Rejoindre le ticket
  useEffect(() => {
    if (!isOpen || !ticket?._id || !isConnected()) return

    console.log(`🎫 Rejoindre ticket: ${ticket._id}`)
    joinTicket(ticket._id)

    // Écouter les nouveaux messages en temps réel
    const cleanupNewMessage = onNewMessage((data) => {
      if (data.ticketId === ticket._id) {
        console.log('💬 Nouveau message reçu:', data)
        
        // Ajouter le message à la liste
        const newMsg: Message = {
          authorId: data.authorId,
          authorName: data.authorEmail,
          authorRole: data.authorRole,
          message: data.message,
          createdAt: new Date(data.timestamp).toISOString(),
          isStaff: data.authorRole !== 'CLIENT'
        }
        
        setLiveMessages(prev => [...prev, newMsg])
        
        // Rafraîchir les données
        if (onRefresh) {
          setTimeout(() => onRefresh(), 500)
        }
      }
    })

    // Écouter l'indicateur d'écriture
    const cleanupTyping = onUserTyping((data) => {
      if (data.ticketId === ticket._id) {
        console.log('✍️ Indicateur d\'écriture:', data)
        setUserTyping(data.isTyping ? data.userName || 'Support' : null)
      }
    })

    return () => {
      cleanupNewMessage()
      cleanupTyping()
      leaveTicket(ticket._id)
      console.log(`🎫 Quitté ticket: ${ticket._id}`)
    }
  }, [isOpen, ticket?._id])

  // Gérer l'indicateur d'écriture
  const handleTyping = () => {
    if (!ticket?._id || !isConnected()) return

    startTyping(ticket._id, 'Client')
    
    // Arrêter après 2 secondes d'inactivité
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current)
    }
    
    typingTimeout.current = setTimeout(() => {
      stopTyping(ticket._id)
    }, 2000)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMessage.trim() || !ticket) return

    // Arrêter l'indicateur d'écriture
    if (ticket._id && isConnected()) {
      stopTyping(ticket._id)
    }

    setSending(true)
    setError(null)

    try {
      const res = await fetch(`/api/tickets/${ticket._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newMessage,
          internal: false
        })
      })

      const data = await res.json()

      if (data.success) {
        setNewMessage('')
        setLiveMessages([]) // Réinitialiser les messages live
        if (onRefresh) {
          onRefresh()
        }
      } else {
        setError(data.error || 'Erreur lors de l\'envoi')
      }
    } catch (err) {
      console.error('Erreur envoi message:', err)
      setError('Erreur de connexion')
    } finally {
      setSending(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
      case 'closed':
        return 'bg-green-100 text-green-700'
      case 'in_progress':
        return 'bg-blue-100 text-blue-700'
      case 'open':
        return 'bg-yellow-100 text-yellow-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-700'
      case 'high':
        return 'bg-orange-100 text-orange-700'
      case 'medium':
        return 'bg-blue-100 text-blue-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'À l\'instant'
    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays < 7) return `Il y a ${diffDays}j`
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  if (!isOpen || !ticket) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-y-0 right-0 max-w-full flex">
          <div className="w-screen max-w-2xl">
            <div className="h-full flex flex-col bg-white shadow-xl">
              {/* Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-mono opacity-90">#{ticket.ticketNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold">{ticket.title}</h2>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-white/20 rounded-lg transition"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                <div className="space-y-4">
                  {/* Message initial (description) */}
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                        <User className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-gray-900">Vous</span>
                          <span className="text-xs text-gray-500">{formatDate(ticket.createdAt)}</span>
                        </div>
                        <p className="text-gray-700">{ticket.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Messages de conversation */}
                  {ticket.messages && ticket.messages.filter(m => !m.internal).map((msg, idx) => {
                    const isStaff = msg.isStaff || msg.authorRole === 'ADMIN' || msg.authorRole === 'TECHNICIAN'
                    return (
                      <div 
                        key={idx}
                        className={`flex gap-3 ${!isStaff ? 'flex-row-reverse' : ''}`}
                      >
                        <div className="flex-shrink-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                            isStaff 
                              ? 'bg-gradient-to-br from-emerald-500 to-green-600' 
                              : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                          }`}>
                            {isStaff ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : (
                              <User className="h-5 w-5" />
                            )}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className={`rounded-2xl p-4 shadow-sm ${
                            isStaff
                              ? 'bg-emerald-50 border border-emerald-200 rounded-tl-none'
                              : 'bg-white border border-gray-200 rounded-tr-none'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-gray-900">
                                {isStaff ? 'Support IT Vision' : 'Vous'}
                              </span>
                              <span className="text-xs text-gray-500">{formatDate(msg.createdAt)}</span>
                            </div>
                            <p className="text-gray-700">{msg.message}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {/* Messages live (temps réel) */}
                  {liveMessages.map((msg, idx) => {
                    const isStaff = msg.isStaff || msg.authorRole === 'ADMIN' || msg.authorRole === 'TECHNICIAN'
                    return (
                      <div 
                        key={`live-${idx}`}
                        className={`flex gap-3 ${!isStaff ? 'flex-row-reverse' : ''} animate-fade-in`}
                      >
                        <div className="flex-shrink-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                            isStaff 
                              ? 'bg-gradient-to-br from-emerald-500 to-green-600' 
                              : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                          }`}>
                            {isStaff ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : (
                              <User className="h-5 w-5" />
                            )}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className={`rounded-2xl p-4 shadow-sm ${
                            isStaff
                              ? 'bg-emerald-50 border border-emerald-200 rounded-tl-none'
                              : 'bg-white border border-gray-200 rounded-tr-none'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-gray-900">
                                {isStaff ? 'Support IT Vision' : 'Vous'}
                              </span>
                              <span className="flex items-center gap-1 text-xs text-emerald-600">
                                <Wifi className="h-3 w-3" />
                                Live
                              </span>
                            </div>
                            <p className="text-gray-700">{msg.message}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {/* Indicateur "en train d'écrire..." */}
                  {userTyping && (
                    <div className="flex gap-3 animate-fade-in">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center text-white font-semibold">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl rounded-tl-none p-4 shadow-sm">
                          <div className="flex items-center gap-2 text-sm text-emerald-700">
                            <div className="flex gap-1">
                              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                            <span className="italic">{userTyping} est en train d'écrire...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Scroll anchor */}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input */}
              <div className="px-6 py-4 border-t border-gray-200 bg-white">
                {error && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}

                {ticket.status === 'closed' || ticket.status === 'resolved' ? (
                  <div className="text-center py-4">
                    <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 font-medium">Ce ticket est fermé</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Créez un nouveau ticket si vous avez besoin d'aide
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="space-y-3">
                    <div className="flex gap-2">
                      <textarea
                        value={newMessage}
                        onChange={(e) => {
                          setNewMessage(e.target.value)
                          handleTyping()
                        }}
                        placeholder="Écrivez votre message..."
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        rows={3}
                        disabled={sending}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                        title="Pièce jointe (bientôt disponible)"
                      >
                        <Paperclip className="h-5 w-5" />
                      </button>
                      <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-medium hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {sending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Envoi...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            Envoyer
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

