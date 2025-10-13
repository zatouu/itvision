'use client'

import { useState } from 'react'
import { Calendar, Clock, MapPin, User, Phone, Mail, Camera, Home, Wrench, CheckCircle, ArrowRight } from 'lucide-react'

interface BookingData {
  service: string
  date: string
  time: string
  duration: string
  clientInfo: {
    name: string
    phone: string
    email: string
    company?: string
  }
  address: string
  details: string
  urgency: 'normal' | 'urgent' | 'critical'
}

export default function DigitalBooking() {
  const [step, setStep] = useState(1)
  const [bookingData, setBookingData] = useState<BookingData>({
    service: '',
    date: '',
    time: '',
    duration: '',
    clientInfo: {
      name: '',
      phone: '',
      email: '',
      company: ''
    },
    address: '',
    details: '',
    urgency: 'normal'
  })

  const services = [
    {
      id: 'audit',
      name: 'Audit sécurité gratuit',
      icon: CheckCircle,
      duration: '2h',
      description: 'Évaluation complète de vos besoins sécuritaires'
    },
    {
      id: 'installation',
      name: 'Installation équipement',
      icon: Camera,
      duration: '4-8h',
      description: 'Installation de votre système de sécurité'
    },
    {
      id: 'maintenance',
      name: 'Maintenance préventive',
      icon: Wrench,
      duration: '2-3h',
      description: 'Vérification et optimisation de votre installation'
    },
    {
      id: 'consultation',
      name: 'Consultation digitalisation',
      icon: Home,
      duration: '1-2h',
      description: 'Analyse de vos processus à digitaliser'
    }
  ]

  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'
  ]

  const generateWhatsAppBooking = () => {
    const service = services.find(s => s.id === bookingData.service)
    const message = `🗓️ DEMANDE DE RENDEZ-VOUS%0A%0A📋 SERVICE DEMANDÉ:%0A${service?.name} (${service?.duration})%0A%0A📅 CRÉNEAU SOUHAITÉ:%0A- Date: ${bookingData.date}%0A- Heure: ${bookingData.time}%0A- Urgence: ${bookingData.urgency}%0A%0A👤 INFORMATIONS CLIENT:%0A- Nom: ${bookingData.clientInfo.name}%0A- Téléphone: ${bookingData.clientInfo.phone}%0A- Email: ${bookingData.clientInfo.email}${bookingData.clientInfo.company ? `%0A- Entreprise: ${bookingData.clientInfo.company}` : ''}%0A%0A📍 ADRESSE:%0A${bookingData.address}%0A%0A📝 DÉTAILS:%0A${bookingData.details || 'Aucun détail supplémentaire'}%0A%0AMerci de confirmer ce rendez-vous.`
    
    return `https://wa.me/221774133440?text=${message}`
  }

  const generateICSUrl = () => {
    if (!bookingData.date || !bookingData.time) return '#'
    const startLocal = `${bookingData.date}T${bookingData.time}`
    // Approx end time by adding 1h if unknown
    const [h, m] = bookingData.time.split(':').map(Number)
    const endHour = String(Math.min(23, h + 1)).padStart(2, '0')
    const endLocal = `${bookingData.date}T${endHour}:${String(m || 0).padStart(2, '0')}`
    const title = encodeURIComponent(`RDV ${services.find(s=>s.id===bookingData.service)?.name || 'IT Vision'}`)
    const description = encodeURIComponent(`Client: ${bookingData.clientInfo.name}\nTéléphone: ${bookingData.clientInfo.phone}\nDétails: ${bookingData.details || ''}`)
    const location = encodeURIComponent(bookingData.address)
    const start = encodeURIComponent(startLocal)
    const end = encodeURIComponent(endLocal)
    return `/api/booking/ics?title=${title}&description=${description}&location=${location}&start=${start}&end=${end}`
  }

  const nextStep = () => {
    if (step < 4) setStep(step + 1)
  }

  const prevStep = () => {
    if (step > 1) setStep(step - 1)
  }

  const isStepValid = () => {
    switch (step) {
      case 1: return bookingData.service !== ''
      case 2: return bookingData.date !== '' && bookingData.time !== ''
      case 3: return bookingData.clientInfo.name !== '' && bookingData.clientInfo.phone !== ''
      default: return true
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
        <h2 className="text-2xl font-bold mb-2">🚀 Prise de Rendez-vous Digitale</h2>
        <p className="text-blue-100">Planifiez votre intervention en quelques clics - Confirmation immédiate</p>
        
        {/* Progress Bar */}
        <div className="mt-4 flex items-center space-x-2">
          {[1, 2, 3, 4].map((stepNum) => (
            <div key={stepNum} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                stepNum <= step ? 'bg-white text-blue-600' : 'bg-blue-500 text-white'
              }`}>
                {stepNum < step ? <CheckCircle className="h-5 w-5" /> : stepNum}
              </div>
              {stepNum < 4 && <div className={`w-8 h-1 ${stepNum < step ? 'bg-white' : 'bg-blue-500'}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Étape 1: Choix du service */}
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">1. Sélectionnez votre service</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.map((service) => {
                const IconComponent = service.icon
                return (
                  <button
                    key={service.id}
                    onClick={() => setBookingData({...bookingData, service: service.id, duration: service.duration})}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      bookingData.service === service.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <IconComponent className={`h-6 w-6 mt-1 ${
                        bookingData.service === service.id ? 'text-blue-600' : 'text-gray-400'
                      }`} />
                      <div>
                        <h4 className="font-medium text-gray-900">{service.name}</h4>
                        <p className="text-sm text-gray-500 mt-1">{service.description}</p>
                        <span className="inline-block mt-2 px-2 py-1 bg-gray-100 text-xs rounded">
                          Durée: {service.duration}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Étape 2: Date et heure */}
        {step === 2 && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">2. Choisissez votre créneau</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="h-4 w-4 inline mr-2" />
                  Date souhaitée
                </label>
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={bookingData.date}
                  onChange={(e) => setBookingData({...bookingData, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="h-4 w-4 inline mr-2" />
                  Heure préférée
                </label>
                <select
                  value={bookingData.time}
                  onChange={(e) => setBookingData({...bookingData, time: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Sélectionner...</option>
                  {timeSlots.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Urgence</label>
              <div className="flex space-x-4">
                {[
                  { value: 'normal', label: 'Normal', color: 'green' },
                  { value: 'urgent', label: 'Urgent (48h)', color: 'orange' },
                  { value: 'critical', label: 'Critique (24h)', color: 'red' }
                ].map(urgency => (
                  <button
                    key={urgency.value}
                    onClick={() => setBookingData({...bookingData, urgency: urgency.value as any})}
                    className={`px-4 py-2 rounded-lg border-2 transition-all ${
                      bookingData.urgency === urgency.value
                        ? `border-${urgency.color}-500 bg-${urgency.color}-50 text-${urgency.color}-700`
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {urgency.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Étape 3: Informations client */}
        {step === 3 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">3. Vos informations</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="h-4 w-4 inline mr-2" />
                  Nom complet *
                </label>
                <input
                  type="text"
                  required
                  value={bookingData.clientInfo.name}
                  onChange={(e) => setBookingData({
                    ...bookingData,
                    clientInfo: {...bookingData.clientInfo, name: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Votre nom"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="h-4 w-4 inline mr-2" />
                  Téléphone *
                </label>
                <input
                  type="tel"
                  required
                  value={bookingData.clientInfo.phone}
                  onChange={(e) => setBookingData({
                    ...bookingData,
                    clientInfo: {...bookingData.clientInfo, phone: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+221 77 xxx xx xx"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="h-4 w-4 inline mr-2" />
                  Email
                </label>
                <input
                  type="email"
                  value={bookingData.clientInfo.email}
                  onChange={(e) => setBookingData({
                    ...bookingData,
                    clientInfo: {...bookingData.clientInfo, email: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="votre@email.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entreprise
                </label>
                <input
                  type="text"
                  value={bookingData.clientInfo.company}
                  onChange={(e) => setBookingData({
                    ...bookingData,
                    clientInfo: {...bookingData.clientInfo, company: e.target.value}
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nom de votre entreprise"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="h-4 w-4 inline mr-2" />
                Adresse complète *
              </label>
              <input
                type="text"
                required
                value={bookingData.address}
                onChange={(e) => setBookingData({...bookingData, address: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Adresse complète du rendez-vous"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Détails supplémentaires
              </label>
              <textarea
                value={bookingData.details}
                onChange={(e) => setBookingData({...bookingData, details: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Décrivez brièvement votre projet ou besoin..."
              />
            </div>
          </div>
        )}

        {/* Étape 4: Confirmation */}
        {step === 4 && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">4. Confirmation de votre rendez-vous</h3>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="font-medium text-gray-900 mb-4">Récapitulatif :</h4>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Service :</span>
                  <span className="font-medium">{services.find(s => s.id === bookingData.service)?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Date :</span>
                  <span className="font-medium">{new Date(bookingData.date).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Heure :</span>
                  <span className="font-medium">{bookingData.time}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Durée estimée :</span>
                  <span className="font-medium">{bookingData.duration}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Client :</span>
                  <span className="font-medium">{bookingData.clientInfo.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Adresse :</span>
                  <span className="font-medium text-right max-w-xs">{bookingData.address}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                <CheckCircle className="h-4 w-4 inline mr-2" />
                Votre demande de rendez-vous sera envoyée via WhatsApp pour confirmation immédiate.
                Vous recevrez une réponse dans les plus brefs délais.
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8 pt-6 border-t">
          <button
            onClick={prevStep}
            disabled={step === 1}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              step === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Précédent
          </button>
          
          {step < 4 ? (
            <button
              onClick={nextStep}
              disabled={!isStepValid()}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                isStepValid()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              Suivant
              <ArrowRight className="h-4 w-4 inline ml-2" />
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={generateWhatsAppBooking()}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-medium transition-colors inline-flex items-center"
              >
                <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                </svg>
                Confirmer sur WhatsApp
              </a>
              <a
                href={generateICSUrl()}
                className="bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 px-6 py-2 rounded-lg font-medium transition-colors inline-flex items-center"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2h-1M5 21a2 2 0 01-2-2V7a2 2 0 012-2h1" />
                </svg>
                Ajouter au calendrier (.ics)
              </a>
              <button
                onClick={async ()=>{
                  const res = await fetch('/api/booking/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...bookingData, channels: { email: !!bookingData.clientInfo.email, sms: true, whatsapp: false } }) })
                  if (res.ok) alert('Confirmation envoyée (stubs)')
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Envoyer confirmations
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}