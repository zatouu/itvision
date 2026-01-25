import { redirect } from 'next/navigation'
import { verifyAuthServer } from '@/lib/auth-server'

export default async function MarketComptePage() {
  const auth = await verifyAuthServer()
  if (!auth.isAuthenticated) {
    redirect('/login?redirect=/market/compte')
  }

  // Point d'entrée "Market" : on garde /compte comme dashboard principal.
  // Cela évite les 404 si l'utilisateur attend /market/compte.
  redirect('/compte')
}
