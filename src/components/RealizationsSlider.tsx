'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, MapPin, Camera, Users, Play } from 'lucide-react'

interface Realization {
  id: number
  title: string
  location: string
  description: string
  image: string
  category: 'project' | 'team'
  services: string[]
}

const realizations: Realization[] = [
  {
    id: 1,
    title: "Installation Vidéosurveillance Centre Commercial",
    location: "Dakar, Plateau",
    description: "Système complet de vidéosurveillance avec 24 caméras 4K, contrôle d'accès et surveillance 24h/7j.",
    image: "/images/placeholder-surveillance.jpg",
    category: "project",
    services: ["Vidéosurveillance", "Contrôle d'accès", "Monitoring"]
  },
  {
    id: 2,
    title: "Équipe Technique en Action",
    location: "Installation sur site",
    description: "Nos techniciens certifiés lors de l'installation d'un système de sécurité complexe.",
    image: "/images/placeholder-team-1.jpg",
    category: "team",
    services: ["Installation", "Configuration", "Formation"]
  },
  {
    id: 3,
    title: "Domotique Résidentielle Premium",
    location: "Almadies, Villa",
    description: "Maison intelligente complète avec automatisation éclairage, sécurité et confort.",
    image: "/images/placeholder-domotique.jpg",
    category: "project",
    services: ["Domotique", "Automatisation", "Smart Home"]
  },
  {
    id: 4,
    title: "Formation Client Système",
    location: "Centre de formation",
    description: "Formation complète du personnel client sur l'utilisation des systèmes installés.",
    image: "/images/placeholder-team-2.jpg",
    category: "team",
    services: ["Formation", "Support", "Accompagnement"]
  },
  {
    id: 5,
    title: "Contrôle d'Accès Entreprise",
    location: "Zone Industrielle",
    description: "Système biométrique et badges RFID pour sécuriser l'accès à l'entreprise.",
    image: "/images/placeholder-access.jpg",
    category: "project",
    services: ["Biométrie", "RFID", "Sécurité"]
  },
  {
    id: 6,
    title: "Équipe de Maintenance",
    location: "Intervention terrain",
    description: "Service de maintenance préventive et corrective de nos équipements.",
    image: "/images/placeholder-team-3.jpg",
    category: "team",
    services: ["Maintenance", "Support", "Dépannage"]
  }
]

export default function RealizationsSlider() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  // Auto-play slider
  useEffect(() => {
    if (!isAutoPlaying) return

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % realizations.length)
    }, 4000)

    return () => clearInterval(interval)
  }, [isAutoPlaying])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % realizations.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + realizations.length) % realizations.length)
  }

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
  }

  const currentRealization = realizations[currentSlide]

  return (
    <div className="relative max-w-6xl mx-auto">
      {/* Slide principal */}
      <div 
        className="relative h-96 rounded-2xl overflow-hidden shadow-2xl"
        onMouseEnter={() => setIsAutoPlaying(false)}
        onMouseLeave={() => setIsAutoPlaying(true)}
      >
        {/* Image de fond avec overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent">
          <div 
            className="w-full h-full bg-cover bg-center transition-all duration-700"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-${currentRealization.category === 'team' ? '1571019613454-1cb2f99b2d8b' : '1558618666-fabe5d0cbeb8'}?w=1200&h=400&fit=crop')`
            }}
          />
        </div>

        {/* Contenu du slide */}
        <div className="absolute inset-0 flex items-center justify-between p-8">
          <div className="flex-1 text-white">
            <div className="flex items-center mb-4">
              {currentRealization.category === 'team' ? (
                <Users className="h-6 w-6 text-green-400 mr-2" />
              ) : (
                <Camera className="h-6 w-6 text-blue-400 mr-2" />
              )}
              <span className="text-sm uppercase tracking-wide text-gray-300">
                {currentRealization.category === 'team' ? 'Équipe' : 'Projet'}
              </span>
            </div>
            
            <h3 className="text-3xl font-bold mb-4">{currentRealization.title}</h3>
            
            <div className="flex items-center text-gray-300 mb-4">
              <MapPin className="h-4 w-4 mr-2" />
              {currentRealization.location}
            </div>
            
            <p className="text-lg text-gray-200 mb-6 max-w-2xl">
              {currentRealization.description}
            </p>
            
            <div className="flex flex-wrap gap-2">
              {currentRealization.services.map((service, idx) => (
                <span
                  key={idx}
                  className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium"
                >
                  {service}
                </span>
              ))}
            </div>
          </div>

          {/* Indicateur de lecture */}
          <div className="hidden lg:flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full ml-8">
            <Play className="h-8 w-8 text-white" />
          </div>
        </div>

        {/* Boutons de navigation */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300"
          aria-label="Slide précédent"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>

        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all duration-300"
          aria-label="Slide suivant"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      {/* Indicateurs de pagination */}
      <div className="flex justify-center space-x-2 mt-8">
        {realizations.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentSlide 
                ? 'bg-blue-600 w-8' 
                : 'bg-gray-300 hover:bg-gray-400'
            }`}
            aria-label={`Aller au slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Mini aperçus */}
      <div className="hidden md:grid grid-cols-3 gap-4 mt-8">
        {[
          realizations[(currentSlide + 1) % realizations.length],
          realizations[(currentSlide + 2) % realizations.length],
          realizations[(currentSlide + 3) % realizations.length]
        ].map((realization, index) => (
          <div
            key={realization.id}
            onClick={() => goToSlide((currentSlide + index + 1) % realizations.length)}
            className="bg-gray-50 hover:bg-gray-100 rounded-xl p-4 cursor-pointer transition-all duration-300 border border-gray-200 hover:border-blue-300 hover:shadow-md"
          >
            <div className="flex items-center mb-2">
              {realization.category === 'team' ? (
                <Users className="h-4 w-4 text-green-500 mr-2" />
              ) : (
                <Camera className="h-4 w-4 text-blue-500 mr-2" />
              )}
              <span className="text-xs text-gray-500 uppercase tracking-wide">
                {realization.category === 'team' ? 'Équipe' : 'Projet'}
              </span>
            </div>
            <h4 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
              {realization.title}
            </h4>
            <p className="text-xs text-gray-600 flex items-center">
              <MapPin className="h-3 w-3 mr-1" />
              {realization.location}
            </p>
          </div>
        ))}
      </div>

      {/* Message pour les vraies photos */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700 text-center">
          📸 <strong>Images temporaires :</strong> Ces images seront remplacées par vos vraies photos de réalisations et équipes une fois fournies.
        </p>
      </div>
    </div>
  )
}