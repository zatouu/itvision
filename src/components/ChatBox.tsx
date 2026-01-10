'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Send, 
  Paperclip, 
  Smile, 
  Users,
  Clock,
  Check,
  CheckCheck,
  Loader2,
  Image as ImageIcon,
  File,
  Edit2,
  Trash2,
  Reply,
  Search,
  Download,
  MoreVertical
} from 'lucide-react'
import { chatService } from '@/lib/chat/ChatService'
import type { ChatMessage, ChatBoxProps, TypingIndicator } from '@/lib/chat/types'

const EMOJI_PICKER = ['😊', '👍', '❤️', '🎉', '🔥', '💡', '✅', '🤔']

export default function ChatBox({
  conversationId,
  conversationType,
  currentUser,
  placeholder = 'Écrivez votre message...',
  height = 'h-96',
  onNewMessage,
  metadata,
  showParticipants = true,
  allowAttachments = true,
  allowReactions = true,
  className = ''
}: ChatBoxProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null)
  const [showThreadFor, setShowThreadFor] = useState<string | null>(null)
  const [threadMessages, setThreadMessages] = useState<Record<string, ChatMessage[]>>({})
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Scroll automatique vers le bas
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Charger les messages au montage
  useEffect(() => {
    loadMessages()
    
    // Rejoindre la conversation Socket.io
    chatService.joinConversation(conversationId)

    // Écouter les nouveaux messages
    const unsubscribeMessages = chatService.onMessage((message) => {
      if (message.conversationId === conversationId) {
        if (message.threadId) {
          // C'est une réponse de thread
          setThreadMessages(prev => ({
            ...prev,
            [message.threadId!]: [...(prev[message.threadId!] || []), message]
          }))
        } else {
          setMessages(prev => [...prev, message])
        }
        scrollToBottom()
        
        // Marquer comme lu si ce n'est pas notre message
        if (message.sender.userId !== currentUser.userId) {
          chatService.markAsRead(conversationId, [message._id], currentUser.userId)
        }
        
        onNewMessage?.(message)
      }
    })

    // Écouter les indicateurs de saisie
    const unsubscribeTyping = chatService.onTyping((data: TypingIndicator) => {
      if (data.conversationId === conversationId && data.userId !== currentUser.userId) {
        setTypingUsers(prev => new Set(prev).add(data.userName))
        
        // Retirer après 3 secondes
        setTimeout(() => {
          setTypingUsers(prev => {
            const next = new Set(prev)
            next.delete(data.userName)
            return next
          })
        }, 3000)
      }
    })

    return () => {
      chatService.leaveConversation(conversationId)
      unsubscribeMessages()
      unsubscribeTyping()
    }
  }, [conversationId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadMessages = async () => {
    try {
      setLoading(true)
      const msgs = await chatService.getMessages(conversationId, 50)
      setMessages(msgs)
    } catch (error) {
      console.error('Erreur chargement messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || sending) return

    try {
      setSending(true)
      
      if (replyingTo) {
        // Envoyer comme réponse dans un thread
        await chatService.replyToThread(
          replyingTo._id,
          inputValue.trim(),
          currentUser,
          conversationId,
          conversationType
        )
        setReplyingTo(null)
      } else {
        // Message normal
        await chatService.sendMessage(
          conversationId,
          inputValue.trim(),
          currentUser,
          conversationType,
          metadata
        )
      }

      setInputValue('')
      chatService.stopTyping(conversationId)
    } catch (error) {
      console.error('Erreur envoi message:', error)
    } finally {
      setSending(false)
    }
  }

  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      await chatService.editMessage(messageId, newContent)
      setMessages(prev => prev.map(msg => 
        msg._id === messageId 
          ? { ...msg, content: newContent, isEdited: true }
          : msg
      ))
      setEditingMessageId(null)
      setEditContent('')
    } catch (error) {
      console.error('Erreur édition:', error)
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Supprimer ce message ?')) return
    
    try {
      await chatService.deleteMessage(messageId)
      setMessages(prev => prev.filter(msg => msg._id !== messageId))
    } catch (error) {
      console.error('Erreur suppression:', error)
    }
  }

  const handleLoadThread = async (messageId: string) => {
    if (threadMessages[messageId]) {
      setShowThreadFor(showThreadFor === messageId ? null : messageId)
      return
    }

    try {
      const replies = await chatService.getThread(messageId)
      setThreadMessages(prev => ({ ...prev, [messageId]: replies }))
      setShowThreadFor(messageId)
    } catch (error) {
      console.error('Erreur chargement thread:', error)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    try {
      const results = await chatService.searchMessages({
        conversationId,
        searchTerm: searchQuery,
        limit: 20
      })
      setMessages(results)
    } catch (error) {
      console.error('Erreur recherche:', error)
    }
  }

  const handleExport = async () => {
    try {
      const blob = await chatService.exportConversation(conversationId, 'json')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `chat-${conversationId}-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erreur export:', error)
    }
  }

  const handleInputChange = (value: string) => {
    setInputValue(value)
    
    // Indicateur de saisie avec debounce
    if (value.trim()) {
      chatService.startTyping(conversationId, currentUser.name)
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        chatService.stopTyping(conversationId)
      }, 2000)
    } else {
      chatService.stopTyping(conversationId)
    }
  }

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await chatService.addReaction(messageId, emoji, currentUser.userId, currentUser.name)
      
      // Mise à jour optimiste
      setMessages(prev => prev.map(msg => {
        if (msg._id === messageId) {
          const existingReaction = msg.reactions?.find(r => r.userId === currentUser.userId)
          
          if (existingReaction) {
            // Retirer la réaction si elle existe déjà
            return {
              ...msg,
              reactions: msg.reactions?.filter(r => r.userId !== currentUser.userId) || []
            }
          } else {
            // Ajouter la nouvelle réaction
            return {
              ...msg,
              reactions: [
                ...(msg.reactions || []),
                { emoji, userId: currentUser.userId, userName: currentUser.name }
              ]
            }
          }
        }
        return msg
      }))
    } catch (error) {
      console.error('Erreur ajout réaction:', error)
    }
  }

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const groupReactions = (reactions?: ChatMessage['reactions']) => {
    if (!reactions) return []
    
    const grouped = reactions.reduce((acc, r) => {
      if (!acc[r.emoji]) {
        acc[r.emoji] = []
      }
      acc[r.emoji].push(r)
      return acc
    }, {} as Record<string, typeof reactions>)
    
    return Object.entries(grouped).map(([emoji, users]) => ({
      emoji,
      count: users.length,
      users: users.map(u => u.userName),
      hasCurrentUser: users.some(u => u.userId === currentUser.userId)
    }))
  }

  return (
    <div className={`flex flex-col bg-white rounded-2xl border shadow-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Discussion</h3>
            <p className="text-xs text-gray-600">
              {messages.length} message{messages.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Bouton recherche */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            title="Rechercher"
          >
            <Search className="w-5 h-5 text-gray-600" />
          </button>

          {/* Bouton export */}
          <button
            onClick={handleExport}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            title="Exporter la conversation"
          >
            <Download className="w-5 h-5 text-gray-600" />
          </button>

          {showParticipants && (
            <div className="flex items-center gap-1 text-xs text-gray-600 ml-2">
              <Users className="w-4 h-4" />
              <span>En ligne</span>
            </div>
          )}
        </div>
      </div>

      {/* Barre de recherche */}
      {showSearch && (
        <div className="p-3 border-b bg-gray-50">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Rechercher dans les messages..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setShowSearch(false)
                setSearchQuery('')
                loadMessages()
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${height}`}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Users className="w-16 h-16 mb-4" />
            <p className="text-sm">Aucun message pour le moment</p>
            <p className="text-xs">Soyez le premier à écrire !</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((message, index) => {
              const isOwn = message.sender.userId === currentUser.userId
              const showAvatar = !isOwn && (
                index === 0 || 
                messages[index - 1]?.sender.userId !== message.sender.userId
              )
              const reactions = groupReactions(message.reactions)

              return (
                <motion.div
                  key={message._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  {showAvatar ? (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {message.sender.name.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <div className="w-8 flex-shrink-0" />
                  )}

                  <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                    {/* Nom et heure */}
                    {showAvatar && (
                      <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                        <span className="text-xs font-semibold text-gray-700">
                          {message.sender.name}
                        </span>
                        {message.sender.role && (
                          <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                            {message.sender.role}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Message bubble */}
                    <div className="relative group">
                      <div
                        className={`px-4 py-2 rounded-2xl ${
                          isOwn
                            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-tr-sm'
                            : 'bg-gray-100 text-gray-900 rounded-tl-sm'
                        }`}
                      >
                        {editingMessageId === message._id ? (
                          <div className="space-y-2">
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="w-full px-2 py-1 text-sm bg-white/10 border border-white/30 rounded text-gray-900 focus:outline-none"
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditMessage(message._id, editContent)}
                                className="px-3 py-1 bg-emerald-500 text-white text-xs rounded hover:bg-emerald-600"
                              >
                                Sauvegarder
                              </button>
                              <button
                                onClick={() => {
                                  setEditingMessageId(null)
                                  setEditContent('')
                                }}
                                className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                              >
                                Annuler
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {message.type === 'system' ? (
                              <p className="text-xs italic">{message.content}</p>
                            ) : (
                              <>
                                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                                {message.isEdited && (
                                  <span className={`text-xs italic ${isOwn ? 'text-white/70' : 'text-gray-500'}`}>
                                    (modifié)
                                  </span>
                                )}
                              </>
                            )}
                          </>
                        )}
                        
                        {/* Pièces jointes */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {message.attachments.map((att, i) => (
                              <a
                                key={i}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                              >
                                {att.mimeType.startsWith('image/') ? (
                                  <ImageIcon className="w-4 h-4" />
                                ) : (
                                  <File className="w-4 h-4" />
                                )}
                                <span className="text-xs truncate">{att.name}</span>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Menu d'actions (apparaît au hover) */}
                      {!editingMessageId && (
                        <div className="absolute top-0 right-0 -mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex gap-1 bg-white shadow-lg rounded-lg p-1 border">
                            <button
                              onClick={() => setReplyingTo(message)}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                              title="Répondre"
                            >
                              <Reply className="w-4 h-4 text-gray-600" />
                            </button>
                            
                            {isOwn && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingMessageId(message._id)
                                    setEditContent(message.content)
                                  }}
                                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                                  title="Éditer"
                                >
                                  <Edit2 className="w-4 h-4 text-blue-600" />
                                </button>
                                <button
                                  onClick={() => handleDeleteMessage(message._id)}
                                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Réactions */}
                      {allowReactions && reactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {reactions.map(({ emoji, count, users, hasCurrentUser }) => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(message._id, emoji)}
                              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all ${
                                hasCurrentUser
                                  ? 'bg-purple-100 border-2 border-purple-400'
                                  : 'bg-gray-100 hover:bg-gray-200'
                              }`}
                              title={users.join(', ')}
                            >
                              <span>{emoji}</span>
                              <span className="font-semibold">{count}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Bouton réaction au hover */}
                      {allowReactions && (
                        <div className="absolute -bottom-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex gap-1 bg-white shadow-lg rounded-lg p-1 border">
                            {EMOJI_PICKER.slice(0, 5).map(emoji => (
                              <button
                                key={emoji}
                                onClick={() => handleReaction(message._id, emoji)}
                                className="hover:scale-125 transition-transform p-1"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Heure et statut */}
                    <div className={`flex items-center gap-1 mt-1 text-xs text-gray-500 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                      <Clock className="w-3 h-3" />
                      <span>{formatTime(message.createdAt)}</span>
                      
                      {isOwn && (
                        <span>
                          {message.readBy.length > 1 ? (
                            <CheckCheck className="w-4 h-4 text-blue-500" />
                          ) : (
                            <Check className="w-4 h-4 text-gray-400" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
        
        {/* Indicateur de saisie */}
        {typingUsers.size > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-sm text-gray-500 italic"
          >
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
            <span>
              {Array.from(typingUsers).join(', ')} {typingUsers.size > 1 ? 'écrivent' : 'écrit'}...
            </span>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-gray-50">
        {/* Message de réponse */}
        {replyingTo && (
          <div className="mb-3 p-3 bg-purple-50 border-l-4 border-purple-400 rounded flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold text-purple-700">
                Répondre à {replyingTo.sender.name}
              </div>
              <div className="text-xs text-gray-600 truncate">
                {replyingTo.content.substring(0, 50)}...
              </div>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex gap-2 items-end">
          {/* Boutons d'action */}
          <div className="flex gap-1">
            {allowAttachments && (
              <button
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title="Joindre un fichier"
              >
                <Paperclip className="w-5 h-5 text-gray-600" />
              </button>
            )}
            
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors relative"
              title="Ajouter un emoji"
            >
              <Smile className="w-5 h-5 text-gray-600" />
              
              {showEmojiPicker && (
                <div className="absolute bottom-full mb-2 left-0 bg-white shadow-lg rounded-lg p-2 border flex gap-1 z-10">
                  {EMOJI_PICKER.map(emoji => (
                    <button
                      key={emoji}
                      onClick={(e) => {
                        e.stopPropagation()
                        setInputValue(prev => prev + emoji)
                        setShowEmojiPicker(false)
                      }}
                      className="hover:scale-125 transition-transform p-1 text-xl"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </button>
          </div>

          {/* Input */}
          <textarea
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            placeholder={placeholder}
            rows={1}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
            style={{ minHeight: '42px', maxHeight: '120px' }}
          />

          {/* Bouton envoyer */}
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || sending}
            className={`p-2 rounded-xl transition-all ${
              inputValue.trim() && !sending
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        
        <p className="text-xs text-gray-500 mt-2">
          Appuyez sur <kbd className="px-1 py-0.5 bg-gray-200 rounded">Entrée</kbd> pour envoyer, 
          <kbd className="px-1 py-0.5 bg-gray-200 rounded ml-1">Shift+Entrée</kbd> pour un saut de ligne
        </p>
      </div>
    </div>
  )
}
