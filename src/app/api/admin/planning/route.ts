import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Intervention from '@/lib/models/Intervention'
import Technician from '@/lib/models/Technician'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import { requireInterventionAccess } from '@/app/api/interventions/route'

// GET — Planning admin unifié (calendrier + liste)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireInterventionAccess(request)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    await connectMongoose()
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const status = searchParams.get('status')
    const technicianId = searchParams.get('technicianId')
    const view = searchParams.get('view') || 'list' // 'list' | 'calendar'

    const query: any = {}
    if (from || to) {
      query.date = {}
      if (from) query.date.$gte = new Date(from)
      if (to) query.date.$lte = new Date(to)
    }
    if (status && status !== 'all') query.status = status
    if (technicianId && technicianId !== 'all') {
      query.$or = [
        { technicienId: technicianId },
        { assignedTechnician: technicianId }
      ]
    }

    const interventions = await Intervention.find(query)
      .sort({ date: 1, createdAt: -1 })
      .limit(view === 'calendar' ? 500 : 200)
      .lean() as any[]

    // Enrichir avec les données liées
    const technicianIds = interventions
      .map(i => i.technicienId || i.assignedTechnician)
      .filter(Boolean)
    const contractIds = interventions
      .map(i => i.maintenanceContractId)
      .filter(Boolean)

    const [technicians, contracts] = await Promise.all([
      Technician.find({ _id: { $in: technicianIds } }).select('name specialties isAvailable').lean(),
      MaintenanceContract.find({ _id: { $in: contractIds } }).select('contractNumber type').lean()
    ])

    const techMap = new Map(technicians.map(t => [String(t._id), t]))
    const contractMap = new Map(contracts.map(c => [String(c._id), c]))

    const enriched = interventions.map(i => {
      const tech = i.technicienId ? techMap.get(String(i.technicienId)) : undefined
      const contract = i.maintenanceContractId ? contractMap.get(String(i.maintenanceContractId)) : undefined
      return {
        ...i,
        technician: tech ? { name: tech.name, specialties: tech.specialties, isAvailable: tech.isAvailable } : null,
        contract: contract ? { contractNumber: contract.contractNumber, type: contract.type } : null,
        _id: String(i._id)
      }
    })

    // Grouping pour calendrier
    const byDate: Record<string, typeof enriched> = {}
    if (view === 'calendar') {
      for (const item of enriched) {
        const d = item.date ? new Date(item.date).toISOString().split('T')[0] : 'unscheduled'
        byDate[d] = byDate[d] || []
        byDate[d].push(item)
      }
    }

    // Stats résumées
    const stats = {
      total: enriched.length,
      pending: enriched.filter(i => i.status === 'pending').length,
      scheduled: enriched.filter(i => i.status === 'scheduled').length,
      inProgress: enriched.filter(i => i.status === 'in_progress').length,
      completed: enriched.filter(i => i.status === 'completed').length,
      unassigned: enriched.filter(i => !i.technicienId).length
    }

    return NextResponse.json({
      success: true,
      view,
      stats,
      data: view === 'calendar' ? byDate : enriched,
      technicians: technicians.map(t => ({ id: String(t._id), name: t.name }))
    })

  } catch (error: any) {
    console.error('Erreur planning admin:', error)
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 })
  }
}
