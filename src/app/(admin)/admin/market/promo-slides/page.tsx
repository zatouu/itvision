'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ArrowDown, ArrowUp, CalendarClock, Eye, EyeOff, ImagePlus, Monitor, Pencil, Plus, Save, Smartphone, Trash2, X,
} from 'lucide-react'
import ImageUpload from '@/components/ImageUpload'
import { PromoSlideView, type HeroSlide } from '@/components/market/storefront/PromoSlideView'
import { cn } from '@/lib/utils'
import {
  MAX_SLIDE_IMAGES, SLIDE_LINK_PRESETS, SLIDE_THEMES, SLIDE_THEME_KEYS, SOURCING_LINK,
  resolveSlideTheme, sanitizeSlideImages, sanitizeSlideLink, type SlideThemeKey,
} from '@/lib/market/promo-slides'

interface PromoSlide {
  _id: string
  title: string
  subtitle?: string
  badge?: string
  ctaText: string
  ctaLink: string
  bgColor?: string
  images?: string[]
  isActive: boolean
  order: number
  startDate?: string | null
  endDate?: string | null
}

interface SlideForm {
  title: string
  subtitle: string
  badge: string
  ctaText: string
  ctaLink: string
  theme: SlideThemeKey
  images: string[]
  isActive: boolean
  startDate: string
  endDate: string
}

const EMPTY_FORM: SlideForm = {
  title: '', subtitle: '', badge: '', ctaText: 'Découvrir', ctaLink: '/produits', theme: 'emerald',
  images: [], isActive: true, startDate: '', endDate: '',
}

// Modèles prêts à l'emploi : l'admin n'a plus qu'à remplacer les « … »
const TEMPLATES: { key: string; label: string; form: Partial<SlideForm> }[] = [
  { key: 'promo', label: 'Promotion', form: { theme: 'sunset', badge: 'Promo', title: 'Jusqu’à -20 % sur …', subtitle: 'Offre valable jusqu’au …, dans la limite des stocks.', ctaText: 'J’en profite', ctaLink: '/produits' } },
  { key: 'new', label: 'Nouveautés', form: { theme: 'ocean', badge: 'Nouveau', title: 'Nouveautés : …', subtitle: 'Les derniers produits arrivés sur DDM+.', ctaText: 'Découvrir', ctaLink: '/produits' } },
  { key: 'group', label: 'Achat groupé', form: { theme: 'violet', badge: 'Achat groupé', title: '… au prix de gros', subtitle: 'Rejoignez le groupe avant la date limite pour profiter du meilleur prix.', ctaText: 'Rejoindre le groupe', ctaLink: '/achats-groupes' } },
  { key: 'sourcing', label: 'Trouvez-moi', form: { theme: 'emerald', badge: 'Trouvez-moi', title: 'Une photo suffit, on le trouve en Chine', subtitle: 'Envoyez la photo ou le lien d’un produit, nous vous envoyons un devis.', ctaText: 'Envoyer une photo', ctaLink: SOURCING_LINK } },
]

const CUSTOM_LINK = '__custom__'
const inputClass = 'w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30'
const labelClass = 'mb-1 block text-sm font-semibold text-stone-800'

// <input type="datetime-local"> travaille en heure locale, l'API en ISO
const toLocalInput = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null)

function slideStatus(slide: PromoSlide): { label: string; tone: string } {
  const now = Date.now()
  if (!slide.isActive) return { label: 'Masquée', tone: 'bg-stone-100 text-stone-600' }
  if (slide.startDate && new Date(slide.startDate).getTime() > now) {
    return { label: `Programmée (${new Date(slide.startDate).toLocaleDateString('fr-FR')})`, tone: 'bg-blue-50 text-blue-700' }
  }
  if (slide.endDate && new Date(slide.endDate).getTime() < now) return { label: 'Terminée', tone: 'bg-amber-50 text-amber-800' }
  return { label: 'En ligne', tone: 'bg-emerald-50 text-emerald-700' }
}

function toHeroSlide(form: SlideForm, id = 'preview'): HeroSlide {
  return {
    id,
    title: form.title || 'Titre de la slide',
    subtitle: form.subtitle || undefined,
    badge: form.badge || undefined,
    ctaText: form.ctaText || 'Découvrir',
    ctaLink: form.ctaLink,
    theme: form.theme,
    images: form.images,
    art: form.ctaLink === SOURCING_LINK ? 'camera' : form.ctaLink.startsWith('/achats-groupes') ? 'users' : 'sparkles',
  }
}

