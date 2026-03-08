'use client'

import { useState } from 'react'
import DigitalBooking from './DigitalBooking'
import SmartQuoteCalculator from './SmartQuoteCalculator'
import SmartChatbot from './SmartChatbot'
import ClientPortal from './ClientPortal'
import Header from './Header'
import Footer from './Footer'
import HeroCarousel from './HeroCarousel'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Camera, 
  Lock, 
  Home, 
  Flame, 
  Cable, 
  Wrench, 
  ArrowRight, 
  Shield, 
  Clock,
  CheckCircle,
  Star,
  Phone,
  MapPin,
  Award,
  Building,
  User,
  Check,
  CircuitBoard,
  FileCheck
} from 'lucide-react'

export default function DigitalHomepage() {
  const [activeFeature, setActiveFeature] = useState<string | null>(null)

  const services = [
    {
      id: 'videosurveillance',
      title: 'Vidéosurveillance',
      description: 'Surveillance professionnelle haute définition',
      icon: Camera,
      color: 'from-green-500 to-green-600'
    },
    {
      id: 'controle-acces',
      title: 'Contrôle d\'accès',
      description: 'Systèmes de sécurité et badge RFID',
      icon: Lock,
      color: 'from-green-500 to-green-600'
    },
    {
      id: 'domotique',
      title: 'Domotique',
      description: 'Protocoles mesh avancés et solutions sur-mesure',
      icon: Home,
      color: 'from-purple-500 to-purple-600'
    },
    {
      id: 'securite-incendie',
      title: 'Sécurité incendie',
      description: 'Détection et extinction automatique',
      icon: Flame,
      color: 'from-red-500 to-red-600'
    },
    {
      id: 'network-cabling',
      title: 'Câblage réseau',
      description: 'Infrastructure réseau et fibre optique',
      icon: Cable,
      color: 'from-orange-500 to-orange-600'
    },
    {
      id: 'digitalisation-pme',
      title: 'Digitalisation PME',
      description: 'Transformation digitale et automatisation',
      icon: CircuitBoard,
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'maintenance',
      title: 'Maintenance',
      description: 'Support technique et entretien préventif',
      icon: Wrench,
      color: 'from-gray-500 to-gray-600'
    },
    {
      id: 'qhse',
      title: 'QHSE',
      description: 'Qualité, Hygiène, Sécurité, Environnement',
      icon: FileCheck,
      color: 'from-teal-500 to-teal-600'
    }
  ]

  const stats = [
    {
      value: '2019',
      label: 'Expertise IoT/LoRaWAN',
      icon: Award,
      color: 'text-green-600'
    },
    {
      value: '200+',
      label: 'Projets IoT/Sécurité',
      icon: CheckCircle,
      color: 'text-green-600'
    },
    {
      value: '24h/7j',
      label: 'Support technique',
      icon: Clock,
      color: 'text-orange-600'
    },
    {
      value: '5+',
      label: 'Années d\'innovation',
      icon: Star,
      color: 'text-purple-600'
    }
  ]

  const realisations = [
    {
      title: 'Résidence ANTALYA',
      location: 'Mermoz, Dakar',
      description: '15 appartements équipés en vidéosurveillance, visiophonie et domotique complète',
      services: ['Câblage réseau', 'Vidéosurveillance', 'Visiophonie', 'Domotique']
    },
    {
      title: 'LOCAFRIQUE',
      location: 'Almadies, Dakar',
      description: '42 caméras POE sur 5 étages avec transmission longue distance',
      services: ['Vidéosurveillance', 'Architecture réseau', 'Transmission']
    }
  ]

  return (
    <main>
      <Header />
      <div className="min-h-screen bg-white dark:bg-black">
        {/* Hero Carousel Section */}
        <section className="relative page-content">
          <HeroCarousel />
        </section>

        {/* Stats rapides sous le carousel */}
        <section className="py-12 bg-white dark:bg-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat, index) => {
                const IconComponent = stat.icon
                return (
                  <div key={index} className="bg-gradient-to-br from-gray-50 to-white dark:from-slate-900 dark:to-slate-950 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-800 hover:shadow-xl transition-shadow">
                    <IconComponent className={`h-8 w-8 ${stat.color} mx-auto mb-3`} />
                    <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{stat.value}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">{stat.label}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Section Réalisations avec Mini-Cartes Modernes */}
        <section className="py-20 bg-gradient-to-br from-gray-50 via-white to-green-50 dark:from-black dark:via-black dark:to-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="text-center mb-16">
              <div className="inline-block mb-4">
                <span className="bg-gradient-to-r from-green-500 to-violet-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                  Portfolio
                </span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Nos <span className="bg-gradient-to-r from-green-600 to-violet-600 bg-clip-text text-transparent">Réalisations</span>
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Découvrez nos projets récents qui témoignent de notre expertise et de notre engagement
              </p>
            </div>

            {/* Grid de cartes détaillées avec aperçu des projets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              {/* Carte 1 - Projet Antalya */}
              <Link href="/realisations" className="group">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100 dark:border-slate-800 hover:border-green-200">
                  {/* Image principale */}
                  <div className="relative h-64 overflow-hidden">
                    <img 
                      src="/images/Antalya-front.jpg" 
                      alt="Résidence Antalya" 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="bg-gradient-to-r from-green-500 to-violet-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">
                        🏆 Résidentiel
                      </span>
                    </div>
                  </div>
                  
                  {/* Contenu détaillé */}
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">Mermoz, Dakar</span>
                    </div>
                    
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-green-600 transition-colors">
                      Résidence ANTALYA
                    </h3>
                    
                    <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm leading-relaxed">
                      Installation complète des systèmes de sécurité et domotique pour un immeuble résidentiel de luxe de 15 appartements.
                    </p>
                    
                    {/* Points clés */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">15 appartements équipés (TV + RJ45)</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Visiophonie HD intégrée</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Domotique centralisée par appartement</span>
                      </div>
                    </div>
                    
                    {/* Mini-galerie */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <img src="/images/domo1.jpeg" alt="Domotique" className="w-full h-20 object-cover rounded-lg" />
                      <img src="/images/domo2.jpeg" alt="Installation" className="w-full h-20 object-cover rounded-lg" />
                      <img src="/images/visiophonie.jpeg" alt="Visiophonie" className="w-full h-20 object-cover rounded-lg" />
                    </div>
                    
                    {/* Tags et CTA */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-200 px-3 py-1 rounded-full text-xs font-semibold">Câblage réseau</span>
                        <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-200 px-3 py-1 rounded-full text-xs font-semibold">Visiophonie</span>
                        <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 px-3 py-1 rounded-full text-xs font-semibold">Domotique</span>
                      </div>
                      <ArrowRight className="h-5 w-5 text-green-600 group-hover:translate-x-2 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>

              {/* Carte 2 - Projet Locafrique */}
              <Link href="/realisations" className="group">
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100 dark:border-slate-800 hover:border-purple-200">
                  {/* Image principale */}
                  <div className="relative h-64 overflow-hidden">
                    <img 
                      src="/images/locafrique.jpg" 
                      alt="Locafrique" 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="bg-gradient-to-r from-violet-500 to-green-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">
                        💼 Financier
                      </span>
                    </div>
                  </div>
                  
                  {/* Contenu détaillé */}
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Building className="h-4 w-4 text-purple-600" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">Almadies, Dakar</span>
                    </div>
                    
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-purple-600 transition-colors">
                      LOCAFRIQUE
                    </h3>
                    
                    <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm leading-relaxed">
                      Installation d'un système de vidéosurveillance avancé pour un établissement financier sur 5 étages avec 42 caméras POE.
                    </p>
                    
                    {/* Points clés */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">42 caméras POE sur 5 étages</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Transmission longue distance optimisée</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">Affichage multi-points (3 points)</span>
                      </div>
                    </div>
                    
                    {/* Mini-galerie */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <img src="/images/visiophonie.jpeg" alt="Surveillance" className="w-full h-20 object-cover rounded-lg" />
                      <img src="/images/ecran_ascenseur.jpeg" alt="Affichage" className="w-full h-20 object-cover rounded-lg" />
                      <img src="/images/fibre.jpeg" alt="Infrastructure" className="w-full h-20 object-cover rounded-lg" />
                    </div>
                    
                    {/* Tags et CTA */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-200 px-3 py-1 rounded-full text-xs font-semibold">Vidéosurveillance</span>
                        <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-200 px-3 py-1 rounded-full text-xs font-semibold">Architecture réseau</span>
                        <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 px-3 py-1 rounded-full text-xs font-semibold">Multi-points</span>
                      </div>
                      <ArrowRight className="h-5 w-5 text-purple-600 group-hover:translate-x-2 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            </div>

            {/* CTA modernisé */}
            <div className="text-center">
              <Link
                href="/realisations"
                className="inline-flex items-center gap-3 bg-gradient-to-r from-green-500 to-violet-600 hover:from-green-600 hover:to-violet-700 text-white px-10 py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
              >
                <span>Découvrir tous nos projets</span>
                <ArrowRight className="h-5 w-5" />
              </Link>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                Plus de 25 projets réalisés avec succès
              </p>
            </div>
          </div>
        </section>

        {/* Section Partenaires */}
        <section className="py-16 bg-gradient-to-br from-gray-50 via-white to-green-50 dark:from-black dark:via-black dark:to-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-block mb-4">
                <span className="bg-gradient-to-r from-green-500 to-violet-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                  Références
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Nos <span className="bg-gradient-to-r from-green-600 to-violet-600 bg-clip-text text-transparent">Partenaires</span>
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Des entreprises de tous secteurs nous font confiance pour leurs projets de sécurité électronique et digitalisation
              </p>
            </div>

            {/* Carousel des logos partenaires */}
            <div className="relative overflow-hidden">
              {/* Gradient de masquage */}
              <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white to-transparent dark:from-black z-10"></div>
              <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white to-transparent dark:from-black z-10"></div>
              
              {/* Animation de défilement */}
              <div className="flex animate-scroll">
                {/* Premier set de logos */}
                <div className="flex items-center space-x-8 flex-shrink-0">
                  {/* Partenaire 1 - LOCAFRIQUE */}
                  <div className="flex items-center justify-center w-32 h-20 md:w-40 md:h-24 p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-xl border border-gray-100 dark:border-slate-800 hover:border-green-200 transition-all duration-500 group hover:scale-125">
                    <Image 
                      src="/images/clients/locaf.png" 
                      alt="LOCAFRIQUE" 
                      width={140}
                      height={90}
                      className="max-w-full max-h-full object-contain transition-all duration-500 group-hover:scale-110"
                    />
                  </div>

                  {/* Partenaire 2 - CEL */}
                  <div className="flex items-center justify-center w-32 h-20 md:w-40 md:h-24 p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-xl border border-gray-100 dark:border-slate-800 hover:border-green-200 transition-all duration-500 group hover:scale-125">
                    <Image 
                      src="/images/clients/CEL.png" 
                      alt="CEL" 
                      width={140}
                      height={90}
                      className="max-w-full max-h-full object-contain transition-all duration-500 group-hover:scale-110"
                    />
                  </div>

                  {/* Partenaire 3 - Sea Plaza */}
                  <div className="flex items-center justify-center w-32 h-20 md:w-40 md:h-24 p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-xl border border-gray-100 dark:border-slate-800 hover:border-green-200 transition-all duration-500 group hover:scale-125">
                    <Image 
                      src="/images/clients/sea-plza.png" 
                      alt="Sea Plaza" 
                      width={140}
                      height={90}
                      className="max-w-full max-h-full object-contain transition-all duration-500 group-hover:scale-110"
                    />
                  </div>

                  {/* Partenaire 4 - Sylla Bois */}
                  <div className="flex items-center justify-center w-32 h-20 md:w-40 md:h-24 p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-xl border border-gray-100 dark:border-slate-800 hover:border-green-200 transition-all duration-500 group hover:scale-125">
                    <Image 
                      src="/images/clients/sylla-bois.jpg" 
                      alt="Sylla Bois" 
                      width={140}
                      height={90}
                      className="max-w-full max-h-full object-contain transition-all duration-500 group-hover:scale-110"
                    />
                  </div>

                  {/* Partenaire 5 - Teyliom */}
                  <div className="flex items-center justify-center w-32 h-20 md:w-40 md:h-24 p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-xl border border-gray-100 dark:border-slate-800 hover:border-green-200 transition-all duration-500 group hover:scale-125">
                    <Image 
                      src="/images/clients/teyliom.jpg" 
                      alt="Teyliom" 
                      width={140}
                      height={90}
                      className="max-w-full max-h-full object-contain transition-all duration-500 group-hover:scale-110"
                    />
                  </div>
                </div>

                {/* Deuxième set de logos (pour l'effet de boucle) */}
                <div className="flex items-center space-x-8 flex-shrink-0 ml-8">
                  {/* Partenaire 1 - LOCAFRIQUE */}
                  <div className="flex items-center justify-center w-32 h-20 md:w-40 md:h-24 p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-xl border border-gray-100 dark:border-slate-800 hover:border-green-200 transition-all duration-500 group hover:scale-125">
                    <Image 
                      src="/images/clients/locaf.png" 
                      alt="LOCAFRIQUE" 
                      width={140}
                      height={90}
                      className="max-w-full max-h-full object-contain transition-all duration-500 group-hover:scale-110"
                    />
                  </div>

                  {/* Partenaire 2 - CEL */}
                  <div className="flex items-center justify-center w-32 h-20 md:w-40 md:h-24 p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-xl border border-gray-100 dark:border-slate-800 hover:border-green-200 transition-all duration-500 group hover:scale-125">
                    <Image 
                      src="/images/clients/CEL.png" 
                      alt="CEL" 
                      width={140}
                      height={90}
                      className="max-w-full max-h-full object-contain transition-all duration-500 group-hover:scale-110"
                    />
                  </div>

                  {/* Partenaire 3 - Sea Plaza */}
                  <div className="flex items-center justify-center w-32 h-20 md:w-40 md:h-24 p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-xl border border-gray-100 dark:border-slate-800 hover:border-green-200 transition-all duration-500 group hover:scale-125">
                    <Image 
                      src="/images/clients/sea-plza.png" 
                      alt="Sea Plaza" 
                      width={140}
                      height={90}
                      className="max-w-full max-h-full object-contain transition-all duration-500 group-hover:scale-110"
                    />
                  </div>

                  {/* Partenaire 4 - Sylla Bois */}
                  <div className="flex items-center justify-center w-32 h-20 md:w-40 md:h-24 p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-xl border border-gray-100 dark:border-slate-800 hover:border-green-200 transition-all duration-500 group hover:scale-125">
                    <Image 
                      src="/images/clients/sylla-bois.jpg" 
                      alt="Sylla Bois" 
                      width={140}
                      height={90}
                      className="max-w-full max-h-full object-contain transition-all duration-500 group-hover:scale-110"
                    />
                  </div>

                  {/* Partenaire 5 - Teyliom */}
                  <div className="flex items-center justify-center w-32 h-20 md:w-40 md:h-24 p-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-xl border border-gray-100 dark:border-slate-800 hover:border-green-200 transition-all duration-500 group hover:scale-125">
                    <Image 
                      src="/images/clients/teyliom.jpg" 
                      alt="Teyliom" 
                      width={140}
                      height={90}
                      className="max-w-full max-h-full object-contain transition-all duration-500 group-hover:scale-110"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Témoignage */}
            <div className="mt-12 text-center">
              <blockquote className="text-lg text-gray-700 dark:text-gray-300 italic max-w-3xl mx-auto mb-4">
                "IT Vision a su nous accompagner dans la digitalisation de nos processus de sécurité. 
                Leur expertise technique et leur professionnalisme nous ont permis d'optimiser nos opérations."
              </blockquote>
              <cite className="text-sm text-gray-500 dark:text-gray-400">
                — Directeur Technique, LOCAFRIQUE
              </cite>
            </div>
          </div>
        </section>

        {/* Section Achats Groupés */}
        <section className="py-20 bg-gradient-to-br from-violet-50 via-white to-green-50 dark:from-black dark:via-black dark:to-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="inline-block mb-4">
                <span className="bg-gradient-to-r from-green-500 to-violet-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                  Marketplace
                </span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                <span className="bg-gradient-to-r from-green-600 to-violet-600 bg-clip-text text-transparent">Achats Groupés</span>
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Regroupez vos commandes avec d&apos;autres acheteurs et bénéficiez de prix dégressifs sur l&apos;import direct Chine
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-lg border border-gray-100 dark:border-slate-800 text-center hover:shadow-xl transition-shadow">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <Camera className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Choisissez un produit</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Parcourez notre catalogue de produits importables depuis la Chine — caméras, alarmes, domotique, réseau.</p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-lg border border-gray-100 dark:border-slate-800 text-center hover:shadow-xl transition-shadow">
                <div className="w-16 h-16 bg-gradient-to-r from-violet-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Rejoignez un groupe</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Plus il y a de participants, plus le prix unitaire baisse. Tarifs dégressifs automatiques sur chaque palier.</p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-lg border border-gray-100 dark:border-slate-800 text-center hover:shadow-xl transition-shadow">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-violet-500 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Économisez ensemble</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Livraison groupée au Sénégal — jusqu&apos;à 40% d&apos;économie par rapport à un achat individuel.</p>
              </div>
            </div>

            <div className="text-center flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/achats-groupes"
                className="inline-flex items-center gap-3 bg-gradient-to-r from-green-500 to-violet-600 hover:from-green-600 hover:to-violet-700 text-white px-10 py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
              >
                Voir les achats groupés
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/produits"
                className="inline-flex items-center gap-3 border-2 border-gray-300 dark:border-slate-700 text-gray-700 dark:text-gray-200 px-10 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 dark:hover:bg-slate-900 transition-all duration-300"
              >
                Voir le catalogue
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Section Services */}
        <section className="py-20 bg-gray-50 dark:bg-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Nos <span className="text-green-600">Services</span>
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                Solutions complètes de sécurité électronique adaptées à tous vos besoins professionnels et résidentiels
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {services.map((service, index) => {
                const IconComponent = service.icon
                return (
                  <div key={index} className="group relative">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 hover:border-blue-300 transition-all duration-300 hover:shadow-lg">
                      <div className={`bg-gradient-to-br ${service.color} w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                      
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{service.title}</h3>
                      <p className="text-gray-600 dark:text-gray-300 mb-4">{service.description}</p>
                      
                      <Link
                        href={
                          service.id === 'domotique' ? '/domotique' :
                          service.id === 'digitalisation-pme' ? '/digitalisation' :
                          service.id === 'qhse' ? '/services/qhse' :
                          `/services/${service.id}`
                        }
                        className="text-green-600 dark:text-green-300 hover:text-green-700 font-medium inline-flex items-center"
                      >
                        {service.id === 'domotique' || service.id === 'digitalisation-pme' ? 'Page dédiée' : 'En savoir plus'}
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
            
            <div className="text-center mt-12">
              <Link
                href="/services"
                className="bg-gradient-to-r from-green-500 to-violet-500 hover:from-green-600 hover:to-violet-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors inline-flex items-center">
                Voir tous nos services
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </div>
          </div>
        </section>

        {/* Section Prise de Rendez-vous Digitale */}
        <section className="py-16 bg-white dark:bg-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">Planifier maintenant — sécurité électronique & domotique</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">Confirmez un créneau en quelques clics et recevez une confirmation. Simple et rapide.</p>
            </div>
            <DigitalBooking />
          </div>
        </section>

        {/* Section Calculateur de Devis */}
        <section className="py-16 bg-gray-50 dark:bg-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3">Obtenir mon estimation — vidéosurveillance & contrôle d'accès</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">Sélectionnez vos équipements et paramètres. Estimation automatique et partage par WhatsApp.</p>
            </div>
            <SmartQuoteCalculator />
          </div>
        </section>



        {/* Section À propos / Pourquoi nous choisir */}
        <section className="py-20 bg-gradient-to-br from-green-50 via-violet-50 to-gray-50 dark:from-black dark:via-black dark:to-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-4xl font-bold mb-6 text-gray-900 dark:text-white">
                  Pourquoi choisir <br />
                  <span className="text-green-600">IT Vision ?</span>
                </h2>
                
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Award className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Expertise complète en sécurité</h3>
                      <p className="text-gray-700 dark:text-gray-300">Vidéosurveillance, contrôle d'accès, sécurité incendie, câblage réseau, fibre optique et domotique. Solutions intégrées pour votre protection totale.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Solutions sur mesure</h3>
                      <p className="text-gray-700 dark:text-gray-300">Chaque projet est unique. Nous analysons vos besoins pour vous proposer la solution la plus adaptée.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Support 24h/7j</h3>
                      <p className="text-gray-700 dark:text-gray-300">Une équipe technique disponible pour vous assister et maintenir vos équipements en parfait état.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-slate-800">
                <h3 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">Nos engagements</h3>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">Devis</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Gratuit et détaillé</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-2">Installation</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Professionnelle</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-2">Garantie</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Constructeur</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600 mb-2">Formation</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Utilisateurs incluse</div>
                  </div>
                </div>
                
                <div className="mt-8 text-center">
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    <strong>Votre sécurité, notre priorité.</strong><br />
                    Des solutions fiables pour protéger ce qui compte le plus pour vous.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section Portail d'accès unifié */}
        <section className="py-20 bg-gradient-to-br from-gray-50 via-violet-50 to-green-50 dark:from-black dark:via-black dark:to-black">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="mb-12">
              <h2 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
                Accès <span className="text-green-600">Portail</span>
              </h2>
              <p className="text-xl text-gray-700 dark:text-gray-300 max-w-3xl mx-auto mb-8">
                Un seul portail pour tous les profils. Connectez-vous et accédez automatiquement à votre espace personnalisé.
              </p>
            </div>

            {/* Portail unifié */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-12 border border-gray-200 dark:border-slate-800 hover:border-green-400 transition-all duration-300 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="bg-gradient-to-r from-green-500 to-violet-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <User className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Portail IT Vision</h3>
                <p className="text-gray-700 dark:text-gray-300 mb-8 text-lg">
                  Clients, techniciens, administrateurs : un seul point d'accès pour tous vos besoins
                </p>
                
                <div className="space-y-4">
                  <Link
                    href="/login"
                    className="bg-gradient-to-r from-green-500 to-violet-500 hover:from-green-600 hover:to-violet-600 text-white px-8 py-4 rounded-lg font-semibold transition-all duration-300 inline-flex items-center justify-center w-full text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    <User className="h-6 w-6 mr-3" />
                    Se connecter
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Link>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Votre rôle sera automatiquement détecté et vous serez redirigé vers votre interface
                  </p>
                </div>
              </div>
            </div>

            {/* Informations sur les différents accès */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 text-sm">
              <div className="text-center bg-white dark:bg-slate-900 rounded-xl p-4 shadow-md">
                <Building className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="font-medium text-gray-900 dark:text-white">Clients</p>
                <p className="text-gray-600 dark:text-gray-300">Suivi projets & maintenance</p>
              </div>
              <div className="text-center bg-white dark:bg-slate-900 rounded-xl p-4 shadow-md">
                <Wrench className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="font-medium text-gray-900 dark:text-white">Techniciens</p>
                <p className="text-gray-600 dark:text-gray-300">Rapports & interventions</p>
              </div>
              <div className="text-center bg-white dark:bg-slate-900 rounded-xl p-4 shadow-md">
                <Shield className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="font-medium text-gray-900 dark:text-white">Administrateurs</p>
                <p className="text-gray-600 dark:text-gray-300">Gestion & supervision</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section Contact */}
        <section className="py-20 bg-gray-50 dark:bg-black">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
              Prêt à sécuriser votre propriété ?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              Contactez-nous pour un audit sécurité gratuit et un devis personnalisé. 
              Nos experts vous accompagnent dans votre projet.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://wa.me/221774133440?text=Bonjour, je souhaite un audit sécurité gratuit et un devis pour mes besoins en sécurité électronique."
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-lg font-semibold transition-all duration-300 inline-flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                </svg>
                Devis WhatsApp
              </a>
              <Link
                href="/contact"
                className="bg-gradient-to-r from-green-500 to-violet-500 hover:from-green-600 hover:to-violet-600 text-white px-8 py-4 rounded-lg font-semibold transition-all duration-300 inline-flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Nous contacter
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
              <a
                href="tel:+221774133440"
                className="border-2 border-gray-400 dark:border-gray-500 text-gray-700 dark:text-gray-200 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-slate-900 transition-all duration-300 inline-flex items-center justify-center"
              >
                <Phone className="h-5 w-5 mr-2" />
                +221 77 413 34 40
              </a>
            </div>
          </div>
        </section>
      </div>

      <Footer />

      {/* Chatbot toujours disponible */}
      <SmartChatbot />
    </main>
  )
}