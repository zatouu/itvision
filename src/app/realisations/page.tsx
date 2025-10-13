import { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Building2, Home, Factory, Shield, MapPin, Calendar, Users } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Nos Réalisations - IT Vision',
  description: 'Découvrez nos dernières réalisations en sécurité électronique : centres commerciaux, résidences, entreprises et villas de prestige.',
}

export default function RealisationsPage() {
  const projects = [
    {
      id: 1,
      title: "Résidence ANTALYA",
      category: "Résidentiel",
      icon: Home,
      location: "Mermoz, Dakar",
      date: "2024",
      client: "Teyliom Properties",
      description: "Installation complète des systèmes de sécurité et domotique pour un immeuble résidentiel de luxe de 15 appartements. Câblage réseau intégral (TV, RJ45), vidéosurveillance, visiophonie et domotique avancée.",
      services: ["Câblage réseau", "Vidéosurveillance", "Visiophonie", "Domotique"],
      image: "🏠",
      stats: { 
        appartements: "15", 
        cablage: "TV + RJ45", 
        visiophonie: "Intégrée",
        domotique: "Complète"
      },
      challenges: [
        "Intégration discrète dans l'architecture moderne",
        "Câblage réseau complet pour chaque appartement",
        "Synchronisation des systèmes domotiques"
      ],
      solutions: [
        "Câblage encastré invisible",
        "Infrastructure réseau structurée",
        "Système domotique centralisé par appartement",
        "Visiophonie HD avec contrôle d'accès"
      ],
      testimonial: {
        text: "Une expertise technique remarquable. L'installation invisible et la qualité des finitions correspondent parfaitement au standing de notre résidence.",
        author: "Mamadou Diallo",
        role: "Directeur Technique Teyliom Properties"
      }
    },
    {
      id: 2,
      title: "Entreprise LOCAFRIQUE",
      category: "Financier",
      icon: Building2,
      location: "Almadies, Dakar",
      date: "2024",
      client: "LOCAFRIQUE",
      description: "Installation d'un système de vidéosurveillance avancé pour un établissement financier sur 5 étages. 42 caméras POE avec architecture réseau optimisée, transmission longue distance et affichage multi-points.",
      services: ["Vidéosurveillance", "Architecture réseau", "Transmission longue distance", "Affichage multi-points"],
      image: "🏢",
      stats: { 
        cameras: "42 POE", 
        etages: "5", 
        affichages: "3 points",
        transmission: "Longue distance"
      },
      challenges: [
        "Préservation du design existant du bâtiment",
        "Transmission du signal souris du 4ème étage au RDC",
        "Double affichage au poste de garde",
        "Architecture réseau pour 5 étages"
      ],
      solutions: [
        "Câblage 100% encastré pour préserver l'esthétique",
        "Switch POE positionné stratégiquement devant le NVR",
        "Transmission signal souris via infrastructure réseau",
        "Affichage déporté bureau directeur et poste de garde",
        "Architecture réseau structurée par étage"
      ],
      testimonial: {
        text: "Nous avons été impressionnés par la capacité de l'équipe à intégrer un système si complexe sans altérer l'aspect de nos bureaux. La maîtrise technique est évidente.",
        author: "Fatou Seck",
        role: "Directrice des Opérations LOCAFRIQUE"
      }
    }
  ]

  const categories = ["Tous", "Résidentiel", "Financier"]

  return (
    <main>
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-white via-gray-50 to-emerald-50 page-content py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Nos <span className="bg-gradient-to-r from-emerald-600 to-purple-600 bg-clip-text text-transparent">Réalisations</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto">
              Découvrez nos réalisations phares mettant en avant notre expertise technique en sécurité électronique
            </p>
          </div>
        </div>
      </section>

      {/* Filter Section */}
      <section className="py-8 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-4">
            {categories.map((category, index) => (
              <button
                key={index}
                className={`px-6 py-2 rounded-full font-semibold transition-all duration-300 ${
                  index === 0 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-600'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-16">
            {projects.map((project, index) => {
              const IconComponent = project.icon
              const isEven = index % 2 === 0
              
              return (
                <div
                  key={project.id}
                  className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-start ${
                    !isEven ? 'lg:grid-flow-col-dense' : ''
                  }`}
                >
                  {/* Content */}
                  <div className={!isEven ? 'lg:col-start-2' : ''}>
                    {/* Header */}
                    <div className="mb-6">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                          <IconComponent className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-semibold">
                            {project.category}
                          </span>
                        </div>
                      </div>
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                        {project.title}
                      </h2>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {project.location}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {project.date}
                        </div>
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {project.client}
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-lg text-gray-600 mb-6">{project.description}</p>

                    {/* Services */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Services réalisés</h3>
                      <div className="flex flex-wrap gap-2">
                        {project.services.map((service, idx) => (
                          <span
                            key={idx}
                            className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-medium"
                          >
                            {service}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Chiffres clés</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(project.stats).map(([key, value], idx) => (
                          <div key={idx} className="bg-white rounded-lg p-4 text-center border">
                            <div className="text-xl font-bold text-blue-600">{value}</div>
                            <div className="text-xs text-gray-500 capitalize">{key}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Challenges & Solutions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Défis</h3>
                        <ul className="space-y-2">
                          {project.challenges.map((challenge, idx) => (
                            <li key={idx} className="flex items-start text-gray-600">
                              <div className="w-2 h-2 bg-red-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                              {challenge}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Solutions</h3>
                        <ul className="space-y-2">
                          {project.solutions.map((solution, idx) => (
                            <li key={idx} className="flex items-start text-gray-600">
                              <div className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2 flex-shrink-0"></div>
                              {solution}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Testimonial */}
                    <div className="bg-white rounded-lg p-6 border-l-4 border-blue-600">
                      <p className="text-gray-700 italic mb-4">"{project.testimonial.text}"</p>
                      <div>
                        <p className="font-semibold text-gray-900">{project.testimonial.author}</p>
                        <p className="text-sm text-gray-600">{project.testimonial.role}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Visual */}
                  <div className={!isEven ? 'lg:col-start-1 lg:row-start-1' : ''}>
                    <div className="bg-white rounded-2xl p-8 shadow-lg">
                      <div className="flex items-center justify-center h-80 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl relative overflow-hidden">
                        <span className="text-8xl">{project.image}</span>
                        <div className="absolute top-4 right-4 bg-white bg-opacity-20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-semibold">
                          {project.category}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Votre projet sera notre prochaine réussite
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Discutons de vos besoins en sécurité électronique
          </p>
          <Link
            href="/contact"
            className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center justify-center"
          >
            Démarrer mon projet
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  )
}