import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { requireAuth } from '@/lib/jwt'

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

const ALLOWED_EXTS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.doc', '.docx', '.xls', '.xlsx']

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

function requireAdmin(request: NextRequest) {
  return requireAuth(request).then(({ role }) => {
    const r = String(role || '').toUpperCase()
    if (!['ADMIN', 'SUPER_ADMIN'].includes(r)) throw new Error('Accès non autorisé')
  })
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request)

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const category = String(formData.get('category') || 'autre').replace(/[^a-zA-Z0-9_-]/g, '')

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    const ext = path.extname(file.name).toLowerCase()
    if (!ALLOWED_EXTS.includes(ext)) {
      return NextResponse.json({ error: `Extension non autorisée: ${ext}` }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'Fichier trop volumineux (10MB max)' }, { status: 400 })
    }

    // Type MIME check (permissif si le navigateur envoie application/octet-stream)
    const mimeOk = ALLOWED_TYPES.includes(file.type) || file.type === 'application/octet-stream'
    if (!mimeOk) {
      return NextResponse.json({ error: `Type de fichier non autorisé: ${file.type}` }, { status: 400 })
    }

    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 10)
    const safeName = `${timestamp}-${random}${ext}`

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'documents')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const bytes = await file.arrayBuffer()
    const filepath = path.join(uploadDir, safeName)
    await writeFile(filepath, new Uint8Array(bytes))

    const publicUrl = `/api/uploads/documents/${safeName}`
    const staticUrl = `/uploads/documents/${safeName}`

    return NextResponse.json({
      success: true,
      name: file.name,
      filename: safeName,
      url: publicUrl,
      staticUrl,
      size: file.size,
      type: file.type,
      category
    })
  } catch (error: any) {
    console.error('[upload-doc] Erreur:', error)
    const msg = error.message || 'Erreur serveur'
    const status = msg.includes('autorisé') || msg.includes('auth') ? 401 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
