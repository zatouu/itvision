import { connectMongoose } from '@/lib/mongoose'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import { emailService } from '@/lib/email-service'

export const JOB_NAME = 'maintenance.renewal-reminders'

const THRESHOLDS = [60, 30, 7]

interface ReminderResult {
  contractsChecked: number
  remindersSent: number
  autoRenewalsCreated: number
  errors: string[]
}

/**
 * Vérifie les contrats proches de l'expiration et envoie des rappels.
 * Si autoRenewal=true et endDate dans 1j, crée un nouveau contrat en draft.
 */
export async function runRenewalRemindersJob(): Promise<ReminderResult> {
  const errors: string[] = []
  let contractsChecked = 0
  let remindersSent = 0
  let autoRenewalsCreated = 0

  try {
    await connectMongoose()

    const now = new Date()
    const adminEmail = process.env.ADMIN_EMAIL || 'contact@itvisionplus.sn'

    const contracts = await MaintenanceContract.find({
      status: 'active',
      endDate: { $gte: now, $lte: new Date(now.getTime() + 61 * 24 * 60 * 60 * 1000) }
    }).lean() as any[]

    for (const contract of contracts) {
      try {
        contractsChecked++
        const endDate = new Date(contract.endDate)
        const daysUntil = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        // Déterminer le seuil de notification applicable
        const threshold = THRESHOLDS.find((t) => daysUntil <= t && daysUntil > t - 2)
        if (!threshold) continue

        const alreadySent = Array.isArray(contract.renewalNotifications)
          ? contract.renewalNotifications.includes(threshold)
          : false
        if (alreadySent) continue

        // Envoi email admin + client
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://itvisionplus.sn'
        const subject = `Renouvellement contrat — ${contract.name} (${daysUntil}j restants)`
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <div style="background:linear-gradient(135deg,#16a34a,#7c3aed);color:white;padding:20px;border-radius:10px 10px 0 0">
              <h2 style="margin:0">Renouvellement contrat</h2>
            </div>
            <div style="background:#f9fafb;padding:20px;border-radius:0 0 10px 10px;border:1px solid #e5e7eb">
              <p>Le contrat <strong>${contract.name}</strong> (${contract.contractNumber}) expire dans <strong>${daysUntil} jours</strong>.</p>
              <p><strong>Prix annuel :</strong> ${contract.annualPrice?.toLocaleString('fr-FR')} FCFA</p>
              <p style="margin-top:20px">
                <a href="${siteUrl}/admin/maintenance" style="background:#7c3aed;color:white;padding:10px 20px;border-radius:5px;text-decoration:none">Gérer le contrat</a>
              </p>
            </div>
          </div>
        `

        await emailService.sendEmail({ to: adminEmail, subject, html })

        // Marquer comme notifié
        await MaintenanceContract.updateOne(
          { _id: contract._id },
          { $addToSet: { renewalNotifications: threshold } }
        )
        remindersSent++

        // Auto-renouvellement si activé et < 2j
        if (contract.autoRenewal && daysUntil <= 1) {
          const newStart = new Date(endDate)
          newStart.setDate(newStart.getDate() + 1)
          const newEnd = new Date(newStart)
          newEnd.setFullYear(newEnd.getFullYear() + 1)

          await MaintenanceContract.create({
            ...contract,
            _id: undefined,
            contractNumber: `${contract.contractNumber}-R`,
            status: 'draft',
            startDate: newStart,
            endDate: newEnd,
            renewalDate: undefined,
            signedDate: undefined,
            coverage: {
              ...contract.coverage,
              interventionsUsed: 0
            },
            renewalNotifications: [],
            createdAt: undefined,
            updatedAt: undefined
          })

          autoRenewalsCreated++
        }
      } catch (err: any) {
        errors.push(`Contrat ${contract._id}: ${err.message}`)
      }
    }
  } catch (err: any) {
    errors.push(`Global: ${err.message}`)
  }

  return { contractsChecked, remindersSent, autoRenewalsCreated, errors }
}
