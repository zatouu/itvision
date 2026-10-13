import type { Metadata } from 'next'
import Link from 'next/link'
import { Users, Wallet, ShieldCheck, Scale, MapPin, Gift, Store, Plane, Ship, ArrowRight } from 'lucide-react'
import { readSharedPricing } from '@/lib/pricing/shared-settings'
import { ambassadorRate } from '@/lib/market/ambassador'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Comment ça marche — DDM+',
  description:
    "Achat groupé depuis la Chine : réservez sans payer, payez le prix final à la clôture, contrôle qualité, transport au poids réel, livraison ou retrait à Dakar.",
}

const fmtPct = (r: number) => `${Math.round(r * 1000) / 10}`.replace('.', ',') + ' %'

export default async function CommentCaMarchePage() {
  const tolerance = (await readSharedPricing()).config.adjustTolerance
  const rate = ambassadorRate()
  const example = { estimated: 10000, real: 13000 }
  const high = Math.round(example.estimated * (1 + tolerance))
  const extra = Math.max(0, example.real - high)

  const steps = [
    { icon: Users, title: 'Réservez sans payer', text: "Choisissez un achat groupé et votre quantité. Rien n'est débité : vous recevez un SMS 24 h avant la clôture avec le prix atteint." },
    { icon: Wallet, title: 'Payez le prix final à la clôture', text: "Groupe validé : vous recevez votre lien de paiement (Wave, Orange Money, carte). L'argent reste bloqué chez nous jusqu'à la livraison. Groupe annulé : rien n'est dû, et toute somme versée est remboursée." },
    { icon: ShieldCheck, title: 'Achat et contrôle qualité en Chine', text: "Nous commandons auprès du fournisseur, puis le lot est reçu et inspecté à notre entrepôt de Guangzhou avant le départ." },
    { icon: Scale, title: 'Transport au poids réel', text: "Le lot est pesé et mesuré avant expédition. Chacun paie sa part de transport sur le poids ou le volume réel, pas sur une estimation gonflée." },
    { icon: MapPin, title: 'Livraison ou retrait', text: "À l'arrivée, vous êtes prévenu par WhatsApp ou SMS : livraison à domicile ou retrait dans un de nos points de retrait." },
  ]

  const faq = [
    { q: 'Dois-je payer pour rejoindre un groupe ?', a: "Non. Vous réservez votre quantité gratuitement ; le paiement n'intervient qu'à la clôture, au prix final atteint par le groupe." },
    { q: "Que se passe-t-il si l'objectif n'est pas atteint ?", a: "Le groupe est annulé : rien n'est dû, et si vous aviez déjà payé vous êtes remboursé." },
    { q: 'Comment est calculé le transport ?', a: `Une estimation est affichée à la commande. Après pesée, si le coût réel reste dans une marge de ${fmtPct(tolerance)}, rien ne change. Au-delà, vous payez seulement la part qui dépasse cette marge ; s'il est plus bas que la marge, l'écart vous est remboursé.` },
    { q: 'Et si mon colis arrive abîmé ?', a: "L'assurance transport couvre la perte, le vol et la casse. Ouvrez un litige depuis le suivi de votre commande : le paiement reste bloqué jusqu'à la résolution." },
    { q: 'Comment gagner de l’argent avec DDM+ ?', a: `Partagez votre lien ambassadeur : vous touchez ${fmtPct(rate)} sur chaque vente payée qui passe par lui. Les revendeurs peuvent aussi prendre des précommandes de leurs clients sur un achat groupé et revendre à leur prix.` },
  ]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6 md:px-6 md:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="rounded-3xl bg-gradient-to-br from-violet-600 via-violet-700 to-emerald-600 px-5 py-7 text-white md:px-10 md:py-10">
        <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">Achat groupé DDM+</p>
        <h1 className="mt-2 text-[28px] font-extrabold leading-tight tracking-tight md:text-[42px]">
          Acheter en Chine à plusieurs,<br />sans risque et au juste prix.
        </h1>
        <p className="mt-3 max-w-xl text-[14px] text-white/85 md:text-[16px]">
          Plus nous sommes nombreux, plus le prix baisse. Vous ne payez qu&apos;une fois le groupe validé, et le transport au poids réel.
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link href="/achats-groupes" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-violet-700">
            Voir les groupes ouverts <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/tarification" className="inline-flex items-center justify-center rounded-xl border border-white/40 px-5 py-3 text-sm font-bold text-white">
            Détail des prix
          </Link>
        </div>
      </header>

      <section>
        <h2 className="mb-4 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white md:text-2xl">En 5 étapes</h2>
        <ol className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-100 text-[11px] font-extrabold text-violet-700 dark:bg-violet-950 dark:text-violet-300">0{i + 1}</span>
                <s.icon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:p-6">
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white md:text-xl">Le transport, expliqué simplement</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="flex gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
            <Plane className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
            <p className="text-sm text-slate-700 dark:text-slate-300"><b>Aérien</b> : facturé au kilo (poids réel ou volumétrique, le plus élevé). Rapide, idéal pour les petites quantités.</p>
          </div>
          <div className="flex gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
            <Ship className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <p className="text-sm text-slate-700 dark:text-slate-300"><b>Maritime</b> : facturé au mètre cube. Bien moins cher, il devient rentable quand le groupe partage le conteneur.</p>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <b>Exemple</b> : transport estimé à {example.estimated.toLocaleString('fr-FR')} F, coût réel après pesée {example.real.toLocaleString('fr-FR')} F.
          Avec la marge de {fmtPct(tolerance)}, les {high.toLocaleString('fr-FR')} premiers francs sont couverts par l&apos;estimation :
          vous ne payez que {extra.toLocaleString('fr-FR')} F de plus. À l&apos;inverse, un coût réel inférieur à la marge basse vous aurait valu un remboursement de l&apos;écart.
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <Gift className="h-5 w-5 text-emerald-600" />
          <h3 className="mt-2 font-bold text-slate-900 dark:text-white">Ambassadeur : {fmtPct(rate)} par vente</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Partagez votre lien ; chaque vente payée qui passe par lui vous rapporte une commission, versée sur Wave ou Orange Money après livraison.</p>
          <Link href="/compte/ambassadeur" className="mt-3 inline-flex text-sm font-bold text-emerald-700 hover:underline dark:text-emerald-400">Obtenir mon lien</Link>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <Store className="h-5 w-5 text-violet-600" />
          <h3 className="mt-2 font-bold text-slate-900 dark:text-white">Revendeur : vos clients précommandent</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Créez une page de précommande sur un achat groupé, fixez votre prix de revente et recevez les réservations de vos clients, sans avancer d&apos;argent.</p>
          <Link href="/compte/precommandes" className="mt-3 inline-flex text-sm font-bold text-violet-700 hover:underline dark:text-violet-400">Créer une précommande</Link>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">Questions fréquentes</h2>
        <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {faq.map(f => (
            <details key={f.q} className="group p-4">
              <summary className="cursor-pointer list-none font-semibold text-slate-900 dark:text-white">{f.q}</summary>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  )
}
