import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { createWriteStream, existsSync } from 'fs'
import path from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import { applyRateLimit, uploadRateLimiter } from '@/lib/rate-limiter'
import { requireAuth } from '@/lib/jwt'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

// Vérification d'authentification requise pour l'upload
async function verifyAuth(request: NextRequest): Promise<{ authenticated: boolean; userId?: string; role?: string }> {
  try {
    const { userId, role } = await requireAuth(request)
    return { authenticated: true, userId, role }
  } catch {
    return { authenticated: false }
  }
}

export async function POST(request: NextRequest) {
  try {
    // SÉCURITÉ: Rate limiting (10 uploads par heure)
    const rateLimitResponse = applyRateLimit(request, uploadRateLimiter)
    if (rateLimitResponse) return rateLimitResponse

    // SÉCURITÉ: Vérifier l'authentification
    const auth = await verifyAuth(request)
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
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
        { error: isAllowedVideo ? 'Vidéo trop volumineuse (100MB max)' : 'Fichier trop volumineux (5MB max)' },
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
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload' },
      { status: 500 }
    )
  }
}