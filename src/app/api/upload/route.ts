import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { applyRateLimit, uploadRateLimiter } from '@/lib/rate-limiter'
import { requireAuth } from '@/lib/jwt'

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

    // Vérifier le type de fichier (images + courte vidéo)
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']

    const lowerName = file.name.toLowerCase()
    const isJpeg = file.type === 'image/jpeg' ||
      file.type === 'image/jpg' ||
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg')

    const isVideoExt = /\.(mp4|webm|ogg|mov|m4v|avi|mkv)$/i.test(lowerName)
    const isAllowedImage = allowedImageTypes.includes(file.type) || isJpeg
    const isAllowedVideo =
      allowedVideoTypes.includes(file.type) ||
      (isVideoExt && (file.type === '' || file.type === 'application/octet-stream' || file.type.startsWith('video/')))

    if (!isAllowedImage && !isAllowedVideo) {
      return NextResponse.json(
        { error: `Type de fichier non autorisé: ${file.type || 'inconnu'}` },
        { status: 400 }
      )
    }

    // Vérifier la taille
    const maxImageSize = 10 * 1024 * 1024 // 10MB
    const maxVideoSize = 100 * 1024 * 1024 // 100MB (courte vidéo)
    const maxSize = isAllowedVideo ? maxVideoSize : maxImageSize

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

    // Sauvegarder le fichier
    const filepath = path.join(uploadDir, filename)
    const bytes = await file.arrayBuffer()
    await writeFile(filepath, new Uint8Array(bytes))

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