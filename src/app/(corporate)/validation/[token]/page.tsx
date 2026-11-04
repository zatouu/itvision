import type { Metadata } from 'next'
import { connectMongoose } from '@/lib/mongoose'
import WorkflowApproval from '@/lib/models/WorkflowApproval'
import ApprovalDecision from './ApprovalDecision'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Validation', robots: { index: false, follow: false } }

const STATUS_LABEL: Record<string, string> = {
  approved: 'Déjà validé',
  rejected: 'Déjà refusé',
  failed: 'Échec lors de l’exécution',
  expired: 'Lien expiré',
}

export default async function ValidationPage({ params, searchParams }: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ d?: string }>
}) {
  const { token } = await params
  const { d } = await searchParams
  await connectMongoose()
  const a = /^[a-f0-9]{48}$/.test(token) ? await WorkflowApproval.findOne({ token }).lean() as any : null

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-10">
      <div className="mx-auto max-w-lg overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="bg-emerald-900 px-5 py-4 text-xs font-semibold tracking-wider text-emerald-100">VALIDATION · IT VISION</div>
        {!a ? (
          <p className="p-6 text-sm text-stone-600">Ce lien de validation est invalide.</p>
        ) : (
          <div className="p-5 sm:p-6">
            <h1 className="text-lg font-bold text-stone-900">{a.title}</h1>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-stone-600">{a.summary}</p>
            {a.lines?.length > 0 && (
              <dl className="mt-4 divide-y divide-stone-100 rounded-xl border border-stone-200 text-sm">
                {a.lines.map((l: any, i: number) => (
                  <div key={i} className="flex items-start justify-between gap-3 px-3 py-2">
                    <dt className="text-stone-600">{l.label}</dt>
                    <dd className="text-right font-semibold text-stone-900">{l.value}</dd>
                  </div>
                ))}
              </dl>
            )}
            {a.status === 'pending' && new Date(a.expiresAt) > new Date() ? (
              <ApprovalDecision token={token} preferred={d === 'reject' ? 'reject' : 'approve'} />
            ) : (
              <div className={`mt-5 rounded-xl px-4 py-3 text-sm ${a.status === 'approved' ? 'bg-emerald-50 text-emerald-800' : a.status === 'failed' ? 'bg-red-50 text-red-700' : 'bg-stone-100 text-stone-700'}`}>
                <p className="font-semibold">{STATUS_LABEL[a.status] || STATUS_LABEL.expired}</p>
                {(a.result || a.error) && <p className="mt-1">{a.result || a.error}</p>}
              </div>
            )}
            {a.projectId && (
              <a href={`/admin/projects/${a.projectId}`} className="mt-4 inline-block text-sm font-medium text-emerald-700 hover:underline">Ouvrir le projet dans l’admin →</a>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
