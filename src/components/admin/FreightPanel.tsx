'use client'

import { useState } from 'react'
import { Scale, Loader2, MapPin } from 'lucide-react'

const fcfa = (n: number) => `${Math.round(n || 0).toLocaleString('fr-FR')} FCFA`

type Summary = {
  estimatedCost?: number
  realCost: number
  billed: number
  unit: 'kg' | 'm3'
  amount?: number
  status?: string
  tolerance?: number
  perPiece?: number
  estimatedPerPiece?: number
  participants?: { name: string; qty: number; amount: number }[]
}

/**
 * Pesée réelle à Guangzhou (commande ou lot d'achat groupé) et avis « disponible au point de retrait ».
 * Calcul d'abord en simulation, puis validation qui prévient les clients.
 */
export default function FreightPanel({
  kind,
  id,
  measured,
  hasPickup,
  readyForPickupAt,
  onDone,
}: {
  kind: 'order' | 'group'
  id: string
  measured?: { realWeightKg?: number; realVolumeM3?: number; label?: string }
  hasPickup?: boolean
  readyForPickupAt?: string
  onDone?: () => void
}) {
  const [weight, setWeight] = useState(measured?.realWeightKg ? String(measured.realWeightKg) : '')
  const [volume, setVolume] = useState(measured?.realVolumeM3 ? String(measured.realVolumeM3) : '')
  const [preview, setPreview] = useState<Summary | null>(null)
  const [busy, setBusy] = useState<'' | 'preview' | 'save' | 'pickup'>('')
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  const call = async (body: object) => {
    const res = await fetch('/api/admin/market/freight', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const d = await res.json().catch(() => ({}))
    if (!res.ok || !d.success) throw new Error(d.error || 'Erreur')
    return d
  }

  const payload = (dryRun: boolean) => ({
    kind,
    ...(kind === 'order' ? { orderId: id } : { groupId: id }),
    weightKg: Number(weight.replace(',', '.')),
    volumeM3: volume ? Number(volume.replace(',', '.')) : undefined,
    dryRun,
  })

  const run = async (mode: 'preview' | 'save') => {
    setBusy(mode); setNotice(null)
    try {
      const d = await call(payload(mode === 'preview'))
      setPreview(d.summary)
      if (mode === 'save') {
        setNotice({ ok: true, text: kind === 'order' ? 'Pesée enregistrée, client prévenu.' : 'Pesée enregistrée, liens de paiement du transport envoyés.' })
        onDone?.()
      }
    } catch (e: any) {
      setNotice({ ok: false, text: e.message })
    } finally {
      setBusy('')
    }
  }

  const pickupReady = async () => {
    setBusy('pickup'); setNotice(null)
    try {
      const d = await call({ action: 'pickup_ready', kind, id })
      setNotice({ ok: true, text: `${d.notified} client(s) prévenu(s)${d.skipped ? `, ${d.skipped} en attente du paiement du transport` : ''}.` })
      onDone?.()
    } catch (e: any) {
      setNotice({ ok: false, text: e.message })
    } finally {
      setBusy('')
    }
  }

  const valid = Number(weight.replace(',', '.')) > 0

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-stone-900"><Scale className="h-4 w-4 text-amber-700" /> Pesée réelle à Guangzhou</h3>
      <p className="mt-0.5 text-xs text-stone-600">
        {kind === 'order'
          ? 'Le transport payé était une estimation : saisissez le poids réel du colis (et le volume si encombrant). Écart dans la tolérance : rien ne change ; au-delà, seul le dépassement est facturé ou remboursé.'
          : 'Le transport du lot est facturé au poids réel, réparti au prorata des pièces entre les participants qui ont payé.'}
      </p>
      {measured?.label && <p className="mt-1 text-xs font-semibold text-amber-800">{measured.label}</p>}
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-[1fr_1fr_auto_auto]">
        <input value={weight} onChange={e => setWeight(e.target.value)} inputMode="decimal" placeholder="Poids réel (kg)" className="rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        <input value={volume} onChange={e => setVolume(e.target.value)} inputMode="decimal" placeholder="Volume (m³, facultatif)" className="rounded-lg border border-stone-300 px-3 py-2 text-sm" />
        <button onClick={() => run('preview')} disabled={!valid || !!busy} className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-900 disabled:opacity-50">
          {busy === 'preview' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Calculer'}
        </button>
        <button onClick={() => run('save')} disabled={!valid || !preview || !!busy} className="rounded-lg bg-amber-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Valider et prévenir'}
        </button>
      </div>

      {preview && (
        <div className="mt-3 rounded-xl bg-white p-3 text-sm text-stone-800">
          <p>Base facturée : <b>{preview.billed} {preview.unit === 'm3' ? 'm³' : 'kg'}</b> · transport réel <b>{fcfa(preview.realCost)}</b></p>
          {kind === 'order' && preview.estimatedCost !== undefined && (
            <p className="mt-1">
              Payé à la commande : {fcfa(preview.estimatedCost)} ·{' '}
              {preview.amount! > 0 ? <b className="text-red-700">complément client {fcfa(preview.amount!)}</b>
                : preview.amount! < 0 ? <b className="text-emerald-700">remboursement {fcfa(-preview.amount!)}</b>
                : <b>dans la tolérance ({Math.round((preview.tolerance || 0) * 100)} %), rien à faire</b>}
            </p>
          )}
          {kind === 'group' && (
            <>
              <p className="mt-1">Par pièce : <b>{fcfa(preview.perPiece || 0)}</b>{preview.estimatedPerPiece ? ` (estimé à la création : ${fcfa(preview.estimatedPerPiece)})` : ''}</p>
              <ul className="mt-2 max-h-40 space-y-0.5 overflow-y-auto text-xs text-stone-600">
                {(preview.participants || []).map((p, i) => <li key={i}>{p.name} · {p.qty} pcs · {fcfa(p.amount)}</li>)}
              </ul>
            </>
          )}
        </div>
      )}

      {hasPickup && (
        <button onClick={pickupReady} disabled={!!busy} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-semibold text-emerald-800 disabled:opacity-50">
          {busy === 'pickup' ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
          {readyForPickupAt ? `Prévenu le ${new Date(readyForPickupAt).toLocaleDateString('fr-FR')} · relancer` : 'Prévenir : disponible au point de retrait'}
        </button>
      )}
      {notice && <p className={`mt-2 text-sm ${notice.ok ? 'text-emerald-700' : 'text-red-700'}`}>{notice.text}</p>}
    </div>
  )
}
