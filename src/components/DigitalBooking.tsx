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
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 wizard-header">
        <h2 className="text-2xl font-bold mb-2 text-white !text-white">🚀 Prise de Rendez-vous</h2>
        <p className="text-white !text-white">Planifiez votre intervention en quelques clics - Confirmation immédiate</p>
        
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
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sélection de date */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="h-4 w-4 inline mr-2" />
                    Date souhaitée
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    max={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    value={bookingData.date}
                    onChange={(e) => setBookingData({...bookingData, date: e.target.value, time: ''})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Disponible jusqu'à 3 mois à l'avance
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Urgence</label>
                  <div className="space-y-2">
                    {[
                      { value: 'normal', label: 'Normal', desc: 'Planification standard', color: 'green', icon: '📅' },
                      { value: 'urgent', label: 'Urgent', desc: 'Intervention sous 48h', color: 'orange', icon: '⚡' },
                      { value: 'critical', label: 'Critique', desc: 'Intervention sous 24h', color: 'red', icon: '🚨' }
                    ].map(urgency => (
                      <button
                        key={urgency.value}
                        onClick={() => setBookingData({...bookingData, urgency: urgency.value as any})}
                        className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                          bookingData.urgency === urgency.value
                            ? `border-${urgency.color}-500 bg-${urgency.color}-50`
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{urgency.icon}</span>
                          <div>
                            <div className={`font-medium ${
                              bookingData.urgency === urgency.value
                                ? `text-${urgency.color}-700`
                                : 'text-gray-900'
                            }`}>
                              {urgency.label}
                            </div>
                            <div className={`text-sm ${
                              bookingData.urgency === urgency.value
                                ? `text-${urgency.color}-600`
                                : 'text-gray-500'
                            }`}>
                              {urgency.desc}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sélection d'heure */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="h-4 w-4 inline mr-2" />
                  Créneaux disponibles
                  {bookingData.date && (
                    <span className="text-blue-600 ml-2">
                      {new Date(bookingData.date).toLocaleDateString('fr-FR', { 
                        weekday: 'long', 
                        day: 'numeric', 
                        month: 'long' 
                      })}
                    </span>
                  )}
                </label>
                
                {!bookingData.date ? (
                  <div className="flex items-center justify-center h-40 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="text-center">
                      <Calendar className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-500">Sélectionnez d'abord une date</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                    {timeSlots.map(time => {
                      const isSelected = bookingData.time === time
                      const isPastTime = bookingData.date === new Date().toISOString().split('T')[0] && 
                                        new Date(`${bookingData.date}T${time}`) < new Date()
                      
                      return (
                        <button
                          key={time}
                          disabled={isPastTime}
                          onClick={() => setBookingData({...bookingData, time})}
                          className={`p-3 rounded-lg border-2 text-center transition-all ${
                            isPastTime
                              ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                              : isSelected
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          <div className="font-medium">{time}</div>
                          <div className="text-xs text-gray-500">
                            {isPastTime ? 'Passé' : 'Disponible'}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
                
                {bookingData.date && bookingData.time && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-800">
                        Créneau sélectionné : {new Date(bookingData.date).toLocaleDateString('fr-FR', { 
                          weekday: 'long', 
                          day: 'numeric', 
                          month: 'long' 
                        })} à {bookingData.time}
                      </span>
                    </div>
                  </div>
                )}
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
            
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Options d'envoi disponibles
              </h4>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                    <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">WhatsApp Business</p>
                    <p className="text-sm text-gray-600">Confirmation immédiate via WhatsApp</p>
                  </div>
                </div>
                
                {bookingData.clientInfo.email && (
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                      <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Email de confirmation</p>
                      <p className="text-sm text-gray-600">Détails complets + lien calendrier à {bookingData.clientInfo.email}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-full">
                    <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">SMS de rappel</p>
                    <p className="text-sm text-gray-600">Notification SMS au {bookingData.clientInfo.phone}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-full">
                    <svg className="h-4 w-4 text-yellow-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2h-1M5 21a2 2 0 01-2-2V7a2 2 0 012-2h1" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Fichier calendrier (.ics)</p>
                    <p className="text-sm text-gray-600">À télécharger pour vos applications calendrier</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <svg className="h-4 w-4 inline mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Notre équipe vous contactera dans les plus brefs délais pour confirmer définitivement votre créneau.
                </p>
              </div>
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
                  const res = await fetch('/api/booking/confirm', { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ 
                      ...bookingData, 
                      channels: { 
                        email: !!bookingData.clientInfo.email, 
                        sms: true, 
                        whatsapp: false 
                      } 
                    }) 
                  })
                  
                  if (res.ok) {
                    const result = await res.json()
                    const emailSent = result.events?.find((e: any) => e.type === 'email')?.status === 'sent'
                    
                    if (emailSent && bookingData.clientInfo.email) {
                      alert(`✅ Demande envoyée avec succès !\n\n📧 Email de confirmation envoyé à ${bookingData.clientInfo.email}\n📱 SMS de confirmation programmé\n\nNotre équipe vous contactera rapidement.`)
                    } else {
                      alert('✅ Demande envoyée avec succès !\n\n📱 SMS de confirmation programmé\n\nNotre équipe vous contactera rapidement.')
                    }
                  } else {
                    alert('❌ Erreur lors de l\'envoi. Veuillez réessayer.')
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Envoyer par Email & SMS
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}