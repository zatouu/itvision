'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  User, Building2, Mail, Phone, MapPin, Globe, Shield,
  Loader2, AlertCircle, CheckCircle, Save, Lock, Bell,
  FileText, ChevronLeft, Briefcase, StickyNote
} from 'lucide-react'

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

  const update = (field: keyof ProfileData, value: any) => {
    setData(prev => prev ? { ...prev, [field]: value } : null)
  }

  const updatePref = (field: keyof ProfileData['preferences'], value: any) => {
    setData(prev => prev ? { ...prev, preferences: { ...prev.preferences, [field]: value } } : null)
  }

  if (loading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  )

  if (error && !data) return (
    <div className="p-6">
      <div className="rounded-xl border border-red-100 bg-red-50 dark:bg-red-900/20 p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-sm text-red-700">{error}</p>
      </div>
    </div>
  )

  if (!data) return null

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/portail-entreprise" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Mon profil</h1>
            <p className="text-sm text-gray-500">Gérez vos informations et préférences</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
          <Save className="w-4 h-4" />
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      {/* Alerts */}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-900/40 p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm font-medium text-green-700">{success}</p>
        </div>
      )}
      {error && data && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900/40 p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-100 dark:border-slate-800">
        {[
          { id: 'account', label: 'Mon compte', icon: User },
          { id: 'company', label: 'Mon entreprise', icon: Building2 },
          { id: 'preferences', label: 'Préférences', icon: Bell },
        ].map(t => {
          const I = t.icon
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-colors ${
                active ? 'border-green-500 text-green-600' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}>
              <I className="w-3.5 h-3.5" />{t.label}
            </button>
          )
        })}
      </div>

      {/* Account tab */}
      {tab === 'account' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm">
                {data.userName?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{data.userName}</p>
                <p className="text-xs text-gray-400">{data.userEmail}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nom complet" icon={User} value={data.userName} onChange={v => update('userName', v)} />
              <Field label="Email" icon={Mail} value={data.userEmail} disabled />
              <Field label="Téléphone" icon={Phone} value={data.userPhone || ''} onChange={v => update('userPhone', v)} placeholder="+221 ..." />
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Sécurité</h3>
            </div>
            <p className="text-xs text-gray-400 mb-3">Pour changer votre mot de passe, utilisez la page de votre compte marketplace.</p>
            <Link href="/compte/profil?tab=security"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 dark:border-slate-700 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
              <Lock className="w-3.5 h-3.5" />Modifier le mot de passe
            </Link>
          </div>
        </div>
      )}

      {/* Company tab */}
      {tab === 'company' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Informations société</h3>
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

          <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <StickyNote className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Notes internes</h3>
            </div>
            <textarea
              rows={3}
              value={data.companyNotes || ''}
              onChange={e => update('companyNotes', e.target.value)}
              placeholder="Notes visibles par vous et IT Vision..."
              className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
            />
          </div>

          <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Permissions portail</h3>
            </div>
            <div className="space-y-2">
              {[
                { key: 'canViewReports', label: 'Consulter les rapports' },
                { key: 'canRequestMaintenance', label: 'Demander une intervention' },
                { key: 'canAccessPortal', label: 'Accéder au portail' },
              ].map(p => (
                <div key={p.key} className="flex items-center justify-between py-1.5">
                  <span className="text-sm text-gray-700 dark:text-gray-200">{p.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    (data.permissions as any)[p.key] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {(data.permissions as any)[p.key] ? 'Activé' : 'Désactivé'}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">Contactez IT Vision pour modifier vos permissions.</p>
          </div>
        </div>
      )}

      {/* Preferences tab */}
      {tab === 'preferences' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Notifications</h3>
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

          <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">Rapports & langue</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Format des rapports</label>
                <select
                  value={data.preferences.reportFormat}
                  onChange={e => updatePref('reportFormat', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="web">Web (en ligne)</option>
                  <option value="pdf">PDF (téléchargeable)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">Langue</label>
                <select
                  value={data.preferences.language}
                  onChange={e => updatePref('language', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
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
      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
        <I className="w-3.5 h-3.5 text-gray-400" />{label}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange?.(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 ${
          disabled ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''
        }`}
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
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-green-500' : 'bg-gray-200 dark:bg-slate-700'
        }`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    </div>
  )
}
