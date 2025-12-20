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

    // Vérifier le type de fichier
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Type de fichier non autorisé' },
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

    // URL publique
    const publicUrl = `/uploads/${safeType}/${filename}`

    return NextResponse.json({
      success: true,
      filename,
      url: publicUrl,
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