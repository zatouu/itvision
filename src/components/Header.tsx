'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X, Phone, Mail, ChevronDown, Home as HomeIcon, Boxes, Package, CircuitBoard, Images, Info, MessageSquare, Camera, Lock, Home as House, Flame, Cable, Wrench, Shield, ArrowRight, FileCheck, Heart, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import UnifiedLoginButton from './UnifiedLoginButton'
import MarketAuthButton from './MarketAuthButton'
import WishlistIcon from './WishlistIcon'
import ThemeToggle from './ThemeToggle'

const Header = () => {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isServicesOpen, setIsServicesOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const headerRef = useRef<HTMLElement>(null)

  const marketCreateAccountHref = `/market/creer-compte?redirect=${encodeURIComponent(pathname || '/produits')}`
  const isMarketPage = (pathname || '').startsWith('/market')

  // Fermeture du menu au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMenuOpen &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  useEffect(() => {
    const header = headerRef.current
    if (!header) return

    const updateHeaderHeight = () => {
      const height = Math.ceil(header.getBoundingClientRect().height)
      document.documentElement.style.setProperty('--header-height', `${height}px`)
    }

    updateHeaderHeight()

    const observer = new ResizeObserver(updateHeaderHeight)
    observer.observe(header)
    window.addEventListener('resize', updateHeaderHeight)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateHeaderHeight)
    }
  }, [])

  const navigation = [
    { name: 'Accueil', href: '/', icon: HomeIcon },
    { name: 'Services', href: '/services', icon: Boxes },
    { name: 'Produits', href: '/produits', icon: Package },
    { name: 'Digitalisation', href: '/digitalisation', icon: CircuitBoard },
    { name: 'Réalisations', href: '/realisations', icon: Images },
    { name: 'À propos', href: '/about', icon: Info },
    { name: 'Contact', href: '/contact', icon: MessageSquare },
  ] as const

  const servicesMenu = [
    { 
      name: 'Vidéosurveillance', 
      href: '/services/videosurveillance', 
      icon: Camera,
      description: 'Caméras HD/4K, analyses intelligentes et supervision temps réel'
    },
    { 
      name: "Contrôle d'accès", 
      href: '/services/controle-acces', 
      icon: Lock,
      description: 'Badges RFID, biométrie et gestion centralisée des autorisations'
    },
    { 
      name: 'Domotique', 
      href: '/domotique', 
      icon: House,
      description: 'Protocoles mesh avancés et solutions sur-mesure connectées'
    },
    { 
      name: 'Sécurité incendie', 
      href: '/services/securite-incendie', 
      icon: Flame,
      description: 'Détection précoce et extinction automatique conformes aux normes'
    },
    { 
      name: 'Câblage Réseau & TV', 
      href: '/services/network-cabling', 
      icon: Cable,
      description: 'Infrastructure Cat6A/Cat7 et prises TV/satellite professionnelles'
    },
    { 
      name: 'Fibre Optique FTTH', 
      href: '/services/fiber-optic', 
      icon: Shield,
      description: 'Installation BPI, PBO et PTO avec dossier technique opérateur'
    },
    { 
      name: 'Maintenance & Support', 
      href: '/services/maintenance', 
      icon: Wrench,
      description: 'Support 24h/7j et maintenance préventive de tous équipements'
    },
    { 
      name: 'Digitalisation PME', 
      href: '/digitalisation', 
      icon: CircuitBoard,
      description: 'Transformation digitale et automatisation des processus pour PME'
    },
    { 
      name: 'QHSE', 
      href: '/services/qhse', 
      icon: FileCheck,
      description: 'Qualité, Hygiène, Sécurité, Environnement - Personnel certifié'
    },
  ] as const

  // Supprimé - remplacé par UnifiedLoginButton

  return (
    <header ref={headerRef} className="bg-white/98 dark:bg-slate-950/95 backdrop-blur-md shadow-lg fixed w-full top-0 z-50 border-b border-emerald-100 dark:border-slate-800">
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
        <div className="flex justify-between items-center py-0">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-3 shrink-0">
              <Image
                src="/logo-it-vision.png"
                alt="IT Vision"
                width={610}
                height={530}
                className="h-20 sm:h-24 lg:h-28 xl:h-32 w-auto object-contain"
                sizes="(max-width: 640px) 80px, (max-width: 1024px) 96px, (max-width: 1280px) 112px, 128px"
                priority
                style={{
                  objectFit: "contain",
                }}
              />
            </Link>
          </div>

          {/* Menu desktop - spacieux et moderne */}
          <div className="hidden lg:flex items-center flex-1 justify-between ml-10 lg:ml-14">
            <div className="flex items-center space-x-1 flex-1">
              {/* Liens principaux avec icônes à gauche */}
              {navigation.map((item) => {
                const Icon = item.icon
                const isServices = item.name === 'Services'
                if (isServices) {
                  return (
                    <div className="relative group flex-1" key={item.name}>
                      <Link
                        href={item.href}
                        className="flex items-center gap-3 text-gray-700 dark:text-gray-200 hover:text-emerald-600 px-3 py-1 text-sm font-medium transition-all duration-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 rounded-xl w-full justify-start group"
                      >
                        <Icon className="h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-emerald-500 transition-colors" />
                        <span className="whitespace-nowrap">{item.name}</span>
                        <ChevronDown className="ml-auto h-4 w-4 text-gray-400 dark:text-gray-500 group-hover:text-emerald-500 transition-colors" />
                      </Link>
                      <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-300 absolute left-0 mt-2 w-[900px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 z-50 overflow-hidden">
                        <div className="p-8">
                          {/* Header du menu */}
                          <div className="mb-8">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Nos Services</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Solutions complètes de sécurité électronique</p>
                          </div>
                          
                          {/* Grid 3 colonnes */}
                          <div className="grid grid-cols-3 gap-8">
                            {/* Colonne SÉCURITÉ */}
                            <div>
                              <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-5 flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                SÉCURITÉ
                              </h4>
                              <div className="space-y-2">
                                {servicesMenu.slice(0, 3).map((s) => {
                                  const SIcon = s.icon
                                  return (
                                    <Link
                                      key={s.name}
                                      href={s.href}
                                      className="block p-4 rounded-xl hover:bg-gradient-to-r hover:from-emerald-50 hover:to-purple-50 dark:hover:from-emerald-900/30 dark:hover:to-purple-900/20 transition-all duration-200 group/item border border-transparent hover:border-emerald-100 dark:hover:border-emerald-800"
                                    >
                                      <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-emerald-100 to-purple-100 dark:from-emerald-900/40 dark:to-purple-900/40 rounded-xl flex items-center justify-center group-hover/item:from-emerald-500 group-hover/item:to-purple-500 transition-all duration-300 shadow-sm">
                                          <SIcon className="h-5 w-5 text-emerald-600 group-hover/item:text-white transition-colors" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <h5 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 group-hover/item:text-emerald-600 transition-colors">{s.name}</h5>
                                          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2">{s.description}</p>
                                        </div>
                                      </div>
                                    </Link>
                                  )
                                })}
                              </div>
                            </div>

                            {/* Colonne INFRASTRUCTURE */}
                            <div>
                              <h4 className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-5 flex items-center gap-2">
                                <Cable className="h-4 w-4" />
                                INFRASTRUCTURE
                              </h4>
                              <div className="space-y-2">
                                {servicesMenu.slice(3, 6).map((s) => {
                                  const SIcon = s.icon
                                  return (
                                    <Link
                                      key={s.name}
                                      href={s.href}
                                      className="block p-4 rounded-xl hover:bg-gradient-to-r hover:from-emerald-50 hover:to-purple-50 dark:hover:from-emerald-900/30 dark:hover:to-purple-900/20 transition-all duration-200 group/item border border-transparent hover:border-purple-100 dark:hover:border-purple-800"
                                    >
                                      <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-emerald-100 to-purple-100 dark:from-emerald-900/40 dark:to-purple-900/40 rounded-xl flex items-center justify-center group-hover/item:from-emerald-500 group-hover/item:to-purple-500 transition-all duration-300 shadow-sm">
                                          <SIcon className="h-5 w-5 text-purple-600 group-hover/item:text-white transition-colors" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <h5 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 group-hover/item:text-purple-600 transition-colors">{s.name}</h5>
                                          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2">{s.description}</p>
                                        </div>
                                      </div>
                                    </Link>
                                  )
                                })}
                              </div>
                            </div>

                            {/* Colonne SUPPORT */}
                            <div>
                              <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-5 flex items-center gap-2">
                                <Wrench className="h-4 w-4" />
                                SUPPORT
                              </h4>
                              <div className="space-y-2">
                                {servicesMenu.slice(6).map((s) => {
                                  const SIcon = s.icon
                                  return (
                                    <Link
                                      key={s.name}
                                      href={s.href}
                                      className="block p-4 rounded-xl hover:bg-gradient-to-r hover:from-emerald-50 hover:to-purple-50 dark:hover:from-emerald-900/30 dark:hover:to-purple-900/20 transition-all duration-200 group/item border border-transparent hover:border-emerald-100 dark:hover:border-emerald-800"
                                    >
                                      <div className="flex items-start gap-4">
                                        <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-emerald-100 to-purple-100 dark:from-emerald-900/40 dark:to-purple-900/40 rounded-xl flex items-center justify-center group-hover/item:from-emerald-500 group-hover/item:to-purple-500 transition-all duration-300 shadow-sm">
                                          <SIcon className="h-5 w-5 text-emerald-600 group-hover/item:text-white transition-colors" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <h5 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 group-hover/item:text-emerald-600 transition-colors">{s.name}</h5>
                                          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2">{s.description}</p>
                                        </div>
                                      </div>
                                    </Link>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                          
                          {/* Footer du menu */}
                          <div className="border-t border-gray-100 dark:border-slate-800 mt-8 pt-6 flex justify-between items-center">
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                              Expertise IT Vision depuis 2019
                            </div>
                            <Link
                              href="/services"
                              className="flex items-center gap-2 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-purple-600 px-6 py-2.5 rounded-xl hover:from-emerald-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                            >
                              Voir tous nos services
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                }
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center gap-3 text-gray-700 dark:text-gray-200 hover:text-emerald-600 px-3 py-1 text-sm font-medium transition-all duration-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 rounded-xl flex-1 justify-start group"
                  >
                    <Icon className="h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-emerald-500 transition-colors" />
                    <span className="whitespace-nowrap">{item.name}</span>
                  </Link>
                )
              })}
            </div>

            {/* Séparateur */}
            <div className="h-8 w-px bg-gray-200 dark:bg-slate-700 mx-4"></div>
            
            {/* Actions */}
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <WishlistIcon />
              {isMarketPage ? (
                <MarketAuthButton variant="header" className="hidden xl:inline-flex" />
              ) : (
                <Link
                  href={marketCreateAccountHref}
                  className="hidden xl:inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
                >
                  <UserPlus className="h-4 w-4" />
                  Compte Market
                </Link>
              )}
              <UnifiedLoginButton variant="header" />
            </div>
          </div>

          {/* Supprimer le CTA devis redondant pour aérer la barre */}

          {/* Menu mobile */}
          <div className="md:hidden">
            <button
              ref={buttonRef}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 dark:text-gray-200 hover:text-emerald-600 transition-colors duration-300 p-2"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

          {/* Menu mobile dropdown - amélioré */}
        {isMenuOpen && (
          <div ref={menuRef} className="md:hidden">
            <div className="px-2 pt-2 pb-4 space-y-2 bg-white dark:bg-slate-950 border-t border-gray-100 dark:border-slate-800 shadow-lg">
              {/* Accueil */}
              <Link
                href="/"
                className="flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-900 block px-4 py-3 text-base font-semibold transition-all duration-300 rounded-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                <HomeIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                Accueil
              </Link>

              {/* Services - accordéon */}
              <button
                onClick={() => setIsServicesOpen(!isServicesOpen)}
                className="w-full flex items-center justify-between px-4 py-3 text-base font-semibold text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-900 rounded-lg transition-all"
                aria-expanded={isServicesOpen}
              >
                <span className="flex items-center gap-2">
                  <Boxes className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  Services
                </span>
                <ChevronDown className={`h-5 w-5 transition-transform ${isServicesOpen ? 'rotate-180' : ''}`} />
              </button>
              {isServicesOpen && (
                <div className="pl-4 space-y-1">
                  {servicesMenu.map((s) => {
                    const SIcon = s.icon
                    return (
                      <Link
                        key={s.name}
                        href={s.href}
                        className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-900 rounded-lg text-sm"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <SIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        {s.name}
                      </Link>
                    )
                  })}
                </div>
              )}

              {/* Autres liens */}
              {navigation.filter((n) => n.name !== 'Accueil' && n.name !== 'Services').map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-900 block px-4 py-3 text-base font-semibold transition-all duration-300 rounded-lg"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Icon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    {item.name}
                  </Link>
                )
              })}
              
              {/* Séparateur pour mobile */}
              <div className="border-t border-gray-200 dark:border-slate-800 my-3"></div>
              
              {/* Actions mobile */}
              <div className="px-4 flex items-center gap-3">
                <ThemeToggle />
                {isMarketPage ? (
                  <MarketAuthButton
                    variant="default"
                    className="flex-1 flex items-center justify-center"
                  />
                ) : (
                  <Link
                    href={marketCreateAccountHref}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <UserPlus className="h-4 w-4" />
                    Compte Market
                  </Link>
                )}
                <Link
                  href="/produits/favoris"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-900"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Heart className="h-4 w-4" />
                  Favoris
                </Link>
                <UnifiedLoginButton variant="default" className="flex-1" />
              </div>
              
              <Link
                href="/contact"
                className="bg-gray-900 hover:bg-black text-white block px-4 py-3 text-base font-semibold rounded-lg mt-3 transition-all duration-300 text-center"
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