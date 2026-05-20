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
        "Visiophonie HD avec contrôle d'accès",
        "Serrures connectées",
        "Videosurveillance"
      ],
      testimonial: {
        text: "Une expertise technique remarquable. L'installation invisible et la qualité des finitions correspondent parfaitement au standing de notre résidence.",
        author: "Mamadou Diallo",
        role: ""
      }
    },
    {
      id: 2,
      title: "LOCAFRIQUE",
      category: "Financier",
      icon: Building2,
      location: "Almadies, Dakar",
      date: "2020",
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
    },
    {
      id: 3,
      title: "Résidence SHIRAMBA",
      category: "Résidentiel",
      icon: Home,
      location: "Diamniadio",
      date: "2023",
      client: "Teyliom",
      description: "Installation complète d'un système d'interphonie audio pour une résidence moderne. Déploiement de 26 combinés interphone audio RL, 1 platine de rue 16 postes RL et 1 platine de rue 12 postes RL pour assurer la communication et le contrôle d'accès de l'ensemble de la résidence.",
      services: ["Interphonie audio", "Contrôle d'accès", "Platines de rue", "Installation résidentielle"],
      image: "🏢",
      stats: { 
        combines: "26", 
        platine16: "1 (16 postes)", 
        platine12: "1 (12 postes)",
        type: "Audio RL"
      },
      challenges: [
        "Installation pour un grand nombre d'unités résidentielles",
        "Intégration de deux platines de rue différentes",
        "Distribution audio claire pour tous les appartements",
        "Câblage optimisé pour 26 points"
      ],
      solutions: [
        "Système d'interphonie audio RL haute performance",
        "Architecture en étoile pour distribution optimale",
        "Platines de rue adaptées aux besoins (16 et 12 postes)",
        "Câblage structuré et testé pour chaque unité",
        "Configuration centralisée pour gestion facilitée",
        "Installation discrète et esthétique"
      ],
      testimonial: {
        text: "L'installation de l'interphonie a été réalisée dans les délais avec une qualité irréprochable. Le système fonctionne parfaitement et répond aux besoins de notre résidence.",
        author: "Équipe Teyliom",
        role: "Client"
      }
    },
    {
      id: 4,
      title: "Holding Mermoz",
      category: "Professionnel",
      icon: Building2,
      location: "Mermoz, Dakar",
      date: "2020",
      client: "Holding Mermoz",
      description: "Système de vidéosurveillance professionnel complet avec 16 caméras POE, enregistrement haute capacité et transmission vidéo longue distance. Infrastructure réseau optimisée pour une surveillance continue et un stockage sécurisé.",
      services: ["Vidéosurveillance", "Architecture réseau", "Infrastructure POE", "Monitoring"],
      image: "🏢",
      stats: { 
        "NVR": "16ch POE", 
        "Caméras": "16 POE", 
        "Stockage": "8 TB",
        "Câblage": "Cat6 FTP"
      },
      challenges: [
        "Déploiement de 16 caméras sur site professionnel",
        "Architecture réseau structurée pour POE",
        "Stockage haute capacité pour longue rétention",
        "Transmission vidéo longue distance (HDMI 50m)"
      ],
      solutions: [
        "Enregistreur NVR 16ch POE Uniview",
        "16 caméras POE Uniview",
        "Stockage redondant 2x4TB",
        "Infrastructure Cat6 FTP complète",
        "Onduleur 420-650VA",
        "Transmission HDMI 50m + convertisseur VGA"
      ],
      testimonial: {
        text: "Un système de surveillance professionnel qui répond parfaitement à nos besoins de sécurité. L'équipe IT Vision a su nous conseiller et installer une solution fiable et évolutive.",
        author: "Direction Holding Mermoz",
        role: "Client"
      }
    }
  ]

  const categories = ["Tous", "Résidentiel", "Financier", "Professionnel"]

  return (
    <main>
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-white via-gray-50 to-emerald-50 dark:from-black dark:via-black dark:to-black page-content py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Nos <span className="bg-gradient-to-r from-emerald-600 to-purple-600 bg-clip-text text-transparent">Réalisations</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Découvrez nos réalisations phares mettant en avant notre expertise technique en sécurité électronique
            </p>
          </div>
        </div>
      </section>

      {/* Filter Section */}
      <section className="py-8 bg-white dark:bg-black border-b dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-4">
            {categories.map((category, index) => (
              <button
                key={index}
                className={`px-6 py-2 rounded-full font-semibold transition-all duration-300 ${
                  index === 0 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 dark:bg-slate-900 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-600'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section className="py-20 bg-gray-50 dark:bg-black">
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
                    <div className="bg-white rounded-2xl overflow-hidden shadow-lg">
                      {/* Image principale */}
                      <div className="relative h-80 overflow-hidden">
                        <img 
                          src={
                            project.id === 1 ? '/images/Antalya-front.jpg' : 
                            project.id === 2 ? '/images/locafrique.jpg' :
                            '/images/Shiramba.png'
                          }
                          alt={project.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-4 right-4 bg-white bg-opacity-95 backdrop-blur-sm text-gray-900 px-3 py-2 rounded-full text-sm font-semibold shadow-lg">
                          {project.category}
                        </div>
                      </div>
                      
                      {/* Mini-galerie en dessous */}
                      <div className="p-4">
                        <div className="grid grid-cols-3 gap-3">
                          {project.id === 1 ? (
                            <>
                              <img src="/images/domo1.jpeg" alt="Détail 1" className="w-full h-24 object-cover rounded-lg" />
                              <img src="/images/domo2.jpeg" alt="Détail 2" className="w-full h-24 object-cover rounded-lg" />
                              <img src="/images/visiophonie.jpeg" alt="Détail 3" className="w-full h-24 object-cover rounded-lg" />
                            </>
                          ) : project.id === 2 ? (
                            <>
                              <img src="/images/visiophonie.jpeg" alt="Surveillance" className="w-full h-24 object-cover rounded-lg" />
                              <img src="/images/ecran_ascenseur.jpeg" alt="Affichage" className="w-full h-24 object-cover rounded-lg" />
                              <img src="/images/fibre.jpeg" alt="Infrastructure" className="w-full h-24 object-cover rounded-lg" />
                            </>
                          ) : (
                            <>
                              <img src="/images/visiophonie.jpeg" alt="Interphone" className="w-full h-24 object-cover rounded-lg" />
                              <img src="/images/domo1.jpeg" alt="Installation" className="w-full h-24 object-cover rounded-lg" />
                              <img src="/images/Shiramba.png" alt="Résidence" className="w-full h-24 object-cover rounded-lg" />
                            </>
                          )}
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