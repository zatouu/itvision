#!/usr/bin/env ts-node
/**
 * Kafka Consumers Bootstrap
 * 
 * Lance tous les consumers Kafka pour les moteurs métier.
 * À exécuter en tant que service séparé en production.
 * 
 * Usage:
 *   npx ts-node scripts/start-consumers.ts
 * 
 * Ou via npm:
 *   npm run kafka:consumers
 */

import { LoyaltyConsumer } from '../src/lib/kafka/consumer'
import { SuggestionConsumer } from '../src/lib/engines/suggestion'
import { ProfitabilityConsumer } from '../src/lib/engines/profitability'
import { disconnectAll } from '../src/lib/kafka/client'

// Liste des consumers à démarrer
const consumers = [
  new LoyaltyConsumer(),
  new SuggestionConsumer(),
  new ProfitabilityConsumer(),
]

async function startAllConsumers() {
  console.log('🚀 Démarrage des consumers Kafka...')
  console.log(`📋 ${consumers.length} consumers à démarrer\n`)

  for (const consumer of consumers) {
    try {
      await consumer.start()
      console.log(`✅ ${(consumer as unknown as { config: { name: string } }).config.name} démarré`)
    } catch (error) {
      console.error(`❌ Erreur au démarrage:`, error)
    }
  }

  console.log('\n✨ Tous les consumers sont démarrés!')
  console.log('📡 En écoute des événements Kafka...\n')
}

async function stopAllConsumers() {
  console.log('\n🛑 Arrêt des consumers...')
  
  for (const consumer of consumers) {
    try {
      await consumer.stop()
    } catch (error) {
      console.error('Erreur à l\'arrêt:', error)
    }
  }
  
  await disconnectAll()
  console.log('👋 Tous les consumers sont arrêtés')
}

// Gestion du shutdown gracieux
process.on('SIGINT', async () => {
  await stopAllConsumers()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await stopAllConsumers()
  process.exit(0)
})

// Démarrer
startAllConsumers().catch(console.error)
