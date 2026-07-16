'use client'

import { useEffect, useState, useCallback } from 'react'
import { MessageCircle, Send, User, Mail, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'

interface QnAItem {
  id: string
  question: string
  askedByName: string
  answer?: string
  answeredBy?: string
  answeredAt?: string
  createdAt: string
  helpful: number
}

interface Props {
  productId: string
}

export default function ProductQnA({ productId }: Props) {
  const [questions, setQuestions] = useState<QnAItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formQuestion, setFormQuestion] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/reviews/questions?productId=${encodeURIComponent(productId)}&limit=20`)
      const data = await res.json()
      if (data.success) setQuestions(data.questions || [])
    } catch (e) {
      console.error('Erreur chargement Q&A:', e)
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    fetchQuestions()
  }, [fetchQuestions])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!formName.trim() || !formQuestion.trim() || formQuestion.trim().length < 5) {
      setError('Nom et question requis (min 5 caractères).')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/reviews/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          question: formQuestion.trim(),
          askedByName: formName.trim(),
          askedByEmail: formEmail.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSuccess(true)
        setFormName('')
        setFormEmail('')
        setFormQuestion('')
        fetchQuestions()
      } else {
        setError(data.error || 'Erreur lors de l\'envoi.')
      }
    } catch {
      setError('Erreur réseau.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Questions & réponses</h3>
        <button
          onClick={() => setShowForm(s => !s)}
          className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          {showForm ? 'Annuler' : 'Poser une question'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3 border border-slate-100 dark:border-slate-700">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nom</label>
              <div className="relative">
                <User className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Votre nom"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Email (optionnel)</label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Pour être notifié de la réponse"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Question</label>
            <textarea
              required
              minLength={5}
              value={formQuestion}
              onChange={e => setFormQuestion(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
              placeholder="Quelle est la garantie ? Y a-t-il d'autres couleurs ?"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          {success && <p className="text-xs text-emerald-600">Merci, votre question est soumise à modération.</p>}
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition"
          >
            {submitting ? 'Envoi...' : <><Send className="w-4 h-4" /> Envoyer</>}
          </button>
        </form>
      )}

      {loading ? (
        <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Chargement...</div>
      ) : questions.length === 0 ? (
        <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Aucune question pour ce produit. Soyez le premier à poser une question !
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map(q => (
            <div key={q.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{q.askedByName}</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{q.question}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{new Date(q.createdAt).toLocaleDateString('fr-FR')}</p>

                  {q.answer && (
                    <div className="mt-3 pl-3 border-l-2 border-emerald-300 dark:border-emerald-700">
                      <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-1">Réponse {q.answeredBy && `· ${q.answeredBy}`}</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{q.answer}</p>
                    </div>
                  )}

                  {!q.answer && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 italic">En attente de réponse de l'équipe.</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
