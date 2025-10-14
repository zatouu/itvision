'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { CheckCircle, ArrowRight } from 'lucide-react'
import ITVisionLogo from './ITVisionLogo'
import TechLines from './TechLines'

const Hero = () => {
  const features = [
    "Installation certifiée",
    "Intervention 24h/7j",
    "Devis gratuit",
    "Actifs depuis 2019"
  ]

  return (
    <section className="relative bg-white text-gray-900 hero-section pb-12 overflow-hidden">
      {/* Section blanche du haut */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Contenu principal */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center lg:text-left"
            >
              <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
                Votre <span className="bg-gradient-to-r from-emerald-600 to-purple-600 bg-clip-text text-transparent">Sécurité</span> Électronique
                <br />
                <span className="text-3xl md:text-5xl text-gray-700">Notre <span className="text-emerald-600">Vision</span></span>
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
                Solutions complètes de vidéosurveillance, contrôle d'accès, domotique 
                et sécurité incendie pour particuliers et entreprises.
              </p>

              {/* Features list */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                    className="flex items-center space-x-2"
                  >
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                    <span className="text-sm md:text-base text-gray-700">{feature}</span>
                  </motion.div>
                ))}
              </div>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4"
              >
                <Link
                  href="/contact"
                  className="bg-gradient-to-r from-emerald-500 to-purple-600 hover:from-emerald-600 hover:to-purple-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
                >
                  <span>Demander un devis gratuit</span>
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/services"
                  className="border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 text-center"
                >
                  Découvrir nos services
                </Link>
              </motion.div>
            </motion.div>

            {/* Image/Visual */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative"
            >
              <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 border border-gray-200 shadow-xl modern-card">
                <TechLines density="high" opacity={0.1} className="rounded-2xl" />
                <div className="relative flex items-center justify-center h-64 md:h-80">
                  <ITVisionLogo size={180} animated={true} />
                </div>
                <div className="absolute top-4 right-4 bg-gradient-to-r from-emerald-500 to-purple-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
                  Certifié IT Vision
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Section colorée du bas */}
      <div className="relative bg-gradient-to-br from-emerald-900 via-teal-800 to-purple-900 text-white py-16 overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-black opacity-40"></div>
        <TechLines density="medium" opacity={0.15} />
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2310B981' fill-opacity='0.03'%3E%3Ccircle cx='7' cy='7' r='7'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }}></div>

        {/* Call to action bar */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="relative"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-lg md:text-xl font-semibold mb-2">
                Urgence sécurité ? Appelez-nous maintenant !
              </p>
              <a
                href="tel:+2217774382220"
                className="text-2xl md:text-3xl font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                📞 +221 77 7438220
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default Hero