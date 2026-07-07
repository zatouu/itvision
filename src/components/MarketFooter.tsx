'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ShoppingBag, Shield, Truck, Headphones, CreditCard, MapPin, ArrowRight,
  Store, Instagram, Facebook, Twitter, Linkedin, Mail, Send
} from 'lucide-react'

const columns = [
  {
    title: 'Acheter',
    links: [
      ['Accueil', '/market'],
      ['Catalogue', '/produits'],
      ['Achats groupés', '/achats-groupes'],
      ['Favoris', '/produits/favoris'],
      ['Comparer', '/produits/compare'],
    ],
  },
  {
    title: 'Mon compte',
    links: [
      ['Mon espace', '/compte'],
      ['Mes commandes', '/compte/commandes'],
      ['Retrouver une commande', '/retrouver-ma-commande'],
      ['Connexion', '/login?role=client'],
    ],
  },
  {
    title: 'Entreprise',
    links: [
      ['Boutiques partenaires', '/market/boutiques'],
      ['Espace vendeurs', '/market/vendeurs'],
      ['Comptes Pro', '/market/pro'],
      ['Sélections Dakar', '/market/selections'],
    ],
  },
]

const assurances = [
  { icon: Shield, label: 'Contrôle qualité' },
  { icon: Truck, label: 'Livraison Sénégal' },
  { icon: CreditCard, label: 'Paiement sécurisé' },
  { icon: Headphones, label: 'Support commande' },
]

const socials = [
  { icon: Instagram, href: 'https://instagram.com', label: 'Instagram' },
  { icon: Facebook, href: 'https://facebook.com', label: 'Facebook' },
  { icon: Twitter, href: 'https://twitter.com', label: 'Twitter' },
  { icon: Linkedin, href: 'https://linkedin.com', label: 'LinkedIn' },
]

const legal = [
  ['CGV', '/cgv'],
  ['Politique de confidentialité', '/privacy'],
  ['Livraison & retours', '/livraison-retours'],
  ['Contact', '/contact'],
]

export default function MarketFooter() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setSubscribed(true)
    setEmail('')
    setTimeout(() => setSubscribed(false), 4000)
  }

  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Brand & assurance */}
          <div className="lg:col-span-4">
            <Link href="/market" className="inline-flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-violet-600 shadow-lg shadow-green-500/20">
                <ShoppingBag className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-base font-black text-gray-900 dark:text-white">DDM+</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-green-600 dark:text-green-400">Marketplace import</p>
              </div>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-gray-500 dark:text-gray-400">
              Achetez en Chine avec accompagnement local : sourcing, contrôle, transport, livraison et suivi au Sénégal.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {assurances.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.label} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    <Icon className="h-4 w-4 text-green-600" />
                    {item.label}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Link columns */}
          <div className="grid gap-6 sm:grid-cols-3 lg:col-span-5">
            {columns.map((column) => (
              <div key={column.title}>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">{column.title}</h3>
                <div className="mt-3 space-y-2">
                  {column.links.map(([label, href]) => (
                    <Link key={href} href={href} className="block text-sm text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400">
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Newsletter & marketplace card */}
          <div className="lg:col-span-3 space-y-4">
            <div className="rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 to-violet-50 p-5 dark:border-green-900/40 dark:from-green-950/30 dark:to-violet-950/30">
              <div className="flex items-center gap-2 text-sm font-black text-gray-900 dark:text-white">
                <Mail className="h-5 w-5 text-green-600" />
                Newsletter
              </div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Recevez les nouveautés, offres groupées et bons plans import Chine.
              </p>
              {subscribed ? (
                <p className="mt-4 text-sm font-semibold text-green-600">Merci, vous êtes inscrit !</p>
              ) : (
                <form onSubmit={handleSubscribe} className="mt-4 flex items-center gap-2">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-3 py-2 text-white hover:bg-black dark:bg-white dark:text-gray-900"
                    aria-label="S'inscrire"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              )}
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-white">
                <Store className="h-5 w-5 text-green-600" />
                Shops marketplace
              </div>
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                Boutiques vendeurs, revendeurs et partenaires sélectionnés prochainement.
              </p>
              <Link href="/market/boutiques" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-black dark:bg-white dark:text-gray-900">
                Feuille de route
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col gap-4 border-t border-slate-100 pt-6 text-xs text-gray-500 dark:border-slate-800 dark:text-gray-400 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <span>DDM+ — Import & sourcing</span>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Dakar, Sénégal
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {legal.map(([label, href]) => (
              <Link key={href} href={href} className="hover:text-green-600 dark:hover:text-green-400">
                {label}
              </Link>
            ))}
            <div className="flex items-center gap-2">
              {socials.map((social) => {
                const Icon = social.icon
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.label}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-slate-100 hover:text-gray-900 dark:hover:bg-slate-800 dark:hover:text-white"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
