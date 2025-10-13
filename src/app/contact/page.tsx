'use client'

import { useState } from 'react'
import { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Contact from '@/components/Contact'
import DigitalBooking from '@/components/DigitalBooking'
import SmartQuoteCalculator from '@/components/SmartQuoteCalculator'
import SmartChatbot from '@/components/SmartChatbot'
import { Calendar, Calculator, MessageCircle, Phone, Mail, MapPin, Bot, Zap } from 'lucide-react'

export default function ContactPage() {
  const [activeDigitalTool, setActiveDigitalTool] = useState<string | null>(null)

  // Pré-sélection via query ?tool=booking|quote
  if (typeof window !== 'undefined' && !activeDigitalTool) {
    const params = new URLSearchParams(window.location.search)
    const tool = params.get('tool')
    if (tool === 'booking' || tool === 'quote') {
      setActiveDigitalTool(tool)
    }
  }

  const digitalContactOptions = [
    {
      id: 'booking',
      title: 'Prise de RDV Digitale',
      description: 'Planifiez votre intervention en ligne',
      icon: Calendar,
      color: 'from-blue-500 to-purple-600',
      component: DigitalBooking
    },
    {
      id: 'quote',
      title: 'Calculateur de Devis',
      description: 'Estimation instantanée et précise',
      icon: Calculator,
      color: 'from-emerald-500 to-teal-600',
      component: SmartQuoteCalculator
    }
  ]

  return (
    <main>
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-900 via-blue-800 to-green-900 text-white page-content py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Contactez-<span className="bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">nous</span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto mb-8">
              Notre équipe d'experts est à votre disposition pour vous accompagner dans vos projets de sécurité électronique
            </p>
            
            {/* Stats contact */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-2xl font-bold text-blue-300">24h/7j</div>
                <div className="text-sm text-blue-100">Support technique</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-2xl font-bold text-green-300">&lt; 1h</div>
                <div className="text-sm text-blue-100">Temps de réponse</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="text-2xl font-bold text-purple-300">15+</div>
                <div className="text-sm text-blue-100">Années d'expérience</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Options de Contact Digitales */}
      <section className="py-16 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Comment souhaitez-vous <span className="text-blue-600">nous contacter ?</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Choisissez la méthode qui vous convient le mieux pour obtenir rapidement un devis ou des informations
            </p>
          </div>

          {/* Sélecteur d'outils digitaux */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {digitalContactOptions.map((option) => {
              const IconComponent = option.icon
              return (
                <button
                  key={option.id}
                  onClick={() => setActiveDigitalTool(activeDigitalTool === option.id ? null : option.id)}
                  className={`flex items-center space-x-3 px-6 py-4 rounded-2xl font-semibold transition-all duration-300 ${
                    activeDigitalTool === option.id
                      ? `bg-gradient-to-r ${option.color} text-white shadow-lg scale-105`
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-md'
                  }`}
                >
                  <IconComponent className="h-5 w-5" />
                  <span>{option.title}</span>
                  <Zap className="h-4 w-4" />
                </button>
              )
            })}
          </div>

          {/* Outil digital actif */}
          {activeDigitalTool && (
            <div className="mb-16 animate-fade-in">
              {activeDigitalTool === 'booking' && <DigitalBooking />}
              {activeDigitalTool === 'quote' && <SmartQuoteCalculator />}
            </div>
          )}

          {/* Contact traditionnel modernisé */}
          {!activeDigitalTool && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Contact immédiat */}
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl p-6">
                <div className="flex items-center mb-4">
                  <MessageCircle className="h-8 w-8 mr-3" />
                  <h3 className="text-xl font-bold">Contact Immédiat</h3>
                </div>
                <p className="text-green-100 mb-6">Pour une réponse instantanée</p>
                
                <div className="space-y-4">
                  <a
                    href="https://wa.me/221774133440?text=Bonjour, je souhaite être contacté pour un projet de sécurité électronique."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-white/20 hover:bg-white/30 text-white p-3 rounded-lg transition-colors"
                  >
                    <div className="flex items-center">
                      <svg className="h-5 w-5 mr-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                      </svg>
                      <div>
                        <div className="font-semibold">WhatsApp Business</div>
                        <div className="text-sm text-green-100">+221 77 413 34 40</div>
                      </div>
                    </div>
                  </a>
                  
                  <a
                    href="tel:+221774133440"
                    className="block bg-white/20 hover:bg-white/30 text-white p-3 rounded-lg transition-colors"
                  >
                    <div className="flex items-center">
                      <Phone className="h-5 w-5 mr-3" />
                      <div>
                        <div className="font-semibold">Téléphone</div>
                        <div className="text-sm text-green-100">+221 77 413 34 40</div>
                      </div>
                    </div>
                  </a>
                </div>
              </div>

              {/* Email */}
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-2xl p-6">
                <div className="flex items-center mb-4">
                  <Mail className="h-8 w-8 mr-3" />
                  <h3 className="text-xl font-bold">Email Professionnel</h3>
                </div>
                <p className="text-blue-100 mb-6">Pour demandes détaillées</p>
                
                <a
                  href="mailto:contact@itvisionplus.sn"
                  className="block bg-white/20 hover:bg-white/30 text-white p-3 rounded-lg transition-colors"
                >
                  <div className="font-semibold">contact@itvisionplus.sn</div>
                  <div className="text-sm text-blue-100">Réponse sous 2h ouvrées</div>
                </a>
              </div>

              {/* Localisation */}
              <div className="bg-gradient-to-br from-orange-500 to-red-600 text-white rounded-2xl p-6">
                <div className="flex items-center mb-4">
                  <MapPin className="h-8 w-8 mr-3" />
                  <h3 className="text-xl font-bold">Nos Bureaux</h3>
                </div>
                <p className="text-orange-100 mb-6">Venez nous rencontrer</p>
                
                <div className="space-y-2">
                  <div className="font-semibold">Siège Social</div>
                  <div className="text-sm text-orange-100">
                    Parcelles Assainies<br />
                    Unité 25, Villa N°123<br />
                    Dakar, Sénégal
                  </div>
                  <div className="text-xs text-orange-200 mt-2">
                    📍 Coordonnées GPS disponibles sur demande
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Section formulaire traditionnel */}
      <Contact />
      
      {/* Chatbot intégré */}
      <SmartChatbot 
        onBookingClick={() => setActiveDigitalTool('booking')}
        onQuoteClick={() => setActiveDigitalTool('quote')}
      />
      
      <Footer />
    </main>
  )
}