'use client'

import { motion } from 'framer-motion'
import { Camera, Lock, Home, Flame, Cable, Wrench } from 'lucide-react'
import Link from 'next/link'
import TechLines from './TechLines'

const Services = () => {
  const services = [
    {
      icon: Camera,
      title: "Vidéosurveillance",
      description: "Systèmes de surveillance HD, IP et analogiques pour une protection optimale de vos biens.",
      features: ["Caméras HD/4K", "Vision nocturne", "Enregistrement cloud", "Accès mobile"],
      link: "/services/videosurveillance"
    },
    {
      icon: Lock,
      title: "Contrôle d'accès",
      description: "Solutions de contrôle d'accès par badge, biométrie ou code pour sécuriser vos locaux.",
      features: ["Badges RFID", "Biométrie", "Codes d'accès", "Gestion centralisée"],
      link: "/services/controle-acces"
    },
    {
      icon: Home,
      title: "Domotique",
      description: "Automatisation intelligente de votre habitat pour plus de confort et d'économies.",
      features: ["Éclairage intelligent", "Chauffage connecté", "Volets automatiques", "Alarmes intégrées"],
      link: "/services/domotique"
    },
    {
      icon: Flame,
      title: "Sécurité incendie",
      description: "Détection et prévention incendie avec systèmes d'alarme et d'extinction automatiques.",
      features: ["Détecteurs fumée", "Alarmes sonores", "Extinction automatique", "Maintenance préventive"],
      link: "/services/securite-incendie"
    },
    {
      icon: Cable,
      title: "Câblage informatique",
      description: "Infrastructure réseau complète pour entreprises et particuliers, fibre optique et cuivre.",
      features: ["Fibre optique", "Câblage cuivre", "Réseau WiFi", "Baies de brassage"],
      link: "/services/cablage"
    },
    {
      icon: Wrench,
      title: "Maintenance",
      description: "Service de maintenance préventive et curative pour tous vos équipements de sécurité.",
      features: ["Maintenance préventive", "Dépannage urgent", "Mise à jour logiciels", "Garantie étendue"],
      link: "/services/maintenance"
    }
  ]

  return (
    <section id="services" className="relative py-20 bg-gradient-to-br from-gray-50 to-emerald-50 overflow-hidden">
      <TechLines density="low" opacity={0.08} />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Nos <span className="bg-gradient-to-r from-emerald-600 to-purple-600 bg-clip-text text-transparent">Services</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Une gamme complète de solutions de sécurité électronique adaptées à vos besoins spécifiques
          </p>
        </motion.div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => {
            const IconComponent = service.icon
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-8 group tech-lines-hover overflow-hidden"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <TechLines density="high" opacity={0.03} />
                </div>
                <div className="relative flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-100 to-purple-100 rounded-lg mb-6 group-hover:from-emerald-500 group-hover:to-purple-600 transition-all duration-300">
                  <IconComponent className="h-8 w-8 text-emerald-600 group-hover:text-white transition-colors duration-300" />
                </div>
                
                <h3 className="relative text-xl font-bold text-gray-900 mb-3">{service.title}</h3>
                <p className="relative text-gray-600 mb-4">{service.description}</p>
                
                <ul className="relative space-y-2 mb-6">
                  {service.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center text-sm text-gray-500">
                      <div className="w-1.5 h-1.5 bg-gradient-to-r from-emerald-500 to-purple-600 rounded-full mr-2"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <Link
                  href={service.link}
                  className="relative inline-flex items-center text-emerald-600 hover:text-purple-600 font-semibold transition-colors duration-300"
                >
                  En savoir plus
                  <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </motion.div>
            )
          })}
        </div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <div className="relative bg-gradient-to-r from-emerald-600 to-purple-600 rounded-2xl p-8 text-white overflow-hidden">
            <TechLines density="medium" opacity={0.1} />
            <div className="relative">
              <h3 className="text-2xl md:text-3xl font-bold mb-4">
                Besoin d'un conseil personnalisé ?
              </h3>
              <p className="text-xl mb-6 text-emerald-100">
                Nos experts IT Vision sont à votre disposition pour étudier votre projet
              </p>
                            <Link
                href="/contact"
                className="inline-flex items-center bg-white text-emerald-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 neon-button justify-center"
              >
                Demander un devis gratuit
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default Services