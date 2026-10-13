'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  User, Building2, Mail, Phone, MapPin, Globe, Shield,
  Loader2, AlertCircle, CheckCircle, Save, Lock, Bell, Users,
  FileText, Briefcase, StickyNote, Palette, Settings
} from 'lucide-react'
import { CARD, INPUT, TONE, PageHeader, Pill } from '@/components/portal-ui'
import TeamSection from '@/components/portal/TeamSection'
import BrandingSection from '@/components/portal/BrandingSection'
import MyNotificationsSection from '@/components/portal/MyNotificationsSection'
import { PORTAL_BRANDING_EVENT, ROLE_LABEL, type CompanyRole, type PortalBranding } from '@/lib/company-rights'

type Tab = 'account' | 'company' | 'team' | 'branding' | 'preferences'
const TABS: Tab[] = ['account', 'company', 'team', 'branding', 'preferences']

interface ProfileData {
  userName: string
  userEmail: string
  userPhone: string | null
  companyName: string
  companyEmail: string | null
  companyPhone: string | null
  companyAddress: string | null
  companyCity: string | null
  companyCountry: string | null
  companyContactPerson: string | null
  companyNotes: string | null
  companyLogo: string | null
  companyBrandColor?: string | null
  companyRole?: string
  capabilities?: string[]
  notifyMuted?: string[]
  preferences: {
    emailNotifications: boolean
    smsNotifications: boolean
    reportFormat: 'pdf' | 'web'
    language: 'fr' | 'en'
  }
  permissions: {
    canViewReports: boolean
    canRequestMaintenance: boolean
    canAccessPortal: boolean
  }
}

