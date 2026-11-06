'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Scale, AlertCircle, CheckCircle2, Loader2, Clock, CreditCard, MessageSquare, FileText, X, Send } from 'lucide-react'

const decisionLabels: Record<string, string> = {
  release_escrow: 'Libérer au prestataire',
  refund: 'Rembourser le client (intégral)',
  partial_refund: 'Remboursement partiel',
  reject: 'Rejeter le litige (libérer au prestataire)',
  cancel: 'Annuler / clôturer sans effet',
  other: 'Autre',
}

const statusBadge = (status: string) => {
  switch (status) {
    case 'resolved': return 'bg-emerald-100 text-emerald-700'
    case 'under_review': return 'bg-blue-100 text-blue-700'
    case 'closed': return 'bg-stone-100 text-stone-700'
    default: return 'bg-amber-100 text-amber-700'
  }
}

export default function AdminServiceDisputeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [decision, setDecision] = useState<string>('')
  const [refundAmount, setRefundAmount] = useState<string>('')
  const [adminNote, setAdminNote] = useState<string>('')
  const [messageText, setMessageText] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  const fetchDispute = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/services/disputes/${id}`)
      if (!res.ok) throw new Error('Erreur de chargement')
      const json = await res.json()
      setData(json)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDispute() }, [id])

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!decision) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/services/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve-dispute',
          decision,
          refundAmount: decision === 'partial_refund' ? Number(refundAmount) : undefined,
          adminNote,
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Erreur lors de la résolution')
      }
      await fetchDispute()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageText.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/services/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dispute-message', text: messageText }),
      })
      if (!res.ok) throw new Error('Erreur envoi message')
      setMessageText('')
      await fetchDispute()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!data) return null

  const item = data.item || {}
  const payments = data.payments || []
  const evidence = data.evidence || []
  const messages = data.messages || []
  const auditLogs = data.auditLogs || []
  const resolved = item.disputeStatus === 'resolved' || item.disputeStatus === 'closed'

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/services/disputes" className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <Scale className="w-6 h-6 text-indigo-600" />
          <h1 className="text-2xl font-bold text-slate-800">Litige #{String(item._id).slice(-6).toUpperCase()}</h1>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadge(item.disputeStatus || 'open')}`}>
          {item.disputeStatus || 'open'}
        </span>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Mission</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-500">Catégorie</span><p className="font-medium">{item.category}</p></div>
              <div><span className="text-slate-500">Statut</span><p className="font-medium">{item.status}</p></div>
              <div className="col-span-2"><span className="text-slate-500">Description</span><p className="font-medium">{item.description || '—'}</p></div>
              <div><span className="text-slate-500">Motif litige</span><p className="font-medium">{item.disputeReason || '—'}</p></div>
              <div><span className="text-slate-500">Ouvert le</span><p className="font-medium">{item.disputeOpenedAt ? new Date(item.disputeOpenedAt).toLocaleString('fr-FR') : '—'}</p></div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Parties</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <p className="text-slate-500">Client</p>
                <p className="font-medium">{data.item.clientName || '—'}</p>
                <p className="text-slate-500">{data.item.clientPhone || '—'}</p>
              </div>
              <div>
                <p className="text-slate-500">Prestataire</p>
                <p className="font-medium">{data.item.providerName || '—'}</p>
                <p className="text-slate-500">{data.item.providerPhone || '—'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4" /> Paiements</h2>
            {payments.length === 0 ? <p className="text-slate-500 text-sm">Aucun paiement.</p> : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr><th className="px-3 py-2 text-left">Phase</th><th className="px-3 py-2 text-left">Provider</th><th className="px-3 py-2 text-right">Montant</th><th className="px-3 py-2 text-left">Statut</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p: any) => (
                    <tr key={p._id}>
                      <td className="px-3 py-2">{p.phase}</td>
                      <td className="px-3 py-2">{p.provider}</td>
                      <td className="px-3 py-2 text-right">{(p.amount || 0).toLocaleString('fr-FR')} FCFA</td>
                      <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs ${statusBadge(p.status)}`}>{p.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2"><FileText className="w-4 h-4" /> Preuves ({evidence.length})</h2>
            {evidence.length === 0 ? <p className="text-slate-500 text-sm">Aucune preuve.</p> : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {evidence.map((e: any) => (
                  <a key={e._id} href={e.url} target="_blank" rel="noopener noreferrer" className="block border border-slate-200 rounded-lg overflow-hidden hover:shadow-md">
                    {e.type === 'image' ? (
                      <img src={e.url} alt={e.title || 'preuve'} className="w-full h-32 object-cover" />
                    ) : (
                      <div className="w-full h-32 bg-slate-100 flex items-center justify-center text-slate-500 text-xs uppercase">{e.type}</div>
                    )}
                    <div className="p-2 text-xs text-slate-600 truncate">{e.title || e.description || e.type}</div>
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2"><Clock className="w-4 h-4" /> Historique</h2>
            {auditLogs.length === 0 ? <p className="text-slate-500 text-sm">Aucun audit.</p> : (
              <ul className="space-y-3 text-sm">
                {auditLogs.map((log: any) => (
                  <li key={log._id} className="flex justify-between border-b border-slate-50 pb-2">
                    <span className="font-medium">{log.action}</span>
                    <span className="text-slate-500">{new Date(log.createdAt).toLocaleString('fr-FR')}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Messages</h2>
            <div className="space-y-3 max-h-80 overflow-y-auto mb-4">
              {messages.length === 0 ? <p className="text-slate-500 text-sm">Aucun message.</p> : messages.map((m: any) => (
                <div key={m._id} className={`p-3 rounded-lg text-sm ${m.senderRole === 'admin' ? 'bg-indigo-50 ml-8' : 'bg-slate-50 mr-8'}`}>
                  <div className="flex justify-between text-xs text-slate-500 mb-1"><span>{m.senderRole}</span><span>{new Date(m.createdAt).toLocaleString('fr-FR')}</span></div>
                  <p>{m.text}</p>
                </div>
              ))}
            </div>
            {!resolved && (
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="Message admin..." className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"><Send className="w-4 h-4" /> Envoyer</button>
              </form>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 sticky top-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Résolution</h2>
            {resolved ? (
              <div className="space-y-4 text-sm">
                <div className="p-4 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Litige résolu</div>
                <p><span className="text-slate-500">Décision :</span> {decisionLabels[item.disputeDecision] || item.disputeDecision}</p>
                {item.disputeRefundAmount > 0 && <p><span className="text-slate-500">Montant remboursé :</span> {item.disputeRefundAmount.toLocaleString('fr-FR')} FCFA</p>}
                {item.disputeAdminNote && <p><span className="text-slate-500">Note admin :</span> {item.disputeAdminNote}</p>}
              </div>
            ) : (
              <form onSubmit={handleResolve} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Décision</label>
                  <select required value={decision} onChange={(e) => setDecision(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm">
                    <option value="">Choisir</option>
                    {Object.entries(decisionLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
                {decision === 'partial_refund' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Montant remboursé (FCFA)</label>
                    <input type="number" min={1} required={decision === 'partial_refund'} value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Note admin</label>
                  <textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" rows={4} />
                </div>
                <button type="submit" disabled={submitting} className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirmer la décision
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
