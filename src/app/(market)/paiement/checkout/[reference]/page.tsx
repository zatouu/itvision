import { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import ScreenPaymentCheckout from '@/components/market/batch1/screens/ScreenPaymentCheckout'
import { readPaymentSettings } from '@/lib/payments/settings'
import { verifyAuthServer } from '@/lib/auth-server'
import {
  resolvePaymentReference,
  canAccessOrderPayment,
  isPaymentSettled,
  maskName,
  maskPhone,
} from '@/lib/payments/resolve-payment-reference'

export const metadata: Metadata = {
  title: 'Paiement — DDM+',
  description: 'Finalisez votre paiement en toute sécurité.',
}

interface PageProps {
  params: Promise<{ reference: string }>
  searchParams: Promise<{ token?: string }>
}

export default async function CheckoutPage({ params, searchParams }: PageProps) {
  const { reference } = await params
  const { token } = await searchParams

  const resolved = await resolvePaymentReference(reference)
  if (!resolved) {
    redirect('/payment/cancel?ref=' + encodeURIComponent(reference))
  }

  const auth = await verifyAuthServer().catch(() => null)
  const userId = auth?.isAuthenticated ? auth.user?.id : null

  if (resolved.type === 'order') {
    const allowed = canAccessOrderPayment(resolved, { userId, token })
    if (!allowed) {
      // Commande protégée : guider vers la récupération du lien de suivi
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-8 text-center">
            <p className="text-[32px] mb-3">🔒</p>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">Lien sécurisé requis</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Cette commande est protégée. Utilisez le lien de suivi reçu par email,
              ou connectez-vous avec le compte associé à la commande.
            </p>
            <div className="space-y-3">
              <Link
                href="/retrouver-ma-commande"
                className="block w-full h-11 rounded-xl bg-emerald-600 text-white font-bold leading-[2.75rem] hover:bg-emerald-700 transition"
              >
                Retrouver ma commande
              </Link>
              <Link
                href={`/login?redirect=${encodeURIComponent(`/paiement/checkout/${reference}`)}`}
                className="block w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold leading-[2.75rem] hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Se connecter
              </Link>
            </div>
          </div>
        </div>
      )
    }

    if (isPaymentSettled(resolved)) {
      redirect(`/payment/success?ref=${encodeURIComponent(reference)}${token ? `&token=${encodeURIComponent(token)}` : ''}`)
    }

    const settings = readPaymentSettings()
    const order = resolved.order

    return (
      <ScreenPaymentCheckout
        reference={resolved.reference}
        orderType="order"
        amount={resolved.amount}
        items={order.items}
        settings={settings}
        phone={order.clientPhone}
        customerName={order.clientName}
        token={token}
        successUrl={`/payment/success?ref=${encodeURIComponent(reference)}${token ? `&token=${encodeURIComponent(token)}` : ''}`}
      />
    )
  }

  // Achat groupé — pay-by-link : la référence reçue par email est la capacité.
  if (isPaymentSettled(resolved)) {
    redirect(`/payment/success?ref=${encodeURIComponent(reference)}`)
  }

  const settings = readPaymentSettings()
  const p = resolved.participant

  return (
    <ScreenPaymentCheckout
      reference={resolved.reference}
      orderType="group"
      amount={resolved.amount}
      items={[
        {
          name: resolved.group.productName,
          qty: p.qty,
          price: p.unitPrice,
          image: resolved.group.productImage,
        },
      ]}
      settings={settings}
      customerName={maskName(p.name)}
      successUrl={`/payment/success?ref=${encodeURIComponent(reference)}`}
    />
  )
}
