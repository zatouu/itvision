'use client'

import { useEffect, useState } from 'react'
import { X, FileText, Download, Pencil, Check, Loader2, MapPin, CalendarDays, Shield, Banknote, Wrench, AlertCircle } from 'lucide-react'

interface Equipment { type: string; quantity: number; location?: string }
interface Service { name?: string; description?: string; frequency?: string }

export interface DrawerContract {
  _id: string
  contractNumber?: string
  name: string
  type?: string
  status: string
  annualPrice?: number
  paymentFrequency?: string
  paymentTerms?: string
  startDate?: string
  endDate?: string
  daysUntilExpiration?: number | null
  isExpired?: boolean
  coverage?: { responseTime?: string; supportHours?: string; interventionsIncluded?: number; interventionsUsed?: number; sitesCovered?: string[] }
  services?: Service[]
  equipment?: Equipment[]
  notes?: string
  preferredTechnicians?: Array<{ _id: string; name: string; email?: string; phone?: string }>
  clientId?: any
  projectId?: any
  autoBilling?: boolean
}

const STATUS: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Brouillon', cls: 'bg-stone-100 text-stone-600' },
  active: { label: 'Actif', cls: 'bg-emerald-100 text-emerald-700' },
  suspended: { label: 'Suspendu', cls: 'bg-amber-100 text-amber-700' },
  expired: { label: 'Expiré', cls: 'bg-red-100 text-red-600' },
  cancelled: { label: 'Annulé', cls: 'bg-stone-200 text-stone-500' },
}

const FREQ: Record<string, string> = { monthly: 'Mensuel', quarterly: 'Trimestriel', annual: 'Annuel' }
const fmt = (n?: number) => typeof n === 'number' ? `${n.toLocaleString('fr-FR')} F` : '—'
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('fr-FR') : '—'

