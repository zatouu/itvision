import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'
import InAppNotification from '@/lib/models/InAppNotification'
import Project from '@/lib/models/Project'
import Intervention from '@/lib/models/Intervention'
import { clientProjectFilter } from '@/lib/portal/project-view'
import { ROLE_LABEL, isCompanyRole } from '@/lib/company-rights'

/** Suivi commercial de l'espace client d'une entreprise : membres, visites, notifications, engagement. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request)
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 })

  await connectMongoose()
  const cid = new mongoose.Types.ObjectId(id)
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const scope = { $or: [{ clientCompanyId: cid }, { clientId: cid }] }

  const [members, notifications, notif30, projects, ratings] = await Promise.all([
    User.find({ companyClientId: cid }).select('name email companyRole companyInvitePending portalSeenAt isActive').sort({ portalSeenAt: -1 }).limit(50).lean() as Promise<any[]>,
    InAppNotification.find({ teamId: id }).select('title type actionUrl createdAt readBy metadata.category').sort({ createdAt: -1 }).limit(10).lean() as Promise<any[]>,
    InAppNotification.countDocuments({ teamId: id, createdAt: { $gte: since30 } }),
    Project.find(clientProjectFilter(scope)).select('name status progress reception.requestedAt reception.signedAt documents.clientVisible').lean() as Promise<any[]>,
    Intervention.find({ ...scope, 'clientFeedback.rating': { $gte: 1 } }).select('clientFeedback.rating').lean() as Promise<any[]>,
  ])

  const lastVisit = members.reduce<Date | null>((acc, m) => (m.portalSeenAt && (!acc || m.portalSeenAt > acc) ? m.portalSeenAt : acc), null)
  return NextResponse.json({
    members: members.map(m => ({
      id: String(m._id), name: m.name, email: m.email,
      role: isCompanyRole(m.companyRole) ? ROLE_LABEL[m.companyRole as keyof typeof ROLE_LABEL] : 'Propriétaire',
      pending: !!m.companyInvitePending, active: m.isActive !== false, lastSeen: m.portalSeenAt || null,
    })),
    stats: {
      members: members.filter(m => !m.companyInvitePending).length,
      activeMembers30: members.filter(m => m.portalSeenAt && new Date(m.portalSeenAt) >= since30).length,
      lastVisit,
      notifications30: notif30,
      visibleProjects: projects.length,
      receptionsPending: projects.filter(p => p.reception?.requestedAt && !p.reception?.signedAt).length,
      sharedDocuments: projects.reduce((s, p) => s + (p.documents || []).filter((d: any) => d.clientVisible).length, 0),
      ratingAvg: ratings.length ? ratings.reduce((s, r) => s + r.clientFeedback.rating, 0) / ratings.length : null,
      ratingCount: ratings.length,
    },
    notifications: notifications.map(n => ({
      id: String(n._id), title: n.title, type: n.type, createdAt: n.createdAt,
      category: n.metadata?.category || null, reads: (n.readBy || []).length,
    })),
  })
}
