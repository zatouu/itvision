'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ShieldExclamationIcon, 
  CameraIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  PhotoIcon,
  XMarkIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import Image from 'next/image'

// Types
interface EscrowTransaction {
  reference: string
  buyerName: string
  buyerPhone: string
  status: string
  amount: number
  productName: string
  quantity: number
  dispute?: {
    reason: string
    description: string
    photos: string[]
    openedAt: Date
  }
}

// Background animé subtil
function DisputeBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Gradient de base - tons ambre/orange pour alerter */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-amber-950/20 to-slate-950" />
      
      {/* Grille subtile */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(251,191,36,0.5) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(251,191,36,0.5) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />
      
      {/* Orbes de gradient */}
      <motion.div 
        className="absolute top-0 right-1/4 w-[600px] h-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(251,191,36,0.08) 0%, transparent 70%)',
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      
      <motion.div 
        className="absolute bottom-0 left-1/3 w-[500px] h-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(239,68,68,0.06) 0%, transparent 70%)',
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.3, 0.4, 0.3],
        }}
        transition={{ duration: 10, repeat: Infinity, delay: 2 }}
      />
      
      {/* Particules flottantes */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-amber-400/30"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 4 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 3,
          }}
        />
      ))}
    </div>
  )
}

// Card avec effet glass
function GlassCard({ 
  children, 
  className = '',
  variant = 'default'
}: { 
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'warning' | 'danger'
}) {
  const variantStyles = {
    default: 'border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02]',
    warning: 'border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-500/5',
    danger: 'border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-500/5'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative overflow-hidden rounded-2xl border backdrop-blur-xl
        shadow-2xl shadow-black/20
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {/* Effet de brillance */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
      
      {/* Contenu */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  )
}

// Composant Upload avec preview
function ImageUpload({ 
  images, 
  onImagesChange,
  maxImages = 5
}: { 
  images: File[]
  onImagesChange: (images: File[]) => void
  maxImages?: number
}) {
  const [previews, setPreviews] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    // Créer les previews
    const urls = images.map(file => URL.createObjectURL(file))
    setPreviews(urls)
    
    return () => urls.forEach(url => URL.revokeObjectURL(url))
  }, [images])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type.startsWith('image/')
    )
    
    if (files.length + images.length <= maxImages) {
      onImagesChange([...images, ...files])
    }
  }, [images, maxImages, onImagesChange])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + images.length <= maxImages) {
      onImagesChange([...images, ...files])
    }
  }

  const removeImage = (index: number) => {
    const newImages = [...images]
    newImages.splice(index, 1)
    onImagesChange(newImages)
  }

  return (
    <div className="space-y-4">
      {/* Zone de drop */}
      <motion.div
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center
          transition-all duration-300
          ${isDragging 
            ? 'border-amber-400 bg-amber-400/10' 
            : 'border-white/20 hover:border-white/40 bg-white/5'
          }
        `}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        whileHover={{ scale: 1.01 }}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <motion.div
          animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
        >
          <CloudArrowUpIcon className="w-12 h-12 mx-auto text-amber-400/60 mb-4" />
          <p className="text-white/80 font-medium">
            Glissez vos photos ici ou cliquez pour sélectionner
          </p>
          <p className="text-white/40 text-sm mt-2">
            Maximum {maxImages} images • JPG, PNG, WEBP
          </p>
        </motion.div>
      </motion.div>

      {/* Previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          <AnimatePresence mode="popLayout">
            {previews.map((url, index) => (
              <motion.div
                key={url}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative aspect-square rounded-xl overflow-hidden group"
              >
                <Image src={url} alt={`Photo ${index + 1}`} fill className="object-cover" />

                {/* Overlay au hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <motion.button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="p-2 bg-red-500 rounded-full text-white"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </motion.button>
                </div>

                {/* Badge numéro */}
                <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{index + 1}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

// Raisons de litige prédéfinies
const disputeReasons = [
  { id: 'not_received', label: 'Produit non reçu', icon: '📦' },
  { id: 'wrong_product', label: 'Mauvais produit', icon: '🔄' },
  { id: 'damaged', label: 'Produit endommagé', icon: '💔' },
  { id: 'defective', label: 'Produit défectueux', icon: '⚠️' },
  { id: 'not_as_described', label: 'Non conforme à la description', icon: '📝' },
  { id: 'partial_order', label: 'Commande incomplète', icon: '❓' },
  { id: 'other', label: 'Autre raison', icon: '💬' }
]

export default function DisputePage() {
  const params = useParams()
  const router = useRouter()
  const reference = params.reference as string

  const [transaction, setTransaction] = useState<EscrowTransaction | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Formulaire
  const [selectedReason, setSelectedReason] = useState<string>('')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<File[]>([])
  const [phoneLast4, setPhoneLast4] = useState('')

  useEffect(() => {
    fetchTransaction()
  }, [reference])

  const fetchTransaction = async () => {
    try {
      const res = await fetch(`/api/escrow/${reference}`)
      if (!res.ok) throw new Error('Transaction non trouvée')
      
      const data = await res.json()
      setTransaction(data)
      
      // Vérifier si un litige existe déjà
      if (data.dispute) {
        setSubmitted(true)
      }
    } catch {
      setError('Transaction non trouvée')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedReason || !description) {
      setError('Veuillez remplir tous les champs requis')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // Upload des images si présentes
      let photoUrls: string[] = []
      
      if (images.length > 0) {
        const formData = new FormData()
        images.forEach(img => formData.append('photos', img))
        
        const uploadRes = await fetch('/api/upload/dispute', {
          method: 'POST',
          body: formData
        })
        
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          photoUrls = uploadData.urls
        }
      }

      // Soumettre le litige
      const res = await fetch(`/api/escrow/${reference}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: selectedReason,
          description,
          photos: photoUrls,
          phoneLast4
        })
      })

      if (!res.ok) throw new Error('Erreur lors de la soumission')
      
      setSubmitted(true)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la soumission')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <DisputeBackground />
        <motion.div
          className="relative"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <div className="w-16 h-16 border-4 border-amber-400/30 border-t-amber-400 rounded-full" />
        </motion.div>
      </div>
    )
  }

  if (error && !transaction) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <DisputeBackground />
        <GlassCard variant="danger" className="max-w-md w-full p-8 text-center">
          <ShieldExclamationIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Transaction non trouvée</h1>
          <p className="text-white/60 mb-6">
            Vérifiez votre référence et réessayez.
          </p>
          <Link href="/suivi">
            <motion.button
              className="px-6 py-3 bg-white/10 rounded-xl text-white font-medium"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Retourner au suivi
            </motion.button>
          </Link>
        </GlassCard>
      </div>
    )
  }

  // Écran de confirmation
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <DisputeBackground />
        
        <GlassCard className="max-w-lg w-full p-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center"
          >
            <CheckCircleIcon className="w-10 h-10 text-white" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-white text-center mb-4"
          >
            Litige soumis avec succès
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white/60 text-center mb-8"
          >
            Votre réclamation a été enregistrée. Notre équipe l&apos;examinera dans les plus brefs délais.
            Vous recevrez une notification par téléphone.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-6"
          >
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="w-6 h-6 text-amber-400" />
              <div>
                <p className="text-white/80 text-sm font-medium">Délai de traitement</p>
                <p className="text-white/50 text-xs">48 à 72 heures ouvrées</p>
              </div>
            </div>
          </motion.div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link href={`/suivi/${reference}`} className="flex-1">
              <motion.button
                className="w-full px-6 py-3 bg-white/10 rounded-xl text-white font-medium"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Voir ma commande
              </motion.button>
            </Link>
            
            <Link href="/support" className="flex-1">
              <motion.button
                className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl text-white font-medium"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Contacter le support
              </motion.button>
            </Link>
          </div>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <DisputeBackground />

      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link href={`/suivi/${reference}`}>
            <motion.button
              className="flex items-center gap-2 text-white/60 hover:text-white mb-4"
              whileHover={{ x: -5 }}
            >
              <ArrowLeftIcon className="w-5 h-5" />
              Retour au suivi
            </motion.button>
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/30 to-red-500/30 flex items-center justify-center">
              <ShieldExclamationIcon className="w-7 h-7 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Ouvrir un litige</h1>
              <p className="text-white/50">Référence: {reference}</p>
            </div>
          </div>
        </motion.div>

        {/* Info transaction */}
        <GlassCard className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <DocumentTextIcon className="w-5 h-5 text-amber-400" />
            Résumé de la commande
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-white/50 text-sm">Produit</p>
              <p className="text-white font-medium">{transaction?.productName}</p>
            </div>
            <div>
              <p className="text-white/50 text-sm">Quantité</p>
              <p className="text-white font-medium">{transaction?.quantity}</p>
            </div>
            <div>
              <p className="text-white/50 text-sm">Montant</p>
              <p className="text-white font-medium">{transaction?.amount?.toLocaleString()} FCFA</p>
            </div>
            <div>
              <p className="text-white/50 text-sm">Statut actuel</p>
              <p className="text-amber-400 font-medium">{transaction?.status}</p>
            </div>
          </div>
        </GlassCard>

        {/* Formulaire de litige */}
        <form onSubmit={handleSubmit}>
          {/* Sélection de la raison */}
          <GlassCard variant="warning" className="p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-400" />
              Raison du litige
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {disputeReasons.map((reason, index) => (
                <motion.button
                  key={reason.id}
                  type="button"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedReason(reason.id)}
                  className={`
                    p-4 rounded-xl border text-left transition-all
                    ${selectedReason === reason.id
                      ? 'border-amber-400 bg-amber-400/20'
                      : 'border-white/10 bg-white/5 hover:border-white/30'
                    }
                  `}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{reason.icon}</span>
                    <span className="text-white font-medium">{reason.label}</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </GlassCard>

          {/* Description détaillée */}
          <GlassCard className="p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <DocumentTextIcon className="w-5 h-5 text-amber-400" />
              Description du problème
            </h2>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez votre problème en détail. Plus vous êtes précis, plus vite nous pourrons vous aider..."
              className="w-full h-40 p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400/20 resize-none"
              required
            />
            
            <p className="text-white/40 text-sm mt-2">
              {description.length}/1000 caractères
            </p>
          </GlassCard>

          {/* Upload photos */}
          <GlassCard className="p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <PhotoIcon className="w-5 h-5 text-amber-400" />
              Photos justificatives
              <span className="text-white/40 text-sm font-normal">(optionnel mais recommandé)</span>
            </h2>

            <ImageUpload 
              images={images}
              onImagesChange={setImages}
              maxImages={5}
            />
          </GlassCard>

          {/* Vérification */}
          <GlassCard className="p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <ShieldExclamationIcon className="w-5 h-5 text-amber-400" />
              Vérification
            </h2>
            <p className="text-white/50 text-sm mb-4">
              Pour protéger votre commande, saisissez les 4 derniers chiffres du téléphone utilisé lors de l'achat.
            </p>
            <input
              value={phoneLast4}
              onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              pattern="\d{4}"
              placeholder="Ex: 1234"
              className="w-full max-w-xs px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
              required
            />
          </GlassCard>

          {/* Avertissement */}
          <GlassCard variant="warning" className="p-4 mb-6">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white/80 text-sm">
                  <strong>Important:</strong> Les litiges abusifs peuvent entraîner la suspension de votre compte.
                  Assurez-vous que votre réclamation est légitime et bien documentée.
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Erreur */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6"
              >
                <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-red-300">
                  {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bouton de soumission */}
          <motion.button
            type="submit"
            disabled={submitting || !selectedReason || !description}
            className={`
              w-full py-4 rounded-xl font-semibold text-white
              flex items-center justify-center gap-3
              transition-all
              ${submitting || !selectedReason || !description
                ? 'bg-white/10 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:shadow-lg hover:shadow-amber-500/25'
              }
            `}
            whileHover={!submitting && selectedReason && description ? { scale: 1.02 } : {}}
            whileTap={!submitting && selectedReason && description ? { scale: 0.98 } : {}}
          >
            {submitting ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
                Envoi en cours...
              </>
            ) : (
              <>
                <PaperAirplaneIcon className="w-5 h-5" />
                Soumettre le litige
              </>
            )}
          </motion.button>
        </form>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-white/40 text-sm mt-8"
        >
          💬 Besoin d&apos;aide ? Contactez-nous au support@exemple.com
        </motion.p>
      </div>
    </div>
  )
}
