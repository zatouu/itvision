'use client'
import { useState, useEffect, type ChangeEvent } from 'react'
import Link from 'next/link'
import {
  User, Building2, Mail, Phone, MapPin, Globe, Shield,
  Loader2, AlertCircle, CheckCircle, Save, Lock, Bell,
  FileText, Briefcase, StickyNote, Image as ImageIcon, Upload, Trash2
} from 'lucide-react'
import { CARD, INPUT, TONE, PageHeader, Pill } from '@/components/portal-ui'

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
  const [tab, setTab] = useState<'account' | 'company' | 'preferences'>('account')
  const [uploadingLogo, setUploadingLogo] = useState(false)

  useEffect(() => {
    fetch('/api/client-enterprise/me')
      .then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError('Impossible de charger le profil'); setLoading(false) })
  }, [])

  const handleSave = async () => {
    if (!data) return
    setSaving(true); setError(''); setSuccess('')
    try {
      const res = await fetch('/api/client-enterprise/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error()
      setSuccess('Modifications enregistrées')
      setTimeout(() => setSuccess(''), 3000)
    } catch {
      setError('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const saveLogo = async (logo: string | null) => {
    const res = await fetch('/api/client-enterprise/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyLogo: logo })
    })
    if (!res.ok) throw new Error()
    setData(prev => prev ? { ...prev, companyLogo: logo } : prev)
    setSuccess('Logo mis à jour')
    setTimeout(() => setSuccess(''), 3000)
  }

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !data) return
    setUploadingLogo(true); setError(''); setSuccess('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', 'logos')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) {
        const j = await res.json().catch(() => null)
        throw new Error(j?.error || 'upload')
      }
      const j = await res.json()
      await saveLogo(j.url)
    } catch (err: any) {
      setError(err?.message && err.message !== 'upload' ? err.message : "Erreur lors de l'upload du logo")
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleLogoRemove = async () => {
    setUploadingLogo(true); setError(''); setSuccess('')
    try { await saveLogo(null) } catch { setError('Erreur lors de la suppression du logo') } finally { setUploadingLogo(false) }
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

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      {/* Header */}
      <PageHeader
        icon={User}
        eyebrow="Paramètres"
        title="Mon profil"
        subtitle="Gérez vos informations et préférences"
      >
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-full bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-50 transition-colors flex-shrink-0">
          <Save className="w-4 h-4" />
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
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
          { id: 'company', label: 'Mon entreprise', icon: Building2 },
          { id: 'preferences', label: 'Préférences', icon: Bell },
        ].map(t => {
          const I = t.icon
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id as any)}
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
          <div className={`${CARD} p-5`}>
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-semibold text-stone-900">Logo de l'entreprise</h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 flex-shrink-0 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-center overflow-hidden">
                {data.companyLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.companyLogo} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                  <Building2 className="w-6 h-6 text-stone-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <label className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${uploadingLogo ? 'bg-stone-100 text-stone-400 pointer-events-none' : 'bg-emerald-700 text-white hover:bg-emerald-800'}`}>
                    {uploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {data.companyLogo ? 'Changer le logo' : 'Choisir un logo'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                  </label>
                  {data.companyLogo && (
                    <button type="button" onClick={handleLogoRemove} disabled={uploadingLogo}
                      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
                      <Trash2 className="w-3.5 h-3.5" /> Retirer
                    </button>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-stone-400">PNG, JPG ou WebP, 10 Mo max. Affiché dans la barre latérale du portail.</p>
              </div>
            </div>
          </div>

          <div className={`${CARD} p-5 space-y-4`}>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-semibold text-stone-900">Informations société</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nom de l'entreprise" icon={Briefcase} value={data.companyName} onChange={v => update('companyName', v)} />
              <Field label="Personne de contact" icon={User} value={data.companyContactPerson || ''} onChange={v => update('companyContactPerson', v)} />
              <Field label="Email société" icon={Mail} value={data.companyEmail || ''} onChange={v => update('companyEmail', v)} />
              <Field label="Téléphone société" icon={Phone} value={data.companyPhone || ''} onChange={v => update('companyPhone', v)} />
              <Field label="Adresse" icon={MapPin} value={data.companyAddress || ''} onChange={v => update('companyAddress', v)} className="sm:col-span-2" />
              <Field label="Ville" icon={MapPin} value={data.companyCity || ''} onChange={v => update('companyCity', v)} />
              <Field label="Pays" icon={Globe} value={data.companyCountry || ''} onChange={v => update('companyCountry', v)} />
            </div>
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
              className={`${INPUT} resize-none`}
            />
          </div>

          <div className={`${CARD} p-5`}>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-semibold text-stone-900">Permissions portail</h3>
            </div>
            <div className="divide-y divide-stone-100">
              {[
                { key: 'canViewReports', label: 'Consulter les rapports' },
                { key: 'canRequestMaintenance', label: 'Demander une intervention' },
                { key: 'canAccessPortal', label: 'Accéder au portail' },
              ].map(p => {
                const on = (data.permissions as any)[p.key]
                return (
                  <div key={p.key} className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-stone-700">{p.label}</span>
                    <Pill color={on ? TONE.emerald : TONE.neutral}>{on ? 'Activé' : 'Désactivé'}</Pill>
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-stone-400 mt-3">Contactez IT Vision pour modifier vos permissions.</p>
          </div>
        </div>
      )}

      {/* Preferences tab */}
      {tab === 'preferences' && (
        <div className="space-y-4">
          <div className={`${CARD} p-5 space-y-4`}>
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-4 h-4 text-emerald-700" />
              <h3 className="text-sm font-semibold text-stone-900">Notifications</h3>
            </div>
            <Toggle
              label="Notifications par email"
              description="Recevoir les alertes et mises à jour par email."
              checked={data.preferences.emailNotifications}
              onChange={v => updatePref('emailNotifications', v)}
            />
            <Toggle
              label="Notifications par SMS"
              description="Recevoir les alertes urgentes par SMS."
              checked={data.preferences.smsNotifications}
              onChange={v => updatePref('smsNotifications', v)}
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

function Toggle({ label, description, checked, onChange }: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
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
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
          checked ? 'bg-emerald-600' : 'bg-stone-200'
        }`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    </div>
  )
}
