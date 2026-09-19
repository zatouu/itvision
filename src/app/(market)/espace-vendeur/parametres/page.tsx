'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Store,
  Upload,
  CheckCircle,
  ImageIcon,
  Clock,
  ExternalLink,
} from 'lucide-react'

interface ShopForm {
  name: string
  slug: string
  status: string
  isVerified: boolean
  description: string
  logo: string
  coverImage: string
  ownerEmail: string
  ownerPhone: string
  city: string
  address: string
  whatsapp: string
  instagram: string
  facebook: string
  website: string
}

const inputCls =
  'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}

export default function VendorShopSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState<ShopForm | null>(null)
  const [uploading, setUploading] = useState<'logo' | 'cover' | null>(null)
  const logoInput = useRef<HTMLInputElement>(null)
  const coverInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/vendor/shop', { credentials: 'include' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Erreur de chargement')
        const s = data.shop
        setForm({
          name: s.name,
          slug: s.slug,
          status: s.status,
          isVerified: s.isVerified,
          description: s.description || '',
          logo: s.logo || '',
          coverImage: s.coverImage || '',
          ownerEmail: s.ownerEmail || '',
          ownerPhone: s.ownerPhone || '',
          city: s.city || '',
          address: s.address || '',
          whatsapp: s.socialLinks?.whatsapp || '',
          instagram: s.socialLinks?.instagram || '',
          facebook: s.socialLinks?.facebook || '',
          website: s.socialLinks?.website || '',
        })
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const uploadImage = async (file: File, field: 'logo' | 'coverImage', kind: 'logo' | 'cover') => {
    try {
      setUploading(kind)
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', 'shops')
      const res = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Erreur d'upload")
      setForm((f) => (f ? { ...f, [field]: data.url } : f))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setUploading(null)
    }
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form) return
    try {
      setSaving(true)
      setError(null)
      setSaved(false)
      const res = await fetch('/api/vendor/shop', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          description: form.description || undefined,
          logo: form.logo || undefined,
          coverImage: form.coverImage || undefined,
          ownerEmail: form.ownerEmail || undefined,
          ownerPhone: form.ownerPhone || undefined,
          city: form.city || undefined,
          address: form.address || undefined,
          socialLinks: {
            whatsapp: form.whatsapp || undefined,
            instagram: form.instagram || undefined,
            facebook: form.facebook || undefined,
            website: form.website || undefined,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (!form) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <p className="text-slate-600 dark:text-slate-400">{error || 'Boutique introuvable'}</p>
        <Link href="/espace-vendeur" className="mt-4 text-emerald-600 font-medium">
          Retour au tableau de bord
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-16">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="mx-auto max-w-3xl px-4 md:px-6 py-6 md:py-8">
          <Link
            href="/espace-vendeur"
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white/70 hover:text-white transition mb-3"
          >
            <ArrowLeft size={14} /> Tableau de bord
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-[22px] md:text-[26px] font-extrabold flex items-center gap-2">
                <Store size={22} /> Paramètres de la boutique
              </h1>
              <p className="text-[13px] text-white/70 mt-1">
                {form.name} · <span className="font-mono">/boutiques/{form.slug}</span>
              </p>
            </div>
            <Link
              href={`/boutiques/${form.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-white/10 border border-white/20 text-white text-[12px] font-semibold hover:bg-white/20 transition"
            >
              <ExternalLink size={13} /> Voir la vitrine
            </Link>
          </div>
          {form.status === 'pending_review' && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-400/15 border border-amber-400/30 px-3.5 py-2 text-[12px] font-semibold text-amber-200">
              <Clock size={14} /> En cours de vérification — non visible publiquement
            </div>
          )}
        </div>
      </div>

      <form onSubmit={save} className="mx-auto max-w-3xl px-4 md:px-6 -mt-4 space-y-5">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 p-3.5 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Identité visuelle */}
        <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4 md:p-6">
          <h2 className="text-[15px] font-extrabold text-slate-900 dark:text-white mb-4">Identité visuelle</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Logo</p>
              <button
                type="button"
                onClick={() => logoInput.current?.click()}
                className="relative w-full aspect-square max-w-[160px] rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden hover:border-emerald-500 transition group"
              >
                {form.logo ? (
                  <img src={form.logo} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full flex-col items-center justify-center text-slate-400 gap-1.5">
                    <ImageIcon size={22} />
                    <span className="text-[11px] font-semibold">Ajouter un logo</span>
                  </span>
                )}
                <span className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[11px] font-bold">
                  {uploading === 'logo' ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Changer'}
                </span>
              </button>
              <input
                ref={logoInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], 'logo', 'logo')}
              />
            </div>
            <div>
              <p className="text-[12px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Bannière</p>
              <button
                type="button"
                onClick={() => coverInput.current?.click()}
                className="relative w-full aspect-[16/9] rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 overflow-hidden hover:border-emerald-500 transition group"
              >
                {form.coverImage ? (
                  <img src={form.coverImage} alt="Bannière" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full flex-col items-center justify-center text-slate-400 gap-1.5">
                    <ImageIcon size={22} />
                    <span className="text-[11px] font-semibold">Ajouter une bannière</span>
                  </span>
                )}
                <span className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[11px] font-bold">
                  {uploading === 'cover' ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Changer'}
                </span>
              </button>
              <input
                ref={coverInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], 'coverImage', 'cover')}
              />
            </div>
          </div>
          <div className="mt-4">
            <Field label="Description" hint="Visible sur votre vitrine publique — présentez votre activité en quelques phrases.">
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                maxLength={1000}
                className={inputCls}
                placeholder="Décrivez votre boutique, vos produits, vos délais…"
              />
            </Field>
          </div>
        </section>

        {/* Contact */}
        <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4 md:p-6">
          <h2 className="text-[15px] font-extrabold text-slate-900 dark:text-white mb-4">Contact</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Email">
              <input type="email" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Téléphone">
              <input type="tel" value={form.ownerPhone} onChange={(e) => setForm({ ...form, ownerPhone: e.target.value })} className={inputCls} placeholder="+221 ..." />
            </Field>
          </div>
        </section>

        {/* Réseaux */}
        <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4 md:p-6">
          <h2 className="text-[15px] font-extrabold text-slate-900 dark:text-white mb-4">Réseaux & présence en ligne</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="WhatsApp" hint="Numéro affiché sur votre vitrine pour le contact direct.">
              <input type="tel" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className={inputCls} placeholder="+221 ..." />
            </Field>
            <Field label="Instagram">
              <input type="text" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} className={inputCls} placeholder="@votrecompte" />
            </Field>
            <Field label="Facebook">
              <input type="text" value={form.facebook} onChange={(e) => setForm({ ...form, facebook: e.target.value })} className={inputCls} placeholder="Page ou profil" />
            </Field>
            <Field label="Site web">
              <input type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className={inputCls} placeholder="https://..." />
            </Field>
          </div>
        </section>

        {/* Localisation */}
        <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 dark:border-slate-800 p-4 md:p-6">
          <h2 className="text-[15px] font-extrabold text-slate-900 dark:text-white mb-4">Localisation</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Ville">
              <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputCls} placeholder="Dakar" />
            </Field>
            <Field label="Adresse">
              <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputCls} placeholder="Quartier, rue…" />
            </Field>
          </div>
        </section>

        <div className="sticky bottom-4 z-10">
          <button
            type="submit"
            disabled={saving || uploading !== null}
            className="w-full h-12 rounded-2xl bg-emerald-600 text-white text-[14px] font-bold hover:bg-emerald-700 transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : saved ? (
              <>
                <CheckCircle size={16} /> Enregistré
              </>
            ) : (
              <>
                <Upload size={16} /> Enregistrer les modifications
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
