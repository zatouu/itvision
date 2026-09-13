'use client'

import { useEffect, useState } from 'react'
import AddressFields, { type AddressFieldsValue } from './AddressFields'

export type SavedAddress = AddressFieldsValue & {
  id: string
  label: string
  fullName: string
  phone: string
  isDefault: boolean
}

const inputCls =
  'mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm outline-none ring-green-500/30 focus:ring-4 dark:border-slate-800 dark:bg-slate-900 dark:text-gray-100'

const emptyForm = {
  label: '', fullName: '', phone: '',
  region: '', department: '', neighborhood: '', street: '', additionalInfo: '',
}

type FormState = typeof emptyForm

/** Carnet d'adresses du compte — liste, ajout, édition, suppression, défaut. */
export default function AddressBook() {
  const [addresses, setAddresses] = useState<SavedAddress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/client/addresses', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setAddresses(Array.isArray(d?.addresses) ? d.addresses : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const startNew = () => {
    setForm(emptyForm)
    setEditing('new')
  }

  const startEdit = (a: SavedAddress) => {
    setForm({
      label: a.label, fullName: a.fullName, phone: a.phone.replace(/^\+221\s?/, ''),
      region: a.region, department: a.department, neighborhood: a.neighborhood,
      street: a.street, additionalInfo: a.additionalInfo || '',
    })
    setEditing(a.id)
  }

  const valid =
    form.fullName.trim() && form.phone.trim() && form.region && form.department &&
    form.neighborhood && form.street.trim()

  async function save() {
    if (!valid || saving) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        label: form.label.trim() || 'Domicile',
        fullName: form.fullName.trim(),
        phone: `+221 ${form.phone.replace(/\D/g, '')}`,
        region: form.region, department: form.department,
        neighborhood: form.neighborhood, street: form.street.trim(),
        additionalInfo: form.additionalInfo?.trim() || undefined,
      }
      const isNew = editing === 'new'
      const res = await fetch('/api/client/addresses', {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(isNew ? payload : { id: editing, ...payload }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Erreur')
      const saved = data.address as SavedAddress
      setAddresses((prev) =>
        isNew ? [saved, ...prev] : prev.map((a) => (a.id === saved.id ? saved : a))
      )
      setEditing(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    setError(null)
    const res = await fetch(`/api/client/addresses?id=${encodeURIComponent(id)}`, {
      method: 'DELETE', credentials: 'include',
    }).catch(() => null)
    if (res?.ok) setAddresses((prev) => prev.filter((a) => a.id !== id))
    else setError("Suppression impossible")
  }

  async function setDefault(id: string) {
    const res = await fetch('/api/client/addresses', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id, isDefault: true }),
    }).catch(() => null)
    if (res?.ok) {
      setAddresses((prev) =>
        [...prev]
          .map((a) => ({ ...a, isDefault: a.id === id }))
          .sort((a, b) => Number(b.isDefault) - Number(a.isDefault))
      )
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-900 dark:text-white">Mes adresses de livraison</div>
        {editing === null && (
          <button
            onClick={startNew}
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
          >
            + Ajouter
          </button>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Chargement…</p>
      ) : addresses.length === 0 && editing === null ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Aucune adresse enregistrée. Ajoutez-en une pour commander plus vite.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {addresses.map((a) => (
            <li
              key={a.id}
              className={`flex items-start gap-3 rounded-xl border p-3 ${
                a.isDefault
                  ? 'border-green-300 bg-green-50/60 dark:border-green-800 dark:bg-green-950/30'
                  : 'border-gray-200 dark:border-slate-800'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{a.label}</span>
                  {a.isDefault && (
                    <span className="rounded-full bg-green-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                      Par défaut
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-300">
                  {a.fullName} · {a.phone}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {a.street}, {a.neighborhood}, {a.department}, {a.region}
                  {a.additionalInfo ? ` · ${a.additionalInfo}` : ''}
                </p>
              </div>
              <div className="flex flex-shrink-0 gap-1.5">
                {!a.isDefault && (
                  <button
                    onClick={() => setDefault(a.id)}
                    title="Définir par défaut"
                    className="rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-semibold text-gray-600 transition hover:border-green-500 hover:text-green-700 dark:border-slate-700 dark:text-gray-300"
                  >
                    Défaut
                  </button>
                )}
                <button
                  onClick={() => startEdit(a)}
                  className="rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-semibold text-gray-600 transition hover:border-gray-400 dark:border-slate-700 dark:text-gray-300"
                >
                  Modifier
                </button>
                <button
                  onClick={() => remove(a.id)}
                  className="rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-semibold text-red-500 transition hover:border-red-400 dark:border-slate-700"
                >
                  Suppr.
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing !== null && (
        <div className="mt-4 space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-950">
          <div className="text-sm font-bold text-gray-900 dark:text-white">
            {editing === 'new' ? 'Nouvelle adresse' : 'Modifier l’adresse'}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Nom de l'adresse</label>
              <input
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Domicile, Bureau…"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Nom complet</label>
              <input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="Destinataire"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Téléphone</label>
              <div className="mt-2 flex items-center gap-1 rounded-xl border border-gray-200 bg-white pl-3 dark:border-slate-800 dark:bg-slate-900">
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">+221</span>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
                  placeholder="77 123 45 67"
                  className="w-full bg-transparent py-3 pr-4 text-sm text-gray-900 outline-none dark:text-gray-100"
                />
              </div>
            </div>
          </div>
          <AddressFields
            value={form}
            onChange={(v) => setForm({ ...form, ...v })}
          />
          <div className="flex gap-2 pt-1">
            <button
              onClick={save}
              disabled={!valid || saving}
              className="rounded-xl bg-gradient-to-r from-green-500 to-violet-500 px-4 py-2.5 text-sm font-bold text-white transition hover:from-green-600 hover:to-violet-600 disabled:opacity-50"
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button
              onClick={() => setEditing(null)}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:border-slate-700 dark:text-gray-300"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
