import { redirect } from 'next/navigation'

// Route historique — la page canonique est /tarification.
export default function PrixTransparentPage() {
  redirect('/tarification')
}
