'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Clock, Loader2 } from 'lucide-react'

type PaymentLookup = {
  status: string
  type?: 'group' | 'order'
  groupId?: string
  orderId?: string
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const reference = searchParams.get('ref') || ''
  const [payment, setPayment] = useState<PaymentLookup | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!reference) {
      setLoading(false)
      return
    }

    let stopped = false
    let attempts = 0

    const checkPayment = async () => {
      attempts += 1
      try {
        const res = await fetch(`/api/payment/status?reference=${encodeURIComponent(reference)}`, { cache: 'no-store' })
        const data = await res.json()
        if (stopped) return

        setPayment(data)
        setLoading(false)

        if ((data?.status === 'paid' || data?.status === 'completed') && data?.type === 'order') {
          window.localStorage.removeItem('cart:items')
          window.dispatchEvent(new CustomEvent('cart:updated'))
        }

        if (data?.status !== 'paid' && data?.status !== 'completed' && attempts < 8) {
          window.setTimeout(checkPayment, 3000)
        }
      } catch {
        if (!stopped) setLoading(false)
      }
    }

    checkPayment()

    return () => {
      stopped = true
    }
  }, [reference])

  const isConfirmed = payment?.status === 'paid' || payment?.status === 'completed'
  const title = loading
    ? 'Vérification du paiement...'
    : isConfirmed
      ? 'Paiement confirmé !'
      : 'Paiement en cours de confirmation'

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
        <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 ${
          isConfirmed ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
        }`}>
          {loading ? <Loader2 size={40} className="animate-spin" /> : isConfirmed ? <CheckCircle size={40} /> : <Clock size={40} />}
        </div>
        
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{title}</h1>
        <p className="text-slate-600 mb-8">
          {isConfirmed
            ? 'Votre paiement a été validé. Vous recevrez les prochaines informations de suivi sous peu.'
            : 'Si le paiement a bien été effectué, la confirmation peut prendre quelques secondes. Vous pouvez aussi revenir sur la page de paiement pour vérifier le statut.'}
        </p>
        
        <div className="space-y-3">
          {reference && !isConfirmed && (
            <Link
              href={`/paiement/checkout/${reference}`}
              className="block w-full bg-violet-600 text-white font-bold py-3 rounded-xl hover:bg-violet-700 transition-colors"
            >
              Vérifier / réessayer le paiement
            </Link>
          )}

          {payment?.type === 'group' && payment.groupId && (
            <Link
              href={`/achats-groupes/${payment.groupId}`}
              className="block w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors"
            >
              Retour à l'achat groupé
            </Link>
          )}

          {payment?.type === 'order' && (
            <Link
              href="/compte/commandes"
              className="block w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 transition-colors"
            >
              Voir mes commandes
            </Link>
          )}

          <Link
            href="/"
            className="block w-full bg-white border-2 border-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-50 transition-colors"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  )
}
