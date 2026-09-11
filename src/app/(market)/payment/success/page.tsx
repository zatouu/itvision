'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Check, Package, MessageCircle, Loader2, Users } from 'lucide-react'
import { formatFcfa } from '@/components/market/batch1/formatFcfa'

const ORDER_STEPS = [
  { key: 'ordered', label: 'Commande confirmée', desc: 'Paiement validé' },
  { key: 'sourcing', label: 'Sourcing en Chine', desc: 'Recherche du fournisseur' },
  { key: 'china', label: 'Inspection qualité', desc: 'Contrôle qualité en Chine' },
  { key: 'in_transit', label: 'En transit', desc: 'Transport international' },
  { key: 'delivered', label: 'Livrée', desc: 'Livraison à l\'adresse' },
]

type PaymentLookup = {
  status: string
  reference: string
  type?: 'group' | 'order'
  groupId?: string
  orderId?: string
}

type OrderDetail = {
  orderId: string
  items: { name?: string; productName?: string; qty?: number; quantity?: number; image?: string; productImage?: string; price?: number }[]
  total: number
  createdAt: string
  shipping?: { method?: string; label?: string } | string
  delivery?: { estimatedDeliveryDate?: string; eta?: string }
} | null

type GroupDetail = {
  groupId: string
  product: { name?: string; image?: string }
  currentUnitPrice?: number
} | null

