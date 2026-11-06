'use client'

import { useEffect, useState, useCallback } from 'react'
import { Star, Camera, Send, Loader2, ThumbsUp, ChevronDown, ImageIcon } from 'lucide-react'

interface ReviewData {
  id: string
  userName: string
  rating: number
  title?: string | null
  comment: string
  photos: string[]
  verified: boolean
  helpful: number
  createdAt: string
}

interface ReviewStats {
  avgRating: number
  total: number
  distribution: Record<number, number>
  withPhotos: number
}

function StarRating({ rating, size = 16, interactive = false, onChange }: {
  rating: number
  size?: number
  interactive?: boolean
  onChange?: (r: number) => void
}) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(i)}
          onMouseEnter={() => interactive && setHover(i)}
          onMouseLeave={() => interactive && setHover(0)}
          className={interactive ? 'cursor-pointer transition-transform hover:scale-110' : 'cursor-default'}
        >
          <Star
            size={size}
            className={`${(hover || rating) >= i ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'} transition-colors`}
          />
        </button>
      ))}
    </div>
  )
}

function PhotoLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <img
        src={src}
        alt="Photo avis"
        className="max-w-full max-h-[90vh] rounded-xl object-contain"
        onClick={e => e.stopPropagation()}
      />
    </div>
  )
}

