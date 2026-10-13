'use client'
import { useState } from 'react'
import { CheckCircle2, Loader2, Star } from 'lucide-react'

const TAGS_GOOD = ['Ponctualité', 'Travail soigné', 'Explications claires', 'Courtoisie']
const TAGS_BAD = ['Retard', 'Travail à reprendre', 'Manque d’explications', 'Site mal nettoyé']
const LABELS = ['', 'Très déçu', 'Déçu', 'Correct', 'Bien', 'Excellent']

/** Avis rapide après une intervention terminée : étoiles d'un geste, points forts / faibles, commentaire facultatif. */
export default function QuickRating({ interventionId, heading, onDone }: { interventionId: string; heading?: string; onDone?: (fb: { rating: number; comment: string; tags: string[] }) => void }) {
  const [rating, setRating] = useState(0)
  const [tags, setTags] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const pick = (n: number) => { setRating(n); setTags([]) }
  const toggle = (t: string) => setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  async function send() {
    setLoading(true); setError('')
    try {
      const res = await fetch(`/api/client-enterprise/interventions/${interventionId}/feedback`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment, tags }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(j.error || 'Envoi impossible')
      setDone(true)
      setTimeout(() => onDone?.({ rating, comment, tags }), 1800)
    } catch (e: any) { setError(e?.message || 'Envoi impossible') } finally { setLoading(false) }
  }

  if (done) return (
    <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
      <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-emerald-600" />
      <p className="text-sm text-emerald-900">Merci, votre avis aide nos équipes à s’améliorer.</p>
    </div>
  )

  return (
    <section id="avis" className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 sm:p-5">
      <h2 className="font-semibold text-stone-900">{heading || 'Comment s’est passée cette intervention ?'}</h2>
      <div className="mt-3 flex items-center gap-1" role="radiogroup" aria-label="Note de 1 à 5">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} sur 5`} onClick={() => pick(n)}
            className="p-1.5 active:scale-90 transition-transform">
            <Star className={`h-8 w-8 ${n <= rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}`} />
          </button>
        ))}
        {rating > 0 && <span className="ml-2 text-sm font-medium text-stone-700">{LABELS[rating]}</span>}
      </div>

      {rating > 0 && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            {(rating >= 4 ? TAGS_GOOD : TAGS_BAD).map(t => (
              <button key={t} type="button" onClick={() => toggle(t)} aria-pressed={tags.includes(t)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${tags.includes(t) ? 'border-amber-500 bg-amber-100 text-amber-900' : 'border-stone-200 bg-white text-stone-600'}`}>
                {t}
              </button>
            ))}
          </div>
          <textarea rows={2} maxLength={1000} value={comment} onChange={e => setComment(e.target.value)}
            placeholder={rating >= 4 ? 'Un mot pour l’équipe (facultatif)' : 'Que devons-nous améliorer ?'}
            className="w-full resize-none rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100" />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button onClick={send} disabled={loading}
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-60">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Envoyer mon avis
          </button>
        </div>
      )}
    </section>
  )
}
