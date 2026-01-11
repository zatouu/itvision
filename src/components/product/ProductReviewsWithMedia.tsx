'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import {
  Star,
  ThumbsUp,
  ThumbsDown,
  CheckCircle,
  Camera,
  Video,
  Play,
  X,
  Upload,
  Loader2,
  Filter,
  ChevronDown,
  ImageIcon,
  Film,
  MessageSquare,
  User,
  Calendar,
  Send,
  AlertCircle
} from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

export interface ReviewMedia {
  type: 'image' | 'video'
  url: string
  thumbnail?: string
}

export interface Review {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  rating: number
  title?: string
  comment: string
  media?: ReviewMedia[]
  verified?: boolean
  helpful: number
  notHelpful?: number
  createdAt: string
  reply?: {
    message: string
    createdAt: string
  }
}

export interface ProductReviewsWithMediaProps {
  /** ID du produit */
  productId: string
  /** Liste des avis */
  reviews: Review[]
  /** Note moyenne */
  averageRating: number
  /** Distribution des notes */
  ratingDistribution?: { [key: number]: number }
  /** Nombre total d'avis */
  totalReviews: number
  /** Callback pour charger plus d'avis */
  onLoadMore?: () => Promise<void>
  /** Callback pour soumettre un nouvel avis */
  onSubmitReview?: (data: NewReviewData) => Promise<void>
  /** Callback pour marquer comme utile */
  onMarkHelpful?: (reviewId: string, helpful: boolean) => Promise<void>
  /** L'utilisateur peut-il laisser un avis ? */
  canReview?: boolean
  /** L'utilisateur a-t-il déjà laissé un avis ? */
  hasReviewed?: boolean
  /** Classe CSS */
  className?: string
}

export interface NewReviewData {
  rating: number
  title?: string
  comment: string
  media?: File[]
}

// ============================================================================
// SOUS-COMPOSANTS
// ============================================================================

function StarRating({
  rating,
  size = 'md',
  interactive = false,
  onChange
}: {
  rating: number
  size?: 'sm' | 'md' | 'lg'
  interactive?: boolean
  onChange?: (rating: number) => void
}) {
  const [hoverRating, setHoverRating] = useState(0)
  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-7 h-7'
  }

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          className={clsx(
            'transition-transform',
            interactive && 'hover:scale-110 cursor-pointer'
          )}
          onMouseEnter={() => interactive && setHoverRating(star)}
          onMouseLeave={() => interactive && setHoverRating(0)}
          onClick={() => interactive && onChange?.(star)}
        >
          <Star
            className={clsx(
              sizeClasses[size],
              (hoverRating || rating) >= star
                ? 'fill-amber-400 text-amber-400'
                : 'fill-gray-200 text-gray-200'
            )}
          />
        </button>
      ))}
    </div>
  )
}

