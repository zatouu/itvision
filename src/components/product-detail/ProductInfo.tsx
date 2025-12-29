'use client'

import { motion } from 'framer-motion'
import { ShieldCheck, Star, Heart, FileDown, Share2 } from 'lucide-react'
import clsx from 'clsx'

interface ProductInfoProps {
  name: string
  tagline?: string | null
  baseCostLabel: string | null
  marginLabel: string | null
  deliveryDays: number | null
  isFavorite: boolean
  onToggleFavorite: () => void
  onExportPDF: () => void
  onShare: (platform?: 'whatsapp' | 'facebook' | 'twitter' | 'linkedin' | 'copy') => void
  shareFeedback: string | null
}

export default function ProductInfo({
  name,
  tagline,
  baseCostLabel,
  marginLabel,
  deliveryDays,
  isFavorite,
  onToggleFavorite,
  onExportPDF,
  onShare,
  shareFeedback
}: ProductInfoProps) {
  return (
    <div className="space-y-6">
      {/* En-tête produit */}
      <motion.div
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex-1">
          <motion.div
            className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 backdrop-blur-sm px-4 py-2 text-xs font-semibold text-emerald-300 border border-emerald-500/30"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <ShieldCheck className="h-4 w-4" />
            Sourcing sécurisé IT Vision
          </motion.div>
          
          <motion.h1
            className="mt-3 text-3xl sm:text-4xl font-bold text-slate-50 leading-tight tracking-tight"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {name}
          </motion.h1>
          
          {tagline && (
            <motion.p
              className="mt-2 text-base text-slate-300/90 font-light"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {tagline}
            </motion.p>
          )}
        </div>

        {/* Actions rapides */}
        <motion.div
          className="flex flex-wrap items-center gap-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <motion.button
            type="button"
            onClick={onToggleFavorite}
            className={clsx(
              'inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-semibold transition-all duration-300',
              isFavorite
                ? 'border-red-500/50 bg-red-500/20 text-red-300 hover:border-red-400/60 shadow-lg shadow-red-500/20'
                : 'border-slate-700 bg-slate-900/70 backdrop-blur-sm text-slate-200 hover:border-emerald-400/40 hover:text-emerald-200 hover:shadow-lg hover:shadow-emerald-500/10'
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <Heart className={clsx('h-4 w-4 transition-all', isFavorite && 'fill-red-400')} />
            {isFavorite ? 'Favori' : 'Favoris'}
          </motion.button>
          
          <motion.button
            type="button"
            onClick={onExportPDF}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 backdrop-blur-sm px-4 py-2.5 text-xs font-semibold text-slate-200 hover:border-emerald-400/40 hover:text-emerald-200 hover:shadow-lg hover:shadow-emerald-500/10 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Exporter en PDF"
          >
            <FileDown className="h-4 w-4" />
            PDF
          </motion.button>
          
          <div className="relative group">
            <motion.button
              type="button"
              onClick={() => onShare()}
              className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 backdrop-blur-sm px-4 py-2.5 text-xs font-semibold text-slate-200 hover:border-emerald-400/40 hover:text-emerald-200 hover:shadow-lg hover:shadow-emerald-500/10 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Share2 className="h-4 w-4" />
              Partager
            </motion.button>
            
            {/* Menu déroulant partage avec glassmorphism */}
            <div className="absolute right-0 top-full mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
              <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-2 shadow-2xl min-w-[200px]">
                <button
                  onClick={() => onShare('whatsapp')}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-emerald-500/10 hover:text-emerald-200 rounded-xl flex items-center gap-3 transition-all"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
                  </svg>
                  WhatsApp
                </button>
                <button
                  onClick={() => onShare('facebook')}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-emerald-500/10 hover:text-emerald-200 rounded-xl flex items-center gap-3 transition-all"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook
                </button>
                <button
                  onClick={() => onShare('twitter')}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-emerald-500/10 hover:text-emerald-200 rounded-xl flex items-center gap-3 transition-all"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                  Twitter
                </button>
                <button
                  onClick={() => onShare('linkedin')}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-emerald-500/10 hover:text-emerald-200 rounded-xl flex items-center gap-3 transition-all"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  LinkedIn
                </button>
                <div className="border-t border-slate-700/50 my-2"></div>
                <button
                  onClick={() => onShare('copy')}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-emerald-500/10 hover:text-emerald-200 rounded-xl flex items-center gap-3 transition-all"
                >
                  <Share2 className="h-5 w-5" />
                  Copier le lien
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {shareFeedback && (
        <motion.div
          className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          {shareFeedback}
        </motion.div>
      )}

      {/* Cartes d'info avec glassmorphism */}
      <motion.div
        className="grid gap-4 sm:grid-cols-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {/* Informations techniques */}
        <div className="rounded-2xl border border-slate-800/50 bg-slate-900/40 backdrop-blur-sm p-5 hover:border-emerald-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10">
          <div className="text-xs uppercase tracking-wider text-slate-500 mb-4 font-bold">Informations produit</div>
          <div className="space-y-3">
            {baseCostLabel && (
              <div className="flex items-center justify-between py-2 border-b border-slate-700/30">
                <span className="text-sm text-slate-400">Prix de base :</span>
                <strong className="text-sm text-slate-100 font-semibold">{baseCostLabel}</strong>
              </div>
            )}
            {marginLabel && (
              <div className="flex items-center justify-between py-2 border-b border-slate-700/30">
                <span className="text-sm text-slate-400">Marge :</span>
                <strong className="text-sm text-slate-100 font-semibold">{marginLabel}</strong>
              </div>
            )}
            {deliveryDays && (
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-400">Délai estimé :</span>
                <strong className="text-sm text-emerald-300 font-semibold">{deliveryDays} jours</strong>
              </div>
            )}
          </div>
        </div>

        {/* Badge de confiance avec glow effect */}
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-emerald-500/20 backdrop-blur-sm p-5 relative overflow-hidden group hover:shadow-lg hover:shadow-emerald-500/30 transition-all duration-300">
          {/* Effet de glow animé */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-200 mb-2">
              <Star className="h-5 w-5 text-emerald-400 fill-emerald-400 animate-pulse" />
              <span>Fiabilité vérifiée</span>
            </div>
            <div className="text-sm text-emerald-50/90 leading-relaxed">
              +50 projets réalisés • Livraison 3-15j • Contrôle qualité Dakar
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
