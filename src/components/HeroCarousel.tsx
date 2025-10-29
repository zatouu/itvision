'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ArrowRight, Camera, Lock, Home, Flame, Cable, Shield, CircuitBoard } from 'lucide-react'
import Link from 'next/link'

interface Slide {
  id: number
  title: string
  subtitle: string
  description: string
  ctaText: string
  ctaLink: string
  bgColor: string
  image?: string
  icon?: React.ReactNode
}

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  const slides: Slide[] = [
    {
      id: 1,
      title: 'Vidéosurveillance Intelligente',
      subtitle: 'Surveillance 24/7 avec analyses IA',
      description: 'Caméras HD/4K, détection intelligente et supervision temps réel pour une sécurité optimale',
      ctaText: 'Découvrir',
      ctaLink: '/services/videosurveillance',
      bgColor: 'from-white via-emerald-100 to-emerald-200',
      image: '/images/visiophonie.jpeg'
    },
    {
      id: 2,
      title: 'Contrôle d\'Accès Moderne',
      subtitle: 'Sécurisez vos espaces professionnels',
      description: 'Badges RFID, biométrie et gestion centralisée des autorisations pour une protection maximale',
      ctaText: 'En savoir plus',
      ctaLink: '/services/controle-acces',
      bgColor: 'from-white via-purple-100 to-purple-200',
      image: '/images/ecran_ascenseur.jpeg'
    },
    {
      id: 3,
      title: 'Digitalisation des Process',
      subtitle: 'Transformez votre entreprise',
      description: 'Automatisez vos workflows, optimisez vos opérations et boostez votre productivité',
      ctaText: 'Transformer',
      ctaLink: '/digitalisation',
      bgColor: 'from-white via-emerald-100 to-purple-200',
      image: '/images/digitalisation.png'
    },
    {
      id: 4,
      title: 'Domotique & Sécurité Incendie',
      subtitle: 'Solutions intelligentes pour votre sécurité',
      description: 'Domotique avancée et systèmes de détection incendie conformes aux normes les plus strictes',
      ctaText: 'Protéger',
      ctaLink: '/domotique',
      bgColor: 'from-white via-purple-100 to-emerald-200',
      image: '/images/domo2.jpeg'
    },
    {
      id: 5,
      title: 'Réseau & Fibre Optique',
      subtitle: 'Infrastructure haute performance',
      description: 'Câblage Cat6A/Cat7, fibre optique FTTH et solutions réseau pour une connectivité optimale',
      ctaText: 'Connecter',
      ctaLink: '/services/fiber-optic',
      bgColor: 'from-white via-emerald-100 to-emerald-200',
      image: '/images/fibre.jpeg'
    }
  ]

  useEffect(() => {
    if (!isAutoPlaying) return

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000) // Change toutes les 5 secondes

    return () => clearInterval(interval)
  }, [isAutoPlaying, slides.length])

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
    setIsAutoPlaying(false)
    setTimeout(() => setIsAutoPlaying(true), 10000) // Reprend auto après 10s
  }

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
    setIsAutoPlaying(false)
    setTimeout(() => setIsAutoPlaying(true), 10000)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
    setIsAutoPlaying(false)
    setTimeout(() => setIsAutoPlaying(true), 10000)
  }

  return (
    <div className="relative w-full overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Container du carousel */}
      <div className="relative h-[500px] md:h-[600px] lg:h-[650px]">
        {/* Slides */}
        <div className="relative h-full">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                index === currentSlide
                  ? 'opacity-100 translate-x-0'
                  : index < currentSlide
                  ? 'opacity-0 -translate-x-full'
                  : 'opacity-0 translate-x-full'
              }`}
            >
              {/* Background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${slide.bgColor}`} />
              
              {/* Content */}
              <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full items-center">
                  {/* Texte */}
                  <div className="text-gray-900 space-y-4 sm:space-y-6 py-8 sm:py-12 lg:py-0">
                    <div className="inline-block animate-pulse">
                      <span className="bg-gradient-to-r from-emerald-500 to-purple-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold shadow-lg">
                        ✨ Solution IT Vision
                      </span>
                    </div>
                    
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight bg-gradient-to-r from-emerald-600 to-purple-600 bg-clip-text text-transparent">
                      {slide.title}
                    </h1>
                    
                    <p className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-700">
                      {slide.subtitle}
                    </p>
                    
                    <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-xl leading-relaxed">
                      {slide.description}
                    </p>

                    <div className="pt-4 flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <Link
                        href={slide.ctaLink}
                        className="inline-flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-500 to-purple-600 text-white hover:from-emerald-600 hover:to-purple-700 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-bold transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 hover:scale-105 text-sm sm:text-base"
                      >
                        <span>{slide.ctaText}</span>
                        <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Link>
                      <Link
                        href="/contact"
                        className="inline-flex items-center justify-center space-x-2 bg-white text-gray-900 hover:bg-gray-50 px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold transition-all duration-300 border-2 border-gray-300 hover:border-emerald-500 shadow-lg text-sm sm:text-base"
                      >
                        <span>Nous contacter</span>
                      </Link>
                    </div>
                  </div>

                  {/* Image côté droit */}
                  <div className="hidden lg:flex items-center justify-center">
                    <div className="relative w-full h-[450px] rounded-3xl overflow-hidden shadow-2xl border-4 border-white/50 backdrop-blur-sm">
                      {/* Image du service */}
                      <img
                        src={slide.image}
                        alt={slide.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                      />
                      
                      {/* Overlay gradient pour effet */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                      
                      {/* Badge sur l'image */}
                      <div className="absolute bottom-6 left-6 right-6">
                        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl">
                          <p className="text-sm font-semibold text-gray-900">{slide.title}</p>
                          <p className="text-xs text-gray-600 mt-1">{slide.subtitle}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Décoration en bas - optionnelle */}
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white/30 to-transparent" />
            </div>
          ))}
        </div>

        {/* Boutons de navigation */}
        <button
          onClick={prevSlide}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10 bg-transparent hover:bg-white/20 backdrop-blur-sm text-gray-900 p-2 sm:p-3 rounded-full transition-all duration-300 hover:scale-110 shadow-lg border-2 border-transparent hover:border-gray-200 touch-manipulation"
          aria-label="Slide précédent"
        >
          <ChevronLeft className="h-4 w-4 sm:h-6 sm:w-6" />
        </button>

        <button
          onClick={nextSlide}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10 bg-transparent hover:bg-white/20 backdrop-blur-sm text-gray-900 p-2 sm:p-3 rounded-full transition-all duration-300 hover:scale-110 shadow-lg border-2 border-transparent hover:border-gray-200 touch-manipulation"
          aria-label="Slide suivant"
        >
          <ChevronRight className="h-4 w-4 sm:h-6 sm:w-6" />
        </button>

        {/* Indicateurs de slides (points en bas) */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex space-x-3">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`transition-all duration-300 rounded-full shadow-lg ${
                index === currentSlide
                  ? 'w-12 h-3 bg-gradient-to-r from-emerald-500 to-purple-600'
                  : 'w-3 h-3 bg-gray-400 hover:bg-gray-600'
              }`}
              aria-label={`Aller au slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Overlay pour transition douce */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-white/10" />
    </div>
  )
}

