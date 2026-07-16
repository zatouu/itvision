'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Store, Loader2, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react'
import MarketHeader from '@/components/MarketHeader'
import MarketFooter from '@/components/MarketFooter'
import MarketBottomNav from '@/components/MarketBottomNav'

export default function BecomeVendorPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [auth, setAuth] = useState<{ id: string; name?: string; email?: string; phone?: string } | null>(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
    contactEmail: '',
    contactPhone: '',
  })

  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/login', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return
        if (data?.user) {
          setAuth({
            id: data.user.id,
            name: data.user.name || data.user.username,
            email: data.user.email,
            phone: data.user.phone,
          })
          setForm((f) => ({
            ...f,
            contactEmail: data.user.email || '',
            contactPhone: data.user.phone || '',
          }))
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!form.name.trim()) {
      setError('Le nom de la boutique est requis')
      return
    }
    if (!auth) {
      setError('Veuillez vous connecter pour créer une boutique')
      return
    }
    try {
      setLoading(true)
      const res = await fetch('/api/vendor/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          contactEmail: form.contactEmail.trim() || auth.email,
          contactPhone: form.contactPhone.trim() || auth.phone,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setSuccess(true)
      setTimeout(() => router.push('/espace-vendeur'), 1500)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 md:pb-0">
      <MarketHeader />

      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg p-6 md:p-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl">
              <Store className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Créer votre boutique DDM+</h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            Achetez en groupe depuis la Chine et revendez plus cher localement. Vos clients paient un peu plus pour la disponibilité immédiate et le stock au Sénégal.
          </p>

          {success ? (
            <div className="text-center py-10">
              <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Boutique créée !</h2>
              <p className="text-slate-600 dark:text-slate-400">Redirection vers votre espace vendeur…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {!auth && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 p-4 text-sm text-amber-800 dark:text-amber-300">
                  <Link href="/login?return=/devenir-vendeur" className="font-semibold underline">Connectez-vous</Link> pour créer votre boutique.
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 p-4 text-sm text-red-700 dark:text-red-300">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Nom de la boutique *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Tech Dakar Store"
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Décrivez votre boutique et les produits que vous revendez…"
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email de contact</label>
                  <input
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                    placeholder="vous@email.com"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Téléphone</label>
                  <input
                    type="tel"
                    value={form.contactPhone}
                    onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                    placeholder="77 123 45 67"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-4 text-sm text-slate-600 dark:text-slate-400 space-y-2">
                <p className="font-semibold text-slate-900 dark:text-slate-200">Comment ça marche ?</p>
                <ul className="space-y-1.5 list-disc list-inside">
                  <li>Vous rejoignez ou créez un achat groupé sur DDM+.</li>
                  <li>Une fois le stock livré au Sénégal, vous le revendez dans votre boutique.</li>
                  <li>Le prix affiché inclut le coût de l&apos;import + une marge pour la disponibilité locale.</li>
                  <li>Vos clients paient plus cher mais reçoivent leur produit immédiatement, <strong>tagué &quot;En stock&quot;.</strong></li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={loading || !auth}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold flex items-center justify-center gap-2 transition"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Créer ma boutique <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}
        </div>
      </main>

      <MarketFooter />
      <MarketBottomNav />
    </div>
  )
}
