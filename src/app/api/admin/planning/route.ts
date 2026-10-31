import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import Intervention from '@/lib/models/Intervention'
import Technician from '@/lib/models/Technician'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import MaintenanceActivity from '@/lib/models/MaintenanceActivity'
import { projectsCollection } from '@/lib/projects/persistence'
import { requireInterventionAccess } from '@/lib/interventions-access'

// GET — Planning admin unifié (calendrier + liste)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireInterventionAccess(request)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    if (auth.role === 'TECHNICIAN') {
      return NextResponse.json({ error: 'Acces refuse' }, { status: 403 })
    }

    await connectMongoose()
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const status = searchParams.get('status')
    const technicianId = searchParams.get('technicianId')
    const view = searchParams.get('view') || 'list' // 'list' | 'calendar' | 'agenda'

    // Agenda unifié : interventions + missions (activités) + jalons et tâches de projet, triés par jour
    if (view === 'agenda') {
      const today = new Date().toISOString().slice(0, 10)
      const fromS = (from || today).slice(0, 10)
      const toS = (to || '2099-12-31').slice(0, 10)
      const events: any[] = []
      const techName = new Map<string, string>()

      const [intvs, acts, projects] = await Promise.all([
        Intervention.find({}).sort({ date: 1 }).limit(500)
          .select('title status priority typeIntervention service date scheduledDate scheduledTime heureDebut site client technicienId assignedTechnician').lean(),
        MaintenanceActivity.find({}).sort({ date: 1 }).limit(300)
          .select('title clientName site date status category').lean(),
        projectsCollection().find({}, { projection: { name: 1, milestones: 1, tasks: 1 } }).limit(300).toArray(),
      ])

      const techIds = intvs.map(i => i.assignedTechnician || i.technicienId).filter(Boolean).map(String)
      if (techIds.length) {
        const techs = await Technician.find({ _id: { $in: techIds } }).select('name').lean() as any[]
        for (const t of techs) techName.set(String(t._id), t.name)
      }
      const inRange = (d: string | null | undefined) => !!d && d >= fromS && d <= toS

      for (const i of intvs) {
        const d = i.scheduledDate || (i.date ? new Date(i.date).toISOString().slice(0, 10) : '')
        if (!inRange(d)) continue
        events.push({
          kind: 'intervention', id: String(i._id), date: d,
          time: i.scheduledTime || i.heureDebut || '', title: i.title,
          status: i.status, site: i.site || '', client: i.client?.name || '',
          tech: techName.get(String(i.assignedTechnician || i.technicienId || '')) || '',
          interventionId: String(i._id),
        })
      }
      for (const a of acts) {
        const d = a.date ? new Date(a.date).toISOString().slice(0, 10) : ''
        if (!inRange(d)) continue
        events.push({
          kind: 'mission', id: String(a._id), date: d, title: a.title || a.clientName || 'Mission',
          status: a.status, site: a.site || '', client: a.clientName || '', href: '/admin/marketplace',
        })
      }
      for (const p of projects) {
        for (const m of p.milestones || []) {
          const d = m.dueDate ? new Date(m.dueDate).toISOString().slice(0, 10) : ''
          if (!inRange(d) || m.status === 'completed') continue
          events.push({ kind: 'milestone', id: `${p._id}-${m.id}`, date: d, title: `${p.name} — ${m.name}`, status: m.status, href: `/admin/projects/${p._id}` })
        }
        for (const t of p.tasks || []) {
          const d = t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : ''
          if (!inRange(d) || t.status === 'done') continue
          events.push({ kind: 'task', id: `${p._id}-${t.id}`, date: d, title: `${p.name} — ${t.title}`, status: t.status, href: `/admin/projects/${p._id}` })
        }
      }
      events.sort((a, b) => a.date === b.date ? String(a.time || '').localeCompare(String(b.time || '')) : a.date < b.date ? -1 : 1)
      return NextResponse.json({ success: true, view, events })
    }

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
