'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ShoppingBag, Package, Users, TrendingDown, ArrowRight,
  Shield, Truck, Clock, Headphones, Sparkles, Star,
  Camera, Lock, Wifi, Bell, Cpu, Search
} from 'lucide-react'
import ImageSearchModal, { ImageSearchButton } from '@/components/ImageSearchModal'
import SourcingRequestModal from '@/components/SourcingRequestModal'

export default function MarketHomePage() {
  const router = useRouter()
  const [showImageSearch, setShowImageSearch] = useState(false)
  const [imageSearchIds, setImageSearchIds] = useState<string[]>([])
  const [showSourcing, setShowSourcing] = useState(false)
  const [sourcingContext, setSourcingContext] = useState<{ file?: File | null; description?: string } | null>(null)
  const [currentUser, setCurrentUser] = useState<{ id?: string; name?: string; phone?: string; email?: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/login', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.user) return
        setCurrentUser({
          id: data.user.id,
          name: data.user.name || data.user.username,
          phone: data.user.phone,
          email: data.user.email,
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pt-16 pb-10 sm:pt-24 sm:pb-14 lg:pt-32 lg:pb-20">
        <div className="absolute inset-0 opacity-40 pointer-events-none">
          <div className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-emerald-300/20 blur-[100px]" />
          <div className="absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-violet-300/20 blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-blue-200/10 blur-[80px]" />
        </div>
        <div className="relative mx-auto max-w-5xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-300"
          >
            <Sparkles className="h-3 w-3" />
            Marketplace IT Vision Plus
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-6 text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-6xl leading-[1.1]"
          >
            Import direct <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-green-600">Chine</span>{' '}
            — Livraison <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-500 to-purple-600">Sénégal</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto"
          >
            Caméras IP, alarmes, contrôle d'accès, domotique, réseau… Commandez seul ou en groupe pour réduire vos coûts.
          </motion.p>

          {/* 3 Cartes d'entrée */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-10 grid gap-4 sm:grid-cols-3"
          >
            {/* Carte Catalogue */}
            <Link href="/produits" className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-left shadow-lg shadow-emerald-200/50 hover:shadow-xl hover:shadow-emerald-300/50 transition-all hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
              <div className="relative">
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <ShoppingBag className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white">Voir le catalogue</h3>
                <p className="mt-1 text-sm text-emerald-100">24 produits en stock</p>
                <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-white">
                  Parcourir <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            {/* Carte Sourcing */}
            <button
              type="button"
              onClick={() => setShowSourcing(true)}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-6 text-left shadow-lg shadow-violet-200/50 hover:shadow-xl hover:shadow-violet-300/50 transition-all hover:-translate-y-1 text-left"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
              <div className="relative">
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Camera className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Trouvez-moi ce produit
                  <Sparkles className="h-4 w-4 text-yellow-300" />
                </h3>
                <p className="mt-1 text-sm text-violet-100">Envoyez une photo, on le trouve en Chine</p>
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur px-3 py-1 text-xs font-bold text-white">
                  <Clock className="h-3 w-3" /> 24H MAX
                </div>
              </div>
            </button>

            {/* Carte Achats Groupés */}
            <Link href="/achats-groupes" className="group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 text-left shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="absolute top-0 right-0 w-32 h-32 bg-violet-100/50 dark:bg-violet-900/20 rounded-full -mr-10 -mt-10 blur-2xl" />
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-violet-100 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Users className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Achats groupés</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Économisez -30%</p>
                <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-violet-600 dark:text-violet-400">
                  Découvrir <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          </motion.div>

          {imageSearchIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-lg text-xs text-emerald-700 dark:text-emerald-300"
            >
              <Sparkles className="h-3 w-3" />
              {imageSearchIds.length} produit similaire trouvé
              <button
                onClick={() => setImageSearchIds([])}
                className="ml-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-800"
              >
                Effacer
              </button>
            </motion.div>
          )}
        </div>
      </section>

      {/* Badges confiance */}
      <section className="mx-auto max-w-5xl px-4 pb-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-6 sm:gap-10"
        >
          {[
            { icon: Package, label: 'Import Direct', sub: 'Direct usine, meilleurs prix' },
            { icon: Star, label: 'Marques Leaders', sub: 'Hikvision, Dahua' },
            { icon: Clock, label: 'Express 3 Jours', sub: 'Livraison rapide Dakar' },
            { icon: Shield, label: 'Garantie & SAV', sub: 'Support après-vente réactif' },
          ].map((item, i) => {
            const I = item.icon
            return (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <I className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{item.sub}</p>
                </div>
              </div>
            )
          })}
        </motion.div>
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
        onRequestSourcing={(ctx) => {
          setSourcingContext(ctx)
          setShowImageSearch(false)
          setShowSourcing(true)
        }}
      />

      {/* Trouvez-moi ce produit (sourcing à la demande) */}
      <SourcingRequestModal
        isOpen={showSourcing}
        onClose={() => {
          setShowSourcing(false)
          setSourcingContext(null)
        }}
        currentUser={currentUser}
        initialContext={sourcingContext}
      />
    </div>
  )
}
