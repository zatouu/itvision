'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { BadgeCheck, Loader2, MessageSquareText, RotateCw, Star } from 'lucide-react'

type Review = {
  id: string
  productId: string
  productName: string
  productImage: string | null
  userName: string
  rating: number
  title: string | null
  comment: string
  photos: string[]
  verified: boolean
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

const TABS: Array<{ key: Review['status']; label: string }> = [
  { key: 'pending', label: 'À modérer' },
  { key: 'approved', label: 'Publiés' },
  { key: 'rejected', label: 'Refusés' },
]

export default function AdminReviewsPage() {
  const [status, setStatus] = useState<Review['status']>('pending')
  const [reviews, setReviews] = useState<Review[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const data = await fetch(`/api/admin/market/reviews?status=${status}`).then(r => r.json())
      if (!data.success) throw new Error(data.error || 'Chargement impossible')
      setReviews(data.reviews || [])
      setCounts(data.counts || {})
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => { load() }, [load])

  const moderate = async (r: Review, next: 'approved' | 'rejected') => {
    setActing(r.id); setError('')
    try {
      const res = await fetch('/api/admin/market/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: r.id, status: next }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) throw new Error(data.error || 'Erreur')
      setReviews(list => list.filter(x => x.id !== r.id))
      setCounts(c => ({ ...c, [r.status]: Math.max(0, (c[r.status] || 1) - 1), [next]: (c[next] || 0) + 1 }))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setActing(null)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-stone-900"><MessageSquareText className="h-6 w-6 text-emerald-600" /> Avis produits</h1>
          <p className="text-sm text-stone-600">Les avis liés à un achat payé sont publiés directement ; les autres attendent votre validation.</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">
          <RotateCw className="h-4 w-4" /> Actualiser
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-stone-200 bg-white p-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setStatus(t.key)}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold ${status === t.key ? 'bg-emerald-700 text-white' : 'text-stone-600 hover:bg-stone-50'}`}
          >
            {t.label} ({counts[t.key] || 0})
          </button>
        ))}
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-emerald-600" /></div>
      ) : reviews.length === 0 ? (
        <p className="rounded-xl border border-stone-200 bg-white p-6 text-center text-sm text-stone-500">Aucun avis dans cette liste.</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map(r => (
            <li key={r.id} className="rounded-2xl border border-stone-200 bg-white p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <Link href={`/produits/${r.productId}`} target="_blank" className="text-xs font-semibold text-emerald-700 hover:underline">{r.productName}</Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold text-stone-900">{r.userName}</span>
                    <span className="flex text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? 'fill-amber-500' : 'fill-stone-200 text-stone-200'}`} />)}
                    </span>
                    {r.verified && <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><BadgeCheck className="h-3.5 w-3.5" /> Achat vérifié</span>}
                    <span className="text-xs text-stone-500">{new Date(r.createdAt).toLocaleDateString('fr-FR')}</span>
                  </div>
                  {r.title && <p className="mt-2 font-semibold text-stone-900">{r.title}</p>}
                  <p className="mt-1 whitespace-pre-line text-sm text-stone-700">{r.comment}</p>
                  {r.photos.length > 0 && (
                    <div className="mt-2 flex gap-2 overflow-x-auto">
                      {r.photos.map(src => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={src} src={src} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  {r.status !== 'approved' && (
                    <button onClick={() => moderate(r, 'approved')} disabled={acting === r.id} className="flex-1 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 md:flex-none">
                      Publier
                    </button>
                  )}
                  {r.status !== 'rejected' && (
                    <button onClick={() => moderate(r, 'rejected')} disabled={acting === r.id} className="flex-1 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-40 md:flex-none">
                      {r.status === 'approved' ? 'Retirer' : 'Refuser'}
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
