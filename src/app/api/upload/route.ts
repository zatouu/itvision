import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { createWriteStream, existsSync } from 'fs'
import path from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import { applyRateLimit, staffUploadRateLimiter, uploadRateLimiter } from '@/lib/rate-limiter'
import { requireApiUser } from '@/lib/api-auth'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

const STAFF_UPLOAD_ROLES = ['ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER', 'ACCOUNTANT', 'TECHNICIAN']

// Vérification d'authentification requise pour l'upload
async function verifyAuth(request: NextRequest): Promise<{ authenticated: boolean; userId?: string; role?: string }> {
  try {
    const { userId, role } = await requireApiUser(request)
    return { authenticated: true, userId, role }
  } catch {
    return { authenticated: false }
  }
}

export async function POST(request: NextRequest) {
  try {
    // SÉCURITÉ: Vérifier l'authentification (avant la limite : le quota dépend du rôle)
    const auth = await verifyAuth(request)
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      )
    }

    // SÉCURITÉ: Rate limiting — 10 uploads/heure, quota élargi pour le personnel (galeries produits, documents)
    const isStaff = STAFF_UPLOAD_ROLES.includes(String(auth.role || '').toUpperCase())
    const rateLimitResponse = await applyRateLimit(request, isStaff ? staffUploadRateLimiter : uploadRateLimiter)
    if (rateLimitResponse) return rateLimitResponse

    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      // Corps tronqué : envoi interrompu (réseau mobile) ou fichier au-delà des limites serveur
      const declared = Number(request.headers.get('content-length') || 0)
      console.warn(`[upload] corps multipart illisible (${declared ? `${(declared / 1024 / 1024).toFixed(1)} Mo déclarés` : 'taille inconnue'})`)
      return NextResponse.json(
        { error: declared > 100 * 1024 * 1024 ? 'Fichier trop volumineux (100 Mo max)' : 'Envoi du fichier interrompu, réessayez (connexion instable ?)' },
        { status: declared > 100 * 1024 * 1024 ? 413 : 400 }
      )
    }
    const file = formData.get('file') as File
    const type = formData.get('type') as string || 'general'
    
    // SÉCURITÉ: Valider le type (éviter path traversal)
    const safeType = type.replace(/[^a-zA-Z0-9_-]/g, '')
    
    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      )
    }

    // Vérifier le type de fichier (images + vidéo + audio)
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
    const allowedAudioTypes = ['audio/mp4', 'audio/m4a', 'audio/aac', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/x-m4a']

    const lowerName = file.name.toLowerCase()
    const isJpeg = file.type === 'image/jpeg' ||
      file.type === 'image/jpg' ||
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg')

    const isVideoExt = /\.(mp4|webm|ogg|mov|m4v|avi|mkv)$/i.test(lowerName)
    const isAudioExt = /\.(m4a|aac|mp3|wav|ogg|webm|caf)$/i.test(lowerName)
    const isAllowedImage = allowedImageTypes.includes(file.type) || isJpeg
    const isAllowedVideo =
      allowedVideoTypes.includes(file.type) ||
      (isVideoExt && (file.type === '' || file.type === 'application/octet-stream' || file.type.startsWith('video/')))
    const isAllowedAudio =
      allowedAudioTypes.includes(file.type) ||
      (isAudioExt && (file.type === '' || file.type === 'application/octet-stream' || file.type.startsWith('audio/')))

    if (!isAllowedImage && !isAllowedVideo && !isAllowedAudio) {
      return NextResponse.json(
        { error: `Type de fichier non autorisé: ${file.type || 'inconnu'}` },
        { status: 400 }
      )
    }

    // Vérifier la taille
    const maxImageSize = 10 * 1024 * 1024 // 10MB
    const maxVideoSize = 100 * 1024 * 1024 // 100MB (courte vidéo)
    const maxAudioSize = 10 * 1024 * 1024 // 10MB (note vocale)
    const maxSize = isAllowedVideo ? maxVideoSize : isAllowedAudio ? maxAudioSize : maxImageSize

    if (file.size > maxSize) {
      return NextResponse.json(
        { error: isAllowedVideo ? 'Vidéo trop volumineuse (100 Mo max)' : 'Fichier trop volumineux (10 Mo max)' },
        { status: 400 }
      )
    }

    // Créer le nom de fichier unique
    const timestamp = Date.now()
    const randomString = crypto.randomUUID().replace(/-/g, '').substring(0, 13)
    const extension = path.extname(file.name)
    const filename = `${timestamp}-${randomString}${extension}`

    // Créer le dossier de destination
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', safeType)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Sauvegarder le fichier (streaming pour les gros fichiers vidéo)
    const filepath = path.join(uploadDir, filename)
    if (isAllowedVideo && file.size > 5 * 1024 * 1024) {
      // Streaming pour fichiers > 5MB (évite de tout charger en RAM)
      const webStream = file.stream()
      const nodeStream = Readable.fromWeb(webStream as any)
      const writeStream = createWriteStream(filepath)
      await pipeline(nodeStream, writeStream)
      console.log(`[upload] Vidéo streamée: ${filename} (${(file.size / 1024 / 1024).toFixed(1)}MB)`)
    } else {
      const bytes = await file.arrayBuffer()
      await writeFile(filepath, new Uint8Array(bytes))
      console.log(`[upload] Fichier écrit: ${filename} (${(file.size / 1024).toFixed(0)}KB)`)
    }

    // URL publique - utiliser l'API pour servir les fichiers en mode standalone
    // En développement, les fichiers statiques fonctionnent directement
    // En production standalone, on utilise l'API pour servir les fichiers
    const publicUrl = `/api/uploads/${safeType}/${filename}`
    
    // URL alternative directe (fonctionne si nginx est configuré pour servir /uploads)
    const staticUrl = `/uploads/${safeType}/${filename}`

    return NextResponse.json({
      success: true,
      filename,
      url: publicUrl, // URL via API (toujours fonctionnelle)
      staticUrl, // URL directe (si serveur configuré)
      size: file.size,
      type: file.type
    })

  } catch (error) {
    console.error('Erreur upload:', error)
    const code = (error as NodeJS.ErrnoException)?.code
    const message = code === 'EACCES' || code === 'EPERM'
      ? 'Stockage des fichiers non accessible en écriture sur le serveur (droits du volume uploads)'
      : code === 'ENOSPC'
        ? 'Espace disque insuffisant sur le serveur'
        : 'Erreur lors de l\'upload'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}