/**
 * Migration : renseigne Ticket.clientCompanyId sur les tickets créés via le
 * portail entreprise (clientId = userId) avant l'ajout du champ.
 *
 * Sans ce champ, un ticket créé par un membre de l'entreprise reste invisible
 * aux autres membres (companyScope filtre sur clientId OU clientCompanyId).
 *
 * Usage :
 *   npx tsx scripts/backfill-ticket-company.ts --dry-run
 *   npx tsx scripts/backfill-ticket-company.ts
 */

import { connectDB } from '../src/lib/db'
import mongoose from 'mongoose'
import Ticket from '../src/lib/models/Ticket'
import User from '../src/lib/models/User'

const isDryRun = process.argv.includes('--dry-run')

async function main() {
  await connectDB()

  const filter = {
    clientCompanyId: { $exists: false },
    channel: 'client_portal',
  }

  const total = await Ticket.countDocuments(filter)
  console.log(`[backfill-ticket-company] ${total} ticket(s) portail sans clientCompanyId${isDryRun ? ' (dry-run)' : ''}`)

  let updated = 0
  let skipped = 0
  let processed = 0

  const cursor = Ticket.find(filter).select('_id clientId').cursor()

  for (let ticket = await cursor.next(); ticket != null; ticket = await cursor.next()) {
    processed++
    const user = await User.findById(ticket.clientId).select('companyClientId').lean() as any
    const companyClientId = user?.companyClientId

    if (!companyClientId) {
      skipped++
      continue
    }

    if (isDryRun) {
      if (processed <= 5) {
        console.log(`  · ${ticket._id} → ${companyClientId}`)
      }
      updated++
      continue
    }

    await Ticket.updateOne(
      { _id: ticket._id },
      { $set: { clientCompanyId: new mongoose.Types.ObjectId(String(companyClientId)) } }
    )
    updated++

    if (updated % 100 === 0) {
      console.log(`  … ${updated} mis à jour`)
    }
  }

  console.log(`[backfill-ticket-company] ${isDryRun ? 'à mettre à jour' : 'mis à jour'} : ${updated} · ignorés (client sans société) : ${skipped} · traités : ${processed}`)
  await mongoose.disconnect()
}

main().catch(err => {
  console.error('[backfill-ticket-company] erreur:', err)
  process.exit(1)
})
