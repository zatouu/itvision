import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { connectMongoose } from '@/lib/mongoose'
import { requireAuth } from '@/lib/jwt'
import KycRequest from '@/lib/models/KycRequest'
import DisputeEvidence from '@/lib/models/DisputeEvidence'
import ServiceRequest from '@/lib/models/ServiceRequest'

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
  '.m4v': 'video/x-m4v',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.caf': 'audio/x-caf',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
}

// Préfixes sensibles : fichiers jamais publics (documents d'identité, preuves de litige).
// Un fichier présent sous ces préfixes DOIT être référencé en BDD pour être servi.
const PROTECTED_PREFIXES = new Set(['kyc', 'disputes'])

const STAFF_ROLES = new Set(['ADMIN', 'SUPER_ADMIN'])

function toStoredUrls(filePath: string): string[] {
  return [`/api/uploads/${filePath}`, `/uploads/${filePath}`]
}

/**
 * Retourne null si l'accès est autorisé, sinon la réponse d'erreur.
 * - kyc/* : propriétaire de la demande KYC ou staff
 * - disputes/* : uploader, client ou prestataire de la mission, ou staff
 * - autres préfixes : public, SAUF si le fichier est référencé par un KYC
 *   (docs legacy uploadés sous requests/ avant l'introduction du type kyc)
 */
async function checkUploadAccess(request: NextRequest, filePath: string): Promise<NextResponse | null> {
  const prefix = filePath.split('/')[0] || ''
  const candidates = toStoredUrls(filePath)

  await connectMongoose()

  const kyc = (await KycRequest.findOne({
    $or: [
      { idCardFrontUrl: { $in: candidates } },
      { idCardBackUrl: { $in: candidates } },
      { selfieUrl: { $in: candidates } },
    ],
  }).select('providerId').lean()) as { providerId?: unknown } | null

  let evidence: any = null
  if (prefix === 'disputes') {
    evidence = await DisputeEvidence.findOne({ url: { $in: candidates } })
      .select('requestId uploadedBy').lean()
  }

  const protectedHit = kyc || evidence || PROTECTED_PREFIXES.has(prefix)
  if (!protectedHit) return null

  let userId = ''
  let role = ''
  try {
    const auth = await requireAuth(request)
    userId = auth.userId
    role = auth.role || ''
  } catch {
    return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
  }

  if (STAFF_ROLES.has(role)) return null

  if (kyc) {
    if (String(kyc.providerId) === String(userId)) return null
    return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  }

  if (evidence) {
    if (String(evidence.uploadedBy) === String(userId)) return null
    const sr = await ServiceRequest.findById(evidence.requestId)
      .select('clientId assignedProviderId').lean()
    if (sr && (String(sr.clientId) === String(userId) || String(sr.assignedProviderId) === String(userId))) {
      return null
    }
    return NextResponse.json({ error: 'Interdit' }, { status: 403 })
  }

  // Fichier sous préfixe protégé mais référencé nulle part → refuser
  return NextResponse.json({ error: 'Interdit' }, { status: 403 })
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

    // Documents sensibles : accès restreint aux personnes concernées
    const denied = await checkUploadAccess(request, filePath)
    if (denied) return denied

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
