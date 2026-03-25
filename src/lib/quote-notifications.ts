import InAppNotification from '@/lib/models/InAppNotification'
import { addNotification } from '@/lib/notifications-memory'

type QuoteEventType =
  | 'quote_sent'
  | 'client_accepted'
  | 'client_rejected'
  | 'client_counter_proposed'
  | 'client_comment'

interface QuoteNotificationParams {
  eventType: QuoteEventType
  quote: any
  actorName?: string
  message?: string
  counterAmount?: number
  clientUserId?: string
  clientCompanyId?: string
}

function fmt(v: number) {
  return Math.round(v || 0).toLocaleString('fr-FR')
}

function buildPayload(params: QuoteNotificationParams) {
  const quoteNumber = String(params.quote?.numero || 'N/A')
  const actor = params.actorName || 'Utilisateur'

  switch (params.eventType) {
    case 'quote_sent':
      return {
        admin: {
          type: 'success' as const,
          title: 'Devis envoyé',
          message: `Le devis ${quoteNumber} a été envoyé au client.`,
          actionUrl: '/admin'
        },
        client: {
          type: 'info' as const,
          title: `Nouveau devis ${quoteNumber}`,
          message: `Un nouveau devis est disponible. Montant: ${fmt(params.quote?.total)} FCFA.`,
          actionUrl: '/portail-entreprise/documents'
        }
      }
    case 'client_accepted':
      return {
        admin: {
          type: 'success' as const,
          title: `Devis ${quoteNumber} accepté`,
          message: `${actor} a accepté le devis.`,
          actionUrl: '/admin'
        },
        client: {
          type: 'success' as const,
          title: `Devis ${quoteNumber} accepté`,
          message: 'Votre validation est enregistrée.',
          actionUrl: '/portail-entreprise/documents'
        }
      }
    case 'client_rejected':
      return {
        admin: {
          type: 'warning' as const,
          title: `Devis ${quoteNumber} refusé`,
          message: `${actor} a refusé le devis.`,
          actionUrl: '/admin'
        },
        client: {
          type: 'warning' as const,
          title: `Devis ${quoteNumber} refusé`,
          message: 'Votre refus est enregistré. Notre équipe reste disponible.',
          actionUrl: '/portail-entreprise/documents'
        }
      }
    case 'client_counter_proposed':
      return {
        admin: {
          type: 'info' as const,
          title: `Contre-proposition sur ${quoteNumber}`,
          message: `${actor} propose ${fmt(Number(params.counterAmount || 0))} FCFA.`,
          actionUrl: '/admin'
        },
        client: {
          type: 'info' as const,
          title: `Contre-proposition envoyée (${quoteNumber})`,
          message: 'Votre contre-proposition a été transmise à l\'équipe IT Vision.',
          actionUrl: '/portail-entreprise/documents'
        }
      }
    case 'client_comment':
    default:
      return {
        admin: {
          type: 'info' as const,
          title: `Nouveau commentaire sur ${quoteNumber}`,
          message: `${actor} a ajouté un commentaire${params.message ? `: "${params.message.slice(0, 120)}"` : ''}.`,
          actionUrl: '/admin'
        },
        client: {
          type: 'info' as const,
          title: `Commentaire envoyé (${quoteNumber})`,
          message: 'Votre commentaire a bien été envoyé.',
          actionUrl: '/portail-entreprise/documents'
        }
      }
  }
}

export async function notifyQuoteWorkflowEvent(params: QuoteNotificationParams): Promise<void> {
  const payload = buildPayload(params)

  addNotification({
    userId: 'admin',
    type: payload.admin.type,
    title: payload.admin.title,
    message: payload.admin.message,
    actionUrl: payload.admin.actionUrl,
    metadata: {
      quoteId: String(params.quote?._id || ''),
      quoteNumber: String(params.quote?.numero || ''),
      eventType: params.eventType
    }
  })

  if (!params.clientUserId && !params.clientCompanyId) {
    return
  }

  try {
    await InAppNotification.create({
      ...(params.clientUserId ? { userId: params.clientUserId } : {}),
      ...(params.clientCompanyId ? { teamId: params.clientCompanyId } : {}),
      roles: ['CLIENT'],
      type: payload.client.type,
      title: payload.client.title,
      message: payload.client.message,
      actionUrl: payload.client.actionUrl,
      metadata: {
        quoteId: String(params.quote?._id || ''),
        quoteNumber: String(params.quote?.numero || ''),
        eventType: params.eventType,
        counterAmount: params.counterAmount,
        comment: params.message
      }
    })
  } catch (error) {
    console.error('[notifyQuoteWorkflowEvent] notification client non envoyée:', error)
  }
}
