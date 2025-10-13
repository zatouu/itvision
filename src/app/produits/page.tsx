import { Metadata } from 'next'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Camera, Shield, Smartphone, Wifi, Cpu, Database, Star, ShoppingCart, CheckCircle, ArrowRight } from 'lucide-react'
import ProductCard from '@/components/ProductCard'
import Link from 'next/link'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'Nos Produits & Solutions - IT Vision Plus',
  description: 'Produits Hikvision dernière génération, domotique Tuya, et solutions de digitalisation d\'entreprise : développement, data science, DevOps.',
}

export default function ProduitsPage() {
  const categories = [
    {
      id: 'cameras',
      title: 'Caméras Surveillance Pro',
      icon: Camera,
      description: 'Hikvision, Dahua, Uniview - Dernière génération 4K avec IA. Approvisionnement direct Chine pour qualité/prix optimal',
      products: [
        {
          name: 'Hikvision DS-2CD2143G2-I',
          model: 'Caméra IP 4K AcuSense',
          price: 'Devis sur WhatsApp',
          features: ['4K Ultra HD 8MP', 'IA AcuSense intégrée', 'Vision nocturne ColorVu', 'Audio bidirectionnel', 'Détection humain/véhicule'],
          rating: 4.9,
          popular: true,
          image: '📷'
        },
        {
          name: 'Hikvision DS-2CD2643G2-IZS',
          model: 'Caméra Varifocale Motorisée',
          price: 'Devis sur WhatsApp',
          features: ['4K 8MP', 'Zoom motorisé 2.8-12mm', 'Vision nocturne 60m', 'IK10 anti-vandalisme', 'H.265+ compression'],
          rating: 4.8,
          image: '🎥'
        },
        {
          name: 'Hikvision DS-2CD2387G2-LU',
          model: 'Caméra Turret ColorVu',
          price: 'Devis sur WhatsApp',
          features: ['8MP 4K', 'ColorVu 24h/24', 'Audio intégré', 'Smart Hybrid Light', 'Strobe lumineux'],
          rating: 4.7,
          image: '📹'
        },
        {
          name: 'Hikvision DS-2DE4A425IW-DE',
          model: 'Caméra PTZ IR 4MP',
          price: 'Devis sur WhatsApp',
          features: ['4MP PTZ', 'Zoom optique 25x', 'Auto-tracking', 'Vision nocturne 100m', 'Protection IP66'],
          rating: 4.9,
          image: '🔄'
        },
        {
          name: 'Dahua DH-IPC-HFW3249T1P-AS-PV',
          model: 'Caméra Full Color 2MP',
          price: 'Devis sur WhatsApp',
          features: ['Full Color 24h/24', 'IA SMD Plus', 'Audio actif deterrent', 'Sirène + LED blanc', 'IP67'],
          rating: 4.8,
          image: '🌈'
        },
        {
          name: 'Uniview IPC2128LR3-PF40-D',
          model: 'Caméra IP 8MP LightHunter',
          price: 'Devis sur WhatsApp',
          features: ['8MP 4K', 'LightHunter 0.005 lux', 'Smart IR 30m', 'Audio intégré', 'IK10 anti-vandalisme'],
          rating: 4.7,
          image: '🌙'
        }
      ]
    },
    {
      id: 'controle-acces',
      title: 'Contrôle d\'Accès Multi-Marques',
      icon: Shield,
      description: 'Hikvision, Dahua, Uniview - Terminaux reconnaissance faciale et biométrique. Import direct 1688',
      products: [
        {
          name: 'Hikvision DS-K1T341CMF',
          model: 'Terminal Facial + Empreinte',
          price: 'Devis sur WhatsApp',
          features: ['Reconnaissance faciale', 'Scanner empreintes', 'Lecteur RFID', '1500 utilisateurs', 'Écran 4.3"'],
          rating: 4.8,
          popular: true,
          image: '👤'
        },
        {
          name: 'Hikvision DS-K1T690MF-X',
          model: 'Terminal Ultra Série',
          price: 'Devis sur WhatsApp',
          features: ['Écran 15.6" tactile', '100 000 visages', 'Double caméra 2MP', 'Précision >99%', 'Détection masque'],
          rating: 4.9,
          image: '🖥️'
        },
        {
          name: 'Hikvision DS-K1T671MF',
          model: 'Terminal avec Thermométrie',
          price: 'Devis sur WhatsApp',
          features: ['Mesure température', 'Reconnaissance faciale', 'Écran 7" tactile', 'Détection fièvre', 'Alerte sanitaire'],
          rating: 4.7,
          image: '🌡️'
        },
        {
          name: 'Dahua ASI7213Y-V3',
          model: 'Terminal Facial + QR Code',
          price: 'Devis sur WhatsApp',
          features: ['Reconnaissance faciale rapide', 'Scan QR code', 'Écran 5" IPS', 'Caméra 2MP WDR', 'Détection masque'],
          rating: 4.6,
          image: '📱'
        },
        {
          name: 'Uniview UV-AC-F710-MF-P',
          model: 'Terminal Multimodal Pro',
          price: 'Devis sur WhatsApp',
          features: ['Face + Fingerprint + Card', 'Écran 7" couleur', 'Capacité 50000 faces', 'TCP/IP + WiFi', 'Détection vivacité'],
          rating: 4.5,
          image: '🔐'
        }
      ]
    },
    {
      id: 'alarmes',
      title: 'Kits Alarme Hikvision',
      icon: Shield,
      description: 'Systèmes d\'alarme sans fil avec application mobile et télésurveillance',
      products: [
        {
          name: 'Hikvision AX PRO',
          model: 'Kit Alarme Sans Fil',
          price: 'Devis sur WhatsApp',
          features: ['Hub central', '8 détecteurs inclus', 'App Hik-Connect', 'Sirène 110dB', 'Batterie 24h'],
          rating: 4.8,
          popular: true,
          image: '🚨'
        },
        {
          name: 'Hikvision AX Hub',
          model: 'Centrale Pro',
          price: 'Devis sur WhatsApp',
          features: ['32 zones sans fil', 'Communication 4G/WiFi', 'Sirène intégrée', 'Batterie secours', 'Extensible'],
          rating: 4.7,
          image: '📡'
        }
      ]
    },
    {
      id: 'visiophonie',
      title: 'Visiophonie Hikvision',
      icon: Smartphone,
      description: 'Interphones vidéo IP avec écrans haute définition',
      products: [
        {
          name: 'Hikvision DS-KH6320-WTE1',
          model: 'Moniteur Intérieur 7"',
          price: 'Devis sur WhatsApp',
          features: ['Écran 7" tactile', 'Connexion WiFi', 'App mobile', 'Enregistrement', 'Mémoire 8GB'],
          rating: 4.6,
          popular: true,
          image: '📱'
        },
        {
          name: 'Hikvision DS-KD8003-IME1',
          model: 'Portier Vidéo Extérieur',
          price: 'Devis sur WhatsApp',
          features: ['Caméra 2MP grand angle', 'Vision nocturne IR', 'Audio bidirectionnel', 'Carte RFID', 'IP65'],
          rating: 4.8,
          image: '🚪'
        }
      ]
    },
    {
      id: 'domotique',
      title: '🏠 Domotique & Bâtiment Intelligent',
      icon: Wifi,
      description: '🔄 RETROFIT : Rendez smart votre installation existante OU 🏗️ NEUF : Équipements intelligents directs • WiFi • Bluetooth • Zigbee',
      products: [
        {
          name: '🏠 Hub Central Zigbee',
          model: 'Passerelle Multi-Protocoles',
          price: 'Devis sur WhatsApp',
          features: ['Zigbee 3.0 + WiFi + Bluetooth', 'App mobile unifiée', 'Compatible Alexa/Google', '256 appareils max', 'Contrôle vocal'],
          rating: 4.8,
          popular: true,
          image: '🏠'
        },
        {
          name: '🔄 Micro-Module Retrofit',
          model: 'Smart Switch Encastrable',
          price: 'Devis sur WhatsApp',
          features: ['Installation derrière interrupteur existant', 'Aucun changement visible', 'Contrôle à distance', 'Programmation horaire', 'Retour d\'état'],
          rating: 4.9,
          popular: true,
          image: '🔧'
        },
        {
          name: '🏗️ Interrupteur Smart Direct',
          model: 'Smart Switch Nouvelle Construction',
          price: 'Devis sur WhatsApp',
          features: ['Écran tactile intégré', 'Design moderne', '3 gangs indépendants', 'Contrôle vocal', 'Scénarios avancés'],
          rating: 4.7,
          image: '💡'
        },
        {
          name: '👁️ Capteur Mouvement PIR',
          model: 'Motion Detector Zigbee',
          price: 'Devis sur WhatsApp',
          features: ['Détection 120° infrarouge', 'Batterie 2 ans', 'Déclenchement automatique', 'Installation magnétique', 'Discret'],
          rating: 4.6,
          image: '👁️'
        },
        {
          name: '🌡️ Capteur Température/Humidité',
          model: 'Climate Sensor Zigbee',
          price: 'Devis sur WhatsApp',
          features: ['Température -20°C à +60°C', 'Humidité 0-100%', 'Historique données', 'Alertes seuils', 'Écran LCD'],
          rating: 4.5,
          image: '🌡️'
        },
        {
          name: '🔌 Prise Connectée 16A',
          model: 'Smart Plug WiFi/Zigbee',
          price: 'Devis sur WhatsApp',
          features: ['Mesure consommation temps réel', 'Timer programmable', 'Contrôle à distance', 'Protection surtension', '16A max'],
          rating: 4.4,
          image: '🔌'
        },
        {
          name: '📊 Compteur Intelligent',
          model: 'Smart Energy Meter',
          price: 'Devis sur WhatsApp',
          features: ['Mesure consommation électrique', 'Données temps réel', 'Détection anomalies', 'Export données', 'Installation modulaire'],
          rating: 4.7,
          image: '📊'
        },
        {
          name: '📱 Télécommande Smart',
          model: 'Universal Remote Zigbee',
          price: 'Devis sur WhatsApp',
          features: ['Contrôle infrarouge universel', 'Base de données 8000+ appareils', 'Scénarios personalisés', 'App mobile', 'Compact'],
          rating: 4.6,
          image: '📱'
        },
        {
          name: '🚪 Contact Intelligent',
          model: 'Smart Door/Window Sensor',
          price: 'Devis sur WhatsApp',
          features: ['Détection ouverture/fermeture', 'Batterie 2 ans', 'Alertes instantanées', 'Installation aimant', 'Étanche IP54'],
          rating: 4.5,
          image: '🚪'
        },
        {
          name: '🏠 Module Volets/Stores',
          model: 'Smart Shutter Control',
          price: 'Devis sur WhatsApp',
          features: ['Motorisation volets/stores', 'Programmation solaire', 'Contrôle pourcentage', 'Sécurité anti-pincement', 'Installation facile'],
          rating: 4.8,
          image: '🏠'
        },
        {
          name: '🔊 Sirène Intelligente',
          model: 'Smart Alarm Siren Zigbee',
          price: 'Devis sur WhatsApp',
          features: ['110dB volume réglable', 'LED clignotantes', 'Batterie secours', 'Déclenchement automatique', 'Anti-sabotage'],
          rating: 4.7,
          image: '🔊'
        },
        {
          name: '💡 Module Variation',
          model: 'Smart Dimmer Module',
          price: 'Devis sur WhatsApp',
          features: ['Variation 0-100%', 'LED + Halogène compatible', 'Installation 1 ou 2 fils', 'Mémorisation niveaux', 'Protection surcharge'],
          rating: 4.6,
          image: '💡'
        }
      ]
    },
    {
      id: 'reseau',
      title: 'Infrastructure Réseau',
      icon: Database,
      description: 'Équipements réseau professionnels Hikvision pour une connectivité optimale',
      products: [
        {
          name: 'Switch PoE Hikvision',
          model: 'DS-3E0318P-E/M',
          price: 'Devis sur WhatsApp',
          features: ['18 ports PoE+', 'Budget 250W', 'Gestion web', 'VLAN support', 'Garantie 3 ans'],
          rating: 4.8,
          popular: true,
          image: '🔌'
        },
        {
          name: 'NVR Hikvision 32 canaux',
          model: 'DS-7732NI-I4/16P',
          price: 'Devis sur WhatsApp',
          features: ['32 canaux IP', '16 ports PoE', '4K output', 'RAID support', 'VCA avancé'],
          rating: 4.9,
          image: '💾'
        },
        {
          name: 'Point d\'Accès WiFi 6',
          model: 'Enterprise Grade',
          price: 'Devis sur WhatsApp',
          features: ['WiFi 6 AX1800', 'PoE+', 'Dual Band', 'Management cloud', 'Enterprise grade'],
          rating: 4.7,
          image: '📡'
        }
      ]
    },
    {
      id: 'network-cabling',
      title: '🌐 Câblage Réseau & TV Bâtiment',
      icon: Wifi,
      description: 'Infrastructure complète Cat6A/Cat7 + TV satellite. Installation optimale dès la construction pour performance maximale',
      products: [
        {
          name: '📡 Câble Cat6A UTP 305m',
          model: 'Legrand LCS3 Certified',
          price: 'Devis sur WhatsApp',
          features: ['Certifié 10 Gbps', 'Gaine LSOH anti-feu', 'Blindage optimisé', 'Bobine professionnelle', '25 ans garantie'],
          rating: 4.8,
          popular: true,
          image: '📡'
        },
        {
          name: '📺 Câble Coaxial RG6 Triple Blindage',
          model: 'Satellite/TNT Premium',
          price: 'Devis sur WhatsApp',
          features: ['Triple blindage haute qualité', 'Impédance 75Ω précise', 'Gaine extérieure UV résistante', 'Connecteur F intégré', 'Signal optimal'],
          rating: 4.7,
          image: '📺'
        },
        {
          name: '🔌 Prise RJ45 Cat6A Blindée',
          model: 'Legrand Mosaic Professional',
          price: 'Devis sur WhatsApp',
          features: ['Connexion IDC sans outil', 'Blindage 360°', 'Test automatique', 'Détrompeur intégré', 'Finition premium'],
          rating: 4.9,
          image: '🔌'
        },
        {
          name: '🏢 Baie Brassage 19" 12U',
          model: 'Armoire Réseau Professionnelle',
          price: 'Devis sur WhatsApp',
          features: ['19 pouces standard', 'Ventilation optimisée', 'Panneau brassage 24 ports', 'Serre-câbles inclus', 'Serrure sécurisée'],
          rating: 4.6,
          image: '🏢'
        },
        {
          name: '📊 Testeur Certification Cat6A',
          model: 'Qualification Performance',
          price: 'Devis sur WhatsApp',
          features: ['Tests certification TIA/ISO', 'Mesures longueur précises', 'Détection défauts', 'Rapport automatique', 'Traçabilité complète'],
          rating: 4.8,
          image: '📊'
        },
        {
          name: '📋 Documentation Technique',
          model: 'Plan Câblage Complet',
          price: 'Devis sur WhatsApp',
          features: ['Plans AutoCAD détaillés', 'Étiquetage professionnel', 'Numérotation logique', 'Base données Excel', 'Formation équipe'],
          rating: 4.7,
          image: '📋'
        }
      ]
    },
    {
      id: 'fiber-optic',
      title: '⚡ Fibre Optique FTTH Professionnelle',
      icon: Wifi,
      description: '🔗 BPI • PBO • PTO pour opérateurs. Installation complète prête raccordement Orange/Free/SFR. Projet Antalya réalisé ✅',
      products: [
        {
          name: '🔗 BPI 8 Départs Extérieur',
          model: 'CommScope FlexNAP F08',
          price: 'Devis sur WhatsApp',
          features: ['8 sorties fibres SC/APC', 'Étanche IP65', 'Verrouillage sécurisé', 'Montage poteau/mural', 'Norme opérateurs'],
          rating: 4.9,
          popular: true,
          image: '🔗'
        },
        {
          name: '📡 PBO 4 Ports Étage',
          model: 'Point Branchement Optique',
          price: 'Devis sur WhatsApp',
          features: ['4 connecteurs SC/APC', 'Montage mural discret', 'Cassettes de protection', 'Traçabilité fibres', 'Accès sécurisé'],
          rating: 4.8,
          image: '📡'
        },
        {
          name: '🏠 PTO Prise Terminale',
          model: 'Prise Murale SC/APC',
          price: 'Devis sur WhatsApp',
          features: ['Prise finale appartement', 'Connecteur SC/APC', 'Encastrable Legrand', 'Faible perte insertion', 'Finition élégante'],
          rating: 4.7,
          image: '🏠'
        },
        {
          name: '⚡ Fibre G.657.A2 12F',
          model: 'Corning OptiTap Monomode',
          price: 'Devis sur WhatsApp',
          features: ['12 fibres G.657.A2', 'Résistante flexion', 'Gaine LSOH', 'Marquage métrage', 'Qualité Corning'],
          rating: 4.9,
          popular: true,
          image: '⚡'
        },
        {
          name: '🔧 Cassette Soudure 12F',
          model: 'Protection Épissurage',
          price: 'Devis sur WhatsApp',
          features: ['12 soudures protégées', 'Enrouleur fibres', 'Empilage modulaire', 'Identification claire', 'Accès facile'],
          rating: 4.6,
          image: '🔧'
        },
        {
          name: '📊 Tests OTDR + Certification',
          model: 'Mesures Optiques Complètes',
          price: 'Devis sur WhatsApp',
          features: ['Réflectométrie OTDR', 'Mesures perte insertion', 'Certificats conformité', 'Dossier technique opérateur', 'Garantie 25 ans'],
          rating: 4.8,
          image: '📊'
        }
      ]
    },
    {
      id: 'digitalisation',
      title: 'Solutions Digitales',
      icon: Cpu,
      description: 'Digitalisation complète : développement, middleware, data science, DevOps',
      products: [
        {
          name: 'Application Mobile Custom',
          model: 'Développement sur mesure',
          price: 'Devis sur WhatsApp',
          features: ['iOS + Android', 'Backend API', 'Design UX/UI', 'Maintenance incluse', 'Architecture microservices'],
          rating: 4.9,
          popular: true,
          image: '📱'
        },
        {
          name: 'Plateforme Web Enterprise',
          model: 'Solution complète',
          price: 'Devis sur WhatsApp',
          features: ['Spring Boot/React', 'Base de données', 'Sécurité OAuth2', 'CI/CD pipeline', 'Cloud deployment'],
          rating: 4.8,
          image: '🌐'
        },
        {
          name: 'Middleware & API',
          model: 'Intégration systèmes',
          price: 'Devis sur WhatsApp',
          features: ['API Gateway', 'Message queues', 'Data transformation', 'Legacy integration', 'Monitoring'],
          rating: 4.7,
          image: '⚙️'
        },
        {
          name: 'Business Intelligence',
          model: 'Analytics & Reporting',
          price: 'Devis sur WhatsApp',
          features: ['Data warehouse', 'Dashboards interactifs', 'Machine Learning', 'Reporting automatisé', 'Big Data'],
          rating: 4.8,
          image: '📊'
        },
        {
          name: 'DevOps & Cloud',
          model: 'Infrastructure moderne',
          price: 'Devis sur WhatsApp',
          features: ['Docker/Kubernetes', 'CI/CD GitHub Actions', 'Monitoring Grafana', 'Cloud AWS/Azure', 'Sécurité'],
          rating: 4.9,
          image: '☁️'
        }
      ]
    }
  ]

  return (
    <main>
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-white via-gray-50 to-gray-100 page-content pt-28 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Nos <span className="bg-gradient-to-r from-emerald-600 to-purple-600 bg-clip-text text-transparent">Produits</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-8">
              Hikvision, Dahua, Uniview et bien d'autres marques. Import direct Chine pour qualité/prix imbattable.
            </p>
            
            {/* Info Banner */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mx-auto max-w-4xl text-left mb-8">
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-500 rounded-full">
                    <span className="text-white text-sm font-bold">∞</span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-blue-700 font-semibold mb-2">🌟 Offre Produits Illimitée</p>
                  <p className="text-blue-600 text-sm">
                    <strong>Import direct :</strong> Approvisionnement depuis 1688.com et Alibaba pour des prix imbattables.<br/>
                    <strong>Marques disponibles :</strong> Hikvision, Dahua, Uniview, et des centaines d'autres selon vos besoins.<br/>
                    <strong>Catalogue :</strong> Les produits ci-dessous sont des exemples. Nous pouvons sourcer tout équipement sur demande.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center bg-white rounded-full px-4 py-2 shadow-md">
                <CheckCircle className="h-5 w-5 text-emerald-600 mr-2" />
                <span className="text-sm font-medium">Garantie constructeur</span>
              </div>
              <div className="flex items-center bg-white rounded-full px-4 py-2 shadow-md">
                <CheckCircle className="h-5 w-5 text-emerald-600 mr-2" />
                <span className="text-sm font-medium">Installation incluse</span>
              </div>
              <div className="flex items-center bg-white rounded-full px-4 py-2 shadow-md">
                <CheckCircle className="h-5 w-5 text-emerald-600 mr-2" />
                <span className="text-sm font-medium">Prix imbattables</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Sections */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {categories.map((category, categoryIndex) => {
            const IconComponent = category.icon
            
            return (
              <div key={category.id} className="mb-24 last:mb-0">
                {/* Category Header */}
                <div className="text-center mb-16">
                  <div className="flex items-center justify-center mb-4">
                    <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-purple-600 rounded-2xl shadow-lg">
                      <IconComponent className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{category.title}</h2>
                  <p className="text-lg text-gray-600 max-w-2xl mx-auto">{category.description}</p>
                </div>

                {/* Products Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {category.products.map((product, index) => (
                    <ProductCard
                      key={index}
                      name={product.name}
                      model={product.model}
                      price={product.price}
                      features={product.features}
                      rating={product.rating}
                      images={[
                        '/file.svg',
                        '/window.svg',
                        '/globe.svg'
                      ]}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Section Explicative Domotique */}
      <section className="py-20 bg-gradient-to-br from-blue-50 via-purple-50 to-emerald-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              🏠 <span className="text-blue-600">Deux Approches Domotiques</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Que votre bâtiment soit existant ou en construction, nous avons la solution adaptée
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Mode Retrofit */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">🔄</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Mode RETROFIT</h3>
                    <p className="text-orange-100">Pour bâtiments existants</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <h4 className="text-xl font-semibold text-gray-900 mb-4">✨ Rendez intelligent sans refaire</h4>
                
                <div className="space-y-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-emerald-600 mt-1" />
                    <div>
                      <p className="font-medium text-gray-900">Micro-modules invisibles</p>
                      <p className="text-sm text-gray-600">Installation derrière vos interrupteurs existants</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-emerald-600 mt-1" />
                    <div>
                      <p className="font-medium text-gray-900">Aucun changement visible</p>
                      <p className="text-sm text-gray-600">Vos interrupteurs gardent leur aspect d'origine</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-emerald-600 mt-1" />
                    <div>
                      <p className="font-medium text-gray-900">Installation rapide</p>
                      <p className="text-sm text-gray-600">Pas de travaux lourds ni de peinture</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-emerald-600 mt-1" />
                    <div>
                      <p className="font-medium text-gray-900">Contrôle mobile</p>
                      <p className="text-sm text-gray-600">App unique pour tout contrôler</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h5 className="font-semibold text-orange-800 mb-2">💡 Idéal pour :</h5>
                  <ul className="text-orange-700 text-sm space-y-1">
                    <li>• Appartements et maisons déjà meublés</li>
                    <li>• Bureaux en activité</li>
                    <li>• Éviter les travaux de rénovation</li>
                    <li>• Budget maîtrisé</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Mode Construction Neuve */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">🏗️</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Mode CONSTRUCTION</h3>
                    <p className="text-blue-100">Pour projets neufs</p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <h4 className="text-xl font-semibold text-gray-900 mb-4">🚀 Équipements smart directement</h4>
                
                <div className="space-y-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-emerald-600 mt-1" />
                    <div>
                      <p className="font-medium text-gray-900">Design moderne intégré</p>
                      <p className="text-sm text-gray-600">Interrupteurs tactiles avec écrans</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-emerald-600 mt-1" />
                    <div>
                      <p className="font-medium text-gray-900">Fonctionnalités avancées</p>
                      <p className="text-sm text-gray-600">Scénarios complexes et contrôle vocal</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-emerald-600 mt-1" />
                    <div>
                      <p className="font-medium text-gray-900">Installation optimale</p>
                      <p className="text-sm text-gray-600">Câblage prévu dès la construction</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="h-5 w-5 text-emerald-600 mt-1" />
                    <div>
                      <p className="font-medium text-gray-900">Évolutivité maximale</p>
                      <p className="text-sm text-gray-600">Prêt pour les futures technologies</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h5 className="font-semibold text-blue-800 mb-2">🏗️ Idéal pour :</h5>
                  <ul className="text-blue-700 text-sm space-y-1">
                    <li>• Nouvelles constructions</li>
                    <li>• Rénovations complètes</li>
                    <li>• Projets haut de gamme</li>
                    <li>• Bâtiments intelligents</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Interface unifiée */}
          <div className="mt-16 bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                📱 Interface Mobile Unifiée
              </h3>
              <p className="text-lg text-gray-600">
                Quel que soit le mode choisi, vous bénéficiez de la même application conviviale
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📱</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">App iOS/Android</h4>
                <p className="text-sm text-gray-600">Interface intuitive et moderne pour tous vos équipements</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🎛️</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Contrôle Central</h4>
                <p className="text-sm text-gray-600">Tous vos protocoles (WiFi, Zigbee, Bluetooth) unifiés</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🎭</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Scénarios Smart</h4>
                <p className="text-sm text-gray-600">Automatisations selon vos habitudes et préférences</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-emerald-600 via-teal-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Besoin d'aide pour choisir ?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Nos experts vous accompagnent dans le choix des produits les plus adaptés à vos besoins et votre budget.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://wa.me/221774133440?text=Bonjour, j'ai besoin d'aide pour choisir des produits de sécurité électronique. Voici mes informations:%0A- Nom:%0A- Type de projet:%0A- Budget approximatif:%0A- Besoins spécifiques:%0AMerci"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-lg font-semibold transition-all duration-300 inline-flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
              </svg>
              Conseil WhatsApp
            </a>
            <Link
              href="/contact"
              className="bg-white text-emerald-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-all duration-300 inline-flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Conseil personnalisé
              <ArrowRight className="h-5 w-5 ml-2" />
            </Link>
            <a
              href="tel:+221774133440"
              className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-emerald-600 transition-all duration-300 inline-flex items-center justify-center"
            >
              📞 +221 77 413 34 40
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}