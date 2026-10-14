'use client';

import { useState, useEffect } from 'react';
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
  RefreshCw,
} from 'lucide-react';
import { formatFcfa } from '../formatFcfa';
import { calculateServiceFeeRate } from '@/lib/pricing/tiered-service-fees';
import { usePricingSettings } from '@/lib/pricing/use-pricing-settings';
import { QUANTITY_TIERS } from '@/lib/pricing/tiered-pricing';
import { DEFAULT_INSURANCE_RATE } from '@/lib/pricing/constants';
import { Icon } from '../Icon';

const getFaqs = (serviceRate: number) => [
  { q: 'Comment est calculé le prix final ?', a: `Prix sourcing + frais de service (${serviceRate} % pour une seule pièce importée ; dès deux pièces importées, barème dégressif selon le montant) + assurance 2,5 % + transport. Le minimum fournisseur reste obligatoire. Le détail est affiché avant paiement.` },
  { q: 'Comment fonctionne l\'assurance ?', a: 'L\'assurance couvre la perte, le vol ou la casse pendant le transport. En cas de problème, ouvrez un litige depuis le suivi de votre commande : votre paiement reste séquestré (escrow) jusqu\'à résolution et vous êtes remboursé si la réclamation est validée.' },
  { q: 'L\'achat groupé est-il toujours moins cher ?', a: 'Oui : plus le groupe atteint son objectif, plus le prix unitaire baisse. Vous êtes remboursé automatiquement si l\'objectif n\'est pas atteint.' },
  { q: 'Quels moyens de paiement sont acceptés ?', a: 'Wave, Orange Money, Free Money, virement bancaire, et virement SWIFT pour les gros volumes. Tous les paiements passent par notre système Escrow.' },
]

const TRANSPORT = [
  { key: 'express', icon: Plane, label: 'Express aérien', days: '3-5j', cost: '12 000 F/kg', idealFor: 'Petites qtés urgentes' },
  { key: 'aerien', icon: Plane, label: 'Aérien standard', days: '10-15j', cost: '8 500 F/kg', idealFor: 'Meilleur rapport prix/délai' },
  { key: 'maritime', icon: Ship, label: 'Maritime', days: '45-50j', cost: '180 000 F/m³', idealFor: 'Gros volumes économiques', badge: 'Idéal en groupe' },
]

