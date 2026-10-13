'use client'

import { useEffect, useState } from 'react'
import { Copy, Check, Download, Share2, Video, Loader2, X } from 'lucide-react'
import { formatFcfa } from '@/components/market/storefront/formatFcfa'
import { canRenderGroupVideo, renderProductVideo } from '@/components/market/storefront/group-video'
import { MARKET_BRAND } from '@/lib/branding'

type KitProduct = { id: string; name: string; price?: number; stockQuantity: number; stockStatus: string }

/**
 * Kit de vente d'un produit de boutique : message prêt à coller, visuels (statut, aperçu de lien)
 * et vidéo 10 s pour WhatsApp, TikTok et Instagram.
 */
export default function SalesKitModal({ product, shopName, onClose }: { product: KitProduct; shopName: string; onClose: () => void }) {
  const url = `${MARKET_BRAND.url}/produits/${product.id}`
  const local = product.stockStatus === 'in_stock' && product.stockQuantity > 0
  const text = [
    `*${product.name}*`,
    product.price ? `${formatFcfa(product.price)}${local ? ' · en stock à Dakar, livré en 24 h' : ''}` : '',
    'Paiement garanti : remboursé si non livré.',
    `Commandez ici : ${url}`,
  ].filter(Boolean).join('\n')

  const [copied, setCopied] = useState(false)
  const [storyFile, setStoryFile] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [progress, setProgress] = useState<number | null>(null)
  const [notice, setNotice] = useState('')
  const [videoSupported, setVideoSupported] = useState(false)

  useEffect(() => { setVideoSupported(canRenderGroupVideo()) }, [])
  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl) }, [videoUrl])

  // Visuel préchargé : le partage natif doit suivre immédiatement le geste de l'utilisateur
  useEffect(() => {
    let cancelled = false
    fetch(`/api/og/product/${product.id}?format=story`)
      .then(r => (r.ok ? r.blob() : null))
      .then(b => { if (b && !cancelled) setStoryFile(new File([b], `produit-${product.id}.png`, { type: 'image/png' })) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [product.id])

  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
  }

  const share = async (file: File | null) => {
    setNotice('')
    if (file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text })
        return
      } catch (e: any) {
        if (e?.name === 'AbortError') return
      }
    }
    if (file) {
      const href = URL.createObjectURL(file)
      const a = document.createElement('a')
      a.href = href
      a.download = file.name
      a.click()
      setTimeout(() => URL.revokeObjectURL(href), 5000)
    }
    await navigator.clipboard?.writeText(text).catch(() => {})
    setNotice('Fichier téléchargé et message copié : publiez-les depuis votre téléphone.')
  }

  const makeVideo = async () => {
    if (progress !== null) return
    setNotice(''); setProgress(0)
    try {
      const file = await renderProductVideo({
        name: product.name,
        price: product.price || 0,
        shopName,
        badge: local ? 'En stock à Dakar · livré en 24 h' : 'Sur commande',
        link: url,
        brand: MARKET_BRAND.name,
        photoUrl: `/api/og/product/${product.id}?format=photo`,
      }, setProgress)
      setVideoFile(file)
      setVideoUrl(URL.createObjectURL(file))
    } catch (e: any) {
      setNotice(e?.message || 'Vidéo impossible sur ce navigateur')
    } finally {
      setProgress(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 dark:bg-slate-900 sm:max-w-lg sm:rounded-3xl" onClick={e => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[16px] font-extrabold text-slate-900 dark:text-white">Kit de vente</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16} className="text-slate-400" /></button>
        </div>
        <p className="text-[12px] text-slate-500">Tout est prêt pour vendre <b>{product.name}</b> sur WhatsApp, TikTok et Instagram.</p>

        <div className="mt-4 flex gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/og/product/${product.id}?format=story`} alt="Visuel statut" className="h-40 w-[90px] shrink-0 rounded-lg bg-slate-100 object-cover" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <button onClick={() => share(storyFile)} disabled={!storyFile} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-[13px] font-bold text-white disabled:opacity-50">
              <Share2 size={15} /> Statut WhatsApp / TikTok
            </button>
            <a href={`/api/og/product/${product.id}?format=card`} download={`produit-${product.id}.png`} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-800 dark:border-slate-700 dark:text-white">
              <Download size={15} /> Visuel horizontal
            </a>
            {videoSupported && !videoFile && (
              <button onClick={makeVideo} disabled={progress !== null} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-800 disabled:opacity-60 dark:border-slate-700 dark:text-white">
                {progress !== null ? <><Loader2 size={15} className="animate-spin" /> Vidéo… {Math.round(progress)} %</> : <><Video size={15} /> Créer la vidéo (10 s)</>}
              </button>
            )}
            {videoFile && (
              <button onClick={() => share(videoFile)} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 text-[13px] font-bold text-white">
                <Video size={15} /> Publier la vidéo
              </button>
            )}
          </div>
        </div>
        {videoUrl && <video src={videoUrl} controls playsInline className="mt-3 w-full rounded-xl bg-black" />}

        <div className="mt-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Message</p>
          <pre className="mt-1 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-[12px] text-slate-800 dark:bg-slate-800 dark:text-slate-200">{text}</pre>
          <div className="mt-2 flex gap-2">
            <button onClick={copy} className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 px-3 text-xs font-bold dark:border-slate-700 dark:text-white">
              {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copié' : 'Copier'}
            </button>
            <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1 rounded-xl bg-[#25D366] px-3 text-xs font-bold text-white">
              <Share2 size={13} /> Envoyer sur WhatsApp
            </a>
          </div>
        </div>
        {notice && <p className="mt-3 text-[12px] text-slate-600 dark:text-slate-300">{notice}</p>}
      </div>
    </div>
  )
}
