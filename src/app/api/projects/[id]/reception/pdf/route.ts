import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import Project from '@/lib/models/Project'
import { latestReceptionPdf, receptionPdfFilename } from '@/lib/pdf-reception'

export const runtime = 'nodejs'

// GET /api/projects/[id]/reception/pdf[?inline=1] : PV de réception signé (version archivée la plus récente)
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

  await connectMongoose()
  const project = await Project.findById(id).populate('clientCompanyId', 'name company').lean() as any
  if (!project?.reception?.signedAt) return NextResponse.json({ error: 'PV non signé' }, { status: 404 })

  try {
    const { data, sha256 } = await latestReceptionPdf(project)
    const inline = request.nextUrl.searchParams.get('inline') === '1'
    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${receptionPdfFilename(project)}"`,
        'Cache-Control': 'private, no-store',
        ...(sha256 ? { 'X-Document-SHA256': sha256 } : {}),
      },
    })
  } catch (e) {
    console.error('[admin] PDF PV de réception', e)
    return NextResponse.json({ error: 'Génération du PDF impossible' }, { status: 500 })
  }
}
