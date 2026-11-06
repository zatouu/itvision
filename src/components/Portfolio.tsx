'use client'

import { motion } from 'framer-motion'
import { Building2, Home, Factory, Shield } from 'lucide-react'
import Link from 'next/link'

const Portfolio = () => {
  const projects = [
    {
      id: 1,
      title: "Résidence ANTALYA",
      category: "Résidentiel",
      icon: Home,
      description: "Installation complète de sécurité et domotique pour 15 appartements de luxe",
      services: ["Câblage réseau", "Vidéosurveillance", "Visiophonie", "Domotique"],
      image: "🏠",
      stats: { appartements: "15", cablage: "TV+RJ45", visiophonie: "HD", domotique: "Intégrée" }
    },
    {
      id: 2,
      title: "Entreprise LOCAFRIQUE",
      category: "Financier",
      icon: Building2,
      description: "42 caméras POE sur 5 étages avec transmission longue distance et affichage multi-points",
      services: ["Vidéosurveillance", "Architecture réseau", "Transmission longue distance", "Affichage multi-points"],
      image: "🏢",
      stats: { cameras: "42 POE", etages: "5", affichages: "3 points", transmission: "Longue distance" }
    }
  ]

  const categories = ["Tous", "Résidentiel", "Financier"]

  return (
    <section id="portfolio" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Nos <span className="text-blue-600">Réalisations</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Découvrez nos réalisations phares qui démontrent notre expertise technique avancée
          </p>
        </motion.div>

        {/* Filter buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-4 mb-12"
        >
          {categories.map((category, index) => (
            <button
              key={index}
              className={`px-6 py-2 rounded-full font-semibold transition-all duration-300 ${
                index === 0
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-emerald-50 hover:text-emerald-600'
              }`}
            >
              {category}
            </button>
          ))}
        </motion.div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {projects.map((project, index) => {
            const IconComponent = project.icon
            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 group"
              >
                {/* Project Image */}
                <div className="relative h-48 bg-gradient-to-br from-emerald-500 to-purple-600 flex items-center justify-center">
                  <span className="text-6xl">{project.image}</span>
                  <div className="absolute top-4 left-4">
                    <span className="bg-white bg-opacity-20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-semibold">
                      {project.category}
                    </span>
                  </div>
                  <div className="absolute top-4 right-4">
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                </div>

                {/* Project Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {project.title}
                  </h3>
                  <p className="text-gray-600 mb-4">{project.description}</p>

                  {/* Services */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.services.map((service, idx) => (
                      <span
                        key={idx}
                        className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {service}
                      </span>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                    {Object.entries(project.stats).map(([key, value], idx) => (
                      <div key={idx} className="text-center">
                        <div className="text-lg font-bold text-blue-600">{value}</div>
                        <div className="text-xs text-gray-500 capitalize">{key}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <div className="bg-white rounded-2xl p-8 border border-gray-200">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Votre projet mérite notre expertise
            </h3>
            <p className="text-xl text-gray-600 mb-6">
              Parlons de vos besoins en sécurité électronique
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/realisations"
                className="inline-flex items-center justify-center px-6 py-3 border border-emerald-600 text-emerald-600 rounded-lg font-semibold hover:bg-emerald-50 transition-colors duration-300"
              >
                Voir toutes nos réalisations
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors duration-300"
              >
                Demander un devis
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default Portfolio