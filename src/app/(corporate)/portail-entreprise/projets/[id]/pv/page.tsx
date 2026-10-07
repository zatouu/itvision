'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Download, Loader2, Printer } from 'lucide-react'
import { BackLink, fmtDate } from '@/components/portal-ui'
import { CORPORATE_BRAND } from '@/lib/branding'

const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  #pv-doc, #pv-doc * { visibility: visible !important; }
  #pv-doc { position: absolute; inset: 0 auto auto 0; width: 100%; border: 0 !important; box-shadow: none !important; }
}`

/** Procès-verbal de réception imprimable (ou enregistrable en PDF depuis le navigateur). */
export default function ReceptionPvPage() {
  const { id } = useParams() as { id: string }
  const [project, setProject] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/client-enterprise/projects/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setProject(d.project))
      .catch(() => setError('PV introuvable'))
  }, [id])

  if (error) return <p className="p-6 text-sm text-stone-500">{error}</p>
  if (!project) return <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-stone-300" /></div>
  const r = project.reception
  if (!r?.signedAt) return <p className="p-6 text-sm text-stone-500">Le PV de réception n&apos;est pas encore signé.</p>

  const company = project.clientSnapshot?.company || project.clientSnapshot?.contact || ''
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:py-10">
      <style>{PRINT_CSS}</style>
      <div className="mb-4 flex items-center justify-between gap-3">
        <BackLink subtle href={`/portail-entreprise/projets/${id}`} label="Projet" />
        <div className="flex gap-2">
          <a href={`/api/client-enterprise/projects/${id}/reception/pdf`} className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
            <Download className="h-4 w-4" /> PDF
          </a>
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">
            <Printer className="h-4 w-4" /> Imprimer
          </button>
        </div>
      </div>

      <article id="pv-doc" className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-800 shadow-sm sm:p-10">
        <header className="flex items-start justify-between gap-4 border-b border-stone-200 pb-4">
          <div>
            <p className="text-lg font-bold text-stone-900">{CORPORATE_BRAND.name}</p>
            <p className="text-xs text-stone-500">{CORPORATE_BRAND.contactEmail}</p>
          </div>
          <div className="text-right">
            <p className="text-base font-bold uppercase tracking-wide text-stone-900">Procès-verbal de réception</p>
            <p className="text-xs text-stone-500">Signé le {new Date(r.signedAt).toLocaleString('fr-FR')}</p>
          </div>
        </header>

        <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Client</p>
            <p className="font-medium">{company || '—'}</p>
            {project.site?.address || project.address ? <p className="text-stone-600">{project.site?.address || project.address}</p> : null}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Projet</p>
            <p className="font-medium">{project.name}</p>
            <p className="text-stone-600">Travaux du {fmtDate(project.startDate)}{project.endDate ? ` au ${fmtDate(project.endDate)}` : ''}</p>
          </div>
        </section>

        <section className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Décision</p>
          <p className="mt-1 font-semibold">
            {r.decision === 'accepted' ? 'Réception prononcée sans réserve.' : 'Réception prononcée avec les réserves suivantes :'}
          </p>
          {r.decision === 'reserves' && <p className="mt-2 whitespace-pre-line rounded-lg border border-stone-200 p-3">{r.reserves}</p>}
          {r.reservesLiftedAt && <p className="mt-2 text-stone-600">Réserves levées le {fmtDate(r.reservesLiftedAt)}.</p>}
          {r.warrantyEnd && <p className="mt-3">Garantie de {r.warrantyMonths || 12} mois, jusqu&apos;au <strong>{fmtDate(r.warrantyEnd)}</strong>.</p>}
        </section>

        {(project.products || []).length > 0 && (
          <section className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Équipements installés</p>
            <table className="mt-2 w-full text-left text-xs">
              <thead><tr className="border-b border-stone-200 text-stone-500"><th className="py-1.5">Désignation</th><th className="py-1.5 text-right">Qté</th></tr></thead>
              <tbody>
                {project.products.map((p: any, i: number) => (
                  <tr key={i} className="border-b border-stone-100"><td className="py-1.5">{[p.name, p.brand, p.model].filter(Boolean).join(' · ')}</td><td className="py-1.5 text-right tabular-nums">{p.quantity}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Pour le client</p>
            <p className="mt-1 font-medium">{r.signatureName}{r.signatureTitle ? `, ${r.signatureTitle}` : ''}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {r.signature && <img src={r.signature} alt="Signature du client" className="mt-2 h-24 w-auto max-w-full object-contain" />}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Pour {CORPORATE_BRAND.name}</p>
            <p className="mt-1 text-stone-600">Réception demandée le {fmtDate(r.requestedAt)}</p>
          </div>
        </section>

        <footer className="mt-10 border-t border-stone-200 pt-3 text-[11px] text-stone-400">
          Document signé électroniquement depuis l&apos;espace client {CORPORATE_BRAND.name}. Horodatage et identité du signataire conservés.
        </footer>
      </article>
    </div>
  )
}
