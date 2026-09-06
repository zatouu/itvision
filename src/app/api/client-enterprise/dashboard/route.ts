import { NextRequest, NextResponse } from 'next/server'
import { requireDomainAccess, companyScope } from '@/lib/domain-access'
import { connectDB } from '@/lib/db'
import mongoose from 'mongoose'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import Intervention from '@/lib/models/Intervention'
import Project from '@/lib/models/Project'
import AdminQuote from '@/lib/models/AdminQuote'
import AdminInvoice from '@/lib/models/AdminInvoice'
import Ticket from '@/lib/models/Ticket'
import Client from '@/lib/models/Client'

export async function GET(request: NextRequest) {
  const result = await requireDomainAccess(request, 'corporate')
  if (!result.ok) return result.response
  const { access } = result

  await connectDB()
  const userId = new mongoose.Types.ObjectId(access.userId)
  const companyId = access.profiles.companyClientId

  const [
    clientDoc,
    contracts,
    recentInterventions,
    activeProjects,
    pendingQuotes,
    unpaidInvoices,
    openTickets
  ] = await Promise.all([
    (companyId ? Client.findById(companyId).select('name company city country contracts').lean() : Promise.resolve(null)),

    MaintenanceContract.find({ ...companyScope({ userId, companyId }), status: { $in: ['active', 'draft'] } })
      .sort({ endDate: 1 })
      .limit(5)
      .select('contractNumber name type status startDate endDate annualPrice coverage stats')
      .lean(),

    Intervention.find(companyScope({ userId, companyId }))
      .sort({ date: -1, createdAt: -1 })
      .limit(5)
      .select('interventionNumber title typeIntervention priority status date service site technicienId')
      .lean(),

    Project.find({
      ...companyScope({ userId, companyId }),
      status: { $in: ['in_progress', 'testing', 'approved', 'quoted'] }
    })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('name status startDate endDate progress currentPhase milestones value serviceType')
      .lean(),

    AdminQuote.find({
      ...(companyId ? { $or: [{ clientUserId: userId }, { clientCompanyId: companyId }] } : { clientUserId: userId }),
      status: { $in: ['sent', 'draft'] }
    })
      .sort({ date: -1 })
      .limit(5)
      .select('numero title date status total client')
      .lean(),

    AdminInvoice.find({
      ...(companyId ? { $or: [{ clientUserId: userId }, { clientCompanyId: companyId }] } : { clientUserId: userId }),
      status: { $in: ['sent', 'overdue'] }
    })
      .sort({ dueDate: 1 })
      .limit(5)
      .select('numero date dueDate status total client')
      .lean(),

    Ticket.find({ ...companyScope({ userId, companyId }), status: { $in: ['open', 'in_progress', 'waiting_client', 'waiting'] } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title category priority status createdAt sla')
      .lean()
  ])

  // Agrégations KPI
  const [
    totalContracts,
    totalInterventions,
    totalProjects,
    totalInvoicesDue,
    totalOpenTickets,
    interventionsThisMonth
  ] = await Promise.all([
    MaintenanceContract.countDocuments({ ...companyScope({ userId, companyId }), status: 'active' }),
    Intervention.countDocuments(companyScope({ userId, companyId })),
    Project.countDocuments(companyScope({ userId, companyId })),
    AdminInvoice.aggregate([
      { $match: { ...(companyId ? { $or: [{ clientUserId: userId }, { clientCompanyId: companyId }] } : { clientUserId: userId }), status: { $in: ['sent', 'overdue'] } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]),
    Ticket.countDocuments({ ...companyScope({ userId, companyId }), status: { $in: ['open', 'in_progress', 'waiting_client', 'waiting'] } }),
    Intervention.countDocuments({
      ...companyScope({ userId, companyId }),
      date: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
    })
  ])

  const amountDue = totalInvoicesDue[0]?.total ?? 0

  // Prochaine intervention planifiée
  const nextIntervention = await Intervention.findOne({
    ...companyScope({ userId, companyId }),
    date: { $gte: new Date() },
    status: { $nin: ['completed', 'cancelled'] }
  })
    .sort({ date: 1 })
    .select('title date service site')
    .lean()

  // Contrat proche expiration (60j)
  const expiringContract = contracts.find((c: any) => {
    const days = Math.floor((new Date(c.endDate).getTime() - Date.now()) / 86400000)
    return days > 0 && days <= 60
  })

  return NextResponse.json({
    company: clientDoc,
    kpis: {
      activeContracts: totalContracts,
      totalInterventions,
      totalProjects,
      amountDue,
      openTickets: totalOpenTickets,
      interventionsThisMonth
    },
    alerts: {
      expiringContract: expiringContract ? {
        id: String((expiringContract as any)._id),
        name: (expiringContract as any).name,
        endDate: (expiringContract as any).endDate,
        daysLeft: Math.floor((new Date((expiringContract as any).endDate).getTime() - Date.now()) / 86400000)
      } : null,
      overdueInvoices: unpaidInvoices.filter((i: any) => i.status === 'overdue').length,
      criticalTickets: openTickets.filter((t: any) => t.priority === 'urgent').length,
      nextIntervention: nextIntervention ? {
        title: (nextIntervention as any).title,
        date: (nextIntervention as any).date,
        site: (nextIntervention as any).site
      } : null
    },
    recent: {
      contracts,
      interventions: recentInterventions,
      projects: activeProjects,
      quotes: pendingQuotes,
      invoices: unpaidInvoices,
      tickets: openTickets
    }
  })
}