function fmtDate(d?: string) {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  } catch {
    return d
  }
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams()
  const reference = searchParams.get('ref') || ''
  const [payment, setPayment] = useState<PaymentLookup | null>(null)
  const [order, setOrder] = useState<OrderDetail>(null)
  const [group, setGroup] = useState<GroupDetail>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!reference) {
      setLoading(false)
      return
    }

    let stopped = false
    let attempts = 0
    let paymentResolved = false

    const checkPayment = async () => {
      attempts += 1
      try {
        const res = await fetch(`/api/payment/status?reference=${encodeURIComponent(reference)}`, { cache: 'no-store' })
        const data = await res.json()
        if (stopped) return

        setPayment(data)

        if (data?.status === 'paid' || data?.status === 'completed') {
          window.localStorage.removeItem('cart:items')
          window.dispatchEvent(new CustomEvent('cart:updated'))
          paymentResolved = true
          setLoading(false)

          if (data.type === 'order' && data.orderId) {
            try {
              const orderRes = await fetch(`/api/order/${data.orderId}`, { credentials: 'include', cache: 'no-store' })
              const orderData = await orderRes.json()
              if (orderData?.success && orderData.order) setOrder(orderData.order)
            } catch {
              // ignore
            }
          } else if (data.type === 'group' && data.groupId) {
            try {
              const groupRes = await fetch(`/api/group-orders/${data.groupId}`, { cache: 'no-store' })
              const groupData = await groupRes.json()
              if (groupData?.success && groupData.group) {
                setGroup({
                  groupId: groupData.group.groupId,
                  product: groupData.group.product,
                  currentUnitPrice: groupData.group.currentUnitPrice,
                })
              }
            } catch {
              // ignore
            }
          }
        } else if (attempts < 8) {
          window.setTimeout(checkPayment, 3000)
        } else {
          setLoading(false)
        }
      } catch {
        if (!stopped) {
          setLoading(false)
        }
      }
    }

    checkPayment()

    return () => {
      stopped = true
    }
  }, [reference])

  const isConfirmed = payment?.status === 'paid' || payment?.status === 'completed'

  const amount = order?.total || (group?.currentUnitPrice ? 0 : 0)
  const orderId = order?.orderId || payment?.reference || ''
  const eta = order?.delivery?.estimatedDeliveryDate || order?.delivery?.eta || ''
  const paidAt = order?.createdAt ? fmtDate(order.createdAt) : 'À l\'instant'

  const items = (order?.items || []).map((it) => ({
    name: it.name || it.productName || 'Article',
    qty: it.qty ?? it.quantity ?? 1,
    image: it.image || it.productImage || '/placeholder.svg',
  }))

  const CheckIcon = () => (
    <div className="relative">
      <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" style={{ animationDuration: '2s' }} />
      <div className="relative grid h-24 w-24 md:h-28 md:w-28 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30">
        <Check size={48} strokeWidth={3} />
      </div>
    </div>
  )

  const HorizontalTimeline = () => (
    <div className="flex items-center gap-1 md:gap-2">
      {ORDER_STEPS.map((step, i) => {
        const isDone = i < 1
        const isCurrent = i === 1
        return (
          <div key={step.key} className="flex flex-col items-center gap-1 flex-shrink-0">
            <span className={
              `grid h-8 w-8 md:h-9 md:w-9 place-items-center rounded-full text-[11px] font-bold ${
                isDone ? 'bg-emerald-500 text-white' :
                isCurrent ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500' :
                'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
              }`
            }>
              {isDone ? <Check size={13} /> : i + 1}
            </span>
            <span className={`text-[9px] md:text-[10px] font-bold text-center leading-tight whitespace-nowrap max-w-[70px] md:max-w-[90px] ${(isDone || isCurrent) ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
              {step.label}
            </span>
          </div>
        )
      })}
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-amber-100 text-amber-600">
            <Loader2 size={40} className="animate-spin" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Vérification du paiement...</h1>
          <p className="text-slate-600 dark:text-slate-400">Chargement des informations de transaction...</p>
        </div>
      </div>
    )
  }

  if (!isConfirmed) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-amber-100 text-amber-600">
            <Loader2 size={40} className="animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Paiement en cours de confirmation</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            La confirmation peut prendre quelques secondes. Vous pouvez aussi revenir sur la page de paiement pour vérifier le statut.
          </p>
          <Link
            href={`/paiement/checkout/${reference}`}
            className="block w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl transition"
          >
            Vérifier / réessayer le paiement
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-4 text-center md:text-left">
          <p className="text-[18px] font-extrabold text-slate-900 dark:text-white"><span className="text-emerald-600">DDM</span>+</p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 md:px-6 py-8 md:py-12">
        <div className="flex flex-col items-center text-center mb-8">
          <CheckIcon />
          <p className="mt-6 text-[11px] md:text-[12px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Paiement confirmé</p>
          <h1 className="mt-2 text-[28px] md:text-[36px] font-extrabold tracking-tight text-slate-900 dark:text-white">Merci pour votre commande</h1>
          <p className="mt-2 text-[13px] md:text-[15px] text-slate-500 dark:text-slate-400 max-w-md">
            Votre paiement {amount > 0 ? `de ${formatFcfa(amount)}` : ''} a bien été reçu. Vous recevrez une confirmation par SMS.
          </p>
          <p className="mt-3 font-mono text-[12px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-1.5">
            Réf. {orderId || reference}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4 md:p-6 mb-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Prochaines étapes</p>
          <HorizontalTimeline />
          {eta && (
            <p className="mt-4 text-[12px] text-slate-500 dark:text-slate-400 text-center">
              Livraison prévue le <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{fmtDate(eta)}</span>
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4 md:p-6 mb-4">
          <div className="mb-3 flex items-baseline justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Commande</p>
              <p className="text-[13px] font-extrabold text-slate-900 dark:text-white tabular-nums">{orderId}</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
              <Check size={11} /> Payée
            </span>
          </div>

          {items.length > 0 ? (
            <div className="space-y-2 mb-3">
              {items.map((it, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <img src={it.image} alt={it.name} className="h-10 w-10 rounded-lg object-cover flex-shrink-0 bg-slate-100 dark:bg-slate-800" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-slate-900 dark:text-white line-clamp-1">{it.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">{it.qty} pcs</p>
                  </div>
                </div>
              ))}
            </div>
          ) : group ? (
            <div className="flex items-center gap-2.5 mb-3">
              <img src={group.product?.image || '/placeholder.svg'} alt={group.product?.name || 'Produit'} className="h-10 w-10 rounded-lg object-cover flex-shrink-0 bg-slate-100 dark:bg-slate-800" />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-slate-900 dark:text-white line-clamp-1">{group.product?.name || 'Achat groupé'}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Groupe {group.groupId}</p>
              </div>
            </div>
          ) : null}

          <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-1.5 text-[12px]">
            {amount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Total</span>
                <span className="font-extrabold tabular-nums text-slate-900 dark:text-white whitespace-nowrap">{formatFcfa(amount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Payé le</span>
              <span className="font-semibold text-slate-900 dark:text-white">{paidAt}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Méthode</span>
              <span className="font-semibold text-slate-900 dark:text-white font-mono">Wave · **** 4587</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-900 p-3 md:p-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 md:h-11 md:w-11 flex-shrink-0 place-items-center rounded-xl bg-emerald-600 text-white">
              <MessageCircle size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-extrabold text-slate-900 dark:text-white">Besoin d&apos;aide ?</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">Notre équipe est là 7j/7</p>
            </div>
            <a
              href="https://wa.me/221761234567"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-emerald-600 text-white text-[13px] font-semibold flex-shrink-0"
            >
              <MessageCircle size={14} /> Contact
            </a>
          </div>
        </div>

        <div className="flex flex-col-reverse md:flex-row gap-3 mt-6">
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center h-12 rounded-xl border border-slate-200 bg-white text-slate-900 font-semibold hover:bg-slate-50 dark:bg-slate-900 dark:text-white dark:border-slate-700 dark:hover:bg-slate-800 transition"
          >
            Retour à l&apos;accueil
          </Link>
          {payment?.type === 'group' && payment.groupId ? (
            <Link
              href={`/achats-groupes/${payment.groupId}`}
              className="flex-1 inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-violet-600 text-white font-semibold hover:bg-violet-700 transition"
            >
              <Users size={16} /> Retour à l&apos;achat groupé
            </Link>
          ) : (
            <Link
              href="/compte/commandes"
              className="flex-1 inline-flex items-center justify-center gap-2 h-12 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
            >
              <Package size={16} /> Voir mes commandes
            </Link>
          )}
        </div>

        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 pt-6">
          Un problème avec ce paiement ?{' '}
          <Link href={`/paiement/checkout/${reference}`} className="font-bold text-emerald-600 dark:text-emerald-400 underline">
            Vérifier ou réessayer
          </Link>
        </p>
      </main>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-amber-100 text-amber-600">
            <Loader2 size={40} className="animate-spin" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Vérification du paiement...</h1>
          <p className="text-slate-600 dark:text-slate-400">Chargement des informations de transaction...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}
