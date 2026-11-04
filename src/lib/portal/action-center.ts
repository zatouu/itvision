import mongoose from 'mongoose'
import { companyScope, type CompanyCapability } from '@/lib/domain-access'
import AdminQuote from '@/lib/models/AdminQuote'
import AdminInvoice from '@/lib/models/AdminInvoice'
import MaintenanceReport from '@/lib/models/MaintenanceReport'
import Ticket from '@/lib/models/Ticket'
import Intervention from '@/lib/models/Intervention'
import Project from '@/lib/models/Project'
import { clientProjectFilter } from '@/lib/portal/project-view'

// Au-delà, une fiche non signée n'est plus réclamée au client
const SIGNATURE_WINDOW_DAYS = 60
// Un avis n'est plus sollicité au-delà de 30 jours
const RATING_WINDOW_DAYS = 30

export interface PortalActionCounts {
  quotesToAnswer: number
  invoicesOverdue: number
  invoicesDue: number
  reportsToAcknowledge: number
  ticketsAwaitingReply: number
  interventionsToSign: number
  receptionsToSign: number
  interventionsToRate: number
}

export interface PortalActionScope {
  userId: mongoose.Types.ObjectId | string
  companyId: mongoose.Types.ObjectId | string
  can: (capability: CompanyCapability) => boolean
}

const zero = () => Promise.resolve(0)

/** Ce qui attend une action du client, filtré selon ses droits dans l'entreprise. */
export async function getPortalActionCounts({ userId, companyId, can }: PortalActionScope): Promise<PortalActionCounts> {
  const uid = new mongoose.Types.ObjectId(String(userId))
  const cid = new mongoose.Types.ObjectId(String(companyId))
  const docOwner = { $or: [{ clientUserId: uid }, { clientCompanyId: cid }] }
  const scope = companyScope({ userId: uid, companyId: cid })
  const signatureSince = new Date(Date.now() - SIGNATURE_WINDOW_DAYS * 24 * 60 * 60 * 1000)

  const [quotesToAnswer, invoicesOverdue, invoicesDue, reportsToAcknowledge, ticketsAwaitingReply, interventionsToSign, receptionsToSign, interventionsToRate] =
    await Promise.all([
      can('quotes:respond')
        ? AdminQuote.countDocuments({ ...docOwner, status: 'sent', clientResponse: { $in: ['pending', null] } })
        : zero(),
      can('finance:view') ? AdminInvoice.countDocuments({ ...docOwner, status: 'overdue' }) : zero(),
      can('finance:view') ? AdminInvoice.countDocuments({ ...docOwner, status: { $in: ['sent', 'partial'] } }) : zero(),
      can('reports:view')
        ? MaintenanceReport.countDocuments({ clientId: cid, publishedToClient: true, 'clientAcknowledgement.status': 'pending' })
        : zero(),
      Ticket.countDocuments({ ...scope, status: 'waiting_client' }),
      can('interventions:ack')
        ? Intervention.countDocuments({
            ...scope,
            status: 'completed',
            date: { $gte: signatureSince },
            'signatures.client.signature': { $in: [null, ''] },
          })
        : zero(),
      can('interventions:ack')
        ? Project.countDocuments(clientProjectFilter(scope, { 'reception.requestedAt': { $exists: true }, 'reception.signedAt': { $exists: false } }))
        : zero(),
      can('interventions:feedback')
        ? Intervention.countDocuments({
            ...scope,
            status: 'completed',
            date: { $gte: new Date(Date.now() - RATING_WINDOW_DAYS * 24 * 60 * 60 * 1000) },
            'clientFeedback.rating': { $exists: false },
          })
        : zero(),
    ])

  return { quotesToAnswer, invoicesOverdue, invoicesDue, reportsToAcknowledge, ticketsAwaitingReply, interventionsToSign, receptionsToSign, interventionsToRate }
}

/** Compteurs à afficher sur la navigation du portail (clé = route). */
export function navBadgesFromCounts(c: PortalActionCounts): Record<string, number> {
  return {
    '/portail-entreprise/documents': c.quotesToAnswer + c.invoicesOverdue,
    '/portail-entreprise/rapports': c.reportsToAcknowledge,
    '/portail-entreprise/support': c.ticketsAwaitingReply,
    '/portail-entreprise/interventions': c.interventionsToSign,
    '/portail-entreprise/projets': c.receptionsToSign,
  }
}
