/**
 * Kafka Client - IT Vision
 * 
 * Client singleton pour la connexion à Kafka.
 * Utilisé par tous les moteurs pour produire et consommer des événements.
 * 
 * @module lib/kafka/client
 */

import { Kafka, logLevel, Producer, Consumer, Admin } from 'kafkajs'

// Configuration depuis les variables d'environnement
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || 'itvision-app'
const KAFKA_GROUP_ID = process.env.KAFKA_GROUP_ID || 'itvision-consumers'

// Singleton Kafka client
let kafkaInstance: Kafka | null = null
let producerInstance: Producer | null = null
let adminInstance: Admin | null = null

/**
 * Obtenir l'instance Kafka (singleton)
 */
export function getKafkaClient(): Kafka {
  if (!kafkaInstance) {
    kafkaInstance = new Kafka({
      clientId: KAFKA_CLIENT_ID,
      brokers: KAFKA_BROKERS,
      logLevel: process.env.NODE_ENV === 'production' ? logLevel.WARN : logLevel.INFO,
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    })
  }
  return kafkaInstance
}

/**
 * Obtenir le producer (singleton, connecté)
 */
export async function getProducer(): Promise<Producer> {
  if (!producerInstance) {
    const kafka = getKafkaClient()
    producerInstance = kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000
    })
    await producerInstance.connect()
    console.log('✅ Kafka Producer connected')
  }
  return producerInstance
}

/**
 * Créer un nouveau consumer (plusieurs peuvent coexister)
 */
export function createConsumer(groupId?: string): Consumer {
  const kafka = getKafkaClient()
  return kafka.consumer({
    groupId: groupId || KAFKA_GROUP_ID,
    sessionTimeout: 30000,
    heartbeatInterval: 3000
  })
}

/**
 * Obtenir l'admin client
 */
export async function getAdmin(): Promise<Admin> {
  if (!adminInstance) {
    const kafka = getKafkaClient()
    adminInstance = kafka.admin()
    await adminInstance.connect()
    console.log('✅ Kafka Admin connected')
  }
  return adminInstance
}

/**
 * Déconnecter tous les clients
 */
export async function disconnectAll(): Promise<void> {
  if (producerInstance) {
    await producerInstance.disconnect()
    producerInstance = null
  }
  if (adminInstance) {
    await adminInstance.disconnect()
    adminInstance = null
  }
  kafkaInstance = null
  console.log('🔌 Kafka clients disconnected')
}

export default {
  getKafkaClient,
  getProducer,
  createConsumer,
  getAdmin,
  disconnectAll
}
