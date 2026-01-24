import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

// Types MIME pour les images et vidéos
const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
  '.mov': 'video/quicktime',
  '.m4v': 'video/x-m4v'
}

/**
 * GET /api/uploads/[...path]
 * Sert les fichiers uploadés dynamiquement
 * Cette route est nécessaire pour servir les fichiers en mode standalone
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params
    
    // Reconstruire le chemin du fichier
    const filePath = pathSegments.join('/')
    
    // Sécurité: empêcher le path traversal
    if (filePath.includes('..') || filePath.includes('~')) {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 })
    }
    
    // Chemin complet du fichier
    const fullPath = path.join(process.cwd(), 'public', 'uploads', filePath)
    
    // Vérifier si le fichier existe
    if (!existsSync(fullPath)) {
      return NextResponse.json({ error: 'Fichier non trouvé' }, { status: 404 })
    }
    
    // Lire le fichier
    const fileBuffer = await readFile(fullPath)
    
    // Déterminer le type MIME
    const ext = path.extname(fullPath).toLowerCase()
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream'
    
    // Convertir le Buffer en Uint8Array pour NextResponse
    const uint8Array = new Uint8Array(fileBuffer)
    
    // Retourner le fichier avec les bons headers
    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': fileBuffer.length.toString()
      }
    })
  } catch (error) {
    console.error('Erreur lecture fichier:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
