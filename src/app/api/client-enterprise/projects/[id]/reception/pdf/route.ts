import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db'
import { requireDomainAccess, companyScope } from '@/lib/domain-access'
import Project from '@/lib/models/Project'
import { CLIENT_VISIBLE_PROJECT } from '@/lib/portal/project-view'
import { latestReceptionPdf, receptionPdfFilename } from '@/lib/pdf-reception'

export const runtime = 'nodejs'

// GET /api/client-enterprise/projects/[id]/reception/pdf[?inline=1]
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireDomainAccess(request, 'corporate')
  if (!result.ok) return result.response
  const { access } = result
  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

  await connectDB()
  const userId = new mongoose.Types.ObjectId(access.userId)
  const project = await Project.findOne({
    $and: [{ _id: new mongoose.Types.ObjectId(id) }, companyScope({ userId, companyId: access.profiles.companyClientId }), CLIENT_VISIBLE_PROJECT],
  }).populate('clientCompanyId', 'name company').lean() as any
  if (!project?.reception?.signedAt) return NextResponse.json({ error: 'PV non signé' }, { status: 404 })

  try {
    const { data } = await latestReceptionPdf(project)
    const inline = request.nextUrl.searchParams.get('inline') === '1'
    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${receptionPdfFilename(project)}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (e) {
    console.error('[portail] PDF PV de réception', e)
    return NextResponse.json({ error: 'Génération du PDF impossible' }, { status: 500 })
  }
}
