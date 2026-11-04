'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, Eye, EyeOff, Save, RefreshCw, ShieldCheck } from 'lucide-react'
import AddressBook from '@/components/market/AddressBook'

type Profile = {
  _id: string; name?: string; email?: string; phone?: string
  marketplaceTier?: 'standard' | 'pro' | 'reseller' | 'partner'
  totalMarketplacePurchases?: number; marketplaceOrderCount?: number; proRequestedAt?: string | null
}
const fieldClass = 'mt-2 min-h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-emerald-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'
const buttonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50'
const tierLabels = { standard: 'Standard', pro: 'Pro', reseller: 'Revendeur', partner: 'Partenaire' }

export default function CompteProfilPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [changingPassword, setChangingPassword] = useState(false)
  const [requestingPro, setRequestingPro] = useState(false)
  const [proError, setProError] = useState<string | null>(null)
  const [proMessage, setProMessage] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setLoadError(null)
    async function load() {
      try {
        const response = await fetch('/api/client/profile', { credentials: 'include', signal: controller.signal })
        if (response.status === 401) { router.replace('/login?redirect=/compte/profil'); return }
        const data = await response.json()
        if (!response.ok || !data.profile) throw new Error(data.error || 'Impossible de charger votre profil.')
        if (controller.signal.aborted) return
        setProfile(data.profile)
        setName(data.profile.name || '')
        setPhone(data.profile.phone || '')
      } catch (failure) {
        if (!controller.signal.aborted) setLoadError(failure instanceof Error ? failure.message : 'Profil indisponible.')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [attempt, router])

  async function saveIdentity(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setSaving(true); setSaveError(null); setSaved(false)
    try {
      const response = await fetch('/api/client/profile', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), phone: phone.trim() }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Enregistrement impossible. Réessayez.')
      setProfile(previous => ({ ...previous!, ...data.profile }))
      setName(data.profile.name || '')
      setPhone(data.profile.phone || '')
      setSaved(true)
    } catch (failure) { setSaveError(failure instanceof Error ? failure.message : 'Enregistrement impossible.') }
    finally { setSaving(false) }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault()
    if (changingPassword) return
    setPasswordError(null)
    if (newPassword !== confirmation) { setPasswordError('Les nouveaux mots de passe ne correspondent pas.'); return }
    setChangingPassword(true)
    try {
      const response = await fetch('/api/client/profile', { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Le mot de passe n’a pas été modifié.')
      setCurrentPassword(''); setNewPassword(''); setConfirmation('')
      router.replace('/login?redirect=/compte/profil&reason=password-changed')
    } catch (failure) { setPasswordError(failure instanceof Error ? failure.message : 'Modification impossible.') }
    finally { setChangingPassword(false) }
  }

  async function requestPro() {
    setRequestingPro(true); setProError(null); setProMessage(null)
    try {
      const response = await fetch('/api/client/request-pro', { method: 'POST', credentials: 'include' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'La demande n’a pas été envoyée.')
      setProfile(previous => previous ? { ...previous, proRequestedAt: new Date().toISOString() } : previous)
      setProMessage(data.message || 'Votre demande a été envoyée.')
    } catch (failure) { setProError(failure instanceof Error ? failure.message : 'Demande indisponible.') }
    finally { setRequestingPro(false) }
  }

  return <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
    <div className="mx-auto max-w-4xl px-4 py-6 pb-28 sm:px-6 md:pb-12">
      <Link href="/compte" className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400"><ArrowLeft size={18} aria-hidden="true"/>Mon compte</Link>
      <h1 className="text-2xl font-bold tracking-normal sm:text-3xl">Mon profil</h1>
      <nav aria-label="Sections du profil" className="my-6 flex flex-wrap gap-x-6 border-b border-zinc-200 dark:border-zinc-800">{[['identite', 'Identité'], ['adresses', 'Adresses'], ['securite', 'Sécurité']].map(([id, label]) => <a key={id} href={`#${id}`} className="inline-flex min-h-12 items-center border-b-2 border-transparent text-sm font-semibold hover:border-emerald-700 hover:text-emerald-700 dark:hover:text-emerald-400">{label}</a>)}</nav>
      {loading ? <p role="status" className="py-10 text-sm">Chargement du profil…</p> : loadError ? <div role="alert" className="py-6 text-sm text-red-700 dark:text-red-300"><p>{loadError}</p><button className={`${buttonClass} mt-4`} onClick={() => setAttempt(value => value + 1)}><RefreshCw size={16} aria-hidden="true"/>Réessayer</button></div> : profile && <>
        <form id="identite" aria-labelledby="identity-title" onSubmit={saveIdentity} className="scroll-mt-40 space-y-5 pb-8">
          <h2 id="identity-title" className="text-lg font-bold">Informations personnelles</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-semibold" htmlFor="profile-name">Nom complet<input id="profile-name" name="name" required minLength={2} maxLength={120} autoComplete="name" value={name} onChange={event => { setName(event.target.value); setSaved(false) }} className={fieldClass}/></label>
            <label className="block text-sm font-semibold" htmlFor="profile-phone">Téléphone<input id="profile-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} value={phone} onChange={event => { setPhone(event.target.value); setSaved(false) }} className={fieldClass}/></label>
            <label className="block text-sm font-semibold sm:col-span-2" htmlFor="profile-email">Adresse email<input id="profile-email" type="email" name="email" autoComplete="email" readOnly value={profile.email || ''} className={`${fieldClass} !bg-zinc-100 dark:!bg-zinc-800`}/></label>
          </div>
          {saveError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{saveError}</p>}
          {saved && <p role="status" className="text-sm text-emerald-800 dark:text-emerald-300">Informations enregistrées.</p>}
          <button type="submit" disabled={saving} className={buttonClass}><Save size={18} aria-hidden="true"/>{saving ? 'Enregistrement…' : 'Enregistrer les informations'}</button>
        </form>
        <AddressBook/>
        <form id="securite" aria-labelledby="security-title" onSubmit={changePassword} className="scroll-mt-40 space-y-5 border-t border-zinc-200 py-8 dark:border-zinc-800">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="security-title" className="flex items-center gap-2 text-lg font-bold"><ShieldCheck size={20} aria-hidden="true"/>Sécurité du compte</h2><button type="button" aria-pressed={passwordVisible} aria-label={passwordVisible ? 'Masquer les mots de passe' : 'Afficher les mots de passe'} title={passwordVisible ? 'Masquer les mots de passe' : 'Afficher les mots de passe'} onClick={() => setPasswordVisible(value => !value)} className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-300 dark:border-zinc-700">{passwordVisible ? <EyeOff size={20}/> : <Eye size={20}/>}</button></div>
          <label htmlFor="current-password" className="block text-sm font-semibold">Mot de passe actuel<input id="current-password" required autoComplete="current-password" type={passwordVisible ? 'text' : 'password'} value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} className={fieldClass}/></label>
          <div className="grid gap-5 sm:grid-cols-2"><label htmlFor="new-password" className="block text-sm font-semibold">Nouveau mot de passe<input id="new-password" required minLength={12} maxLength={72} aria-describedby="password-policy" autoComplete="new-password" type={passwordVisible ? 'text' : 'password'} value={newPassword} onChange={event => setNewPassword(event.target.value)} className={fieldClass}/></label><label htmlFor="confirm-password" className="block text-sm font-semibold">Confirmer le nouveau mot de passe<input id="confirm-password" required autoComplete="new-password" type={passwordVisible ? 'text' : 'password'} value={confirmation} onChange={event => setConfirmation(event.target.value)} className={fieldClass}/></label></div>
          <p id="password-policy" className="text-sm text-zinc-600 dark:text-zinc-400">Au moins 12 caractères. Après modification, reconnectez-vous sur cet appareil.</p>
          {passwordError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{passwordError}</p>}
          <button type="submit" disabled={changingPassword} className={buttonClass}><ShieldCheck size={18} aria-hidden="true"/>{changingPassword ? 'Modification…' : 'Modifier le mot de passe'}</button>
          <Link href="/forgot-password" className="ml-0 block min-h-11 py-3 text-sm font-semibold text-emerald-800 dark:text-emerald-300">Mot de passe oublié ?</Link>
        </form>
        <section className="border-t border-zinc-200 py-6 dark:border-zinc-800" aria-labelledby="tier-title">
          <h2 id="tier-title" className="text-lg font-bold">Statut Marketplace</h2><p className="mt-3 text-sm">Votre statut : <strong>{tierLabels[profile.marketplaceTier || 'standard']}</strong></p>
          {(!profile.marketplaceTier || profile.marketplaceTier === 'standard') && <><p className="my-3 text-sm text-zinc-600 dark:text-zinc-400">Accès Pro à partir de 3 commandes ou 150 000 FCFA d’achats.</p>{profile.proRequestedAt ? <p className="text-sm">Demande en cours d’examen.</p> : <button onClick={requestPro} disabled={requestingPro || ((profile.marketplaceOrderCount || 0) < 3 && (profile.totalMarketplacePurchases || 0) < 150000)} className={buttonClass}>{requestingPro ? 'Envoi…' : 'Demander le statut Pro'}</button>}</>}
          {proError && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{proError}</p>}{proMessage && <p role="status" className="mt-3 text-sm text-emerald-800 dark:text-emerald-300">{proMessage}</p>}
        </section>
      </>}
    </div>
  </div>
}