export default function ScreenPricing() {
  const { open: openSourcing } = useSourcingModal();
  const { settings: pricingSettings, error: pricingError, reload: reloadPricing } = usePricingSettings();
  const [simPrice, setSimPrice] = useState(15000)
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [avgGroupSave, setAvgGroupSave] = useState(0)

  // Économie moyenne des achats groupés : calculée sur les groupes réellement
  // en cours (même logique que l'accueil), pas de pourcentage inventé.
  useEffect(() => {
    fetch('/api/group-orders/featured')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        const groups = (d?.featured || d?.groups || []) as { savingsPercent?: number }[]
        const saves = groups.map(g => g.savingsPercent ?? 0).filter(v => v > 0)
        if (saves.length) setAvgGroupSave(Math.round(saves.reduce((s, v) => s + v, 0) / saves.length))
      })
      .catch(() => {})
  }, [])

  if (!pricingSettings) return (
    <div className="mx-auto flex min-h-48 max-w-6xl flex-wrap items-center justify-center gap-3 px-4 py-8 text-sm" role={pricingError ? 'alert' : 'status'}>
      <span>{pricingError || 'Chargement des tarifs...'}</span>
      {pricingError && <button type="button" onClick={reloadPricing} className="inline-flex min-h-11 items-center gap-2 rounded border px-3"><RefreshCw size={16} /> Réessayer</button>}
    </div>
  )

  const factory = simPrice
  const serviceRate = calculateServiceFeeRate(factory, pricingSettings.serviceFeeTiers, 1, pricingSettings.singleImportServiceFeeRate)
  const FAQS = getFaqs(serviceRate)
  const service = Math.round(factory * (serviceRate / 100))
  const insurance = Math.round(factory * (DEFAULT_INSURANCE_RATE / 100))
  const shipping = 2500 // estimation plate — le coût réel est calculé au poids au checkout
  const total = factory + service + insurance + shipping

  // La remise quantité du moteur s'applique au sous-total marchandise (prix +
  // frais de service + assurance), jamais au transport.
  const priceAtTier = (discountPercent: number, quantity: number) => {
    const orderCost = factory * quantity
    const feeRate = calculateServiceFeeRate(orderCost, pricingSettings.serviceFeeTiers, quantity, pricingSettings.singleImportServiceFeeRate)
    const orderFees = Math.round(orderCost * feeRate / 100) + Math.round(orderCost * DEFAULT_INSURANCE_RATE / 100)
    return Math.round(((orderCost + orderFees) / quantity) * (1 - discountPercent / 100)) + shipping
  }

  const maxTier = QUANTITY_TIERS[QUANTITY_TIERS.length - 1]

  const bars = [
    { label: 'Prix usine', value: factory, color: 'bg-blue-500', tone: 'blue' },
    { label: `Frais de service (${serviceRate}%)`, value: service, color: 'bg-emerald-500', tone: 'emerald' },
    { label: `Assurance (${String(DEFAULT_INSURANCE_RATE).replace('.', ',')}%)`, value: insurance, color: 'bg-amber-500', tone: 'amber' },
    { label: 'Transport (estimation)', value: shipping, color: 'bg-violet-500', tone: 'violet' },
  ]

  const cards = [
    { key: 'solo', title: 'Achat unitaire', desc: 'Une seule pièce importée.', price: total, qty: 1, save: 0, cta: 'Voir le catalogue', tone: 'slate' as const, icon: User, best: false },
    { key: 'groupe', title: 'Achat groupé', desc: 'Vous rejoignez d\'autres acheteurs — le prix baisse à mesure que le groupe avance.', price: priceAtTier(avgGroupSave, 10), qty: 10, save: avgGroupSave, cta: 'Voir les groupes', tone: 'violet' as const, icon: Users, best: avgGroupSave > 0 },
    { key: 'palier', title: 'Prix par palier', desc: `Remise quantité garantie dès ${QUANTITY_TIERS[0]?.minQuantity ?? 20} pièces.`, price: priceAtTier(maxTier?.discountPercent ?? 0, maxTier?.minQuantity ?? 20), qty: maxTier?.minQuantity ?? 20, save: maxTier?.discountPercent ?? 0, cta: 'Voir les produits en lot', tone: 'amber' as const, icon: Boxes, best: false },
  ]

  // Paliers dérivés du moteur de prix (QUANTITY_TIERS) — jamais codés en dur.
  const paliers = [
    {
      range: '1',
      label: 'Prix unitaire',
      unit: total,
      tone: 'slate' as const,
      highlight: false,
    },
    {
      range: QUANTITY_TIERS[0] ? `2-${QUANTITY_TIERS[0].minQuantity - 1}` : '2+',
      label: 'Plusieurs pièces',
      unit: priceAtTier(0, 2),
      tone: 'slate' as const,
      highlight: false,
    },
    ...QUANTITY_TIERS.map((t, i) => ({
      range: t.maxQuantity ? `${t.minQuantity}-${t.maxQuantity}` : `${t.minQuantity}+`,
      label: `-${t.discountPercent}%`,
      unit: priceAtTier(t.discountPercent, t.minQuantity),
      tone: 'emerald' as const,
      highlight: i === 0,
    })),
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <main className="mx-auto max-w-6xl px-4 md:px-6 py-6 md:py-8 space-y-6 md:space-y-8">
        {/* Hero */}
        <header className="border-b border-slate-200 pb-6 dark:border-slate-800">
          <p className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <CheckCircle size={16} /> Produit, frais de service et transport
          </p>
          <h1 className="mt-3 text-2xl font-extrabold leading-tight text-slate-900 md:text-3xl dark:text-white">Tarifs d&apos;importation</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Les montants ci-dessous sont estimatifs. Le total de votre commande est confirmé avant paiement.
          </p>
        </header>

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
                <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">Estimation pour 1 pièce</p>
                <p className="mt-1 text-[26px] font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap leading-none">{formatFcfa(total)}</p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Transport indicatif. Total confirmé avant paiement.</p>
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
                    <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400 tabular-nums">{pct.toFixed(1)}% du total</p>
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
              const CardIcon = c.icon
              const toneBorder = c.tone === 'violet' ? 'border-violet-500 ring-4 ring-violet-500/10' : c.tone === 'amber' ? 'border-amber-300' : 'border-slate-200'
              const iconBg = c.tone === 'violet' ? 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300' : c.tone === 'amber' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              const link = c.key === 'groupe' ? '/achats-groupes' : c.key === 'palier' ? '/produits?moq=lot' : '/produits'
              return (
                <div key={c.key} className={`relative rounded-2xl border-2 bg-white dark:bg-slate-900 p-5 ${toneBorder}`}>
                  {c.best && <span className="absolute -top-2.5 left-4 inline-flex items-center gap-1 rounded-full bg-violet-600 text-white text-[11px] font-extrabold px-2.5 py-0.5 whitespace-nowrap"><Icon name="star" size={10}/>Recommandé</span>}
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`grid h-10 w-10 place-items-center rounded-xl ${iconBg}`}><CardIcon size={18} /></span>
                    <div>
                      <p className="text-[14px] font-extrabold text-slate-900 dark:text-white">{c.title}</p>
                      {c.save > 0 && <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">-{c.save}% économisés</p>}
                    </div>
                  </div>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3">{c.desc}</p>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 mb-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Prix/pc</p>
                    <p className="mt-1 text-[22px] font-extrabold text-slate-900 dark:text-white tabular-nums whitespace-nowrap leading-none">{formatFcfa(c.price)}</p>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">Total {c.qty} pcs : {formatFcfa(c.price * c.qty)}</p>
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
                          <span className="inline-flex items-center gap-1 rounded-md bg-violet-100 border border-violet-200 px-1.5 py-0.5 text-[11px] font-bold text-violet-700 dark:bg-violet-950 dark:border-violet-900 dark:text-violet-300">
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
          <div className="lg:sticky lg:top-[calc(var(--mkt-header-h,0px)+12px)] lg:self-start">
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
                    <span className={`grid h-8 w-8 place-items-center rounded-lg text-[11px] font-extrabold whitespace-nowrap ${
                      t.tone === 'slate' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}>
                      {t.range}
                    </span>
                    <div>
                      <p className="text-[12px] font-bold text-slate-900 dark:text-white">{t.range} pcs</p>
                      <p className={`text-[11px] font-bold ${t.tone === 'slate' ? 'text-slate-500 dark:text-slate-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{t.label}</p>
                    </div>
                    {t.highlight && <span className="inline-flex items-center rounded-md bg-emerald-600 text-white text-[11px] font-extrabold px-1.5 py-0.5 whitespace-nowrap">Populaire</span>}
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
