'use client'

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, Send, Bot, User, X, Zap, Phone, Calendar, Calculator } from 'lucide-react'

interface Message {
  id: string
  text: string
  isBot: boolean
  timestamp: Date
  actions?: Array<{
    label: string
    action: string
    data?: any
  }>
}

interface ChatbotProps {
  onBookingClick?: () => void
  onQuoteClick?: () => void
}

export default function SmartChatbot({ onBookingClick, onQuoteClick }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [conversationContext, setConversationContext] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Message d'accueil
      setTimeout(() => {
        addBotMessage(
          "👋 Bonjour ! Je suis l'assistant d'IT Vision. Comment puis-je vous aider avec vos besoins en sécurité électronique ?",
          [
            { label: "🔒 Vidéosurveillance", action: "videosurveillance" },
            { label: "🔐 Contrôle d'accès", action: "access_control" },
            { label: "🏠 Domotique", action: "domotique" },
            { label: "🔧 Maintenance", action: "maintenance" },
            { label: "⚙️ Digitalisation de processus", action: "digitalization" },
            { label: "📞 Contact direct", action: "contact" }
          ]
        )
      }, 500)
    }
  }, [isOpen])

  // Réduction au clic extérieur (conserve l'historique)
  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (!isOpen) return
      const target = e.target as Node
      if (chatRef.current && !chatRef.current.contains(target)) {
        if (messages.length > 0) setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [isOpen, messages.length])

  const addBotMessage = (text: string, actions?: Array<{label: string, action: string, data?: any}>) => {
    const message: Message = {
      id: Date.now().toString(),
      text,
      isBot: true,
      timestamp: new Date(),
      actions
    }
    setMessages(prev => [...prev, message])
  }

  const addUserMessage = (text: string) => {
    const message: Message = {
      id: Date.now().toString(),
      text,
      isBot: false,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, message])
  }

  const simulateTyping = (callback: () => void, delay = 1000) => {
    setIsTyping(true)
    setTimeout(() => {
      setIsTyping(false)
      callback()
    }, delay)
  }

  const handleActionClick = (action: string, data?: any) => {
    switch (action) {
      case 'security':
        simulateTyping(() => {
          addBotMessage(
            "Excellent choix ! Nous proposons plusieurs solutions de sécurité électronique :",
            [
              { label: "📹 Vidéosurveillance", action: "videosurveillance" },
              { label: "🔐 Contrôle d'accès", action: "access_control" },
              { label: "🚨 Alarmes", action: "alarms" },
              { label: "🏠 Domotique", action: "domotique" },
              { label: "💰 Calculer un devis", action: "quote" }
            ]
          )
        })
        break

      case 'access_control':
        simulateTyping(() => {
          addBotMessage(
            "🔐 Excellente ! Nos solutions de contrôle d'accès incluent :",
            [
              { label: "👤 Reconnaissance faciale", action: "facial_recognition" },
              { label: "🔑 Badges RFID", action: "rfid_badges" },
              { label: "🔢 Claviers à codes", action: "keypad_access" },
              { label: "👆 Biométrie", action: "biometric" },
              { label: "💰 Demander un devis", action: "whatsapp" }
            ]
          )
        })
        break

      case 'domotique':
        simulateTyping(() => {
          addBotMessage(
            "🏠 Parfait ! Nous proposons deux approches domotiques :",
            [
              { label: "🔄 Retrofit (existant)", action: "retrofit" },
              { label: "🏗️ Construction neuve", action: "new_construction" },
              { label: "📱 Interface mobile", action: "mobile_interface" },
              { label: "🌡️ Capteurs smart", action: "smart_sensors" },
              { label: "💰 Devis domotique", action: "whatsapp" }
            ]
          )
        })
        break

      case 'maintenance':
        simulateTyping(() => {
          addBotMessage(
            "La maintenance est cruciale ! Sans elle, votre vidéosurveillance est vouée à l'instabilité.",
            [
              { label: "🔧 Maintenance préventive", action: "preventive" },
              { label: "⚡ Dépannage urgent", action: "emergency" },
              { label: "📋 Audit système", action: "audit" },
              { label: "📝 Formulaire équipement", action: "equipment_form" }
            ]
          )
        })
        break

      case 'videosurveillance':
        simulateTyping(() => {
          addBotMessage(
            "🎯 Vidéosurveillance professionnelle :\n\n• Caméras 4K avec IA\n• Enregistrement cloud sécurisé\n• Accès mobile temps réel\n• Vision nocturne avancée\n\nVous avez un projet spécifique en tête ?",
            [
              { label: "🏢 Entreprise/Commerce", action: "business_security" },
              { label: "🏠 Résidentiel", action: "home_security" },
              { label: "🏭 Industriel", action: "industrial_security" },
              { label: "💰 Estimer le coût", action: "quote" }
            ]
          )
        })
        break

      case 'quote':
        if (onQuoteClick) {
          onQuoteClick()
          addUserMessage("Je veux calculer un devis")
          simulateTyping(() => {
            addBotMessage("Perfect ! J'ai ouvert notre calculateur de devis intelligent pour vous. Vous pouvez sélectionner vos équipements et voir le prix en temps réel ! 🧮")
          })
        }
        break

      case 'digitalization':
        simulateTyping(() => {
          addBotMessage(
            "⚙️ Digitalisation de processus:\n\n• Cartographie de vos processus métiers\n• Dématérialisation des formulaires et validations\n• Automatisation des workflows (notifications, étapes, règles)\n• Intégrations (ERP/CRM, email, WhatsApp)\n\nQue souhaitez-vous faire ?",
            [
              { label: "🗺️ Cartographier mes processus", action: "process_mapping" },
              { label: "📝 Dématérialiser mes formulaires", action: "forms_workflow" },
              { label: "🤖 Automatiser un workflow", action: "process_automation" },
              { label: "🔗 Intégrations ERP/CRM", action: "integrations" },
              { label: "📅 Audit digitalisation (RDV)", action: "booking" }
            ]
          )
        })
        break

      case 'process_mapping':
      case 'forms_workflow':
      case 'process_automation':
      case 'integrations':
        simulateTyping(() => {
          addBotMessage(
            "Parfait. Pour cadrer rapidement votre besoin, je vous propose un court échange avec un expert digitalisation.",
            [
              { label: "📅 Planifier un audit (gratuit)", action: "booking" },
              { label: "💬 WhatsApp expert digitalisation", action: "whatsapp" }
            ]
          )
        })
        break

      case 'booking':
        if (onBookingClick) {
          onBookingClick()
          addUserMessage("Je veux prendre rendez-vous")
          simulateTyping(() => {
            addBotMessage("Excellent ! J'ai ouvert notre système de prise de rendez-vous digital. Vous pouvez choisir votre créneau en quelques clics ! 📅")
          })
        }
        break

      case 'contact':
        simulateTyping(() => {
          addBotMessage(
            "📞 Contactez-nous directement :\n\n• WhatsApp : +221 77 413 34 40\n• Téléphone : +221 77 7438220\n• Email : contact@itvision.sn\n\nOu utilisez nos outils digitaux :",
            [
              { label: "📅 Prendre RDV en ligne", action: "booking" },
              { label: "💰 Calculer un devis", action: "quote" },
              { label: "💬 WhatsApp direct", action: "whatsapp" }
            ]
          )
        })
        break

      case 'whatsapp':
        simulateTyping(() => {
          addBotMessage("Je vous redirige vers WhatsApp pour un contact direct avec notre équipe ! 💬")
        })
        setTimeout(() => {
          window.open('https://wa.me/221774133440?text=Bonjour, je viens du site web et je souhaite avoir des informations.', '_blank')
        }, 1500)
        break

      case 'business_security':
        simulateTyping(() => {
          addBotMessage(
            "🏢 Solution entreprise/commerce :\n\n• Surveillance multi-sites\n• Accès par badge/biométrie\n• Intégration avec alarmes\n• Monitoring 24h/24\n• Rapports automatiques\n\nCombien de caméras estimez-vous ?",
            [
              { label: "1-10 caméras", action: "small_business" },
              { label: "10-50 caméras", action: "medium_business" },
              { label: "50+ caméras", action: "large_business" },
              { label: "💰 Devis personnalisé", action: "quote" }
            ]
          )
        })
        break

      case 'emergency':
        simulateTyping(() => {
          addBotMessage(
            "🚨 Dépannage URGENT 24h/7j !\n\nNous intervenons dans l'heure pour :\n• Panne système critique\n• Caméras déconnectées\n• Problèmes d'enregistrement\n• Sécurité compromise",
            [
              { label: "📞 Appel d'urgence", action: "emergency_call" },
              { label: "💬 WhatsApp urgent", action: "emergency_whatsapp" }
            ]
          )
        })
        break

      case 'emergency_call':
        simulateTyping(() => {
          addBotMessage("☎️ Appelez immédiatement le +221 77 7438220 pour une intervention d'urgence !")
        })
        break

      case 'emergency_whatsapp':
        simulateTyping(() => {
          addBotMessage("Je vous connecte à notre service d'urgence via WhatsApp...")
        })
        setTimeout(() => {
          window.open('https://wa.me/221774133440?text=🚨 URGENCE - Dépannage sécurité électronique requis immédiatement !', '_blank')
        }, 1000)
        break

      case 'facial_recognition':
      case 'rfid_badges':
      case 'keypad_access':
      case 'biometric':
      case 'retrofit':
      case 'new_construction':
      case 'mobile_interface':
      case 'smart_sensors':
        simulateTyping(() => {
          addBotMessage(
            "Excellente question ! Pour vous donner des détails précis sur cette solution, je vous propose de parler directement avec nos experts :",
            [
              { label: "💬 WhatsApp expert", action: "whatsapp" },
              { label: "📞 Appel immédiat", action: "contact" }
            ]
          )
        })
        break

      default:
        simulateTyping(() => {
          addBotMessage(
            "Je peux vous aider avec nos services :",
            [
              { label: "🔒 Vidéosurveillance", action: "videosurveillance" },
              { label: "🔐 Contrôle d'accès", action: "access_control" },
              { label: "🏠 Domotique", action: "domotique" },
              { label: "🔧 Maintenance", action: "maintenance" },
              { label: "⚙️ Digitalisation de processus", action: "digitalization" },
              { label: "📞 Contact direct", action: "contact" }
            ]
          )
        })
    }
  }

  const handleSendMessage = () => {
    if (inputText.trim()) {
      addUserMessage(inputText)
      const userInput = inputText.toLowerCase()
      setInputText('')
      
      // Ajouter au contexte de conversation
      setConversationContext(prev => [...prev, userInput])
      
      // Traitement contextuel des messages
      if (userInput.includes('prix') || userInput.includes('coût') || userInput.includes('tarif') || userInput.includes('devis')) {
        simulateTyping(() => {
          addBotMessage(
            "Pour vous donner un devis précis, je peux vous rediriger vers WhatsApp où nos experts analyseront vos besoins spécifiques.",
            [
              { label: "💬 WhatsApp devis", action: "whatsapp" },
              { label: "📞 Appeler directement", action: "contact" }
            ]
          )
        })
      } else if (
        userInput.includes('digitalisation') || userInput.includes('digitisation') || userInput.includes('digitaliser') ||
        userInput.includes('processus') || userInput.includes('workflow') || userInput.includes('automatisation') ||
        userInput.includes('dématérialisation') || userInput.includes('dematerialisation')
      ) {
        handleActionClick('digitalization')
      } else if (userInput.includes('rendez-vous') || userInput.includes('rdv') || userInput.includes('meeting') || userInput.includes('rencontrer')) {
        simulateTyping(() => {
          addBotMessage(
            "📅 Je vous aide à planifier un rendez-vous. Vous préférez :",
            [
              { label: "📞 Appel téléphonique", action: "contact" },
              { label: "💬 WhatsApp", action: "whatsapp" }
            ]
          )
        })
      } else if (userInput.includes('urgence') || userInput.includes('urgent') || userInput.includes('panne') || userInput.includes('problème')) {
        handleActionClick('emergency')
      } else if (userInput.includes('merci') || userInput.includes('au revoir') || userInput.includes('bye')) {
        simulateTyping(() => {
          addBotMessage(
            "Merci de nous avoir contactés ! N'hésitez pas à revenir si vous avez d'autres questions. Bonne journée ! 😊"
          )
        })
      } else if (userInput.includes('bonjour') || userInput.includes('salut') || userInput.includes('hello')) {
        simulateTyping(() => {
          addBotMessage(
            "Bonjour ! Ravi de vous rencontrer. Comment puis-je vous aider avec vos besoins en sécurité électronique ?",
            [
              { label: "🔒 Vidéosurveillance", action: "videosurveillance" },
              { label: "🔐 Contrôle d'accès", action: "access_control" },
              { label: "🏠 Domotique", action: "domotique" },
              { label: "💬 Autre besoin", action: "contact" }
            ]
          )
        })
      } else if (conversationContext.length > 3) {
        // Si la conversation devient longue, proposer un contact direct
        simulateTyping(() => {
          addBotMessage(
            "Je vois que vous avez plusieurs questions. Pour mieux vous accompagner, je vous propose de parler directement avec nos experts :",
            [
              { label: "💬 WhatsApp expert", action: "whatsapp" },
              { label: "📞 Appel immédiat", action: "contact" }
            ]
          )
        })
      } else {
        // Réponse adaptative basée sur les mots-clés
        const responses = [
          "Intéressant ! Pouvez-vous me dire plus sur vos besoins ?",
          "Je comprends. Pour mieux vous aider, quel type de projet avez-vous en tête ?",
          "D'accord. Quel aspect de la sécurité électronique vous préoccupe le plus ?"
        ]
        
        simulateTyping(() => {
          addBotMessage(
            responses[Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / (2**32) * responses.length)],
            [
              { label: "🔒 Sécurité électronique", action: "security" },
              { label: "🔧 Maintenance", action: "maintenance" },
              { label: "💬 Parler à un expert", action: "whatsapp" }
            ]
          )
        })
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <>
      {/* Bouton flottant */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 z-50 animate-pulse"
        >
          <MessageCircle className="h-6 w-6" />
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center animate-bounce">
            <Bot className="h-3 w-3" />
          </div>
        </button>
      )}

      {/* Interface du chat */}
      {isOpen && (
        <div ref={chatRef} className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Assistant IT Vision</h3>
                <p className="text-xs text-blue-100">En ligne • Répond instantanément</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
              >
                <div className={`max-w-[80%] ${message.isBot ? 'order-2' : 'order-1'}`}>
                  {message.isBot && (
                    <div className="flex items-center space-x-2 mb-1">
                      <Bot className="h-4 w-4 text-blue-600" />
                      <span className="text-xs text-gray-500">Assistant</span>
                    </div>
                  )}
                  
                  <div
                    className={`px-4 py-2 rounded-2xl ${
                      message.isBot
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-line">{message.text}</p>
                  </div>
                  
                  {message.actions && (
                    <div className="mt-2 space-y-1">
                      {message.actions.map((action, index) => (
                        <button
                          key={index}
                          onClick={() => handleActionClick(action.action, action.data)}
                          className="block w-full text-left px-3 py-2 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors border border-blue-200"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-400 mt-1">
                    {message.timestamp.toLocaleTimeString('fr-FR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
                
                {message.isBot && (
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center order-1 mr-2">
                    <Bot className="h-4 w-4 text-blue-600" />
                  </div>
                )}
                
                {!message.isBot && (
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center order-2 ml-2">
                    <User className="h-4 w-4 text-purple-600" />
                  </div>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Bot className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="bg-gray-100 px-4 py-2 rounded-2xl">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Tapez votre message..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim()}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-2 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            
            <div className="flex justify-center space-x-2 mt-2">
              <button
                onClick={() => handleActionClick('quote')}
                className="flex items-center space-x-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs hover:bg-emerald-200 transition-colors"
              >
                <Calculator className="h-3 w-3" />
                <span>Devis</span>
              </button>
              <button
                onClick={() => handleActionClick('booking')}
                className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
              >
                <Calendar className="h-3 w-3" />
                <span>RDV</span>
              </button>
              <button
                onClick={() => handleActionClick('emergency_call')}
                className="flex items-center space-x-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 transition-colors"
              >
                <Phone className="h-3 w-3" />
                <span>Urgence</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}