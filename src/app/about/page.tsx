import { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Shield, Users, Award, Clock, CheckCircle, Target, Heart, Lightbulb } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'À propos - IT Vision',
  description: 'Découvrez IT Vision, experts en sécurité électronique, domotique et digitalisation des processus PME depuis 2019.',
}

export default function AboutPage() {
  const stats = [
    { icon: Users, label: 'Clients satisfaits', value: '+15' },
    { icon: Shield, label: 'Projets réalisés', value: '+20' },
    { icon: Award, label: "Expérience", value: '5+ ans' },
    { icon: Clock, label: 'Disponibilité', value: '24h/7j' }
  ]

  const values = [
    {
      icon: Shield,
      title: 'Sécurité',
      description: 'Votre protection est notre priorité absolue. Nous utilisons uniquement des équipements certifiés et des technologies de pointe.'
    },
    {
      icon: Heart,
      title: 'Confiance',
      description: 'Nous construisons des relations durables basées sur la transparence, la fiabilité et un service client irréprochable.'
    },
    {
      icon: Lightbulb,
      title: 'Innovation',
      description: 'Nous restons à la pointe de la technologie pour vous offrir les solutions les plus avancées du marché.'
    },
    {
      icon: Target,
      title: 'Excellence',
      description: 'Chaque projet est traité avec le plus grand soin, de la conception à la maintenance, pour garantir votre satisfaction.'
    }
  ]

  const team = [
    {
      name: 'Ibrahima Gueye',
      role: 'Directeur Technique',
      experience: '5+ ans',
      speciality: 'Sécurité électronique & domotique',
      certifications: []
    },
    {
      name: 'Ibrahima Ndiaye',
      role: 'Directeur Commercial',
      experience: '5+ ans',
      speciality: 'Conseil PME & digitalisation',
      certifications: []
    },
    {
      name: 'Talibouya Ndiaye',
      role: 'Chef de Projet',
      experience: '5+ ans',
      speciality: 'Gestion de projets & intégration',
      certifications: []
    }
  ]

  return (
    <main>
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-white via-gray-50 to-emerald-50 page-content py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              À propos d&apos;<span className="bg-gradient-to-r from-emerald-600 to-purple-600 bg-clip-text text-transparent">IT Vision</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-8">
              Depuis plus de 5 ans, nous accompagnons particuliers et PME en sécurité électronique,
              domotique et digitalisation opérationnelle.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => {
              const IconComponent = stat.icon
              return (
                <div key={index} className="text-center">
                  <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-purple-600 rounded-2xl shadow-lg mx-auto mb-4">
                    <IconComponent className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">{stat.value}</div>
                  <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Notre Histoire */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Notre Histoire
              </h2>
              <div className="space-y-6 text-lg text-gray-600 leading-relaxed">
                <p>
                  Fondée en <strong className="text-emerald-600">décembre 2019</strong>, <strong className="text-emerald-600">IT Vision</strong> est née de la passion 
                  de ses fondateurs pour les technologies avancées et leur vision d&apos;un écosystème connecté 
                  intelligent au service de la sécurité et de l'efficacité.
                </p>
                <p>
                  Nous avons démarré avec l'IoT (LoRa/LoRaWAN, MQTT) pour la collecte de données et l'automation,
                  puis étendu notre offre vers la <strong className="text-emerald-600">sécurité électronique</strong> et la
                  <strong className="text-emerald-600"> domotique</strong>, avec un rôle de facilitateur pour la
                  <strong className="text-emerald-600"> digitalisation des processus des PME</strong>.
                </p>
                <p>
                  Notre approche unique combine <strong>expertise technique pointue</strong> (protocols mesh, LoRaWAN, MQTT), 
                  <strong>solutions sur-mesure</strong> et <strong>innovation constante</strong>. Chaque projet nous permet 
                  de repousser les limites du possible dans l'écosystème connecté africain.
                </p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-8 text-center">
              <div className="text-6xl mb-4">📈</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">5+ ans d'expérience</h3>
              <p className="text-gray-600">Sécurité électronique, domotique et digitalisation des PME depuis 2019</p>
            </div>
          </div>
        </div>
      </section>

      {/* Nos Valeurs */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Nos Valeurs
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Quatre piliers fondamentaux guident notre action au quotidien et définissent notre approche unique.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => {
              const IconComponent = value.icon
              return (
                <div key={index} className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 modern-card text-center">
                  <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-purple-600 rounded-2xl shadow-lg mx-auto mb-4">
                    <IconComponent className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{value.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{value.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Notre Équipe */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Notre Équipe
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Une équipe d&apos;experts passionnés, formés aux dernières technologies et certifiés par les plus grandes marques.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {team.map((member, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden modern-card">
                <div className="bg-gradient-to-r from-emerald-500 to-purple-600 p-6 text-white text-center">
                  <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mx-auto mb-4 flex items-center justify-center text-2xl font-bold">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <h3 className="text-xl font-bold mb-1">{member.name}</h3>
                  <p className="text-white/90 font-medium">{member.role}</p>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500">Expérience:</span>
                      <span className="text-sm font-semibold text-gray-900">{member.experience}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500 block mb-2">Spécialité:</span>
                      <span className="text-sm text-gray-900">{member.speciality}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-500 block mb-2">Certifications:</span>
                      <div className="flex flex-wrap gap-2">
                        {member.certifications.map((cert, idx) => (
                          <span key={idx} className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full font-medium">
                            {cert}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pourquoi nous choisir */}
      <section className="py-20 bg-gradient-to-br from-emerald-600 via-teal-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Pourquoi choisir IT Vision ?
            </h2>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              Nous nous distinguons par notre approche personnalisée et notre engagement qualité.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              'Devis gratuit et détaillé',
              'Installation certifiée',
              'Intervention rapide 24h/7j',
              'Garantie 3 ans sur tous nos équipements',
              'Formation utilisateur incluse',
              'Support technique permanent'
            ].map((feature, index) => (
              <div key={index} className="flex items-center space-x-3">
                <CheckCircle className="h-6 w-6 text-emerald-300 flex-shrink-0" />
                <span className="text-lg font-medium">{feature}</span>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/contact"
              className="bg-white text-emerald-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 inline-flex items-center shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Parlons de votre projet
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}