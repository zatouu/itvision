'use client'

import { useState } from 'react'
import { X, Image as ImageIcon } from 'lucide-react'
import FileDropZone from '@/components/ui/FileDropZone'
import { IMAGE_ACCEPT, uploadFile } from '@/lib/http/upload-file'

interface ImageUploadProps {
  onUpload: (url: string, filename: string) => void
  onRemove?: (url: string) => void
  maxFiles?: number
  type?: string
  existingImages?: string[]
  disabled?: boolean
  onError?: (message: string) => void
  /** Masque la grille d'aperçu (quand l'image est déjà affichée ailleurs, ex. avatar). */
  hidePreview?: boolean
}

const MAX_MB = 10

export default function ImageUpload({
  onUpload,
  onRemove,
  maxFiles = 5,
  type = 'general',
  existingImages = [],
  disabled = false,
  onError,
  hidePreview = false,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  // Une seule image : un nouveau dépôt remplace l'actuelle (avatar, logo)
  const replaceMode = maxFiles === 1
  const remaining = replaceMode ? 1 : Math.max(0, maxFiles - existingImages.length)

  const report = (message: string) => {
    setError(message)
    onError?.(message)
  }

  const handleFiles = async (files: File[]) => {
    setError('')
    setUploading(true)
    try {
      for (const file of files.slice(0, remaining)) {
        const uploaded = await uploadFile(file, { endpoint: '/api/upload', fields: { type } })
        onUpload(uploaded.url, uploaded.filename)
      }
    } catch (err) {
      report(err instanceof Error ? err.message : 'Erreur lors de l’envoi de l’image')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      {remaining > 0 && !disabled && (
        <FileDropZone
          onFiles={handleFiles}
          accept={IMAGE_ACCEPT}
          multiple={!replaceMode}
          maxFiles={remaining}
          maxSizeMb={MAX_MB}
          busy={uploading}
          compact={replaceMode}
          onError={report}
          label={replaceMode
            ? (existingImages.length ? 'Remplacer l’image (glisser ou cliquer)' : 'Glissez une image ou cliquez')
            : 'Glissez vos images ici ou cliquez pour parcourir'}
          hint={`PNG, JPG, WEBP, GIF — ${MAX_MB} Mo max (${existingImages.length}/${maxFiles})`}
        />
      )}
      {error && <p role="alert" className="text-xs font-medium text-red-600">{error}</p>}

      {!hidePreview && existingImages.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {existingImages.map((imageUrl, index) => (
            <div key={`${imageUrl}-${index}`} className="group relative">
              <div className="aspect-square overflow-hidden rounded-lg bg-stone-100">
                <img src={imageUrl} alt={`Image ${index + 1}`} className="h-full w-full object-cover" />
              </div>
              {onRemove && !disabled && (
                <button
                  type="button"
                  onClick={() => onRemove(imageUrl)}
                  aria-label="Retirer l’image"
                  className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow-lg transition-opacity hover:bg-red-600 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!hidePreview && existingImages.length === 0 && !replaceMode && (
        <div className="py-6 text-center text-stone-500">
          <ImageIcon className="mx-auto mb-2 h-10 w-10 opacity-50" />
          <p className="text-sm">Aucune image ajoutée</p>
        </div>
      )}
    </div>
  )
}
