import Link from 'next/link'
import Image from 'next/image'
import { Phone, Mail, MapPin, Clock } from 'lucide-react'
import TechLines from './TechLines'

const Footer = () => {
  return (
    <footer className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-emerald-900 text-white py-12 overflow-hidden">
      <TechLines density="low" opacity={0.05} />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Logo et description */}
          <div className="col-span-1 lg:col-span-1">
            <div className="mb-4">
              <Image
                src="/Complet transparent vert.png"
                alt="IT Vision"
                width={200}
                height={80}
                className="h-16 w-auto object-contain"
                priority
                style={{
                  objectFit: "contain",
                }}
              />
            </div>
            <p className="text-gray-300 mb-4 max-w-md">
              IT Vision Plus : Votre expert en sécurité électronique au Sénégal depuis 2019. Vision technologique avancée 
              pour des solutions innovantes de vidéosurveillance, contrôle d&apos;accès, domotique et sécurité incendie.
            </p>
            <div className="flex space-x-4">
              <div className="flex items-center space-x-2 text-sm">
                <Clock className="h-4 w-4 text-emerald-400" />
                <span>Service 24h/7j</span>
              </div>
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Sécurité Électronique</h3>
            <ul className="space-y-2 text-gray-300">
              <li><Link href="/services/videosurveillance" className="hover:text-emerald-400 transition-colors duration-300">Vidéosurveillance</Link></li>
              <li><Link href="/services/controle-acces" className="hover:text-emerald-400 transition-colors duration-300">Contrôle d&apos;accès</Link></li>
              <li><Link href="/domotique" className="hover:text-emerald-400 transition-colors duration-300">Domotique</Link></li>
              <li><Link href="/services/securite-incendie" className="hover:text-emerald-400 transition-colors duration-300">Sécurité incendie</Link></li>
              <li><Link href="/services/network-cabling" className="hover:text-emerald-400 transition-colors duration-300">Câblage Réseau & TV</Link></li>
              <li><Link href="/produits" className="hover:text-emerald-400 transition-colors duration-300">Produits</Link></li>
            </ul>
          </div>

          {/* Digitalisation */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Digitalisation</h3>
            <ul className="space-y-2 text-gray-300">
              <li><Link href="/digitalisation" className="hover:text-emerald-400 transition-colors duration-300">Développement Web/Mobile</Link></li>
              <li><Link href="/digitalisation" className="hover:text-emerald-400 transition-colors duration-300">Middleware & API</Link></li>
              <li><Link href="/digitalisation" className="hover:text-emerald-400 transition-colors duration-300">Data Science & BI</Link></li>
              <li><Link href="/digitalisation" className="hover:text-emerald-400 transition-colors duration-300">DevOps & Cloud</Link></li>
              <li><Link href="/digitalisation" className="hover:text-emerald-400 transition-colors duration-300">Architecture Microservices</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact</h3>
            <div className="space-y-3 text-gray-300">
              <div className="flex items-start space-x-2">
                <MapPin className="h-5 w-5 text-emerald-400 mt-0.5" />
                <div>
                  <p>Parcelles Assainies U25</p>
                  <p>Dakar, Sénégal</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-5 w-5 text-emerald-400" />
                <a href="tel:+2217774382220" className="hover:text-emerald-400 transition-colors duration-300">
                  +221 77 7438220
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-emerald-400" />
                <a href="mailto:contact@itvisionplus.sn" className="hover:text-emerald-400 transition-colors duration-300">
                  contact@itvisionplus.sn
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-emerald-800 border-opacity-30 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2024 IT Vision. Tous droits réservés.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/mentions-legales" className="text-gray-400 hover:text-emerald-400 text-sm transition-colors duration-300">
                Mentions légales
              </Link>
              <Link href="/politique-confidentialite" className="text-gray-400 hover:text-emerald-400 text-sm transition-colors duration-300">
                Politique de confidentialité
              </Link>
              <Link href="/cgv" className="text-gray-400 hover:text-emerald-400 text-sm transition-colors duration-300">
                CGV
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer