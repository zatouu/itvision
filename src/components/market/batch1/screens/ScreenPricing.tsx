'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSourcingModal } from '../SourcingModalContext';
import {
  CheckCircle,
  Plane,
  Ship,
  Truck,
  User,
  Users,
  Boxes,
  Plus,
  Minus,
  Grid3X3,
  Camera,
} from 'lucide-react';
import { formatFcfa } from '../formatFcfa';
import { calculateServiceFeeRate } from '@/lib/pricing/tiered-service-fees';

const FAQS = [
  { q: 'Comment est calculé le prix final ?', a: 'Prix sourcing + frais de service dégressifs (10% jusqu\'à 500 000 F, puis 8%, 6% et 5% au-delà de 5M F) + assurance 2,5% + transport selon le mode et le poids facturé. Aucun frais caché : tout est décomposé dans le panier et au checkout.' },
  { q: 'Puis-je payer en plusieurs fois ?', a: 'Pour les commandes supérieures à 100 000 F, un paiement en 2 fois est possible via Wave. Contactez le support pour l\'activer.' },
  { q: 'Comment fonctionne l\'assurance ?', a: 'L\'assurance couvre la perte, le vol ou la casse pendant le transport. En cas de problème, remboursement intégral sous 7 jours.' },
  { q: 'L\'achat groupé est-il toujours moins cher ?', a: 'Oui : plus le groupe atteint son objectif, plus le prix unitaire baisse. Vous êtes remboursé automatiquement si l\'objectif n\'est pas atteint.' },
  { q: 'Quels moyens de paiement sont acceptés ?', a: 'Wave, Orange Money, Free Money, virement bancaire, et virement SWIFT pour les gros volumes. Tous les paiements passent par notre système Escrow.' },
]

const TRANSPORT = [
  { key: 'express', icon: Plane, label: 'Express aérien', days: '4-7j', cost: '12 000 F/kg', idealFor: 'Petites qtés urgentes' },
  { key: 'aerien', icon: Plane, label: 'Aérien standard', days: '8-12j', cost: '8 500 F/kg', idealFor: 'Meilleur rapport prix/délai' },
  { key: 'maritime', icon: Ship, label: 'Maritime', days: '35-45j', cost: '180 000 F/m³', idealFor: 'Gros volumes économiques', badge: 'Idéal en groupe' },
]

export default function ScreenPricing() {
  const { open: openSourcing } = useSourcingModal();
  const [simPrice, setSimPrice] = useState(15000)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const factory = simPrice
  const serviceRate = calculateServiceFeeRate(factory)
  const service = Math.round(factory * (serviceRate / 100))
  const insurance = Math.round(factory * 0.025)
  const shipping = 2500
  const total = factory + service + insurance + shipping

  const bars = useMemo(() => [
    { label: 'Prix usine', value: factory, color: 'bg-blue-500', tone: 'blue' },
    { label: `Frais de service (${serviceRate}%)`, value: service, color: 'bg-emerald-500', tone: 'emerald' },
    { label: 'Assurance (2,5%)', value: insurance, color: 'bg-amber-500', tone: 'amber' },
    { label: 'Transport', value: shipping, color: 'bg-violet-500', tone: 'violet' },
  ], [factory, service, insurance, shipping])

  const cards = [
    { key: 'solo', title: 'Achat seul', desc: 'Vous commandez juste vos pièces.', price: total, save: 0, cta: 'Voir le catalogue', tone: 'slate' as const, icon: User, best: false },
    { key: 'groupe', title: 'Achat groupé', desc: 'Vous rejoignez d\'autres acheteurs.', price: Math.round(total * 0.72), save: 28, cta: 'Voir les groupes', tone: 'violet' as const, icon: Users, best: true },
    { key: 'palier', title: 'Prix par palier', desc: 'Vous commandez en volume.', price: Math.round(total * 0.80), save: 20, cta: 'Simuler mon lot', tone: 'amber' as const, icon: Boxes, best: false },
  ]

  const paliers = [
    { range: '1-5', label: 'Prix local', unit: total, tone: 'slate' as const, highlight: false },
    { range: '6-19', label: '-13%', unit: Math.round(total * 0.87), tone: 'emerald' as const, highlight: false },
    { range: '20-49', label: '-25%', unit: Math.round(total * 0.75), tone: 'emerald' as const, highlight: true },
    { range: '50+', label: '-40%', unit: Math.round(total * 0.60), tone: 'emerald' as const, highlight: false },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <main className="mx-auto max-w-6xl px-4 md:px-6 py-6 md:py-8 space-y-6 md:space-y-8">
        {/* Hero */}
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-violet-700 to-emerald-600 text-white rounded-3xl">
          <div className="absolute inset-0 opacity-15">
            <svg viewBox="0 0 800 300" className="h-full w-full" preserveAspectRatio="none">
              <defs>
                <pattern id="dots-pricing" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="1.5" cy="1.5" r="1" fill="white" />
                </pattern>
              </defs>
              <rect width="800" height="300" fill="url(#dots-pricing)" />
            </svg>
          </div>
          <div className="relative px-5 py-6 md:px-10 md:py-10">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/25 px-3 py-1 text-[11px] font-bold whitespace-nowrap">
              <CheckCircle size={12} /> Zéro frais caché
            </span>
            <h1 className="mt-3 text-[28px] md:text-[44px] font-extrabold leading-[1] tracking-tight">
              Prix transparent,<br />calculé <span className="text-emerald-300">au FCFA près</span>.
            </h1>
            <p className="mt-3 max-w-md text-white/85 leading-snug text-[13px] md:text-[15px]">
              Chaque prix affiché sur DDM+ est décomposé ligne par ligne. Vous savez exactement ce que vous payez et pourquoi.
            </p>
          </div>
        </div>

        {/* Decomposition */}
        <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4 md:p-6">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Décomposition interactive</p>
          <h2 className="text-[20px] md:text-[24px] font-extrabold tracking-tight text-slate-900 dark:text-white">Comment votre prix se compose</h2>
          <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">Ajustez le prix usine pour voir l&apos;impact en direct.</p>

          <div className="mt-5 grid gap-4 md:grid-cols-[280px_1fr]">
            <div className="space-y-3">
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Prix usine</label>
                  <span className="text-[15px] font-extrabold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">{formatFcfa(factory)}</span>
                </div>
                <input
                  type="range"
                  min="5000"
                  max="50000"
                  step="500"
                  value={simPrice}
                  onChange={(e) => setSimPrice(+e.target.value)}
                  className="w-full accent-emerald-600"
                  aria-label="Prix usine"
                />
              </div>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Total unitaire</p>
                <p className="mt-1 text-[26px] font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap leading-none">{formatFcfa(total)}</p>
                <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Prix TTC livré au Sénégal</p>
              </div>
            </div>

            <div className="space-y-3">
              {bars.map((b) => {
                const pct = total > 0 ? (b.value / total) * 100 : 0
                return (
                  <div key={b.label}>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">{b.label}</span>
                      <span className="text-[12px] font-extrabold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">{formatFcfa(b.value)}</span>
                    </div>
                    <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${b.color}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500 tabular-nums">{pct.toFixed(1)}% du total</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Comparison */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Comparatif</p>
          <h2 className="text-[20px] md:text-[24px] font-extrabold tracking-tight text-slate-900 dark:text-white">3 façons d&apos;obtenir le meilleur prix</h2>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {cards.map((c) => {
              const Icon = c.icon
              const toneBorder = c.tone === 'violet' ? 'border-violet-500 ring-4 ring-violet-500/10' : c.tone === 'amber' ? 'border-amber-300' : 'border-slate-200'
              const iconBg = c.tone === 'violet' ? 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300' : c.tone === 'amber' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              const link = c.key === 'groupe' ? '/achats-groupes' : c.key === 'palier' ? '/tarification' : '/produits'
              return (
                <div key={c.key} className={`relative rounded-2xl border-2 bg-white dark:bg-slate-900 p-5 ${toneBorder}`}>
                  {c.best && <span className="absolute -top-2.5 left-4 rounded-full bg-violet-600 text-white text-[10px] font-extrabold px-2.5 py-0.5 whitespace-nowrap">⭐ Recommandé</span>}
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`grid h-10 w-10 place-items-center rounded-xl ${iconBg}`}><Icon size={18} /></span>
                    <div>
                      <p className="text-[14px] font-extrabold text-slate-900 dark:text-white">{c.title}</p>
                      {c.save > 0 && <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">-{c.save}% économisés</p>}
                    </div>
                  </div>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3">{c.desc}</p>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 mb-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Prix/pc</p>
                    <p className="mt-1 text-[22px] font-extrabold text-slate-900 dark:text-white tabular-nums whitespace-nowrap leading-none">{formatFcfa(c.price)}</p>
                    <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">Total 10 pcs : {formatFcfa(c.price * 10)}</p>
                    <div className="mt-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div className={`h-full rounded-full ${c.tone === 'violet' ? 'bg-violet-500' : c.tone === 'amber' ? 'bg-amber-500' : 'bg-slate-400'}`} style={{ width: `${100 - c.save}%` }} />
                    </div>
                  </div>
                  <Link
                    href={link}
                    className={`w-full inline-flex items-center justify-center h-10 rounded-xl text-[13px] font-semibold transition ${
                      c.tone === 'violet'
                        ? 'bg-violet-600 text-white hover:bg-violet-700'
                        : 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:hover:bg-slate-800'
                    }`}
                  >
                    {c.cta}
                  </Link>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-6 md:space-y-8">
            {/* Transport */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Options de transport</p>
              <h2 className="text-[20px] md:text-[24px] font-extrabold tracking-tight text-slate-900 dark:text-white">Choisissez votre mode</h2>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                {TRANSPORT.map((t) => {
                  const Icon = t.icon
                  return (
                    <div key={t.key} className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4">
                      <div className="flex items-start justify-between mb-3">
                        <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"><Icon size={20} /></span>
                        {t.badge && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-violet-100 border border-violet-200 px-1.5 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-950 dark:border-violet-900 dark:text-violet-300">
                            <Users size={10} /> {t.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[14px] font-extrabold text-slate-900 dark:text-white">{t.label}</p>
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        <span className="tabular-nums">{t.days}</span>
                        <span>·</span>
                        <span className="tabular-nums">{t.cost}</span>
                      </div>
                      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 leading-snug">Idéal pour : <b className="text-slate-700 dark:text-slate-300">{t.idealFor}</b></p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* FAQ */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Questions fréquentes</p>
              <h2 className="text-[20px] md:text-[24px] font-extrabold tracking-tight text-slate-900 dark:text-white">Vos réponses</h2>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
                {FAQS.map((f, i) => (
                  <div key={i} className={`${i < FAQS.length - 1 ? 'border-b border-slate-200 dark:border-slate-800' : ''}`}>
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                      aria-expanded={openFaq === i}
                    >
                      <span className="text-[13px] font-bold text-slate-900 dark:text-white">{f.q}</span>
                      {openFaq === i ? <Minus size={16} className="text-slate-500 dark:text-slate-400 flex-shrink-0" /> : <Plus size={16} className="text-slate-500 dark:text-slate-400 flex-shrink-0" />}
                    </button>
                    {openFaq === i && (
                      <div className="px-4 pb-4 pt-1 text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        {f.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tiers */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Remises par volume</p>
            <h2 className="text-[20px] md:text-[24px] font-extrabold tracking-tight text-slate-900 dark:text-white">Le prix baisse dès que vous augmentez</h2>
            <div className="mt-4 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
              {paliers.map((t, i) => (
                <div
                  key={t.range}
                  className={`flex items-center justify-between px-4 py-3 ${t.highlight ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'bg-white dark:bg-slate-900'} ${
                    i < paliers.length - 1 ? 'border-b border-slate-200 dark:border-slate-800' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`grid h-8 w-8 place-items-center rounded-lg text-[10px] font-extrabold whitespace-nowrap ${
                      t.tone === 'slate' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}>
                      {t.range}
                    </span>
                    <div>
                      <p className="text-[12px] font-bold text-slate-900 dark:text-white">{t.range} pcs</p>
                      <p className={`text-[11px] font-bold ${t.tone === 'slate' ? 'text-slate-500 dark:text-slate-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{t.label}</p>
                    </div>
                    {t.highlight && <span className="inline-flex items-center rounded-md bg-emerald-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 whitespace-nowrap">Populaire</span>}
                  </div>
                  <p className={`text-[15px] font-extrabold tabular-nums whitespace-nowrap ${t.tone === 'slate' ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                    {formatFcfa(t.unit)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-700 dark:from-emerald-700 dark:to-emerald-900 text-white p-6 md:p-10 text-center">
          <h2 className="text-[22px] md:text-[32px] font-extrabold tracking-tight">Prêt à importer au vrai prix ?</h2>
          <p className="mt-2 text-[13px] md:text-[15px] text-white/85 max-w-md mx-auto">Explorez le catalogue ou envoyez-nous ce que vous cherchez.</p>
          <div className="mt-5 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/produits" className="whitespace-nowrap rounded-xl bg-white text-slate-900 px-5 py-3 text-[14px] font-bold hover:bg-slate-100 inline-flex items-center justify-center gap-2 transition">
              <Grid3X3 size={16} /> Voir le catalogue
            </Link>
            <button
              onClick={openSourcing}
              className="whitespace-nowrap rounded-xl bg-white/10 border border-white/25 text-white px-5 py-3 text-[14px] font-bold hover:bg-white/20 inline-flex items-center justify-center gap-2 transition"
            >
              <Camera size={16} /> Demander un sourcing
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
