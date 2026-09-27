'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Icon, type IconName } from '@/components/market/storefront/Icon'
import { Button } from '@/components/market/storefront/Button'
import { Card } from '@/components/market/storefront/Card'
import { Badge } from '@/components/market/storefront/Badge'

// Étapes de la garantie escrow (réelles : voir src/lib/escrow-service.ts)
const trackingSteps: { icon: IconName; title: string; description: string }[] = [
  {
    icon: 'shield',
    title: 'Paiement sécurisé',
    description: "Votre argent est protégé jusqu'à réception",
  },
  {
    icon: 'truck',
    title: 'Commande & Expédition',
    description: 'Nous commandons et suivons votre colis',
  },
  {
    icon: 'clock',
    title: 'Livraison',
    description: 'Livré chez vous à Dakar',
  },
  {
    icon: 'checkCircle',
    title: 'Validation',
    description: 'Vérifiez votre commande sous 48h',
  },
]

export default function SuiviPage() {
  const router = useRouter()
  const [reference, setReference] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!reference.trim()) {
      setError('Veuillez entrer une référence')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Vérifier l'existence de la commande (endpoint public masqué)
      const res = await fetch(`/api/order/track-public?ref=${encodeURIComponent(reference.trim().toUpperCase())}`)

      if (res.ok) {
        router.push(`/suivi/${reference.trim().toUpperCase()}`)
      } else {
        setError('Référence non trouvée. Vérifiez votre numéro de commande (CMD-…).')
      }
    } catch {
      setError('Erreur de connexion. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-full bg-slate-50 px-4 py-8 dark:bg-slate-950 md:py-12">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <Badge tone="violet" className="mb-4">
            <Icon name="shield" size={11} /> Garantie escrow incluse
          </Badge>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white md:text-3xl">
            Suivez votre commande
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-[13px] text-slate-500 dark:text-slate-400 md:text-sm">
            Entrez votre numéro de commande (CMD-…) pour voir son état d&apos;avancement
          </p>
        </div>

        {/* Formulaire de recherche */}
        <Card className="p-5 md:p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label htmlFor="tracking-ref" className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Référence de commande
              </label>
              <div className="relative">
                <input
                  id="tracking-ref"
                  type="text"
                  value={reference}
                  onChange={(e) => {
                    setReference(e.target.value.toUpperCase())
                    setError(null)
                  }}
                  placeholder="Ex : CMD-1700000000-ABC123"
                  autoComplete="off"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-11 font-mono text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                />
                <Icon name="search" size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-[12px] font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                <Icon name="info" size={16} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Recherche…
                </>
              ) : (
                <>
                  <Icon name="search" size={16} /> Suivre ma commande
                </>
              )}
            </Button>
          </form>
        </Card>

        {/* Comment ça marche */}
        <h2 className="mt-10 mb-4 text-center text-[15px] font-extrabold text-slate-900 dark:text-white md:text-base">
          Comment fonctionne notre garantie ?
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {trackingSteps.map((step, index) => (
            <Card key={step.title} className="h-full p-4">
              <div className="flex flex-col items-center text-center">
                <span className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <Icon name={step.icon} size={20} />
                </span>
                <span className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Étape {index + 1}
                </span>
                <h3 className="text-[13px] font-bold text-slate-900 dark:text-white">{step.title}</h3>
                <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">{step.description}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Lien vers achats groupés */}
        <Link href="/achats-groupes" className="mt-8 block">
          <Card className="group p-4 transition-colors hover:border-emerald-300 dark:hover:border-emerald-800">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400">
                  <Icon name="users" size={20} />
                </span>
                <div>
                  <h3 className="text-[13px] font-bold text-slate-900 dark:text-white">Découvrez nos achats groupés</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Achetez ensemble et partagez les frais de transport</p>
                </div>
              </div>
              <Icon name="arrowRight" size={18} className="flex-shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
            </div>
          </Card>
        </Link>

        {/* Footer */}
        <p className="mt-8 text-center text-[12px] text-slate-400 dark:text-slate-500">
          Besoin d&apos;aide ? Contactez-nous à support@itvisionplus.sn
        </p>
      </div>
    </div>
  )
}
