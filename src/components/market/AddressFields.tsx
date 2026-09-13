'use client'

import { useState } from 'react'
import { SENEGAL_REGIONS } from '@/lib/senegal-address'

export type AddressFieldsValue = {
  region: string
  department: string
  neighborhood: string
  street: string
  additionalInfo?: string
}

const OTHER = '__other__'

const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400'
const fieldCls =
  'mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-white'

/**
 * Champs d'adresse Sénégal — région/département/quartier en cascade
 * (listes réelles SENEGAL_REGIONS) + rue + repère. Réutilisé au checkout
 * et dans le carnet d'adresses du profil.
 */
export default function AddressFields({
  value,
  onChange,
}: {
  value: AddressFieldsValue
  onChange: (v: AddressFieldsValue) => void
}) {
  const regions = Object.keys(SENEGAL_REGIONS)
  const departments = value.region ? Object.keys(SENEGAL_REGIONS[value.region]?.departments ?? {}) : []
  const neighborhoods =
    value.region && value.department
      ? (SENEGAL_REGIONS[value.region]?.departments[value.department]?.neighborhoods ?? [])
      : []

  // Quartier hors liste → saisie libre. Auto-détecté à l'initialisation
  // (adresse enregistrée avec un quartier non référencé).
  const [customHood, setCustomHood] = useState(
    () =>
      !!value.neighborhood &&
      !!value.region &&
      !!value.department &&
      !(SENEGAL_REGIONS[value.region]?.departments[value.department]?.neighborhoods ?? []).includes(
        value.neighborhood
      )
  )

  const set = (patch: Partial<AddressFieldsValue>) => onChange({ ...value, ...patch })

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className={labelCls}>Région</span>
          <select
            value={value.region}
            onChange={(e) => {
              setCustomHood(false)
              set({ region: e.target.value, department: '', neighborhood: '' })
            }}
            className={fieldCls}
          >
            <option value="">Choisir…</option>
            {regions.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Département</span>
          <select
            value={value.department}
            onChange={(e) => {
              setCustomHood(false)
              set({ department: e.target.value, neighborhood: '' })
            }}
            disabled={!value.region}
            className={`${fieldCls} disabled:opacity-50`}
          >
            <option value="">Choisir…</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelCls}>Quartier</span>
          {customHood ? (
            <input
              value={value.neighborhood}
              onChange={(e) => set({ neighborhood: e.target.value })}
              placeholder="Précisez le quartier"
              autoFocus
              className={fieldCls}
            />
          ) : (
            <select
              value={value.neighborhood}
              onChange={(e) => {
                if (e.target.value === OTHER) {
                  setCustomHood(true)
                  set({ neighborhood: '' })
                } else {
                  set({ neighborhood: e.target.value })
                }
              }}
              disabled={!value.department}
              className={`${fieldCls} disabled:opacity-50`}
            >
              <option value="">Choisir…</option>
              {neighborhoods.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
              <option value={OTHER}>Autre…</option>
            </select>
          )}
        </label>
      </div>
      <label className="block">
        <span className={labelCls}>Adresse (rue, N°, point de repère)</span>
        <input
          value={value.street}
          onChange={(e) => set({ street: e.target.value })}
          placeholder="Ex : Rue 10, N° 42, en face de la pharmacie"
          className={fieldCls}
        />
      </label>
      <label className="block">
        <span className={labelCls}>Instructions de livraison (optionnel)</span>
        <input
          value={value.additionalInfo ?? ''}
          onChange={(e) => set({ additionalInfo: e.target.value })}
          placeholder="Ex : Appeler à l'arrivée, 2e étage…"
          className={fieldCls}
        />
      </label>
    </div>
  )
}
