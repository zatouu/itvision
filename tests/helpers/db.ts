/**
 * Helper pour créer des données de test en DB depuis les tests E2E.
 * Utilise Mongoose directement (pas d'API publique pour créer des users).
 */
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'
import Technician from '@/lib/models/Technician'
import Intervention from '@/lib/models/Intervention'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import mongoose from 'mongoose'

const DEFAULT_PASSWORD = 'test123'

export interface TestUser {
  email: string
  password: string
  role: string
  userId: string
}

export async function ensureTestUsers(): Promise<{
  admin: TestUser
  client: TestUser
  tech: TestUser
}> {
  await connectMongoose()

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12)

  // Admin
  let adminUser = await User.findOne({ email: 'e2e-admin@itvision.sn' }).lean() as any
  if (!adminUser) {
    adminUser = await User.create({
      email: 'e2e-admin@itvision.sn',
      username: 'e2e_admin',
      name: 'E2E Admin',
      passwordHash,
      role: 'ADMIN',
      isActive: true
    })
  }

  // Client
  let clientUser = await User.findOne({ email: 'e2e-client@itvision.sn' }).lean() as any
  if (!clientUser) {
    clientUser = await User.create({
      email: 'e2e-client@itvision.sn',
      username: 'e2e_client',
      name: 'E2E Client',
      passwordHash,
      role: 'CLIENT',
      isActive: true
    })
  }

  // Technician (Technician doc + User doc)
  let techUser = await User.findOne({ email: 'e2e-tech@itvision.sn' }).lean() as any
  let techDoc = await Technician.findOne({ email: 'e2e-tech@itvision.sn' }).lean() as any

  if (!techDoc) {
    techDoc = await Technician.create({
      technicianId: 'TECH-E2E001',
      name: 'E2E Technician',
      email: 'e2e-tech@itvision.sn',
      phone: '770000001',
      passwordHash,
      specialties: ['vidéosurveillance', 'contrôle d\'accès', 'maintenance'],
      certifications: ['Certif E2E'],
      experience: 5,
      isActive: true,
      isAvailable: true,
      permissions: {
        canCreateReports: true,
        canEditOwnReports: true,
        canDeleteDrafts: true,
        allowedInterventionTypes: ['maintenance', 'installation']
      }
    })
  }

  if (!techUser) {
    techUser = await User.create({
      email: 'e2e-tech@itvision.sn',
      username: 'e2e_tech',
      name: 'E2E Technician',
      passwordHash,
      role: 'TECHNICIAN',
      isActive: true
    })
  }

  return {
    admin: { email: 'e2e-admin@itvision.sn', password: DEFAULT_PASSWORD, role: 'ADMIN', userId: String(adminUser._id) },
    client: { email: 'e2e-client@itvision.sn', password: DEFAULT_PASSWORD, role: 'CLIENT', userId: String(clientUser._id) },
    tech: { email: 'e2e-tech@itvision.sn', password: DEFAULT_PASSWORD, role: 'TECHNICIAN', userId: String(techUser._id) }
  }
}

export async function createTestContract(clientId: string): Promise<string> {
  await connectMongoose()

  const existing = await MaintenanceContract.findOne({
    clientId: new mongoose.Types.ObjectId(clientId),
    status: 'active'
  }).lean() as any

  if (existing) return String(existing._id)

  const now = new Date()
  const contract = await MaintenanceContract.create({
    contractNumber: `MC-E2E-${now.getFullYear()}${String(now.getMonth()+1).padStart(2, '0')}-9999`,
    clientId: new mongoose.Types.ObjectId(clientId),
    name: 'Contrat E2E Test',
    type: 'full',
    status: 'active',
    startDate: new Date(now.getFullYear(), 0, 1),
    endDate: new Date(now.getFullYear() + 1, 0, 1),
    annualPrice: 500000,
    paymentFrequency: 'annual',
    coverage: {
      equipmentTypes: ['vidéosurveillance', 'contrôle d\'accès'],
      sitesCovered: ['Site E2E'],
      interventionsIncluded: 10,
      interventionsUsed: 0,
      responseTime: '24h',
      supportHours: '8h-18h'
    },
    services: [{ name: 'Visite préventive', description: 'Test', frequency: 'mensuel' }],
    equipment: [{ type: 'Caméra', quantity: 4, location: 'Site E2E' }]
  })

  return String(contract._id)
}

export async function cleanupTestData() {
  await connectMongoose()
  await Promise.all([
    Intervention.deleteMany({ title: /^E2E / }),
    MaintenanceContract.deleteMany({ contractNumber: /^MC-E2E-/ })
  ])
}
