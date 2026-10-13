'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, ClipboardCheck, Download, FileText, Loader2, ShieldCheck, TriangleAlert, X } from 'lucide-react'
import { CARD, INPUT, fmtDate } from '@/components/portal-ui'
import SignaturePad from '@/components/portal/SignaturePad'

export interface ProjectReception {
  requestedAt?: string
  warrantyMonths?: number
  signedAt?: string
  decision?: 'accepted' | 'reserves'
  reserves?: string
  signature?: string
  signatureName?: string
  signatureTitle?: string
  warrantyEnd?: string
  reservesLiftedAt?: string
}

/** Carte « Réception des travaux » de la fiche projet : à signer, signé avec ou sans réserves, garantie. */
export function ReceptionCard({ projectId, projectName, reception, canSign, autoOpen, onSigned }: {
  projectId: string
  projectName: string
  reception: ProjectReception | null
  canSign: boolean
  autoOpen?: boolean
  onSigned: () => void
}) {
  const [open, setOpen] = useState(false)
  const pending = !!reception?.requestedAt && !reception?.signedAt
  useEffect(() => { if (autoOpen && pending && canSign) setOpen(true) }, [autoOpen, pending, canSign])
  if (!reception?.requestedAt) return null

  if (pending) return (
    <section className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white"><ClipboardCheck className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-stone-900">Réception des travaux</h2>
          <p className="mt-0.5 text-sm text-stone-600">
            IT Vision a terminé l&apos;installation. Vérifiez-la sur site, puis signez le procès-verbal. La garantie de {reception.warrantyMonths || 12} mois démarre à la signature.
          </p>
          {canSign ? (
            <button onClick={() => setOpen(true)} className="mt-3 w-full sm:w-auto rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">
              Signer le PV de réception
            </button>
          ) : (
            <p className="mt-2 text-xs text-stone-500">La signature est réservée aux membres autorisés à valider les interventions (droit accordé par un administrateur de votre espace).</p>
          )}
        </div>
      </div>
      {open && <ReceptionModal projectId={projectId} projectName={projectName} warrantyMonths={reception.warrantyMonths || 12} onClose={() => setOpen(false)} onSigned={() => { setOpen(false); onSigned() }} />}
    </section>
  )

  const openReserves = reception.decision === 'reserves' && !reception.reservesLiftedAt
  return (
    <section className={`${CARD} p-4 sm:p-5`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${openReserves ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
          {openReserves ? <TriangleAlert className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-stone-900">
            {openReserves ? 'Réception avec réserves' : 'Travaux réceptionnés'}
          </h2>
          <p className="mt-0.5 text-sm text-stone-600">
            PV signé le {fmtDate(reception.signedAt)} par {reception.signatureName}
            {openReserves ? '. IT Vision traite les points signalés.' : reception.reservesLiftedAt ? `, réserves levées le ${fmtDate(reception.reservesLiftedAt)}.` : '.'}
          </p>
          {reception.warrantyEnd && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" /> Sous garantie jusqu&apos;au {fmtDate(reception.warrantyEnd)}
            </p>
          )}
          {openReserves && reception.reserves && <p className="mt-2 whitespace-pre-line rounded-xl bg-amber-50 p-3 text-xs text-amber-900">{reception.reserves}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={`/api/client-enterprise/projects/${projectId}/reception/pdf`} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
              <Download className="h-4 w-4" /> Télécharger le PV (PDF)
            </a>
            <Link href={`/portail-entreprise/projets/${projectId}/pv`} className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:border-emerald-400 hover:text-emerald-800">
              <FileText className="h-4 w-4" /> Consulter
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

function ReceptionModal({ projectId, projectName, warrantyMonths, onClose, onSigned }: {
  projectId: string; projectName: string; warrantyMonths: number; onClose: () => void; onSigned: () => void
}) {
  const [decision, setDecision] = useState<'accepted' | 'reserves'>('accepted')
  const [reserves, setReserves] = useState('')
  const [signatureName, setSignatureName] = useState('')
  const [signatureTitle, setSignatureTitle] = useState('')
  const [signature, setSignature] = useState<string | null>(null)
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [loading, onClose])

  const missing = [
    decision === 'reserves' && !reserves.trim() && 'les réserves',
    !signatureName.trim() && 'le nom du signataire',
    !signature && 'la signature',
    !consent && 'la case de confirmation',
  ].filter(Boolean) as string[]

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (missing.length) { setError(`Il manque ${missing.join(', ')}.`); return }
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/client-enterprise/projects/${projectId}/reception`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reserves, signatureName, signatureTitle, signature, consent }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Signature impossible')
      setDone(true)
    } catch (err: any) { setError(err?.message || 'Signature impossible') } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-stone-950/50 backdrop-blur-sm" onClick={() => !loading && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="reception-title" onClick={e => e.stopPropagation()}
        className="relative flex max-h-[92vh] w-full max-w-xl flex-col rounded-t-2xl sm:rounded-2xl border border-stone-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs text-stone-400">Procès-verbal de réception</p>
            <h2 id="reception-title" className="truncate font-bold tracking-tight text-stone-900">{projectName}</h2>
          </div>
          <button onClick={onClose} aria-label="Fermer" className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {done ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
              <p className="mt-3 font-semibold text-stone-900">PV signé, merci.</p>
              <p className="mt-1 text-sm text-stone-500">
                {decision === 'accepted'
                  ? `Votre installation est réceptionnée et sous garantie ${warrantyMonths} mois.`
                  : 'IT Vision a reçu vos réserves et revient vers vous pour les lever.'}
              </p>
              <button onClick={onSigned} className="mt-5 rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">Fermer</button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-stone-700">Après vérification de l&apos;installation</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: 'accepted', label: 'Sans réserve', icon: CheckCircle2, on: 'border-emerald-500 bg-emerald-50 text-emerald-800' },
                    { id: 'reserves', label: 'Avec réserves', icon: TriangleAlert, on: 'border-amber-500 bg-amber-50 text-amber-800' },
                  ] as const).map(o => (
                    <button key={o.id} type="button" onClick={() => setDecision(o.id)} aria-pressed={decision === o.id}
                      className={`flex items-center justify-center gap-2 rounded-xl border-2 p-3 text-sm font-medium transition-all ${decision === o.id ? o.on : 'border-stone-200 text-stone-500 hover:border-stone-300'}`}>
                      <o.icon className="h-4 w-4" /> {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {decision === 'reserves' && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-stone-600">Points à reprendre</label>
                  <textarea rows={4} value={reserves} onChange={e => setReserves(e.target.value)} maxLength={3000} className={`${INPUT} resize-none`}
                    placeholder="Ex. : caméra du parking mal orientée, badge de l'entrée B non programmé..." />
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input className={INPUT} placeholder="Nom et prénom du signataire" value={signatureName} onChange={e => setSignatureName(e.target.value)} autoComplete="name" />
                <input className={INPUT} placeholder="Fonction (facultatif)" value={signatureTitle} onChange={e => setSignatureTitle(e.target.value)} autoComplete="organization-title" />
              </div>
              <SignaturePad onChange={setSignature} />
              <label className="flex items-start gap-2 text-xs text-stone-600">
                <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 rounded" />
                <span>Je confirme avoir vérifié l&apos;installation et signe ce procès-verbal au nom de mon entreprise. La garantie de {warrantyMonths} mois court à partir d&apos;aujourd&apos;hui.</span>
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Signer le PV
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
