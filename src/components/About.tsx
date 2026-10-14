'use client'

import { motion } from 'framer-motion'
import { Award, Users, Clock, Target } from 'lucide-react'
import TechLines from './TechLines'

const About = () => {
  const stats = [
    { icon: Award, label: "Ans d'expérience", value: "15+" },
    { icon: Users, label: "Clients satisfaits", value: "500+" },
    { icon: Clock, label: "Interventions/an", value: "1000+" },
    { icon: Target, label: "Taux de satisfaction", value: "98%" }
  ]

  const values = [
    {
      title: "Expertise technique",
      description: "Notre équipe de techniciens certifiés maîtrise les dernières technologies de sécurité électronique."
    },
    {
      title: "Service personnalisé", 
      description: "Chaque projet est unique. Nous adaptons nos solutions à vos besoins spécifiques et votre budget."
    },
    {
      title: "Disponibilité 24h/7j",
      description: "Service d'urgence disponible à tout moment pour garantir la continuité de votre sécurité."
    },
    {
      title: "Qualité garantie",
      description: "Nous utilisons uniquement des équipements de marques reconnues avec garantie constructeur étendue."
    }
  ]

  return (
    <section id="about" className="relative py-20 bg-gradient-to-br from-white to-purple-50 overflow-hidden">
      <TechLines density="low" opacity={0.06} />
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
            Qui sommes-<span className="bg-gradient-to-r from-emerald-600 to-purple-600 bg-clip-text text-transparent">nous</span> ?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            IT Vision, votre partenaire technologique de confiance en sécurité électronique depuis 2009
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
              Une <span className="text-emerald-600">vision technologique</span> au service de votre sécurité
            </h3>
            
            <p className="text-lg text-gray-600 mb-6 leading-relaxed">
              Chez IT Vision, nous combinons expertise technique et innovation pour accompagner particuliers et entreprises 
              dans la conception, l'installation et la maintenance de systèmes de sécurité nouvelle génération.
            </p>
            
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Notre approche technologique couvre tous les aspects de la sécurité moderne : de la vidéosurveillance intelligente 
              au contrôle d'accès biométrique, en passant par la domotique connectée et la sécurité incendie automatisée. 
              Nous proposons également des solutions de câblage informatique pour une infrastructure digitale complète.
            </p>

            {/* Values */}
            <div className="space-y-4">
              {values.map((value, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="flex items-start space-x-3"
                >
                  <div className="w-2 h-2 bg-gradient-to-r from-emerald-500 to-purple-600 rounded-full mt-3 flex-shrink-0"></div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">{value.title}</h4>
                    <p className="text-gray-600">{value.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative bg-gradient-to-br from-emerald-50 to-purple-50 rounded-2xl p-8 overflow-hidden"
          >
            <TechLines density="high" opacity={0.04} className="rounded-2xl" />
            <div className="relative">
              <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
                Nos chiffres clés
              </h3>
            
            <div className="grid grid-cols-2 gap-6">
              {stats.map((stat, index) => {
                const IconComponent = stat.icon
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="text-center bg-white rounded-xl p-6 shadow-sm tech-hover"
                  >
                    <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-emerald-100 to-purple-100 rounded-lg mx-auto mb-4">
                      <IconComponent className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-purple-600 bg-clip-text text-transparent mb-2">{stat.value}</div>
                    <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
                  </motion.div>
                )
              })}
            </div>

              {/* Certifications */}
              <div className="mt-8 pt-8 border-t border-emerald-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                  Nos certifications
                </h4>
                <div className="flex flex-wrap justify-center gap-4">
                  <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg">
                    RGE Qualibat
                  </div>
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg">
                    APSAD
                  </div>
                  <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg">
                    NF Service
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default About