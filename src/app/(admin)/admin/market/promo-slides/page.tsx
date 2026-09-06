'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  GripVertical,
  Save,
  X,
  ImageIcon,
  ArrowUpDown,
} from 'lucide-react'

interface PromoSlide {
  _id: string
  title: string
  subtitle?: string
  ctaText: string
  ctaLink: string
  bgColor?: string
  accentColor?: string
  textColor?: string
  images?: string[]
  isActive: boolean
  order: number
  startDate?: string
  endDate?: string
  createdAt: string
}

const DEFAULT_COLORS = [
  { label: 'Amber', value: 'from-amber-50 via-yellow-50 to-orange-50', accent: 'bg-black' },
  { label: 'Emeraude', value: 'from-emerald-50 via-green-50 to-teal-50', accent: 'bg-emerald-600' },
  { label: 'Violet', value: 'from-violet-50 via-purple-50 to-fuchsia-50', accent: 'bg-violet-600' },
  { label: 'Bleu', value: 'from-blue-50 via-sky-50 to-cyan-50', accent: 'bg-blue-600' },
  { label: 'Rose', value: 'from-rose-50 via-pink-50 to-red-50', accent: 'bg-rose-600' },
]

export default function PromoSlidesPage() {
  const [slides, setSlides] = useState<PromoSlide[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<PromoSlide | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState<Partial<PromoSlide>>({
    title: '',
    subtitle: '',
    ctaText: 'En savoir plus',
    ctaLink: '/produits',
    bgColor: DEFAULT_COLORS[0].value,
    accentColor: DEFAULT_COLORS[0].accent,
    textColor: 'text-slate-900',
    images: [],
    isActive: true,
    order: 0,
  })
  const [imageInput, setImageInput] = useState('')

  const loadSlides = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/promo-slides', { credentials: 'include' })
      const data = await res.json()
      if (data.success) {
        setSlides(data.slides)
      } else {
        setError(data.error || 'Erreur de chargement')
      }
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSlides()
  }, [])

  const resetForm = () => {
    setForm({
      title: '',
      subtitle: '',
      ctaText: 'En savoir plus',
      ctaLink: '/produits',
      bgColor: DEFAULT_COLORS[0].value,
      accentColor: DEFAULT_COLORS[0].accent,
      textColor: 'text-slate-900',
      images: [],
      isActive: true,
      order: 0,
    })
    setImageInput('')
  }

  const handleCreate = () => {
    resetForm()
    setIsCreating(true)
    setEditing(null)
  }

  const handleEdit = (slide: PromoSlide) => {
    setForm({ ...slide })
    setImageInput(slide.images?.join('\n') || '')
    setEditing(slide)
    setIsCreating(false)
  }

  const handleCancel = () => {
    setEditing(null)
    setIsCreating(false)
    resetForm()
  }

  const handleSave = async () => {
    try {
      const payload = {
        ...form,
        images: imageInput
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
      }

      const url = editing ? `/api/admin/promo-slides/${editing._id}` : '/api/admin/promo-slides'
      const method = editing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (data.success) {
        await loadSlides()
        handleCancel()
      } else {
        setError(data.error || 'Erreur lors de la sauvegarde')
      }
    } catch {
      setError('Erreur réseau')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette slide ?')) return
    try {
      const res = await fetch(`/api/admin/promo-slides/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (data.success) {
        await loadSlides()
      } else {
        setError(data.error || 'Erreur lors de la suppression')
      }
    } catch {
      setError('Erreur réseau')
    }
  }

  const toggleActive = async (slide: PromoSlide) => {
    try {
      const res = await fetch(`/api/admin/promo-slides/${slide._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !slide.isActive }),
      })
      const data = await res.json()
      if (data.success) await loadSlides()
    } catch {
      setError('Erreur réseau')
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse h-8 w-48 bg-gray-200 rounded mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Slides promotionnelles</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gérez les slides du carrousel en page d&apos;accueil. Les slides actives et dans la période de validité s&apos;affichent.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-semibold transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nouvelle slide
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">Fermer</button>
        </div>
      )}

      {/* Formulaire */}
      {(isCreating || editing) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              {editing ? 'Modifier la slide' : 'Nouvelle slide'}
            </h2>
            <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titre *</label>
              <input
                type="text"
                value={form.title || ''}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                placeholder="Titre de la slide"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sous-titre</label>
              <input
                type="text"
                value={form.subtitle || ''}
                onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                placeholder="Description courte"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Texte du bouton</label>
              <input
                type="text"
                value={form.ctaText || ''}
                onChange={(e) => setForm((f) => ({ ...f, ctaText: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lien du bouton</label>
              <input
                type="text"
                value={form.ctaLink || ''}
                onChange={(e) => setForm((f) => ({ ...f, ctaLink: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                placeholder="/produits"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Couleur de fond</label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, bgColor: c.value, accentColor: c.accent }))
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    form.bgColor === c.value
                      ? 'border-emerald-500 ring-2 ring-emerald-200 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ordre</label>
              <input
                type="number"
                value={form.order ?? 0}
                onChange={(e) => setForm((f) => ({ ...f, order: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
              <input
                type="datetime-local"
                value={form.startDate ? new Date(form.startDate).toISOString().slice(0, 16) : ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    startDate: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
              <input
                type="datetime-local"
                value={form.endDate ? new Date(form.endDate).toISOString().slice(0, 16) : ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    endDate: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Images (une URL par ligne, max 4)
            </label>
            <textarea
              value={imageInput}
              onChange={(e) => setImageInput(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
              placeholder="https://exemple.com/image1.jpg&#10;https://exemple.com/image2.jpg"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors"
            >
              <Save className="h-4 w-4" />
              {editing ? 'Enregistrer' : 'Créer'}
            </button>
            <button
              onClick={handleCancel}
              className="px-5 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Annuler
            </button>
          </div>
        </motion.div>
      )}

      {/* Liste */}
      <div className="space-y-3">
        {slides.length === 0 ? (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-2xl">
            <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucune slide configurée</p>
            <p className="text-sm text-gray-400">Les slides par défaut s&apos;afficheront sur le site</p>
          </div>
        ) : (
          slides.map((slide) => (
            <motion.div
              key={slide._id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`bg-white border rounded-2xl p-5 flex items-center gap-4 transition-shadow hover:shadow-sm ${
                slide.isActive ? 'border-gray-200' : 'border-gray-200 opacity-60'
              }`}
            >
              <div className="text-gray-400">
                <GripVertical className="h-4 w-4" />
              </div>

              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-r ${slide.bgColor || 'from-gray-100 to-gray-200'} flex-shrink-0`}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 truncate">{slide.title}</h3>
                  {slide.isActive ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      <Eye className="h-3 w-3" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      <EyeOff className="h-3 w-3" />
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate">{slide.subtitle}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  <span>Ordre: {slide.order}</span>
                  <span>·</span>
                  <span>{slide.images?.length || 0} image(s)</span>
                  {slide.startDate && (
                    <>
                      <span>·</span>
                      <span>Début: {new Date(slide.startDate).toLocaleDateString('fr-FR')}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(slide)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                  title={slide.isActive ? 'Désactiver' : 'Activer'}
                >
                  {slide.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => handleEdit(slide)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                  title="Modifier"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(slide._id)}
                  className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
