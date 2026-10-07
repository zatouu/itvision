'use client'

import { useState, type ChangeEvent } from 'react'
import { Palette, Upload, Trash2, Loader2, Check, Building2, LayoutDashboard, Receipt, Wrench, RotateCcw } from 'lucide-react'
import { CARD, BTN_PRIMARY } from '@/components/portal-ui'
import { BRAND_PRESETS, PORTAL_BRANDING_EVENT, brandThemeStyle, sanitizeBrandColor, type PortalBranding } from '@/lib/company-rights'

const DEFAULT_COLOR = '#059669'

function emitBranding(detail: PortalBranding) {
  window.dispatchEvent(new CustomEvent<PortalBranding>(PORTAL_BRANDING_EVENT, { detail }))
}

/** Aperçu miniature du portail avec la couleur et le logo choisis. */
function Preview({ color, logo, companyName }: { color: string; logo: string | null; companyName: string }) {
  const initials = companyName.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'IV'
  return (
    <div className="rounded-xl border border-stone-200 overflow-hidden flex h-44 text-[10px]" style={brandThemeStyle(color) as React.CSSProperties} aria-hidden>
      <div className="w-32 bg-emerald-950 text-emerald-50 p-2.5 space-y-2">
        <div className="flex items-center gap-1.5">
          {logo
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={logo} alt="" className="w-6 h-6 rounded bg-white object-contain p-0.5" />
            : <span className="w-6 h-6 rounded bg-emerald-400 text-emerald-950 font-black flex items-center justify-center">{initials}</span>}
          <span className="font-bold truncate">{companyName}</span>
        </div>
        {[{ i: LayoutDashboard, l: 'Tableau de bord', a: true }, { i: Receipt, l: 'Devis & Factures' }, { i: Wrench, l: 'Interventions' }].map(n => (
          <div key={n.l} className={`flex items-center gap-1.5 rounded px-1.5 py-1 ${n.a ? 'bg-white/10 text-white' : 'text-emerald-200/60'}`}>
            <n.i className="w-3 h-3" />{n.l}
          </div>
        ))}
      </div>
      <div className="flex-1 bg-stone-50 p-3 space-y-2">
        <div className="h-2 w-24 rounded bg-stone-200" />
        <div className="rounded-lg bg-white border border-stone-200 p-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-stone-700">Devis DEV-2026-0012</span>
            <span className="rounded-full bg-emerald-50 text-emerald-700 px-1.5 py-0.5">Accepté</span>
          </div>
          <div className="h-1.5 w-full rounded bg-stone-100"><div className="h-1.5 w-2/3 rounded bg-emerald-600" /></div>
        </div>
        <span className="inline-block rounded-full bg-emerald-800 text-white px-2.5 py-1 font-semibold">Bouton principal</span>
        <span className="ml-1.5 text-emerald-700 font-semibold">Lien</span>
      </div>
    </div>
  )
}