function MediaPreview({
  media,
  onRemove
}: {
  media: { file: File; preview: string; type: 'image' | 'video' }
  onRemove: () => void
}) {
  return (
    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100 group">
      {media.type === 'image' ? (
        <Image
          src={media.preview}
          alt="Preview"
          fill
          className="object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-900">
          <Play className="w-6 h-6 text-white" />
        </div>
      )}
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

function ReviewCard({
  review,
  onMarkHelpful
}: {
  review: Review
  onMarkHelpful?: (reviewId: string, helpful: boolean) => void
}) {
  const [showAllMedia, setShowAllMedia] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState<ReviewMedia | null>(null)

  const displayMedia = showAllMedia ? review.media : review.media?.slice(0, 4)
  const remainingCount = (review.media?.length || 0) - 4

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
            {review.userAvatar ? (
              <Image src={review.userAvatar} alt={review.userName} fill className="object-cover" />
            ) : (
              review.userName.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">{review.userName}</span>
              {review.verified && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <CheckCircle className="w-3 h-3" />
                  Achat vérifié
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <StarRating rating={review.rating} size="sm" />
              <span className="text-xs text-gray-400">
                {new Date(review.createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Title */}
      {review.title && (
        <h4 className="font-semibold text-gray-900 mb-2">{review.title}</h4>
      )}

      {/* Comment */}
      <p className="text-gray-600 text-sm leading-relaxed mb-4">{review.comment}</p>

      {/* Media grid */}
      {review.media && review.media.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {displayMedia?.map((media, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedMedia(media)}
                className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100 group"
              >
                {media.type === 'image' ? (
                  <Image
                    src={media.thumbnail || media.url}
                    alt={`Media ${idx + 1}`}
                    fill
                    className="object-cover group-hover:scale-105 transition"
                  />
                ) : (
                  <>
                    <Image
                      src={media.thumbnail || media.url}
                      alt={`Video ${idx + 1}`}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <Play className="w-6 h-6 text-white" />
                    </div>
                  </>
                )}
              </button>
            ))}
            {!showAllMedia && remainingCount > 0 && (
              <button
                onClick={() => setShowAllMedia(true)}
                className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 font-semibold hover:bg-gray-200 transition"
              >
                +{remainingCount}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Reply from seller */}
      {review.reply && (
        <div className="bg-emerald-50 rounded-xl p-4 mb-4 border-l-4 border-emerald-500">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-emerald-700">Réponse IT Vision</span>
            <span className="text-xs text-gray-400">
              {new Date(review.reply.createdAt).toLocaleDateString('fr-FR')}
            </span>
          </div>
          <p className="text-sm text-gray-700">{review.reply.message}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-500">Cet avis vous a-t-il été utile ?</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onMarkHelpful?.(review.id, true)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-emerald-600 transition"
          >
            <ThumbsUp className="w-4 h-4" />
            <span>{review.helpful}</span>
          </button>
          <button
            onClick={() => onMarkHelpful?.(review.id, false)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition"
          >
            <ThumbsDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Media modal */}
      <AnimatePresence>
        {selectedMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelectedMedia(null)}
          >
            <button
              onClick={() => setSelectedMedia(null)}
              className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="max-w-4xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
              {selectedMedia.type === 'image' ? (
                <Image
                  src={selectedMedia.url}
                  alt="Media"
                  width={1200}
                  height={800}
                  className="w-full h-auto rounded-xl object-contain"
                />
              ) : (
                <video
                  src={selectedMedia.url}
                  controls
                  autoPlay
                  className="w-full rounded-xl"
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function ProductReviewsWithMedia({
  productId,
  reviews,
  averageRating,
  ratingDistribution = {},
  totalReviews,
  onLoadMore,
  onSubmitReview,
  onMarkHelpful,
  canReview = true,
  hasReviewed = false,
  className
}: ProductReviewsWithMediaProps) {
  const [filter, setFilter] = useState<'all' | 'with_media' | 'with_images' | 'with_videos' | '5star' | '4star'>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'helpful' | 'rating_high' | 'rating_low'>('recent')
  const [showNewReviewForm, setShowNewReviewForm] = useState(false)
  const [newReview, setNewReview] = useState({
    rating: 0,
    title: '',
    comment: ''
  })
  const [mediaFiles, setMediaFiles] = useState<{ file: File; preview: string; type: 'image' | 'video' }[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Filter reviews
  const filteredReviews = reviews.filter((review) => {
    if (filter === 'with_media') return review.media && review.media.length > 0
    if (filter === 'with_images') return review.media?.some((m) => m.type === 'image')
    if (filter === 'with_videos') return review.media?.some((m) => m.type === 'video')
    if (filter === '5star') return review.rating === 5
    if (filter === '4star') return review.rating >= 4
    return true
  })

  // Sort reviews
  const sortedReviews = [...filteredReviews].sort((a, b) => {
    if (sortBy === 'recent') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    if (sortBy === 'helpful') return b.helpful - a.helpful
    if (sortBy === 'rating_high') return b.rating - a.rating
    if (sortBy === 'rating_low') return a.rating - b.rating
    return 0
  })

  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const maxFiles = 5 - mediaFiles.length

    files.slice(0, maxFiles).forEach((file) => {
      const isVideo = file.type.startsWith('video/')
      const preview = URL.createObjectURL(file)
      setMediaFiles((prev) => [
        ...prev,
        { file, preview, type: isVideo ? 'video' : 'image' }
      ])
    })

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [mediaFiles.length])

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleSubmitReview = async () => {
    if (!onSubmitReview || newReview.rating === 0 || !newReview.comment.trim()) return

    setSubmitting(true)
    try {
      await onSubmitReview({
        rating: newReview.rating,
        title: newReview.title,
        comment: newReview.comment,
        media: mediaFiles.map((m) => m.file)
      })
      setNewReview({ rating: 0, title: '', comment: '' })
      setMediaFiles([])
      setShowNewReviewForm(false)
    } catch (error) {
      console.error('Error submitting review:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleLoadMore = async () => {
    if (!onLoadMore) return
    setLoading(true)
    try {
      await onLoadMore()
    } finally {
      setLoading(false)
    }
  }

  // Stats
  const mediaReviewsCount = reviews.filter((r) => r.media && r.media.length > 0).length
  const imagesCount = reviews.reduce((acc, r) => acc + (r.media?.filter((m) => m.type === 'image').length || 0), 0)
  const videosCount = reviews.reduce((acc, r) => acc + (r.media?.filter((m) => m.type === 'video').length || 0), 0)

  return (
    <div className={clsx('space-y-6', className)}>
      {/* Header avec stats */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          {/* Score global */}
          <div className="text-center md:text-left">
            <div className="text-5xl font-bold text-gray-900">{averageRating.toFixed(1)}</div>
            <StarRating rating={averageRating} size="md" />
            <p className="text-sm text-gray-500 mt-1">{totalReviews} avis</p>
          </div>

          {/* Distribution */}
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingDistribution[star] || 0
              const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-4">{star}</span>
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8">{count}</span>
                </div>
              )
            })}
          </div>

          {/* Media stats */}
          <div className="flex gap-4 justify-center md:justify-end">
            <div className="text-center">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm mx-auto mb-1">
                <ImageIcon className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-sm font-semibold text-gray-900">{imagesCount}</span>
              <p className="text-xs text-gray-500">Photos</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm mx-auto mb-1">
                <Film className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-sm font-semibold text-gray-900">{videosCount}</span>
              <p className="text-xs text-gray-500">Vidéos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'Tous', count: totalReviews },
            { id: 'with_media', label: 'Avec médias', count: mediaReviewsCount, icon: Camera },
            { id: '5star', label: '5★', count: ratingDistribution[5] || 0 },
            { id: '4star', label: '4★+', count: (ratingDistribution[4] || 0) + (ratingDistribution[5] || 0) }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as typeof filter)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition',
                filter === f.id
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {f.icon && <f.icon className="w-3.5 h-3.5" />}
              {f.label}
              <span className="text-xs opacity-75">({f.count})</span>
            </button>
          ))}
        </div>

        {/* Sort + Add review */}
        <div className="flex items-center gap-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="recent">Plus récents</option>
            <option value="helpful">Plus utiles</option>
            <option value="rating_high">Meilleures notes</option>
            <option value="rating_low">Notes basses</option>
          </select>

          {canReview && !hasReviewed && (
            <button
              onClick={() => setShowNewReviewForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition"
            >
              <MessageSquare className="w-4 h-4" />
              Donner mon avis
            </button>
          )}
        </div>
      </div>

      {/* New review form */}
      <AnimatePresence>
        {showNewReviewForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Partagez votre expérience</h3>
                <button
                  onClick={() => setShowNewReviewForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Rating */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Votre note *</label>
                <StarRating
                  rating={newReview.rating}
                  size="lg"
                  interactive
                  onChange={(rating) => setNewReview((prev) => ({ ...prev, rating }))}
                />
              </div>

              {/* Title */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Titre (optionnel)</label>
                <input
                  type="text"
                  value={newReview.title}
                  onChange={(e) => setNewReview((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Résumez votre avis en quelques mots"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Comment */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Votre avis *</label>
                <textarea
                  value={newReview.comment}
                  onChange={(e) => setNewReview((prev) => ({ ...prev, comment: e.target.value }))}
                  placeholder="Décrivez votre expérience avec ce produit..."
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* Media upload */}
              <div className="mb-6">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Photos & Vidéos (optionnel)
                </label>
                <div className="flex flex-wrap gap-3">
                  {mediaFiles.map((media, idx) => (
                    <MediaPreview key={idx} media={media} onRemove={() => removeMedia(idx)} />
                  ))}
                  {mediaFiles.length < 5 && (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-emerald-500 hover:text-emerald-500 transition"
                      >
                        <Upload className="w-5 h-5 mb-1" />
                        <span className="text-xs">Ajouter</span>
                      </button>
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Max 5 fichiers. Images (JPG, PNG) ou vidéos courtes (MP4, max 30s).
                </p>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowNewReviewForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmitReview}
                  disabled={submitting || newReview.rating === 0 || !newReview.comment.trim()}
                  className="flex items-center gap-2 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white font-medium rounded-xl transition"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Publier
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reviews list */}
      <div className="space-y-4">
        {sortedReviews.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucun avis correspondant à ce filtre</p>
          </div>
        ) : (
          sortedReviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              onMarkHelpful={onMarkHelpful}
            />
          ))
        )}
      </div>

      {/* Load more */}
      {onLoadMore && sortedReviews.length < totalReviews && (
        <div className="text-center">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            Voir plus d'avis
          </button>
        </div>
      )}
    </div>
  )
}
