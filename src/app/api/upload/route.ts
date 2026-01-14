import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import jwt from 'jsonwebtoken'
import { applyRateLimit, uploadRateLimiter } from '@/lib/rate-limiter'

// Vérification d'authentification requise pour l'upload
function verifyAuth(request: NextRequest): { authenticated: boolean; userId?: string; role?: string } {
  const token = request.cookies.get('auth-token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '')
  
  if (!token) return { authenticated: false }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
    return { 
      authenticated: true, 
      userId: decoded.userId,
      role: String(decoded.role || '').toUpperCase()
    }
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
    const auth = verifyAuth(request)
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

    // Vérifier le type de fichier (image/jpeg couvre .jpg et .jpeg)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    // Certains navigateurs/systèmes peuvent envoyer un type incorrect pour les JPG
    const isJpeg = file.type === 'image/jpeg' || 
                   file.type === 'image/jpg' || 
                   file.name.toLowerCase().endsWith('.jpg') || 
                   file.name.toLowerCase().endsWith('.jpeg')
    const isAllowed = allowedTypes.includes(file.type) || isJpeg
    
    if (!isAllowed) {
      return NextResponse.json(
        { error: `Type de fichier non autorisé: ${file.type}` },
        { status: 400 }
      )
    }

    // Vérifier la taille (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux (5MB max)' },
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