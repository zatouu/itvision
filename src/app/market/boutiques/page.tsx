import Link from 'next/link'
import { Store, ShieldCheck, PackageSearch, Truck, BadgeCheck, ArrowRight, Sparkles } from 'lucide-react'

const roadmap = [
  {
    title: 'Boutiques vérifiées',
    desc: 'Des espaces marchands pour vendeurs et revendeurs sélectionnés par IT Vision Plus.',
    icon: Store,
  },
  {
    title: 'Produits contrôlés',
    desc: 'Catalogue filtré avec contrôle qualité, disponibilité et cohérence prix/logistique.',
    icon: ShieldCheck,
  },
  {
    title: 'Sourcing Chine',
    desc: 'Accès à des fournisseurs et produits adaptés au marché sénégalais.',
    icon: PackageSearch,
  },
  {
    title: 'Livraison encadrée',
    desc: 'Suivi achat, fret, réception, contrôle et livraison locale depuis un même espace.',
    icon: Truck,
  },
]

export default function MarketBoutiquesPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-7">
            <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700 dark:bg-green-900/40 dark:text-green-300">
              <Sparkles className="h-3.5 w-3.5" />
              Prochaine étape marketplace
            </span>
            <h1 className="mt-5 text-4xl font-black tracking-tight text-gray-900 dark:text-white md:text-5xl">
              Des <span className="bg-gradient-to-r from-green-600 to-violet-600 bg-clip-text text-transparent">shops partenaires</span> arrivent bientôt
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-gray-600 dark:text-gray-300 md:text-lg">
              La marketplace évolue vers un modèle multi-boutiques : chaque vendeur pourra présenter ses produits, tout en gardant le contrôle qualité, la logistique Chine → Sénégal et le paiement encadré par IT Vision Plus.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/produits" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-green-500 to-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:opacity-90">
                Explorer le catalogue actuel
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/achats-groupes" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                Voir les achats groupés
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-[2rem] border border-green-100 bg-white p-6 shadow-xl shadow-green-500/10 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-green-600 to-violet-600 p-5 text-white">
                <Store className="h-9 w-9" />
                <div>
                  <p className="text-sm font-semibold text-white/80">Marketplace shops</p>
                  <p className="text-2xl font-black">En construction</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3">
                {['Vendeurs vérifiés', 'Gestion boutique', 'Produits import', 'Paiement & livraison'].map((label) => (
                  <div key={label} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <BadgeCheck className="h-4 w-4 text-green-600" />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {roadmap.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.title} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 dark:bg-green-900/30">
                  <Icon className="h-6 w-6 text-green-600 dark:text-green-300" />
                </div>
                <h2 className="text-base font-black text-gray-900 dark:text-white">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">{item.desc}</p>
              </div>
            )
          })}
        </div>
      </section>
    </main>
  )
}
