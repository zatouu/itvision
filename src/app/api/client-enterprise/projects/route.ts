import { NextRequest, NextResponse } from 'next/server'
import { requireDomainAccess, companyScope } from '@/lib/domain-access'
import { connectDB } from '@/lib/db'
import mongoose from 'mongoose'
import Project from '@/lib/models/Project'
import { clientProjectFilter, detectDomain, projectStage } from '@/lib/portal/project-view'

/** GET — projets partagés avec l'entreprise (données visibles par le client uniquement). */
export async function GET(request: NextRequest) {
  const result = await requireDomainAccess(request, 'corporate')
  if (!result.ok) return result.response
  const { access } = result
  await connectDB()
  const userId = new mongoose.Types.ObjectId(access.userId)
  const companyId = access.profiles.companyClientId
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')

  const projects = await Project.find(clientProjectFilter(companyScope({ userId, companyId }), status ? { status } : {}))
    .sort({ updatedAt: -1 })
    .select('name description status progress currentPhase serviceType address startDate endDate milestones.id milestones.name milestones.status milestones.dueDate quote.status updatedAt')
    .lean() as any[]

  return NextResponse.json({
    projects: projects.map(p => ({
      ...p,
      _id: String(p._id),
      domain: detectDomain(p.serviceType, p.name),
      stage: projectStage(p),
    })),
  })
}
