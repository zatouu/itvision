'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'

export default function ApprovalDecision({ token, preferred }: { token: string; preferred: 'approve' | 'reject' }) {
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)
  const [done, setDone] = useState<{ ok: boolean; text: string } | null>(null)

  const decide = async (decision: 'approve' | 'reject') => {
    setBusy(decision)
    try {
      const res = await fetch(`/api/approvals/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      })
      const data = await res.json().catch(() => ({}))
      setDone(res.ok ? { ok: true, text: data.message || 'Décision enregistrée.' } : { ok: false, text: data.error || 'Action impossible.' })
    } catch {
      setDone({ ok: false, text: 'Réseau indisponible, réessayez.' })
    } finally {
      setBusy(null)
    }
  }

  if (done) {
    return (
      <div className={`mt-5 flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${done.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
        {done.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
        <p>{done.text}</p>
      </div>
    )
  }

  return (
    <div className="mt-5 flex flex-col gap-2 sm:flex-row">
      <button type="button" onClick={() => decide('approve')} disabled={!!busy}
        className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-60 ${preferred === 'approve' ? 'bg-emerald-600 ring-2 ring-emerald-300 hover:bg-emerald-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
        {busy === 'approve' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Confirmer la validation
      </button>
      <button type="button" onClick={() => decide('reject')} disabled={!!busy}
        className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold disabled:opacity-60 ${preferred === 'reject' ? 'border-red-300 bg-red-50 text-red-700 ring-2 ring-red-200' : 'border-stone-200 bg-white text-red-700 hover:bg-red-50'}`}>
        {busy === 'reject' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}Refuser
      </button>
    </div>
  )
}
