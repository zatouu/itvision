'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, Phone, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'
import ITVisionLogo from './ITVisionLogo'
import UnifiedLoginButton from './UnifiedLoginButton'

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const navigation = [
    { name: 'Accueil', href: '/' },
    { name: 'Services', href: '/services' },
    { name: 'Domotique', href: '/domotique' },
    { name: 'Produits', href: '/produits' },
    { name: 'Digitalisation', href: '/digitalisation' },
    { name: 'Réalisations', href: '/realisations' },
    { name: 'À propos', href: '/about' },
    { name: 'Contact', href: '/contact' },
    { name: 'Admin', href: '/admin' },
  ]

  // Supprimé - remplacé par UnifiedLoginButton

  return (
    <header className="bg-white/98 backdrop-blur-md shadow-lg fixed w-full top-0 z-50 border-b border-emerald-100">
      {/* Barre de contact - réduite */}
      <div className="bg-gradient-to-r from-emerald-600 to-purple-600 text-white py-1.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span className="font-medium">+221 77 7438220</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span className="font-medium">contact@itvisionplus.sn</span>
              </div>
            </div>
            <div className="hidden md:block">
              <span className="font-medium">Intervention 24h/7j - Devis gratuit</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation principale - optimisée */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-3">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <ITVisionLogo size={36} animated={true} />
            </Link>
          </div>

          {/* Menu desktop - amélioré */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-gray-700 hover:text-emerald-600 px-4 py-2.5 text-base font-semibold transition-all duration-300 hover:bg-emerald-50 rounded-lg relative group"
                >
                  {item.name}
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-emerald-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 rounded-full"></span>
                </Link>
              ))}
              
              {/* Séparateur */}
              <div className="h-6 w-px bg-gray-300 mx-2"></div>
              
              {/* Bouton de connexion unifié */}
              <UnifiedLoginButton variant="header" />
            </div>
          </div>

          {/* Supprimer le CTA devis redondant pour aérer la barre */}

          {/* Menu mobile */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-emerald-600 transition-colors duration-300 p-2"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Menu mobile dropdown - amélioré */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-4 space-y-2 bg-white border-t border-gray-100 shadow-lg">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 block px-4 py-3 text-base font-semibold transition-all duration-300 rounded-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              
              {/* Séparateur pour mobile */}
              <div className="border-t border-gray-200 my-3"></div>
              
              {/* Bouton de connexion unifié pour mobile */}
              <div className="px-4">
                <UnifiedLoginButton variant="default" className="w-full" />
              </div>
              
              <Link
                href="/contact"
                className="bg-gradient-to-r from-emerald-500 to-purple-600 text-white block px-4 py-3 text-base font-semibold rounded-lg mt-3 transition-all duration-300 text-center"
                onClick={() => setIsMenuOpen(false)}
              >
                Demander un devis
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}

export default Header