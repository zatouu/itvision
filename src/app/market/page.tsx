'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  ShoppingBag, Package, Users, TrendingDown, ArrowRight,
  Shield, Truck, Clock, Headphones, Sparkles, Star,
  Camera, Lock, Wifi, Bell, Cpu
} from 'lucide-react'
import ImageSearchModal, { ImageSearchButton } from '@/components/ImageSearchModal'

export default function MarketHomePage() {
  const router = useRouter()
  const [showImageSearch, setShowImageSearch] = useState(false)
  const [imageSearchIds, setImageSearchIds] = useState<string[]>([])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-16 sm:py-24 lg:py-32">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-green-300/30 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-violet-300/30 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700 dark:bg-green-900/40 dark:text-green-300">
            <Sparkles className="h-3 w-3" />
            Marketplace IT Vision Plus
          </span>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            Import direct <span className="text-green-600">Chine</span> — Livraison <span className="text-violet-600">Sénégal</span>
          </h1>
          <p className="mt-4 text-base text-gray-600 dark:text-gray-300 sm:text-lg">
            Caméras IP, alarmes, contrôle d'accès, domotique, réseau… Commandez seul ou en groupe pour réduire vos coûts.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/produits"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:opacity-90 transition-opacity"
            >
              <ShoppingBag className="h-4 w-4" />
              Voir le catalogue
            </Link>
            <Link
              href="/achats-groupes"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Users className="h-4 w-4" />
              Achats groupés
            </Link>
            <ImageSearchButton onClick={() => setShowImageSearch(true)} />
          </div>
          {imageSearchIds.length > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg text-xs text-green-700 dark:text-green-300">
              <Sparkles className="h-3 w-3" />
              {imageSearchIds.length} produit similaire trouvé
              <button
                onClick={() => setImageSearchIds([])}
                className="ml-1 text-green-600 dark:text-green-400 hover:text-green-800"
              >
                Effacer
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Cartes features style page produits */}
      <section className="mx-auto max-w-6xl px-4 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {[
            { icon: Package, title: 'Import Direct', desc: 'Chine → Dakar sans intermédiaire', color: 'green' },
            { icon: Star, title: 'Marques Leaders', desc: 'Hikvision, Dahua, Uniview', color: 'blue' },
            { icon: Clock, title: 'Express 3 Jours', desc: 'Ou maritime économique 60j', color: 'orange' },
            { icon: Shield, title: 'Garantie & SAV', desc: 'Installation Dakar incluse', color: 'purple' },
          ].map((f, i) => {
            const I = f.icon
            const colorMap: Record<string, { bg: string; icon: string; border: string; darkBorder: string }> = {
              green: { bg: 'from-green-100 to-green-50', icon: 'text-green-600', border: 'hover:border-green-200', darkBorder: 'dark:hover:border-green-500/50' },
              blue: { bg: 'from-blue-100 to-blue-50', icon: 'text-blue-600', border: 'hover:border-blue-200', darkBorder: 'dark:hover:border-blue-500/50' },
              orange: { bg: 'from-orange-100 to-orange-50', icon: 'text-orange-600', border: 'hover:border-orange-200', darkBorder: 'dark:hover:border-orange-500/50' },
              purple: { bg: 'from-purple-100 to-purple-50', icon: 'text-purple-600', border: 'hover:border-purple-200', darkBorder: 'dark:hover:border-purple-500/50' },
            }
            const c = colorMap[f.color]
            return (
              <div
                key={i}
                className={`group bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-lg ${c.border} ${c.darkBorder} transition-all duration-300`}
              >
                <div className={`w-12 h-12 bg-gradient-to-br ${c.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <I className={`h-6 w-6 ${c.icon}`} />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm">{f.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Bannière Achats Groupés */}
      <section className="mx-auto max-w-6xl px-4 py-6">
        <Link href="/achats-groupes" className="block">
          <div className="relative overflow-hidden bg-gradient-to-r from-green-600 via-violet-600 to-violet-700 rounded-2xl p-6 md:p-8 text-white shadow-xl hover:shadow-2xl transition-all group">
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Users className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl md:text-3xl font-bold mb-1">Achats Groupés</h3>
                  <p className="text-white/80 text-sm md:text-base">Rejoignez d'autres acheteurs et économisez jusqu'à <span className="font-bold text-yellow-300">-30%</span></p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-2 bg-white/10 backdrop-blur rounded-xl px-4 py-2">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-green-400 flex items-center justify-center text-xs font-bold">JD</div>
                    <div className="w-8 h-8 rounded-full bg-violet-400 flex items-center justify-center text-xs font-bold">AM</div>
                    <div className="w-8 h-8 rounded-full bg-green-300 flex items-center justify-center text-xs font-bold">SK</div>
                  </div>
                  <span className="text-sm">+12 participants</span>
                </div>
                <div className="flex items-center gap-2 bg-white text-green-700 font-bold px-6 py-3 rounded-xl group-hover:bg-green-100 transition-colors">
                  <Sparkles className="w-5 h-5" />
                  Découvrir
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        </Link>
      </section>

      {/* Catégories produits */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 text-center">Catégories populaires</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Camera, title: 'Vidéosurveillance', desc: 'Caméras IP, NVR, kits complets', href: '/produits?category=Vid%C3%A9osurveillance', color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300' },
            { icon: Lock, title: "Contrôle d'accès", desc: 'Lecteurs biométriques, serrures, badges', href: '/produits?category=Contr%C3%B4le+d%27Acc%C3%A8s', color: 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-300' },
            { icon: Bell, title: 'Alarme & Détection', desc: 'Détecteurs, sirènes, centrales', href: '/produits?category=Alarme', color: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300' },
            { icon: Wifi, title: 'Réseau & PoE', desc: 'Switches, routeurs, câbles, connectique', href: '/produits?category=R%C3%A9seau', color: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-300' },
            { icon: Cpu, title: 'Domotique', desc: 'Capteurs, automatisations, smart home', href: '/produits?category=Domotique', color: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-300' },
            { icon: Shield, title: 'Sécurité incendie', desc: 'Détecteurs fumée, extincteurs, signalisation', href: '/produits?category=S%C3%A9curit%C3%A9+incendie', color: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-300' },
          ].map((cat, i) => {
            const I = cat.icon
            return (
              <Link
                key={i}
                href={cat.href}
                className="group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-gray-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 transition-all"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${cat.color}`}>
                  <I className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">{cat.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{cat.desc}</p>
                </div>
                <ArrowRight className="ml-auto h-5 w-5 text-gray-300 group-hover:text-green-500 group-hover:translate-x-1 transition-all" />
              </Link>
            )
          })}
        </div>
      </section>

      {/* Features complètes */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Package, title: 'Catalogue vaste', desc: 'Des centaines de produits de sécurité électronique.' },
            { icon: TrendingDown, title: 'Prix compétitifs', desc: 'Import direct sans intermédiaires.' },
            { icon: Users, title: 'Achats groupés', desc: 'Payez moins cher en regroupant vos commandes.' },
            { icon: Truck, title: 'Livraison Sénégal', desc: 'Dakar et régions, délais optimisés.' },
            { icon: Shield, title: 'Garantie incluse', desc: 'Produits testés et garantis 12 mois.' },
            { icon: Clock, title: 'Suivi temps réel', desc: 'Suivez votre commande à chaque étape.' },
            { icon: Headphones, title: 'Support dédié', desc: 'Assistance technique et commerciale.' },
            { icon: Sparkles, title: 'Pro & Revendeur', desc: 'Tarifs préférentiels pour les professionnels.' },
          ].map((f, i) => {
            const I = f.icon
            return (
              <div
                key={i}
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="mb-3 inline-flex rounded-xl bg-green-50 p-2.5 dark:bg-green-900/20">
                  <I className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">{f.title}</h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-4 py-12 text-center">
        <div className="rounded-2xl bg-gradient-to-r from-green-600 to-violet-600 p-8 text-white shadow-xl">
          <h2 className="text-xl font-bold sm:text-2xl">Prêt à commander ?</h2>
          <p className="mt-2 text-sm text-white/90">
            Créez votre compte marketplace en 30 secondes et accédez à nos tarifs préférentiels.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-green-700 hover:bg-green-50 transition-colors"
            >
              Créer un compte
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/10 transition-colors"
            >
              J'ai déjà un compte
            </Link>
          </div>
        </div>
      </section>

      {/* Recherche visuelle par image */}
      <ImageSearchModal
        isOpen={showImageSearch}
        onClose={() => setShowImageSearch(false)}
        onResultsFound={(results) => {
          const ids = results.map((r) => r.id)
          if (ids.length > 0) {
            setImageSearchIds(ids)
            router.push(`/produits?imageIds=${ids.join(',')}`)
          }
          setShowImageSearch(false)
        }}
      />
    </div>
  )
}