/** Rend le slide à sa vraie largeur (site ordinateur ou mobile) puis le réduit pour tenir dans la colonne d'aperçu. */
function ScaledPreview({ width, children }: { width: number; children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [height, setHeight] = useState<number | undefined>(undefined)

  useEffect(() => {
    const update = () => {
      const available = outerRef.current?.clientWidth || width
      const next = Math.min(1, available / width)
      setScale(next)
      setHeight((innerRef.current?.offsetHeight || 0) * next)
    }
    update()
    const observer = new ResizeObserver(update)
    if (outerRef.current) observer.observe(outerRef.current)
    if (innerRef.current) observer.observe(innerRef.current)
    return () => observer.disconnect()
  }, [width])

  return (
    <div ref={outerRef} className="w-full overflow-hidden" style={{ height }}>
      <div ref={innerRef} className="mx-auto" style={{ width, transform: `scale(${scale})`, transformOrigin: 'top left' }}>{children}</div>
    </div>
  )
}

export default function PromoSlidesPage() {
  const [slides, setSlides] = useState<PromoSlide[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<SlideForm>(EMPTY_FORM)
  const [linkChoice, setLinkChoice] = useState('/produits')
  const [imageUrl, setImageUrl] = useState('')
  const [previewMobile, setPreviewMobile] = useState(false)
  const [categories, setCategories] = useState<{ slug: string; label: string }[]>([])

  const linkOptions = useMemo(() => [
    ...SLIDE_LINK_PRESETS,
    ...categories.map(category => ({ label: `Catégorie : ${category.label}`, value: `/produits?cat=${encodeURIComponent(category.slug)}` })),
  ], [categories])

  const loadSlides = async () => {
    try {
      const res = await fetch('/api/admin/promo-slides', { credentials: 'include' })
      const data = await res.json()
      if (data.success) setSlides(data.slides)
      else setError(data.error || 'Erreur de chargement')
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSlides()
    fetch('/api/catalog/category-highlights')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        type HighlightItem = { slug?: string; labelFr?: string; name?: string }
        const items: HighlightItem[] = Array.isArray(data?.items) ? data.items : []
        setCategories(items.filter(item => item?.slug).map(item => ({ slug: String(item.slug), label: String(item.labelFr || item.name || item.slug) })))
      })
      .catch(() => {})
  }, [])

  const patchForm = (patch: Partial<SlideForm>) => setForm(current => ({ ...current, ...patch }))

  // Les catégories arrivent après l'ouverture d'une slide : un lien de catégorie ne doit pas rester en « Autre lien »
  useEffect(() => {
    if (linkChoice === CUSTOM_LINK && form.ctaLink && linkOptions.some(option => option.value === form.ctaLink)) {
      setLinkChoice(form.ctaLink)
    }
  }, [linkOptions]) // eslint-disable-line react-hooks/exhaustive-deps

  const syncLinkChoice = (link: string) => {
    setLinkChoice(linkOptions.some(option => option.value === link) ? link : CUSTOM_LINK)
  }

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setLinkChoice(EMPTY_FORM.ctaLink)
    setEditingId(null)
    setFormOpen(true)
    setError('')
  }

  const openEdit = (slide: PromoSlide) => {
    const next: SlideForm = {
      title: slide.title || '',
      subtitle: slide.subtitle || '',
      badge: slide.badge || '',
      ctaText: slide.ctaText || 'Découvrir',
      ctaLink: slide.ctaLink || '/produits',
      theme: resolveSlideTheme(slide.bgColor),
      images: sanitizeSlideImages(slide.images),
      isActive: slide.isActive,
      startDate: toLocalInput(slide.startDate),
      endDate: toLocalInput(slide.endDate),
    }
    setForm(next)
    syncLinkChoice(next.ctaLink)
    setEditingId(slide._id)
    setFormOpen(true)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingId(null)
    setImageUrl('')
  }

  const applyTemplate = (template: Partial<SlideForm>) => {
    setForm(current => ({ ...current, ...template }))
    if (template.ctaLink) syncLinkChoice(template.ctaLink)
  }

  const addImageUrl = () => {
    const [url] = sanitizeSlideImages([imageUrl])
    if (!url) { setError('Adresse d’image invalide : elle doit commencer par https:// ou /'); return }
    patchForm({ images: [...form.images, url].slice(0, MAX_SLIDE_IMAGES) })
    setImageUrl('')
  }

  const save = async () => {
    if (!form.title.trim()) { setError('Le titre est obligatoire'); return }
    if (!sanitizeSlideLink(form.ctaLink)) { setError('Lien du bouton invalide : choisissez une page dans la liste ou une adresse https://'); return }
    setSaving(true)
    setError('')
    try {
      const payload = {
        title: form.title, subtitle: form.subtitle, badge: form.badge, ctaText: form.ctaText, ctaLink: form.ctaLink,
        bgColor: form.theme, images: form.images, isActive: form.isActive,
        startDate: fromLocalInput(form.startDate), endDate: fromLocalInput(form.endDate),
      }
      const res = await fetch(editingId ? `/api/admin/promo-slides/${editingId}` : '/api/admin/promo-slides', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) { setError(data.error || 'Erreur lors de l’enregistrement'); return }
      await loadSlides()
      closeForm()
    } catch {
      setError('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  const update = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/promo-slides/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.success) throw new Error(data.error || 'Erreur lors de la mise à jour')
  }

  const toggleActive = async (slide: PromoSlide) => {
    try {
      await update(slide._id, { isActive: !slide.isActive })
      await loadSlides()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau')
    }
  }

  // Renumérote toute la liste : corrige aussi les anciennes slides qui avaient toutes l'ordre 0
  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= slides.length) return
    const reordered = [...slides]
    ;[reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    setSlides(reordered)
    try {
      await Promise.all(reordered.map((slide, position) => (slide.order !== position ? update(slide._id, { order: position }) : null)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau')
    }
    await loadSlides()
  }

  const remove = async (slide: PromoSlide) => {
    if (!confirm(`Supprimer la slide « ${slide.title} » ?`)) return
    try {
      const res = await fetch(`/api/admin/promo-slides/${slide._id}`, { method: 'DELETE', credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) { setError(data.error || 'Erreur lors de la suppression'); return }
      if (editingId === slide._id) closeForm()
      await loadSlides()
    } catch {
      setError('Erreur réseau')
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-8">
        <div className="mb-6 h-8 w-48 animate-pulse rounded bg-stone-200" />
        <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-24 animate-pulse rounded-2xl bg-stone-100" />)}</div>
      </div>
    )
  }

  const activeCount = slides.filter(slide => slideStatus(slide).label === 'En ligne').length

  return (
    <div className="max-w-6xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-stone-900">Carrousel de l’accueil DDM+</h1>
          <p className="mt-1 max-w-2xl text-sm text-stone-600">
            Les slides en ligne défilent en haut de l’accueil de la marketplace.
            {activeCount === 0 && ' Aucune slide en ligne : le site affiche 3 slides automatiques (Trouvez-moi, achats groupés, catalogue).'}
          </p>
        </div>
        {!formOpen && (
          <button type="button" onClick={openCreate}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-4 font-semibold text-white hover:bg-emerald-700">
            <Plus className="h-4 w-4" />Nouvelle slide
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} aria-label="Fermer le message" className="shrink-0"><X className="h-4 w-4" /></button>
        </div>
      )}

      {formOpen && (
        <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-stone-900">{editingId ? 'Modifier la slide' : 'Nouvelle slide'}</h2>
            <button type="button" onClick={closeForm} aria-label="Fermer" className="rounded-lg p-2 text-stone-500 hover:bg-stone-100"><X className="h-5 w-5" /></button>
          </div>

          {!editingId && (
            <div className="mb-5">
              <p className={labelClass}>Partir d’un modèle</p>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map(template => (
                  <button key={template.key} type="button" onClick={() => applyTemplate(template.form)}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-stone-200 px-3 text-sm font-medium text-stone-700 hover:border-emerald-500 hover:bg-emerald-50">
                    <span className={cn('h-4 w-4 rounded-full', SLIDE_THEMES[template.form.theme ?? 'emerald'].swatch)} />
                    {template.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div className="space-y-4">
              <div>
                <label htmlFor="slide-title" className={labelClass}>Titre *</label>
                <input id="slide-title" value={form.title} maxLength={120} onChange={e => patchForm({ title: e.target.value })}
                  className={inputClass} placeholder="Ex. : Caméras Wi-Fi à prix de gros" />
              </div>
              <div>
                <label htmlFor="slide-subtitle" className={labelClass}>Texte sous le titre</label>
                <textarea id="slide-subtitle" value={form.subtitle} maxLength={240} rows={2} onChange={e => patchForm({ subtitle: e.target.value })}
                  className={inputClass} placeholder="Une phrase qui donne envie de cliquer" />
              </div>
              <div>
                <label htmlFor="slide-badge" className={labelClass}>Pastille <span className="font-normal text-stone-500">(facultatif)</span></label>
                <input id="slide-badge" value={form.badge} maxLength={40} onChange={e => patchForm({ badge: e.target.value })}
                  className={inputClass} placeholder="Ex. : -20 %, Nouveau, Stock limité" />
              </div>

              <fieldset>
                <legend className={labelClass}>Couleur</legend>
                <div className="flex flex-wrap gap-3">
                  {SLIDE_THEME_KEYS.map(key => (
                    <button key={key} type="button" onClick={() => patchForm({ theme: key })} aria-pressed={form.theme === key}
                      className="flex flex-col items-center gap-1 text-xs font-medium text-stone-700">
                      <span className={cn('h-10 w-10 rounded-full ring-offset-2 transition', SLIDE_THEMES[key].swatch, form.theme === key ? 'ring-2 ring-emerald-600' : 'ring-1 ring-stone-200')} />
                      {SLIDE_THEMES[key].label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <div>
                <p className={labelClass}>Images <span className="font-normal text-stone-500">(jusqu’à {MAX_SLIDE_IMAGES}, de préférence sur fond blanc)</span></p>
                <ImageUpload
                  type="promo-slides"
                  maxFiles={MAX_SLIDE_IMAGES}
                  existingImages={form.images}
                  onUpload={url => setForm(current => ({ ...current, images: [...current.images, url].slice(0, MAX_SLIDE_IMAGES) }))}
                  onRemove={url => setForm(current => ({ ...current, images: current.images.filter(image => image !== url) }))}
                  onError={setError}
                />
                {form.images.length < MAX_SLIDE_IMAGES && (
                  <div className="mt-2 flex gap-2">
                    <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} className={inputClass}
                      placeholder="…ou collez l’adresse d’une image (https://…)" aria-label="Adresse d’une image" />
                    <button type="button" onClick={addImageUrl} disabled={!imageUrl.trim()}
                      className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl border border-stone-200 px-3 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50">
                      <ImagePlus className="h-4 w-4" />Ajouter
                    </button>
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="slide-cta" className={labelClass}>Texte du bouton</label>
                  <input id="slide-cta" value={form.ctaText} maxLength={40} onChange={e => patchForm({ ctaText: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="slide-link" className={labelClass}>Le bouton mène vers</label>
                  <select id="slide-link" value={linkChoice} className={inputClass}
                    onChange={e => {
                      setLinkChoice(e.target.value)
                      patchForm({ ctaLink: e.target.value === CUSTOM_LINK ? '' : e.target.value })
                    }}>
                    {linkOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    <option value={CUSTOM_LINK}>Autre lien…</option>
                  </select>
                </div>
              </div>
              {linkChoice === CUSTOM_LINK && (
                <div>
                  <label htmlFor="slide-custom-link" className={labelClass}>Adresse du lien</label>
                  <input id="slide-custom-link" value={form.ctaLink} onChange={e => patchForm({ ctaLink: e.target.value })} className={inputClass}
                    placeholder="/produits/… ou https://…" />
                  <p className="mt-1 text-xs text-stone-500">Astuce : ouvrez la page voulue sur le site et copiez la fin de l’adresse (à partir du « / »).</p>
                </div>
              )}

              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-stone-800">
                <input type="checkbox" checked={form.isActive} onChange={e => patchForm({ isActive: e.target.checked })} className="h-5 w-5 rounded accent-emerald-600" />
                Afficher sur le site
              </label>

              <details className="rounded-xl border border-stone-200 p-3">
                <summary className="flex min-h-9 cursor-pointer items-center gap-2 text-sm font-semibold text-stone-800">
                  <CalendarClock className="h-4 w-4" />Programmer (facultatif)
                  {(form.startDate || form.endDate) && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">dates définies</span>}
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="slide-start" className={labelClass}>Visible à partir du</label>
                    <input id="slide-start" type="datetime-local" value={form.startDate} onChange={e => patchForm({ startDate: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="slide-end" className={labelClass}>Jusqu’au</label>
                    <input id="slide-end" type="datetime-local" value={form.endDate} onChange={e => patchForm({ endDate: e.target.value })} className={inputClass} />
                  </div>
                </div>
              </details>

              <div className="flex flex-wrap gap-3 pt-1">
                <button type="button" onClick={save} disabled={saving}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                  <Save className="h-4 w-4" />{saving ? 'Enregistrement…' : editingId ? 'Enregistrer' : 'Créer la slide'}
                </button>
                <button type="button" onClick={closeForm} className="min-h-11 rounded-xl px-5 font-medium text-stone-600 hover:bg-stone-100">Annuler</button>
              </div>
            </div>

            <div className="lg:sticky lg:top-4 lg:self-start">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-stone-800">Aperçu</p>
                <div className="inline-flex rounded-lg border border-stone-200 p-0.5" role="group" aria-label="Taille de l’aperçu">
                  <button type="button" onClick={() => setPreviewMobile(false)} aria-pressed={!previewMobile}
                    className={cn('inline-flex min-h-9 items-center gap-1 rounded-md px-2.5 text-xs font-medium', !previewMobile ? 'bg-stone-900 text-white' : 'text-stone-600')}>
                    <Monitor className="h-3.5 w-3.5" />Ordinateur
                  </button>
                  <button type="button" onClick={() => setPreviewMobile(true)} aria-pressed={previewMobile}
                    className={cn('inline-flex min-h-9 items-center gap-1 rounded-md px-2.5 text-xs font-medium', previewMobile ? 'bg-stone-900 text-white' : 'text-stone-600')}>
                    <Smartphone className="h-3.5 w-3.5" />Mobile
                  </button>
                </div>
              </div>
              <ScaledPreview width={previewMobile ? 360 : 1200}>
                <PromoSlideView slide={toHeroSlide(form)} preview eager />
              </ScaledPreview>
              <p className="mt-2 text-xs text-stone-500">L’aperçu se met à jour pendant la saisie. Le bouton n’est pas cliquable ici.</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {slides.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white px-4 py-12 text-center">
            <ImagePlus className="mx-auto mb-3 h-12 w-12 text-stone-300" />
            <p className="font-medium text-stone-700">Aucune slide pour le moment</p>
            <p className="text-sm text-stone-500">Les 3 slides automatiques s’affichent sur le site. Créez la vôtre en partant d’un modèle.</p>
          </div>
        ) : (
          slides.map((slide, index) => {
            const status = slideStatus(slide)
            const theme = SLIDE_THEMES[resolveSlideTheme(slide.bgColor)]
            const image = sanitizeSlideImages(slide.images)[0]
            return (
              <div key={slide._id} className={cn('flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 sm:flex-nowrap sm:p-4', !slide.isActive && 'opacity-70')}>
                <div className={cn('relative grid h-16 w-24 shrink-0 place-items-center overflow-hidden rounded-xl', theme.swatch)}>
                  {image && <img src={image} alt="" className="h-12 w-12 rotate-3 rounded-lg bg-white object-contain p-0.5 shadow" />}
                </div>
                <div className="min-w-0 flex-1 basis-40">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-stone-900 [overflow-wrap:anywhere]">{slide.title}</h3>
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', status.tone)}>{status.label}</span>
                  </div>
                  {slide.subtitle && <p className="truncate text-sm text-stone-500">{slide.subtitle}</p>}
                  <p className="mt-0.5 truncate text-xs text-stone-400">Bouton « {slide.ctaText} » → {slide.ctaLink === SOURCING_LINK ? 'Trouvez-moi' : slide.ctaLink}</p>
                </div>
                <div className="flex w-full items-center justify-end gap-1 sm:w-auto">
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Monter"
                    className="grid h-10 w-10 place-items-center rounded-lg text-stone-500 hover:bg-stone-100 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                  <button type="button" onClick={() => move(index, 1)} disabled={index === slides.length - 1} aria-label="Descendre"
                    className="grid h-10 w-10 place-items-center rounded-lg text-stone-500 hover:bg-stone-100 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                  <button type="button" onClick={() => toggleActive(slide)} aria-label={slide.isActive ? 'Masquer' : 'Afficher'} title={slide.isActive ? 'Masquer' : 'Afficher'}
                    className="grid h-10 w-10 place-items-center rounded-lg text-stone-500 hover:bg-stone-100">
                    {slide.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button type="button" onClick={() => openEdit(slide)} aria-label="Modifier" title="Modifier"
                    className="grid h-10 w-10 place-items-center rounded-lg text-stone-500 hover:bg-stone-100"><Pencil className="h-4 w-4" /></button>
                  <button type="button" onClick={() => remove(slide)} aria-label="Supprimer" title="Supprimer"
                    className="grid h-10 w-10 place-items-center rounded-lg text-stone-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
