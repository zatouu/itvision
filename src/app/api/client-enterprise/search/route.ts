import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { requireDomainAccess, companyCapabilities, companyScope } from '@/lib/domain-access'
import { connectDB } from '@/lib/db'
import { applyRateLimit, apiRateLimiter } from '@/lib/rate-limiter'
import { CLIENT_VISIBLE_INVOICE, CLIENT_VISIBLE_QUOTE } from '@/lib/client-documents'
import AdminQuote from '@/lib/models/AdminQuote'
import AdminInvoice from '@/lib/models/AdminInvoice'
import Intervention from '@/lib/models/Intervention'
import Ticket from '@/lib/models/Ticket'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import Project from '@/lib/models/Project'
import { CLIENT_VISIBLE_PROJECT } from '@/lib/portal/project-view'

const PER_TYPE = 5
const BASE = '/portail-entreprise'

export type SearchResultType = 'quote' | 'invoice' | 'intervention' | 'ticket' | 'contract' | 'project'

export interface SearchResult {
  id: string
  type: SearchResultType
  label: string
  sub?: string
  href: string
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// GET /api/client-enterprise/search?q=... — recherche transverse pour la palette ⌘K
export async function GET(request: NextRequest) {
  const limited = await applyRateLimit(request, apiRateLimiter)
  if (limited) return limited

  const result = await requireDomainAccess(request, 'corporate')
  if (!result.ok) return result.response
  const { access } = result
  const companyId = access.profiles.companyClientId
  if (!companyId) return NextResponse.json({ results: [] })

  const q = (new URL(request.url).searchParams.get('q') || '').trim().slice(0, 60)
  if (q.length < 2) return NextResponse.json({ results: [] })

  await connectDB()
  const re = new RegExp(escapeRegex(q), 'i')
  const uid = new mongoose.Types.ObjectId(access.userId)
  const cid = new mongoose.Types.ObjectId(companyId)
  const scope = companyScope({ userId: uid, companyId: cid })
  const docOwner = { $or: [{ clientUserId: uid }, { clientCompanyId: cid }] }
  const canFinance = companyCapabilities(access).has('finance:view')

  const [quotes, invoices, interventions, tickets, contracts, projects] = await Promise.all([
    canFinance
      ? AdminQuote.find({ $and: [docOwner, CLIENT_VISIBLE_QUOTE, { $or: [{ numero: re }, { title: re }] }] })
          .select('numero title total').sort({ date: -1 }).limit(PER_TYPE).lean()
      : [],
    canFinance
      ? AdminInvoice.find({ $and: [docOwner, CLIENT_VISIBLE_INVOICE, { numero: re }] })
          .select('numero total status').sort({ date: -1 }).limit(PER_TYPE).lean()
      : [],
    Intervention.find({ $and: [scope, { $or: [{ title: re }, { interventionNumber: re }, { site: re }] }] })
      .select('title interventionNumber date').sort({ date: -1 }).limit(PER_TYPE).lean(),
    Ticket.find({ $and: [scope, { title: re }] })
      .select('title status').sort({ createdAt: -1 }).limit(PER_TYPE).lean(),
    MaintenanceContract.find({ $and: [scope, { $or: [{ name: re }, { contractNumber: re }] }] })
      .select('name contractNumber').limit(PER_TYPE).lean(),
    Project.find({ $and: [scope, CLIENT_VISIBLE_PROJECT, { name: re }] })
      .select('name status').sort({ updatedAt: -1 }).limit(PER_TYPE).lean(),
  ])

  const fmtAmount = (n: unknown) => `${Math.round(Number(n) || 0).toLocaleString('fr-FR')} F`
  const fmtDay = (d: unknown) => (d ? new Date(d as string).toLocaleDateString('fr-FR') : undefined)

  const results: SearchResult[] = [
    ...(quotes as any[]).map(d => ({ id: String(d._id), type: 'quote' as const, label: `Devis ${d.numero}${d.title ? ` · ${d.title}` : ''}`, sub: fmtAmount(d.total), href: `${BASE}/documents/devis/${d._id}` })),
    ...(invoices as any[]).map(d => ({ id: String(d._id), type: 'invoice' as const, label: `Facture ${d.numero}`, sub: fmtAmount(d.total), href: `${BASE}/documents/factures/${d._id}` })),
    ...(interventions as any[]).map(d => ({ id: String(d._id), type: 'intervention' as const, label: d.title || d.interventionNumber || 'Intervention', sub: fmtDay(d.date), href: `${BASE}/interventions/${d._id}` })),
    ...(tickets as any[]).map(d => ({ id: String(d._id), type: 'ticket' as const, label: d.title, sub: 'Ticket', href: `${BASE}/support/${d._id}` })),
    ...(contracts as any[]).map(d => ({ id: String(d._id), type: 'contract' as const, label: d.name || d.contractNumber, sub: d.contractNumber, href: `${BASE}/contrats/${d._id}` })),
    ...(projects as any[]).map(d => ({ id: String(d._id), type: 'project' as const, label: d.name, sub: 'Projet', href: `${BASE}/projets/${d._id}` })),
  ]

  return NextResponse.json({ results })
}