export default function ProfilePage() {
  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [tab, setTab] = useState<Tab>('account')

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab') as Tab
    if (TABS.includes(t)) setTab(t)
    fetch('/api/client-enterprise/me')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('Impossible de charger le profil'); setLoading(false) })
  }, [])

  const selectTab = (t: Tab) => {
    setTab(t)
    setError(''); setSuccess('')
    window.history.replaceState(null, '', `?tab=${t}`)
  }

  const handleSave = async () => {
    if (!data) return
    setSaving(true); setError(''); setSuccess('')
    try {
      // Sans droit de gestion, seuls les champs personnels sont envoyés (sinon l'API refuse tout)
      const payload = canManageCompany
        ? { ...data, companyLogo: undefined, companyBrandColor: undefined }
        : { userName: data.userName, userPhone: data.userPhone }
      const res = await fetch('/api/client-enterprise/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Erreur lors de la sauvegarde')
      if (canManageCompany) window.dispatchEvent(new CustomEvent<PortalBranding>(PORTAL_BRANDING_EVENT, { detail: { companyName: data.companyName } }))
      setSuccess('Modifications enregistrées')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e: any) {
      setError(e?.message || 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const update = (field: keyof ProfileData, value: any) => {
    setData(prev => prev ? { ...prev, [field]: value } : null)
  }

  const updatePref = (field: keyof ProfileData['preferences'], value: any) => {
    setData(prev => prev ? { ...prev, preferences: { ...prev.preferences, [field]: value } } : null)
  }

  if (loading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-stone-300" />
    </div>
  )

  if (error && !data) return (
    <div className="p-4 sm:p-6">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm text-red-700">{error}</p>
      </div>
    </div>
  )

  if (!data) return null

  // Édition de la fiche société et de la personnalisation : droit 'company:manage' accordé dans l'espace
  const canManageCompany = data.capabilities ? data.capabilities.includes('company:manage') : true
  const showSave = tab === 'account' || ((tab === 'company' || tab === 'preferences') && canManageCompany)

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      {/* Header */}
      <PageHeader
        icon={Settings}
        eyebrow={data.companyName}
        title="Paramètres"
        subtitle={`Votre compte, votre entreprise, votre équipe et l'apparence de votre espace${data.companyRole ? ` · Vous êtes ${(ROLE_LABEL[data.companyRole as CompanyRole] || data.companyRole).toLowerCase()}` : ''}`}
      >
        {showSave && (
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 self-start sm:self-auto rounded-full bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-50 transition-colors flex-shrink-0">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        )}
      </PageHeader>

      {/* Alerts */}
      {success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <p className="text-sm font-medium text-emerald-800">{success}</p>
        </div>
      )}
      {error && data && (
        <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-stone-200 overflow-x-auto">
        {[
          { id: 'account', label: 'Mon compte', icon: User },
          { id: 'company', label: 'Entreprise', icon: Building2 },
          { id: 'team', label: 'Équipe et droits', icon: Users },
          { id: 'branding', label: 'Personnalisation', icon: Palette },
          { id: 'preferences', label: 'Préférences', icon: Bell },
        ].map(t => {
          const I = t.icon
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => selectTab(t.id as Tab)} role="tab" aria-selected={active}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors ${
                active ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-stone-400 hover:text-stone-600'
              }`}>
              <I className="w-3.5 h-3.5" />{t.label}
            </button>
          )
        })}
      </div>

      {/* Account tab */}
      {tab === 'account' && (
        <div className="space-y-4">
          <div className={`${CARD} p-5 space-y-4`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-emerald-800 flex items-center justify-center text-emerald-50 font-bold text-sm">
                {data.userName?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-stone-900 truncate">{data.userName}</p>
                <p className="text-xs text-stone-400 truncate">{data.userEmail}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nom complet" icon={User} value={data.userName} onChange={v => update('userName', v)} />
              <Field label="Email" icon={Mail} value={data.userEmail} disabled />
              <Field label="Téléphone" icon={Phone} value={data.userPhone || ''} onChange={v => update('userPhone', v)} placeholder="+221 ..." />
            </div>
          </div>

          <div className={`${CARD} p-5`}>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-semibold text-stone-900">Sécurité</h3>
            </div>
            <p className="text-xs text-stone-400 mb-3">Pour changer votre mot de passe, utilisez la page de votre compte marketplace.</p>
            <Link href="/compte/profil?tab=security"
              className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 text-xs font-medium text-stone-600 hover:border-emerald-400 hover:text-emerald-800 transition-colors">
              <Lock className="w-3.5 h-3.5" />Modifier le mot de passe
            </Link>
          </div>
        </div>
      )}

      {/* Company tab */}
      {tab === 'company' && (
        <div className="space-y-4">
          <div className={`${CARD} p-5 space-y-4`}>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-semibold text-stone-900">Informations société</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nom de l'entreprise" icon={Briefcase} value={data.companyName} onChange={v => update('companyName', v)} disabled={!canManageCompany} />
              <Field label="Personne de contact" icon={User} value={data.companyContactPerson || ''} onChange={v => update('companyContactPerson', v)} disabled={!canManageCompany} />
              <Field label="Email société" icon={Mail} value={data.companyEmail || ''} onChange={v => update('companyEmail', v)} disabled={!canManageCompany} />
              <Field label="Téléphone société" icon={Phone} value={data.companyPhone || ''} onChange={v => update('companyPhone', v)} disabled={!canManageCompany} />
              <Field label="Adresse" icon={MapPin} value={data.companyAddress || ''} onChange={v => update('companyAddress', v)} disabled={!canManageCompany} className="sm:col-span-2" />
              <Field label="Ville" icon={MapPin} value={data.companyCity || ''} onChange={v => update('companyCity', v)} disabled={!canManageCompany} />
              <Field label="Pays" icon={Globe} value={data.companyCountry || ''} onChange={v => update('companyCountry', v)} disabled={!canManageCompany} />
            </div>
            {!canManageCompany && (
              <p className="text-xs text-stone-400">Modification réservée aux membres disposant du droit « Modifier la fiche de l&apos;entreprise ».</p>
            )}
          </div>

          <div className={`${CARD} p-5`}>
            <div className="flex items-center gap-2 mb-3">
              <StickyNote className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-semibold text-stone-900">Notes internes</h3>
            </div>
            <textarea
              rows={3}
              value={data.companyNotes || ''}
              onChange={e => update('companyNotes', e.target.value)}
              placeholder="Notes visibles par vous et IT Vision..."
              disabled={!canManageCompany}
              className={`${INPUT} resize-none ${!canManageCompany ? 'bg-stone-50 text-stone-400 cursor-not-allowed' : ''}`}
            />
          </div>

          <div className={`${CARD} p-5`}>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-semibold text-stone-900">Services activés par IT Vision</h3>
            </div>
            <div className="divide-y divide-stone-100">
              {[
                { key: 'canAccessPortal', label: 'Espace client en ligne' },
                { key: 'canViewReports', label: "Rapports d'intervention" },
                { key: 'canRequestMaintenance', label: "Demandes d'intervention en ligne" },
              ].map(p => {
                const on = (data.permissions as any)[p.key]
                return (
                  <div key={p.key} className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-stone-700">{p.label}</span>
                    <Pill color={on ? TONE.emerald : TONE.neutral}>{on ? 'Activé' : 'Non activé'}</Pill>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-stone-400 mt-3">Ces services dépendent de votre contrat avec IT Vision. Les droits de chaque collègue se règlent dans l&apos;onglet « Équipe et droits ».</p>
          </div>
        </div>
      )}

      {/* Team tab */}
      {tab === 'team' && <TeamSection />}

      {/* Branding tab */}
      {tab === 'branding' && (
        <BrandingSection
          companyName={data.companyName}
          logo={data.companyLogo}
          brandColor={data.companyBrandColor || null}
          canEdit={canManageCompany}
          onChange={b => setData(prev => prev ? { ...prev, ...b } as ProfileData : prev)}
        />
      )}

      {/* Preferences tab */}
      {tab === 'preferences' && (
        <div className="space-y-4">
          <MyNotificationsSection muted={data.notifyMuted || []} onChange={m => setData(prev => prev ? { ...prev, notifyMuted: m } : prev)} />
          {!canManageCompany && (
            <div className={`${CARD} p-4`}>
              <p className="text-xs text-stone-400">Les réglages ci-dessous sont communs à toute l&apos;entreprise ; ils se modifient avec le droit « Modifier la fiche de l&apos;entreprise ».</p>
            </div>
          )}
          <div className={`${CARD} p-5 space-y-4`}>
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-semibold text-stone-900">Emails et SMS de l&apos;entreprise</h3>
            </div>
            <Toggle
              label="Notifications par email"
              description="Recevoir les alertes et mises à jour par email."
              checked={data.preferences.emailNotifications}
              onChange={v => updatePref('emailNotifications', v)}
              disabled={!canManageCompany}
            />
            <Toggle
              label="Notifications par SMS"
              description="Recevoir les alertes urgentes par SMS."
              checked={data.preferences.smsNotifications}
              onChange={v => updatePref('smsNotifications', v)}
              disabled={!canManageCompany}
            />
          </div>

          <div className={`${CARD} p-5 space-y-4`}>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-semibold text-stone-900">Rapports & langue</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">Format des rapports</label>
                <select
                  value={data.preferences.reportFormat}
                  onChange={e => updatePref('reportFormat', e.target.value)}
                  disabled={!canManageCompany}
                  className={INPUT}
                >
                  <option value="web">Web (en ligne)</option>
                  <option value="pdf">PDF (téléchargeable)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1.5">Langue</label>
                <select
                  value={data.preferences.language}
                  onChange={e => updatePref('language', e.target.value)}
                  disabled={!canManageCompany}
                  className={INPUT}
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, icon: I, value, onChange, disabled, placeholder, className = '' }: {
  label: string
  icon: any
  value: string
  onChange?: (v: string) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}) {
  return (
    <div className={className}>
      <label className="flex items-center gap-1.5 text-xs font-medium text-stone-600 mb-1.5">
        <I className="w-3.5 h-3.5 text-stone-400" />{label}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange?.(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={`${INPUT} ${disabled ? 'bg-stone-50 text-stone-400 cursor-not-allowed' : ''}`}
      />
    </div>
  )
}

function Toggle({ label, description, checked, onChange, disabled }: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div>
        <p className="text-sm font-medium text-stone-900">{label}</p>
        <p className="text-xs text-stone-400 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
          checked ? 'bg-emerald-600' : 'bg-stone-200'
        }`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    </div>
  )
}
