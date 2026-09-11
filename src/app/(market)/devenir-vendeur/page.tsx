'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Store,
  Loader2,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Clock,
  Percent,
  Package,
  Globe,
  Shield,
} from 'lucide-react'

const BENEFITS = [
  'Prix usine sans intermédiaire',
  'Logistique incluse',
  'Assurance 2%',
  'Visibilité 10 000+ clients',
  'Escrow',
  'Support 7j/7',
]

const STEPS = [
  { icon: Package, title: 'Importez en groupe', desc: 'Réduisez les coûts en partageant les achats avec d\'autres vendeurs.' },
  { icon: Globe, title: 'Recevez le stock', desc: 'Nous livrons à Dakar, vous récupérez vos produits prêts à vendre.' },
  { icon: TrendingUp, title: 'Revendez', desc: 'Vendez en ligne ou en magasin avec une marge attractive.' },
]

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Hero */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-10 md:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-[11px] font-bold">
                <Store size={12} /> Devenez vendeur
              </span>
              <h1 className="mt-4 text-[32px] md:text-[44px] font-extrabold tracking-tight leading-tight">
                Vendez avec <span className="text-emerald-400">DDM+</span>
              </h1>
              <p className="mt-3 text-[15px] text-white/80 max-w-md leading-relaxed">
                Importez en groupe, recevez le stock à Dakar, revendez avec marge. Nous gérons la Chine, vous gérez vos clients.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-white/10 backdrop-blur border border-white/20 p-3">
                  <p className="text-[22px] font-extrabold text-emerald-400">+45%</p>
                  <p className="text-[11px] text-white/70">Marge moyenne</p>
                </div>
                <div className="rounded-xl bg-white/10 backdrop-blur border border-white/20 p-3">
                  <p className="text-[22px] font-extrabold text-emerald-400">10min</p>
                  <p className="text-[11px] text-white/70">Setup</p>
                </div>
                <div className="rounded-xl bg-white/10 backdrop-blur border border-white/20 p-3">
                  <p className="text-[22px] font-extrabold text-emerald-400">0%</p>
                  <p className="text-[11px] text-white/70">Commission</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white/10 backdrop-blur border border-white/20 p-5 md:p-6">
              <h2 className="text-[18px] font-bold text-white mb-4">Créer ma boutique</h2>
              {success ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                  <p className="font-bold text-white">Boutique créée !</p>
                  <p className="text-white/70 text-sm">Redirection…</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {!auth && (
                    <div className="rounded-xl bg-amber-100/20 border border-amber-200/30 p-3 text-sm text-amber-100">
                      <Link href="/login?return=/devenir-vendeur" className="font-semibold underline">Connectez-vous</Link> pour créer votre boutique.
                    </div>
                  )}
                  {error && (
                    <div className="flex items-start gap-2 rounded-xl bg-red-100/20 border border-red-200/30 p-3 text-sm text-red-100">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      {error}
                    </div>
                  )}
                  <div>
                    <label className="block text-[12px] font-bold text-white/80 mb-1">Nom de la boutique *</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Ex: Tech Dakar Store"
                      className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold text-white/80 mb-1">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Décrivez votre boutique…"
                      rows={3}
                      className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-bold text-white/80 mb-1">Email</label>
                      <input
                        type="email"
                        value={form.contactEmail}
                        onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                        placeholder="vous@email.com"
                        className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold text-white/80 mb-1">Téléphone</label>
                      <input
                        type="tel"
                        value={form.contactPhone}
                        onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                        placeholder="77 123 45 67"
                        className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-white/60">
                    En créant votre boutique, vous acceptez nos CGV vendeurs.
                  </p>
                  <button
                    type="submit"
                    disabled={loading || !auth}
                    className="w-full py-3 bg-white text-slate-900 hover:bg-slate-100 disabled:opacity-50 rounded-xl font-bold flex items-center justify-center gap-2 transition"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Créer ma boutique <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-10 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            return (
              <div key={s.title} className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-5">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 mb-3">
                  <Icon size={22} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Étape {i + 1}</p>
                <p className="mt-1 text-[16px] font-extrabold text-slate-900 dark:text-white">{s.title}</p>
                <p className="mt-1 text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            )
          })}
        </div>

        {/* Benefits */}
        <div className="mt-8 md:mt-12 rounded-3xl bg-emerald-600 dark:bg-emerald-700 p-6 md:p-10 text-white">
          <h2 className="text-[22px] md:text-[28px] font-extrabold tracking-tight mb-4">Pourquoi vendre avec DDM+ ?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {BENEFITS.map((b) => (
              <div key={b} className="flex items-center gap-2">
                <div className="grid h-5 w-5 place-items-center rounded-full bg-white/20">
                  <CheckCircle size={12} />
                </div>
                <span className="text-[14px] font-semibold">{b}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile form duplicate */}
        <div className="mt-8 md:mt-12 lg:hidden rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-5">
          <h2 className="text-[18px] font-bold text-slate-900 dark:text-white mb-4">Créer ma boutique</h2>
          {!auth && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-3 text-sm text-amber-800 dark:text-amber-300 mb-3">
              <Link href="/login?return=/devenir-vendeur" className="font-semibold underline">Connectez-vous</Link> pour créer votre boutique.
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-3 text-sm text-red-700 dark:text-red-300">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nom de la boutique"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description"
              rows={3}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input
              type="email"
              value={form.contactEmail}
              onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
              placeholder="Email"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input
              type="tel"
              value={form.contactPhone}
              onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
              placeholder="Téléphone"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={loading || !auth}
              className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Créer ma boutique <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