export default function ProductReviews({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<ReviewData[]>([])
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  // Form state
  const [formRating, setFormRating] = useState(0)
  const [formTitle, setFormTitle] = useState('')
  const [formComment, setFormComment] = useState('')
  const [formPhotos, setFormPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState(false)

  const fetchReviews = useCallback(async (p: number) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/reviews?productId=${encodeURIComponent(productId)}&page=${p}&limit=5`)
      const data = await res.json()
      if (data.success) {
        setReviews(data.reviews)
        setStats(data.stats)
        setTotalPages(data.pagination?.pages || 1)
      }
    } catch (e) {
      console.error('Erreur chargement avis:', e)
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => { fetchReviews(page) }, [fetchReviews, page])

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    if (formPhotos.length >= 5) return

    setUploading(true)
    try {
      for (let i = 0; i < Math.min(files.length, 5 - formPhotos.length); i++) {
        const fd = new FormData()
        fd.append('file', files[i])
        fd.append('type', 'reviews')
        const res = await fetch('/api/upload', { method: 'POST', body: fd, credentials: 'include' })
        const data = await res.json()
        if (data.success && data.url) {
          setFormPhotos(prev => [...prev, data.url])
        }
      }
    } catch (err) {
      console.error('Erreur upload photo:', err)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (formRating === 0) { setFormError('Veuillez donner une note'); return }
    if (formComment.trim().length < 10) { setFormError('Le commentaire doit faire au moins 10 caracteres'); return }

    setSubmitting(true)
    try {
      let csrfToken: string | null = null
      try {
        const csrfRes = await fetch('/api/csrf', { credentials: 'include' })
        const csrfData = await csrfRes.json().catch(() => ({}))
        csrfToken = csrfData?.csrfToken || null
      } catch {}

      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          productId,
          rating: formRating,
          title: formTitle.trim() || undefined,
          comment: formComment.trim(),
          photos: formPhotos,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error || 'Erreur')
        return
      }
      setFormSuccess(true)
      setFormRating(0)
      setFormTitle('')
      setFormComment('')
      setFormPhotos([])
      setShowForm(false)
      fetchReviews(1)
      setPage(1)
    } catch {
      setFormError('Erreur lors de l\'envoi')
    } finally {
      setSubmitting(false)
    }
  }

  const removePhoto = (idx: number) => {
    setFormPhotos(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <div className="mt-8">
      {lightboxSrc && <PhotoLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      {/* Header + Stats */}
      <div className="flex flex-col md:flex-row md:items-start gap-6 mb-6">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900">Avis clients</h3>
          {stats && stats.total > 0 && (
            <div className="flex items-center gap-3 mt-2">
              <span className="text-3xl font-bold text-gray-900">{stats.avgRating}</span>
              <div>
                <StarRating rating={Math.round(stats.avgRating)} size={18} />
                <p className="text-sm text-gray-500 mt-0.5">{stats.total} avis{stats.withPhotos > 0 && ` · ${stats.withPhotos} avec photos`}</p>
              </div>
            </div>
          )}
        </div>

        {/* Distribution */}
        {stats && stats.total > 0 && (
          <div className="w-full md:w-56 space-y-1">
            {[5, 4, 3, 2, 1].map(star => {
              const count = stats.distribution[star] || 0
              const pct = stats.total > 0 ? (count / stats.total) * 100 : 0
              return (
                <div key={star} className="flex items-center gap-2 text-sm">
                  <span className="w-4 text-right text-gray-500 font-medium">{star}</span>
                  <Star size={12} className="fill-yellow-400 text-yellow-400 flex-shrink-0" />
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right text-gray-400 text-xs">{count}</span>
                </div>
              )
            })}
          </div>
        )}

        {/* CTA */}
        <div className="flex-shrink-0">
          <button
            onClick={() => { setShowForm(!showForm); setFormSuccess(false) }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-violet-500 text-white text-sm font-bold hover:from-green-600 hover:to-violet-600 transition shadow-md"
          >
            Donner mon avis
          </button>
        </div>
      </div>

      {/* Success message */}
      {formSuccess && !showForm && (
        <div className="mb-4 p-3 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700 font-medium">
          Merci pour votre avis !
        </div>
      )}

      {/* Formulaire */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-5 rounded-2xl border border-gray-200 bg-white shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Votre note</label>
            <StarRating rating={formRating} size={28} interactive onChange={setFormRating} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Titre (optionnel)</label>
            <input
              type="text"
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="Resumez votre experience"
              maxLength={100}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Votre avis</label>
            <textarea
              value={formComment}
              onChange={e => setFormComment(e.target.value)}
              placeholder="Partagez votre experience avec ce produit (min 10 caracteres)"
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none resize-none"
            />
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Photos (max 5)</label>
            <div className="flex flex-wrap gap-2">
              {formPhotos.map((url, idx) => (
                <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 group">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="absolute inset-0 bg-black/50 text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                  >
                    X
                  </button>
                </div>
              ))}
              {formPhotos.length < 5 && (
                <label className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition">
                  {uploading ? (
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  ) : (
                    <Camera className="w-5 h-5 text-gray-400" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          </div>

          {formError && (
            <p className="text-sm text-red-600 font-medium">{formError}</p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-violet-500 text-white text-sm font-bold hover:from-green-600 hover:to-violet-600 transition shadow disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Publier
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Liste des avis */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
          Chargement des avis...
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8 rounded-2xl border border-gray-200 bg-white">
          <ImageIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Aucun avis pour le moment. Soyez le premier !</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => (
            <div key={review.id} className="p-4 rounded-2xl border border-gray-200 bg-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-900">{review.userName}</span>
                    {review.verified && (
                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">Achat verifie</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <StarRating rating={review.rating} size={14} />
                    <span className="text-xs text-gray-400">
                      {new Date(review.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>

              {review.title && (
                <p className="font-semibold text-sm text-gray-900 mt-2">{review.title}</p>
              )}
              <p className="text-sm text-gray-700 mt-1 leading-relaxed">{review.comment}</p>

              {/* Photos */}
              {review.photos.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {review.photos.map((photo, idx) => (
                    <button
                      key={idx}
                      onClick={() => setLightboxSrc(photo)}
                      className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 hover:border-violet-300 hover:shadow-md transition"
                    >
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Helpful */}
              {review.helpful > 0 && (
                <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-400">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  {review.helpful} personne{review.helpful > 1 ? 's' : ''} a trouve cet avis utile
                </div>
              )}
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-sm font-semibold transition ${
                    p === page
                      ? 'bg-gradient-to-r from-green-500 to-violet-500 text-white shadow'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
