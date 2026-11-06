import { redirect } from 'next/navigation'

// Les comptes clients entreprise sont créés uniquement par l'admin
// (/api/admin/clients). Toute demande passe par le canal contact.
export default function RegisterCorporateRedirectPage() {
  redirect('/contact')
}
