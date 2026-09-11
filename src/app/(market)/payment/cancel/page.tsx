import { Metadata } from 'next'
import ScreenPaymentCancel from '@/components/market/batch1/screens/ScreenPaymentCancel'

export const metadata: Metadata = {
  title: 'Paiement annulé — DDM+',
  description: 'Votre paiement a été annulé. Aucune somme n\'a été débitée.',
}

export default async function PaymentCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { ref } = await searchParams
  const reference = typeof ref === 'string' ? ref : undefined

  return <ScreenPaymentCancel reference={reference} />
}
