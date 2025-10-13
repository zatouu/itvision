'use client'

import { motion } from 'framer-motion'
import { Code, Database, Cloud, BarChart3, Smartphone, Globe, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const Digitalisation = () => {
  const solutions = [
    {
      icon: Code,
      title: "Développement Sur Mesure",
      description: "Digitalisez votre commerce : e-shop, gestion stocks, facturation auto, app mobile clients/livreurs.",
      features: ["E-commerce + App Mobile", "Gestion Stock Temps Réel", "Facturation Automatique", "CRM Intégré"],
      price: "Solutions sur mesure"
    },
    {
      icon: Database,
      title: "Data Science & BI",
      description: "Analysez vos ventes, prédisez la demande, identifiez vos meilleurs clients avec l'IA.",
      features: ["Prédiction Ventes", "Analyse Clientèle", "Optimisation Stocks", "Détection Tendances"],
      price: "Projets évolutifs"
    },
    {
      icon: Cloud,
      title: "DevOps & Cloud",
      description: "Automatisez vos processus avec Kafka : commande → stock → livraison → facturation en temps réel.",
      features: ["Event Streaming Kafka", "Automatisation Workflow", "Notifications Temps Réel", "Microservices"],
      price: "Architecture moderne"
    }
  ]

  const technologies = [
    "Spring Boot", "React", "Angular", "React Native", "Docker", "Kubernetes", 
    "AWS", "Azure", "Python", "Java", "Node.js", "PostgreSQL"
  ]

  return (
    <section className="py-20 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Digitalisation <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">d'Entreprise</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-6">
            Au-delà de la sécurité électronique, nous digitalisons vos processus métier avec notre équipe d'experts : 
            ingénieurs développement, data scientists, DevOps.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {technologies.slice(0, 8).map((tech, index) => (
              <span key={index} className="bg-white/10 backdrop-blur text-white px-3 py-1 rounded-full text-sm">
                {tech}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Solutions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {solutions.map((solution, index) => {
            const IconComponent = solution.icon
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300 group"
              >
                <div className="flex items-center mb-6">
                  <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg">
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-xl font-bold text-white group-hover:text-blue-300 transition-colors">
                      {solution.title}
                    </h3>
                  </div>
                </div>

                <p className="text-gray-300 mb-6">{solution.description}</p>

                <ul className="space-y-2 mb-6">
                  {solution.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center text-sm text-gray-300">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="border-t border-white/20 pt-4">
                  <p className="text-2xl font-bold text-blue-400 mb-3">{solution.price}</p>
                  <Link
                    href="/digitalisation"
                    className="inline-flex items-center text-white hover:text-blue-300 transition-colors group"
                  >
                    En savoir plus
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Why Choose Us */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Pourquoi Choisir IT Vision Plus ?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-400 mb-2">15+</div>
                <div className="text-white">Années d'expérience</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-400 mb-2">200+</div>
                <div className="text-white">Projets réalisés</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-emerald-400 mb-2">24/7</div>
                <div className="text-white">Support technique</div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/digitalisation"
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 inline-flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Découvrir nos solutions
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
              <Link
                href="/contact"
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-900 transition-all duration-300 inline-flex items-center justify-center"
              >
                Audit gratuit
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default Digitalisation