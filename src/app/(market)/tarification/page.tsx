import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Calculator,
  Plane,
  Ship,
  Truck,
  Package,
  Users,
  ShieldCheck,
  Percent,
  ChevronRight,
  Info,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Détail de notre tarification — DDM+',
  description:
    'Transparence totale sur nos prix : logique de prix, transports, remises pack, frais de service 10% et assurance 2%.',
}

const TRANSPORTS = [
  {
    icon: Plane,
    name: 'Aérien express',
    delay: '3 à 7 jours',
    cost: 'À partir de 8 000 FCFA/kg',
    bestFor: 'Petits volumes, urgence',
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
  },
  {
    icon: Ship,
    name: 'Maritime groupé',
    delay: '25 à 45 jours',
    cost: 'À partir de 1 500 FCFA/kg',
    bestFor: 'Gros volumes, économique',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  {
    icon: Truck,
    name: 'Routier terrestre',
    delay: '15 à 25 jours',
    cost: 'À partir de 3 000 FCFA/kg',
    bestFor: 'Volumes moyens, Afrique',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
]

const PACK_TIERS = [
  { qty: '1–5 unités', discount: 'Prix catalogue', color: 'bg-slate-100 text-slate-700' },
  { qty: '6–19 unités', discount: '-5%', color: 'bg-emerald-50 text-emerald-700' },
  { qty: '20–49 unités', discount: '-10%', color: 'bg-emerald-100 text-emerald-800' },
  { qty: '50+ unités', discount: '-15% sur devis', color: 'bg-emerald-200 text-emerald-900' },
]

const PRICE_BREAKDOWN = [
  { label: 'Prix usine constaté', pct: '88%', desc: 'Ce que nous payons réellement chez le fabricant' },
  { label: 'Frais de service', pct: '10%', desc: 'Sourcing, négociation, inspection qualité, logistique' },
  { label: 'Assurance transport', pct: '2%', desc: 'Couverture perte, casse et retard de livraison' },
]

export default function TarificationPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-slate-900 text-white py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <Calculator className="h-4 w-4" />
            Transparence totale
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">
            Comment nos prix sont calculés
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Pas de surprises. Voici exactement ce qui compose le prix que vous payez,
            de l&apos;usine en Chine jusqu&apos;à votre porte au Sénégal.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-16 space-y-20">
        {/* 1. Logique des prix */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Calculator className="h-5 w-5 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Logique des prix</h2>
          </div>
          <p className="text-slate-600 mb-6 leading-relaxed">
            Notre prix de vente = <strong>prix usine réel</strong> + <strong>frais de service</strong> + <strong>assurance</strong>.
            Nous affichons le prix sourcing brut sur chaque fiche produit pour que vous sachiez
            exactement ce que coûte l&apos;article chez le fabricant, avant nos frais.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PRICE_BREAKDOWN.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-slate-200 p-5 bg-white shadow-sm"
              >
                <div className="text-3xl font-extrabold text-emerald-600 mb-1">{item.pct}</div>
                <div className="font-semibold text-slate-800 mb-1">{item.label}</div>
                <div className="text-sm text-slate-500">{item.desc}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Le <strong>prix sourcing affiché</strong> sur chaque fiche produit correspond au prix usine
              réel que nous payons. Vous voyez le vrai coût avant ajout de nos 10% de frais de service
              et 2% d&apos;assurance transport.
            </p>
          </div>
        </section>

        {/* 2. Transports disponibles */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
              <Plane className="h-5 w-5 text-sky-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Options de transport</h2>
          </div>
          <p className="text-slate-600 mb-6">
            Vous choisissez votre mode de transport à la commande. Le coût est calculé au poids réel
            ou au volume (au plus fort des deux).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {TRANSPORTS.map((t) => (
              <div
                key={t.name}
                className={`rounded-2xl border ${t.border} p-5 ${t.bg}`}
              >
                <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center mb-4 shadow-sm`}>
                  <t.icon className={`h-5 w-5 ${t.color}`} />
                </div>
                <h3 className="font-bold text-slate-900 mb-1">{t.name}</h3>
                <div className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <ChevronRight className="h-3 w-3 text-slate-400" />
                    <span className="text-slate-600">Délai : {t.delay}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChevronRight className="h-3 w-3 text-slate-400" />
                    <span className="text-slate-600">Coût : {t.cost}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChevronRight className="h-3 w-3 text-slate-400" />
                    <span className="text-slate-600">Idéal : {t.bestFor}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-sm text-slate-500">
            * Les tarifs transport sont indicatifs et varient selon la saison, le volume et la destination finale.
            Un devis précis vous est transmis après validation de votre panier.
          </div>
        </section>

        {/* 3. Remises pack */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
              <Package className="h-5 w-5 text-violet-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Remises par volume</h2>
          </div>
          <p className="text-slate-600 mb-6">
            Plus vous achetez d&apos;unités du même produit, plus la marge unitaire baisse.
            Les remises s&apos;appliquent automatiquement dans le panier.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PACK_TIERS.map((tier) => (
              <div
                key={tier.qty}
                className={`rounded-2xl p-5 text-center ${tier.color}`}
              >
                <div className="text-2xl font-extrabold mb-1">{tier.discount}</div>
                <div className="text-sm font-medium opacity-80">{tier.qty}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Achats groupés */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Achats groupés</h2>
          </div>
          <p className="text-slate-600 mb-6">
            Rejoignez un groupe d&apos;acheteurs sur un même produit. La quantité cumulée descend
            le prix usine pour tout le monde. Nos frais de service restent fixes à 10%.
          </p>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
                <Percent className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-emerald-900">Jusqu&apos;à -45% sur le prix usine</h3>
                <p className="text-sm text-emerald-700">
                  Exemple : un produit à 50 000 FCFA en unitaire peut descendre à 27 500 FCFA en groupe de 50 personnes.
                </p>
              </div>
            </div>
            <div className="text-sm text-emerald-800 space-y-1">
              <div className="flex items-center gap-2">
                <ChevronRight className="h-3 w-3" />
                Pas de minimum de commande individuelle
              </div>
              <div className="flex items-center gap-2">
                <ChevronRight className="h-3 w-3" />
                Livraison groupée à Dakar, retrait ou livraison locale
              </div>
              <div className="flex items-center gap-2">
                <ChevronRight className="h-3 w-3" />
                Garantie satisfait ou remboursé sous 7 jours
              </div>
            </div>
          </div>
        </section>

        {/* 5. Assurance */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-rose-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Assurance transport 2%</h2>
          </div>
          <p className="text-slate-600 mb-4">
            L&apos;assurance de 2% couvre votre commande de la sortie d&apos;usine jusqu&apos;à la livraison finale.
            Elle est automatiquement incluse dans chaque commande et ne peut pas être désactivée.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              'Perte de colis',
              'Dommage / casse',
              'Retard de livraison > 15 jours',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 bg-white">
                <ShieldCheck className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span className="text-sm font-medium text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* CTA final */}
        <section className="text-center bg-slate-900 rounded-3xl p-10">
          <h2 className="text-2xl font-bold text-white mb-3">
            Prêt à importer intelligemment ?
          </h2>
          <p className="text-slate-300 mb-6">
            Parcourez notre catalogue ou faites une demande de sourcing personnalisée.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/produits"
              className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
            >
              Voir le catalogue
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              href="/market"
              className="inline-flex items-center justify-center gap-2 border border-white/30 text-white hover:bg-white/10 px-6 py-3 rounded-xl font-semibold transition-colors"
            >
              Retour à l&apos;accueil
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