export default function ContractDetailDrawer({
  contract,
  onClose,
  onSaved,
}: {
  contract: DrawerContract | null
  onClose: () => void
  onSaved: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<any>({})

  useEffect(() => {
    setEditing(false)
    setError(null)
    if (contract) {
      setForm({
        name: contract.name || '',
        status: contract.status || 'draft',
        annualPrice: contract.annualPrice ?? 0,
        paymentFrequency: contract.paymentFrequency || 'annual',
        paymentTerms: contract.paymentTerms || '',
        startDate: contract.startDate ? String(contract.startDate).slice(0, 10) : '',
        endDate: contract.endDate ? String(contract.endDate).slice(0, 10) : '',
        notes: contract.notes || '',
        responseTime: contract.coverage?.responseTime || '24h',
        supportHours: contract.coverage?.supportHours || '',
      })
    }
  }, [contract])

  if (!contract) return null

  const client = contract.clientId || {}
  const clientName = client.company || client.name || 'Client'
  const st = STATUS[contract.status] || STATUS.draft
  const sites = [...new Set((contract.equipment || []).map(e => e.location || ''))]

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/maintenance/contracts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          contractId: contract._id,
          name: form.name,
          status: form.status,
          annualPrice: Number(form.annualPrice) || 0,
          paymentFrequency: form.paymentFrequency,
          paymentTerms: form.paymentTerms,
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
          notes: form.notes,
          coverage: { ...contract.coverage, responseTime: form.responseTime, supportHours: form.supportHours },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Enregistrement impossible')
      setEditing(false)
      onSaved()
    } catch (e: any) {
      setError(e?.message || 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

  const quickStatus = async (status: string) => {
    setSaving(true)
    try {
      await fetch('/api/maintenance/contracts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ contractId: contract._id, status }),
      })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const exportUrl = (format: 'pdf' | 'docx') =>
    `/api/maintenance/contracts/${contract._id || contract.contractNumber}/export?format=${format}`

  const Field = ({ label, value }: { label: string; value?: React.ReactNode }) => (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-stone-400">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-stone-900">{value || '—'}</p>
    </div>
  )

  const Input = ({ k, label, type = 'text' }: { k: string; label: string; type?: string }) => (
    <div>
      <label className="text-[11px] uppercase tracking-wide text-stone-400">{label}</label>
      <input
        type={type}
        value={form[k] ?? ''}
        onChange={e => set(k, e.target.value)}
        className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
      />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <aside
        className="h-full w-full max-w-2xl overflow-y-auto bg-stone-50 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-emerald-900 to-teal-800 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-300">{clientName}</p>
              <h2 className="mt-1 truncate text-xl font-bold">{contract.name}</h2>
              <p className="mt-1 text-xs text-emerald-200">#{contract.contractNumber || contract._id?.slice(-8)} · {contract.type || '—'}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${st.cls}`}>{st.label}</span>
              <button onClick={onClose} className="rounded-lg p-1.5 text-emerald-200 hover:bg-white/10" aria-label="Fermer"><X className="h-5 w-5" /></button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={exportUrl('pdf')} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25">
              <FileText className="h-3.5 w-3.5" /> PDF
            </a>
            <a href={exportUrl('docx')} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25">
              <Download className="h-3.5 w-3.5" /> Word
            </a>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-50">
                <Pencil className="h-3.5 w-3.5" /> Modifier
              </button>
            ) : (
              <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-50 disabled:opacity-50">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Enregistrer
              </button>
            )}
            {contract.status === 'draft' && (
              <button onClick={() => quickStatus('active')} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-400 disabled:opacity-50">
                Activer le contrat
              </button>
            )}
          </div>
        </div>

        <div className="space-y-5 px-6 py-6">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}

          {/* Période & finances */}
          <section className="rounded-2xl border border-stone-200 bg-white p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-stone-900">
              <CalendarDays className="h-4 w-4 text-emerald-600" /> Période & finances
            </h3>
            {editing ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input k="name" label="Nom du contrat" />
                <div>
                  <label className="text-[11px] uppercase tracking-wide text-stone-400">Statut</label>
                  <select value={form.status} onChange={e => set('status', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm">
                    {Object.entries(STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
                  </select>
                </div>
                <Input k="annualPrice" label="Prix annuel (FCFA)" type="number" />
                <div>
                  <label className="text-[11px] uppercase tracking-wide text-stone-400">Fréquence</label>
                  <select value={form.paymentFrequency} onChange={e => set('paymentFrequency', e.target.value)} className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm">
                    {Object.entries(FREQ).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <Input k="startDate" label="Début" type="date" />
                <Input k="endDate" label="Fin" type="date" />
                <div className="sm:col-span-2"><Input k="paymentTerms" label="Modalités de paiement" /></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Field label="Début" value={fmtDate(contract.startDate)} />
                <Field label="Fin" value={fmtDate(contract.endDate)} />
                <Field label="Expiration" value={contract.isExpired ? 'Expiré' : contract.daysUntilExpiration != null ? `${contract.daysUntilExpiration} j` : '—'} />
                <Field label="Prix annuel" value={<span className="text-emerald-700">{fmt(contract.annualPrice)}</span>} />
                <Field label="Fréquence" value={FREQ[contract.paymentFrequency || ''] || contract.paymentFrequency} />
                <Field label="Paiement" value={contract.paymentTerms} />
              </div>
            )}
          </section>

          {/* SLA & couverture */}
          <section className="rounded-2xl border border-stone-200 bg-white p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-stone-900">
              <Shield className="h-4 w-4 text-emerald-600" /> Couverture & SLA
            </h3>
            {editing ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input k="responseTime" label="Délai d'intervention" />
                <Input k="supportHours" label="Support" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Field label="Délai d'intervention" value={contract.coverage?.responseTime} />
                <Field label="Support" value={contract.coverage?.supportHours} />
                <Field label="Interventions" value={`${contract.coverage?.interventionsUsed || 0} / ${contract.coverage?.interventionsIncluded || '—'}`} />
                <Field label="Sites" value={contract.coverage?.sitesCovered?.join(', ') || (sites.length ? sites.join(', ') : undefined)} />
              </div>
            )}
          </section>

          {/* Équipements par site */}
          {(contract.equipment || []).length > 0 && (
            <section className="rounded-2xl border border-stone-200 bg-white p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-stone-900">
                <MapPin className="h-4 w-4 text-emerald-600" /> Équipements couverts ({contract.equipment!.length})
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100 text-left text-[11px] uppercase tracking-wide text-stone-400">
                    <th className="pb-2 font-semibold">Équipement</th>
                    <th className="pb-2 font-semibold">Site</th>
                    <th className="pb-2 text-right font-semibold">Qté</th>
                  </tr>
                </thead>
                <tbody>
                  {contract.equipment!.map((e, i) => (
                    <tr key={i} className="border-b border-stone-50 last:border-0">
                      <td className="py-2 text-stone-800">{e.type}</td>
                      <td className="py-2 text-stone-500">{e.location || '—'}</td>
                      <td className="py-2 text-right font-semibold text-stone-900">{e.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Prestations */}
          {(contract.services || []).length > 0 && (
            <section className="rounded-2xl border border-stone-200 bg-white p-5">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-stone-900">
                <Wrench className="h-4 w-4 text-emerald-600" /> Prestations incluses
              </h3>
              <ul className="space-y-2">
                {contract.services!.map((s, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-xl bg-stone-50 px-3 py-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-900">{s.name}</p>
                      <p className="text-xs text-stone-500">{[s.frequency, s.description].filter(Boolean).join(' · ')}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Techniciens attitrés */}
          {(contract.preferredTechnicians || []).length > 0 && (
            <section className="rounded-2xl border border-stone-200 bg-white p-5">
              <h3 className="mb-4 text-sm font-bold text-stone-900">Techniciens attitrés</h3>
              <div className="flex flex-wrap gap-2">
                {contract.preferredTechnicians!.map(t => (
                  <span key={t._id} className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-800">
                    {t.name}{t.phone ? ` · ${t.phone}` : ''}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Notes */}
          <section className="rounded-2xl border border-stone-200 bg-white p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-stone-900">
              <Banknote className="h-4 w-4 text-emerald-600" /> Notes & conditions
            </h3>
            {editing ? (
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={4}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm" placeholder="Conditions particulières…" />
            ) : (
              <p className="whitespace-pre-line text-sm text-stone-600">{contract.notes || 'Aucune note.'}</p>
            )}
          </section>
        </div>
      </aside>
    </div>
  )
}
