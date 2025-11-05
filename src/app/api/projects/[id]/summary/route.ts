import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { connectMongoose } from '@/lib/mongoose'
import Project, { IProject } from '@/lib/models/Project'
import Ticket from '@/lib/models/Ticket'
import User, { IUser } from '@/lib/models/User'

type DecodedToken = {
  userId: string
  role: string
}

function extractToken(request: NextRequest): DecodedToken {
  const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) {
    throw new Error('Non authentifié')
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any
  const role = String(decoded.role || '').toUpperCase()
  const userId = String(decoded.userId || decoded.id || decoded.sub || '')

  if (!userId) {
    throw new Error('Token invalide')
  }

  return { userId, role }
}

export async function GET(request: NextRequest, context: any) {
  try {
    await connectMongoose()

    const { params } = context
    const { userId, role } = extractToken(request)
    const projectId = params.id

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return NextResponse.json({ error: 'Identifiant projet invalide' }, { status: 400 })
    }

    const project = await Project.findById(projectId).lean() as (IProject & { _id: mongoose.Types.ObjectId }) | null
    if (!project) {
      return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
    }

    const projectClientId = String(project.clientId)

    if (role === 'CLIENT' && projectClientId !== userId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    if (role === 'TECHNICIAN') {
      const assigned = Array.isArray(project.assignedTo) ? project.assignedTo : []
      const matchesAssignment = assigned.some((value) => {
        if (!value) return false
        if (value === userId) return true
        if (mongoose.Types.ObjectId.isValid(value) && value === userId) return true
        return false
      })

      if (!matchesAssignment) {
        return NextResponse.json({ error: 'Accès réservé aux techniciens assignés' }, { status: 403 })
      }
    }

    const timeline = (project.timeline || [])
      .filter((event) => role === 'CLIENT' ? event.clientVisible : true)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const documents = (project.documents || [])
      .filter((doc) => role === 'CLIENT' ? doc.clientVisible : true)
      .sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())

    const sharedNotes = (project.sharedNotes || [])
      .filter((note) => role === 'CLIENT' ? note.clientVisible : true)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const milestoneList = (project.milestones || []).sort((a, b) => {
      const da = a.dueDate ? new Date(a.dueDate).getTime() : 0
      const db = b.dueDate ? new Date(b.dueDate).getTime() : 0
      return da - db
    })

    const ticketQuery = { projectId: project._id }
    const tickets = await Ticket.find(ticketQuery).sort({ createdAt: -1 }).limit(20).lean()

    const assignedTechnicianIds = (project.assignedTo || []).filter((value) => mongoose.Types.ObjectId.isValid(value)) as string[]
    const assignedTechnicians = assignedTechnicianIds.length > 0
      ? await User.find({ _id: { $in: assignedTechnicianIds } }, { passwordHash: 0 }).lean()
      : []

    let clientProfile = project.clientSnapshot
    if (!clientProfile) {
      const clientUser = await User.findById(project.clientId).lean<IUser>()
      if (clientUser) {
        const clientAny = clientUser as IUser & { company?: string }
        clientProfile = {
          company: clientAny.company || clientUser.name || '',
          contact: clientUser.name || clientUser.username || '',
          phone: clientUser.phone || '',
          email: clientUser.email || ''
        }
      }
    }

    const stats = {
      progress: Number(project.progress ?? 0),
      margin: project.margin ?? 0,
      value: project.value ?? 0,
      tasksTotal: project.metrics?.tasksTotal ?? milestoneList.length,
      tasksCompleted: project.metrics?.tasksCompleted ?? milestoneList.filter((m) => m.status === 'completed').length,
      satisfactionScore: project.metrics?.satisfactionScore ?? null
    }

    return NextResponse.json({
      success: true,
      project: {
        id: String(project._id),
        name: project.name,
        description: project.description,
        address: project.address,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        serviceType: project.serviceType,
        currentPhase: project.currentPhase,
        clientAccess: project.clientAccess,
        site: project.site,
        clientSnapshot: clientProfile,
        nextMaintenance: project.nextMaintenance ?? null,
        maintenanceWindow: project.maintenanceWindow ?? null,
        metrics: project.metrics ?? null
      },
      stats,
      timeline,
      milestones: milestoneList,
      documents,
      statusHistory: project.statusHistory || [],
      risks: project.risks || [],
      sharedNotes,
      tickets: tickets.map((ticket) => ({
        id: String(ticket._id),
        title: ticket.title,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        sla: ticket.sla
      })),
      assignedTechnicians: assignedTechnicians.map((tech) => ({
        id: String(tech._id),
        name: tech.name || tech.username || tech.email,
        email: tech.email,
        phone: tech.phone,
        role: tech.role
      }))
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur interne'
    const status = message.includes('auth') ? 401 : message.includes('refusé') ? 403 : 500
    return NextResponse.json({ success: false, error: message }, { status })
  }
}