export default function BrandingSection({ companyName, logo, brandColor, canEdit, onChange }: {
  companyName: string
  logo: string | null
  brandColor: string | null
  canEdit: boolean
  onChange: (b: { companyLogo?: string | null; companyBrandColor?: string | null }) => void
}) {
  const [color, setColor] = useState(sanitizeBrandColor(brandColor) || DEFAULT_COLOR)
  const [hexInput, setHexInput] = useState(color)
  const [savingColor, setSavingColor] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const savedColor = sanitizeBrandColor(brandColor) || DEFAULT_COLOR

  const put = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/client-enterprise/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(d.error || 'Enregistrement refusé')
  }

  const pick = (c: string) => {
    setColor(c)
    setHexInput(c)
    setMessage(null)
  }

  const saveColor = async (value: string | null) => {
    setSavingColor(true); setMessage(null)
    try {
      await put({ companyBrandColor: value })
      onChange({ companyBrandColor: value })
      emitBranding({ brandColor: value })
      if (!value) pick(DEFAULT_COLOR)
      setMessage({ ok: true, text: value ? "Couleur appliquée à l'espace de toute l'équipe." : 'Couleurs IT Vision rétablies.' })
    } catch (e: any) {
      setMessage({ ok: false, text: e.message })
    } finally {
      setSavingColor(false)
    }
  }

  const uploadLogo = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return setMessage({ ok: false, text: 'Format accepté : PNG, JPG ou WebP.' })
    if (file.size > 2 * 1024 * 1024) return setMessage({ ok: false, text: 'Logo trop lourd (2 Mo maximum).' })
    setUploading(true); setMessage(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', 'logos')
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || "Échec de l'envoi du logo")
      await put({ companyLogo: j.url })
      onChange({ companyLogo: j.url })
      emitBranding({ companyLogo: j.url })
      setMessage({ ok: true, text: 'Logo mis à jour.' })
    } catch (err: any) {
      setMessage({ ok: false, text: err.message })
    } finally {
      setUploading(false)
    }
  }

  const removeLogo = async () => {
    setUploading(true); setMessage(null)
    try {
      await put({ companyLogo: null })
      onChange({ companyLogo: null })
      emitBranding({ companyLogo: null })
      setMessage({ ok: true, text: 'Logo retiré.' })
    } catch (err: any) {
      setMessage({ ok: false, text: err.message })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      {!canEdit && (
        <p className={`${CARD} p-4 text-xs text-stone-500`}>La personnalisation est gérée par les membres disposant du droit « Modifier la fiche de l&apos;entreprise et la personnalisation ».</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,320px)] gap-4">
        <div className="space-y-4">
          <div className={`${CARD} p-5`}>
            <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-2 mb-3"><Building2 className="w-4 h-4 text-emerald-700" />Logo</h3>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 flex-shrink-0 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-center overflow-hidden">
                {logo
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={logo} alt="Logo de l'entreprise" className="h-full w-full object-contain" />
                  : <Building2 className="w-6 h-6 text-stone-300" />}
              </div>
              <div className="min-w-0">
                {canEdit && (
                  <div className="flex flex-wrap items-center gap-2">
                    <label className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold cursor-pointer transition-colors ${uploading ? 'bg-stone-100 text-stone-400 pointer-events-none' : 'bg-emerald-800 text-white hover:bg-emerald-900'}`}>
                      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {logo ? 'Changer le logo' : 'Ajouter un logo'}
                      <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={uploadLogo} disabled={uploading} />
                    </label>
                    {logo && (
                      <button type="button" onClick={removeLogo} disabled={uploading}
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
                        <Trash2 className="w-3.5 h-3.5" />Retirer
                      </button>
                    )}
                  </div>
                )}
                <p className="mt-1.5 text-xs text-stone-400">Format carré ou horizontal sur fond clair, PNG transparent idéal. 2 Mo maximum. Affiché en haut de la navigation pour toute l&apos;équipe.</p>
              </div>
            </div>
          </div>

          <div className={`${CARD} p-5`}>
            <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-2 mb-1"><Palette className="w-4 h-4 text-emerald-700" />Couleur de l&apos;espace</h3>
            <p className="text-xs text-stone-500 mb-4">Utilisée pour la navigation, les boutons et les éléments actifs. Les nuances sont calculées automatiquement pour rester lisibles.</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Couleurs proposées">
              {BRAND_PRESETS.map(p => (
                <button key={p.color} type="button" role="radio" aria-checked={color === p.color} aria-label={p.label} title={p.label}
                  disabled={!canEdit} onClick={() => pick(p.color)}
                  className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-transform disabled:cursor-not-allowed ${color === p.color ? 'border-stone-900 scale-110' : 'border-white shadow ring-1 ring-stone-200 hover:scale-105'}`}
                  style={{ backgroundColor: p.color }}>
                  {color === p.color && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-stone-600">
                Couleur sur mesure
                <input type="color" value={color} disabled={!canEdit} onChange={e => pick(e.target.value)}
                  className="h-9 w-12 rounded border border-stone-200 bg-white p-0.5 cursor-pointer disabled:cursor-not-allowed" />
              </label>
              <input value={hexInput} disabled={!canEdit} aria-label="Code couleur hexadécimal" maxLength={7}
                onChange={e => { setHexInput(e.target.value); const c = sanitizeBrandColor(e.target.value); if (c) setColor(c) }}
                className="w-28 rounded-lg border border-stone-200 px-3 py-2 text-sm font-mono uppercase" />
            </div>
            {canEdit && (
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => saveColor(color)} disabled={savingColor || color === savedColor && !!brandColor} className={BTN_PRIMARY}>
                  {savingColor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Appliquer à l&apos;espace
                </button>
                {brandColor && (
                  <button type="button" onClick={() => saveColor(null)} disabled={savingColor}
                    className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-50">
                    <RotateCcw className="w-4 h-4" />Couleurs IT Vision
                  </button>
                )}
              </div>
            )}
          </div>
          {message && (
            <p role="status" className={`text-sm rounded-xl border px-4 py-3 ${message.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>{message.text}</p>
          )}
        </div>

        <div className="lg:sticky lg:top-4 self-start">
          <p className="text-xs font-medium text-stone-500 mb-2">Aperçu</p>
          <Preview color={color} logo={logo} companyName={companyName} />
          {color !== savedColor && <p className="mt-2 text-xs text-amber-700">Aperçu non enregistré : cliquez sur « Appliquer à l&apos;espace ».</p>}
        </div>
      </div>
    </div>
  )
}
