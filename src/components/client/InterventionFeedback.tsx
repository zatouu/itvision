'use client'

import { useState } from 'react'
import { Star, PenLine, AlertTriangle, CheckCircle } from 'lucide-react'

interface Props {
  interventionId: string
  existingFeedback?: { rating?: number; comment?: string }
  hasSignature?: boolean
}

export default function InterventionFeedback({ interventionId, existingFeedback, hasSignature }: Props) {
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [signatureOpen, setSignatureOpen] = useState(false)
  const [rating, setRating] = useState(existingFeedback?.rating || 0)
  const [comment, setComment] = useState(existingFeedback?.comment || '')
  const [name, setName] = useState('')
  const [signature, setSignature] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(''); setSuccess('')
    try {
      const res = await fetch(`/api/client-enterprise/interventions/${interventionId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess('Merci pour votre retour !')
      setTimeout(() => { setFeedbackOpen(false); setSuccess('') }, 1500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const submitAcknowledge = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError(''); setSuccess('')
    try {
      const res = await fetch(`/api/client-enterprise/interventions/${interventionId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature, name })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuccess('Accusé de réception enregistré.')
      setTimeout(() => { setSignatureOpen(false); setSuccess(''); window.location.reload() }, 1500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      {!existingFeedback?.rating && (
        <button
          onClick={() => setFeedbackOpen(true)}
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors"
        >
          <Star className="w-3.5 h-3.5" /> Noter
        </button>
      )}
      {!hasSignature && (
        <button
          onClick={() => setSignatureOpen(true)}
          className="inline-flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 bg-green-50 px-2.5 py-1.5 rounded-lg transition-colors"
        >
          <PenLine className="w-3.5 h-3.5" /> Signer
        </button>
      )}

      {feedbackOpen && (
        <Modal title="Votre avis" onClose={() => setFeedbackOpen(false)}>
          <form onSubmit={submitFeedback} className="space-y-4">
            {error && <div className="text-red-600 text-sm flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> {error}</div>}
            {success && <div className="text-green-600 text-sm flex items-center gap-1"><CheckCircle className="w-4 h-4" /> {success}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note (1 à 5)</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} type="button" onClick={() => setRating(n)} className="p-1">
                    <Star className={`w-6 h-6 ${n <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire</label>
              <textarea rows={3} value={comment} onChange={e => setComment(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <button type="submit" disabled={loading || rating === 0}
              className="w-full rounded-lg bg-blue-600 text-white text-sm font-medium py-2 hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Envoi...' : 'Envoyer'}
            </button>
          </form>
        </Modal>
      )}

      {signatureOpen && (
        <Modal title="Accusé de réception" onClose={() => setSignatureOpen(false)}>
          <form onSubmit={submitAcknowledge} className="space-y-4">
            {error && <div className="text-red-600 text-sm flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> {error}</div>}
            {success && <div className="text-green-600 text-sm flex items-center gap-1"><CheckCircle className="w-4 h-4" /> {success}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Votre nom *</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Signature (texte ou base64) *</label>
              <textarea rows={3} value={signature} onChange={e => setSignature(e.target.value)} required
                placeholder="Dessinez ou saisissez votre signature"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <button type="submit" disabled={loading || !signature || !name}
              className="w-full rounded-lg bg-green-600 text-white text-sm font-medium py-2 hover:bg-green-700 disabled:opacity-50">
              {loading ? 'Envoi...' : 'Valider'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
