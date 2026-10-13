'use client'

import { useEffect, useRef, useState } from 'react'
import { LocateFixed, Plus, Pencil, Trash2, Star, RefreshCw, Check, X } from 'lucide-react'
import AddressFields, { type AddressFieldsValue } from './AddressFields'

export type SavedAddress = AddressFieldsValue & {
  id: string
  label: string
  fullName: string
  phone: string
  isDefault: boolean
}

const inputCls =
  'mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-emerald-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'

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
  const [attempt, setAttempt] = useState(0)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [locationConsent, setLocationConsent] = useState(false)
  const [locating, setLocating] = useState(false)
  const [suggestion, setSuggestion] = useState<AddressFieldsValue | null>(null)
  const [locationMessage, setLocationMessage] = useState('')
  const locationRequest = useRef(0)
  const locationController = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    fetch('/api/client/addresses', { credentials: 'include', signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Impossible de charger vos adresses. Veuillez réessayer.')
        const data = await response.json()
        if (!Array.isArray(data.addresses)) throw new Error('Liste des adresses indisponible.')
        if (!controller.signal.aborted) setAddresses(data.addresses)
      })
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [attempt])

  useEffect(() => () => { locationRequest.current++; locationController.current?.abort() }, [])

  function cancelLocation() {
    locationRequest.current++
    locationController.current?.abort()
    setLocating(false)
    setLocationConsent(false)
    setSuggestion(null)
    setLocationMessage('')
  }

  async function locate() {
    if (locating) return
    setError(null)
    setSuggestion(null)
    if (!window.isSecureContext || !navigator.geolocation) {
      setError('La localisation nécessite HTTPS et un navigateur compatible. Vous pouvez saisir votre adresse.')
      return
    }
    const requestId = ++locationRequest.current
    const controller = new AbortController()
    locationController.current = controller
    setLocating(true)
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }))
      if (requestId !== locationRequest.current) return
      if (!Number.isFinite(position.coords.accuracy) || position.coords.accuracy > 500) throw new Error('Position trop imprécise. Réessayez près d’une fenêtre ou saisissez votre adresse.')
      const response = await fetch('/api/client/address-from-position', {
        method: 'POST', credentials: 'include', signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      })
      const data = await response.json()
      if (!response.ok || !data.address) throw new Error(data.error || 'Aucune adresse trouvée à cette position.')
      if (requestId !== locationRequest.current) return
      setSuggestion(data.address)
      setLocationMessage(`Précision estimée : ${Math.ceil(position.coords.accuracy)} m. Vérifiez et complétez cette proposition.`)
    } catch (failure) {
      if (requestId !== locationRequest.current) return
      const code = (failure as GeolocationPositionError)?.code
      setError(code === 1 ? 'Localisation refusée. Vous pouvez l’autoriser dans le navigateur ou saisir votre adresse.' : code === 3 ? 'La recherche de position a expiré. Réessayez ou saisissez votre adresse.' : code === 2 ? 'Position indisponible. Vérifiez votre GPS ou saisissez votre adresse.' : failure instanceof Error ? failure.message : 'Localisation indisponible.')
    } finally {
      if (requestId === locationRequest.current) setLocating(false)
    }
  }

  const startNew = () => {
    cancelLocation()
    setError(null)
    setForm(emptyForm)
    setEditing('new')
  }

  const startEdit = (a: SavedAddress) => {
    cancelLocation()
    setError(null)
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
      setAddresses((prev) => (isNew ? [saved, ...prev] : prev.map(address => address.id === saved.id ? saved : address))
        .map(address => saved.isDefault && address.id !== saved.id ? { ...address, isDefault: false } : address))
      cancelLocation()
      setEditing(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    setError(null)
    setBusyId(id)
    const res = await fetch(`/api/client/addresses?id=${encodeURIComponent(id)}`, {
      method: 'DELETE', credentials: 'include',
    }).catch(() => null)
    if (res?.ok) {
      setDeleting(null)
      setAttempt(value => value + 1)
    }
    else setError("Suppression impossible")
    setBusyId(null)
  }

  async function setDefault(id: string) {
    setError(null)
    setBusyId(id)
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
    else setError('Impossible de modifier l’adresse par défaut. Réessayez.')
    setBusyId(null)
  }

  return (
    <section id="adresses" aria-labelledby="addresses-title" className="scroll-mt-40 border-t border-zinc-200 py-6 dark:border-zinc-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="addresses-title" className="text-lg font-bold text-zinc-900 dark:text-white">Adresses de livraison</h2>
        {editing === null && !loading && (
          <button
            onClick={startNew}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            <Plus size={18} aria-hidden="true"/>Ajouter
          </button>
        )}
      </div>

      {error && <div role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300"><p>{error}</p>{editing === null && <button onClick={() => setAttempt(value => value + 1)} className="mt-2 inline-flex min-h-11 items-center gap-2 font-semibold"><RefreshCw size={16} aria-hidden="true"/>Réessayer</button>}</div>}

      {loading ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Chargement…</p>
      ) : !error && addresses.length === 0 && editing === null ? (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Aucune adresse enregistrée. Ajoutez-en une pour commander plus vite.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {addresses.map((a) => (
            <li
              key={a.id}
              className={`flex min-w-0 flex-col gap-3 rounded-lg border p-4 ${
                a.isDefault
                  ? 'border-green-300 bg-green-50/60 dark:border-green-800 dark:bg-green-950/30'
                  : 'border-gray-200 dark:border-slate-800'
              }`}
            >
              <div className="min-w-0 flex-1 break-words">
                <div className="flex flex-wrap items-center gap-2">
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
              <div className="flex flex-wrap gap-2">
                {!a.isDefault && (
                  <button
                    onClick={() => setDefault(a.id)}
                    disabled={busyId !== null || saving}
                    title="Définir par défaut"
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-zinc-300 px-3 text-sm dark:border-zinc-700 disabled:opacity-50"
                  >
                    <Star size={16} aria-hidden="true"/>Par défaut
                  </button>
                )}
                <button
                  onClick={() => startEdit(a)}
                  disabled={busyId !== null || saving}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-zinc-300 px-3 text-sm dark:border-zinc-700 disabled:opacity-50"
                >
                  <Pencil size={16} aria-hidden="true"/>Modifier
                </button>
                <button
                  onClick={() => setDeleting(a.id)}
                  disabled={busyId !== null || saving}
                  aria-label={`Supprimer l’adresse ${a.label}`}
                  title="Supprimer l’adresse"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-300 text-red-700 dark:border-zinc-700 dark:text-red-300 disabled:opacity-50"
                >
                  <Trash2 size={18} aria-hidden="true"/>
                </button>
              </div>
              {deleting === a.id && <div role="alert" className="text-sm"><p>Supprimer cette adresse ?</p><div className="mt-2 flex flex-wrap gap-3"><button disabled={busyId !== null} onClick={() => remove(a.id)} className="min-h-11 font-semibold text-red-700 dark:text-red-300">Confirmer la suppression</button><button disabled={busyId !== null} onClick={() => setDeleting(null)} className="min-h-11">Annuler</button></div></div>}
            </li>
          ))}
        </ul>
      )}

      {editing !== null && (
        <form onSubmit={event => { event.preventDefault(); void save() }} className="mt-5 space-y-4 border-t border-zinc-200 pt-5 dark:border-zinc-800">
          <div className="text-sm font-bold text-gray-900 dark:text-white">
            {editing === 'new' ? 'Nouvelle adresse' : 'Modifier l’adresse'}
          </div>
          <button type="button" onClick={() => setLocationConsent(true)} disabled={saving || locating} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-emerald-700 px-3 text-sm font-semibold text-emerald-800 dark:text-emerald-300"><LocateFixed size={18} aria-hidden="true"/>{locating ? 'Recherche de position…' : 'Utiliser ma position'}</button>
          {locationConsent && !suggestion && <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-300"><p>Avec votre accord, vos coordonnées sont transmises au service de géocodage OpenStreetMap pour proposer une adresse. Elles ne sont pas enregistrées dans votre compte.</p><div className="flex flex-wrap gap-3"><button type="button" disabled={locating} onClick={locate} className="min-h-11 font-semibold text-emerald-800 dark:text-emerald-300">Autoriser et localiser</button><button type="button" onClick={cancelLocation} className="min-h-11">Annuler la localisation</button></div></div>}
          {suggestion && <div role="status" className="space-y-3 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100"><p>{locationMessage}</p><p className="break-words font-semibold">{[suggestion.street, suggestion.neighborhood, suggestion.department, suggestion.region].filter(Boolean).join(', ') || 'Adresse partielle : complétez les champs.'}</p><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="inline-block underline">© OpenStreetMap contributors</a><div className="flex flex-wrap gap-3"><button type="button" onClick={() => { setForm(previous => ({ ...previous, ...suggestion })); cancelLocation() }} className="inline-flex min-h-11 items-center gap-2 font-semibold"><Check size={16} aria-hidden="true"/>Utiliser cette adresse</button><button type="button" onClick={cancelLocation} className="inline-flex min-h-11 items-center gap-2"><X size={16} aria-hidden="true"/>Ignorer</button></div></div>}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="address-label" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Nom de l'adresse</label>
              <input
                id="address-label" maxLength={60}
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="Domicile, Bureau…"
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="address-full-name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Nom complet</label>
              <input
                id="address-full-name" required maxLength={120} autoComplete="shipping name"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="Destinataire"
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="address-phone" className="block text-sm font-semibold text-gray-700 dark:text-gray-300">Téléphone du destinataire</label>
              <div className="mt-2 flex items-center gap-1 rounded-xl border border-gray-200 bg-white pl-3 dark:border-slate-800 dark:bg-slate-900">
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">+221</span>
                <input
                  id="address-phone" required pattern="[0-9]{9}" maxLength={9}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
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
              type="submit"
              disabled={!valid || saving || locating}
              className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button
              type="button" disabled={saving}
              onClick={() => { cancelLocation(); setEditing(null); setError(null) }}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:border-slate-700 dark:text-gray-300"
            >
              Annuler
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
