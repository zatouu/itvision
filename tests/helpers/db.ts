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
import Product from '@/lib/models/Product.validated'
import ProviderProfile from '@/lib/models/ProviderProfile'
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
    MaintenanceContract.deleteMany({ contractNumber: /^MC-E2E-/ }),
    Product.deleteMany({ name: /^E2E-NAMESPACE-/ })
  ])
}

export async function createNamespaceTestProducts(): Promise<{
  marketplaceId: string
  corporateId: string
  bothId: string
  fallbackId: string
  hiddenId: string
}> {
  await connectMongoose()

  const timestamp = Date.now()

  const [marketplace, corporate, both, fallback, hidden] = await Promise.all([
    Product.create({
      name: `E2E-NAMESPACE-Marketplace-${timestamp}`,
      category: 'marketplace-test',
      price: 10000,
      currency: 'FCFA',
      isPublished: true,
      channels: ['marketplace'],
      corporateVisible: false,
      stockStatus: 'in_stock',
      stockQuantity: 10,
      deliveryDays: 1,
      leadTimeDays: 1,
      features: [],
      colorOptions: [],
      variantOptions: [],
      gallery: [],
      descriptionImages: [],
      variantGroups: [],
      shippingOverrides: [],
      priceTiers: [],
      groupBuyEnabled: false,
      groupBuyMinQty: 1,
      groupBuyTargetQty: 1,
      price1688Currency: 'FCFA',
      exchangeRate: 1
    }),
    Product.create({
      name: `E2E-NAMESPACE-Corporate-${timestamp}`,
      category: 'caméra',
      price: 20000,
      b2bPrice: 18000,
      currency: 'FCFA',
      isPublished: true,
      channels: ['corporate'],
      corporateVisible: true,
      stockStatus: 'in_stock',
      stockQuantity: 10,
      deliveryDays: 1,
      leadTimeDays: 1,
      features: [],
      colorOptions: [],
      variantOptions: [],
      gallery: [],
      descriptionImages: [],
      variantGroups: [],
      shippingOverrides: [],
      priceTiers: [],
      groupBuyEnabled: false,
      groupBuyMinQty: 1,
      groupBuyTargetQty: 1,
      price1688Currency: 'FCFA',
      exchangeRate: 1
    }),
    Product.create({
      name: `E2E-NAMESPACE-Both-${timestamp}`,
      category: 'switch',
      price: 15000,
      b2bPrice: 14000,
      currency: 'FCFA',
      isPublished: true,
      channels: ['marketplace', 'corporate'],
      corporateVisible: true,
      stockStatus: 'in_stock',
      stockQuantity: 10,
      deliveryDays: 1,
      leadTimeDays: 1,
      features: [],
      colorOptions: [],
      variantOptions: [],
      gallery: [],
      descriptionImages: [],
      variantGroups: [],
      shippingOverrides: [],
      priceTiers: [],
      groupBuyEnabled: false,
      groupBuyMinQty: 1,
      groupBuyTargetQty: 1,
      price1688Currency: 'FCFA',
      exchangeRate: 1
    }),
    Product.create({
      name: `E2E-NAMESPACE-Fallback-${timestamp}`,
      category: 'dahua',
      price: 25000,
      b2bPrice: 22000,
      currency: 'FCFA',
      isPublished: true,
      channels: [],
      corporateVisible: false,
      stockStatus: 'in_stock',
      stockQuantity: 10,
      deliveryDays: 1,
      leadTimeDays: 1,
      features: [],
      colorOptions: [],
      variantOptions: [],
      gallery: [],
      descriptionImages: [],
      variantGroups: [],
      shippingOverrides: [],
      priceTiers: [],
      groupBuyEnabled: false,
      groupBuyMinQty: 1,
      groupBuyTargetQty: 1,
      price1688Currency: 'FCFA',
      exchangeRate: 1
    }),
    Product.create({
      name: `E2E-NAMESPACE-Hidden-${timestamp}`,
      category: 'hidden',
      price: 30000,
      currency: 'FCFA',
      isPublished: false,
      channels: ['marketplace', 'corporate'],
      corporateVisible: true,
      stockStatus: 'in_stock',
      stockQuantity: 10,
      deliveryDays: 1,
      leadTimeDays: 1,
      features: [],
      colorOptions: [],
      variantOptions: [],
      gallery: [],
      descriptionImages: [],
      variantGroups: [],
      shippingOverrides: [],
      priceTiers: [],
      groupBuyEnabled: false,
      groupBuyMinQty: 1,
      groupBuyTargetQty: 1,
      price1688Currency: 'FCFA',
      exchangeRate: 1
    })
  ])

  return {
    marketplaceId: String(marketplace._id),
    corporateId: String(corporate._id),
    bothId: String(both._id),
    fallbackId: String(fallback._id),
    hiddenId: String(hidden._id)
  }
}

export async function createNamespaceTestProvider(): Promise<{ userId: string; providerId: string }> {
  await connectMongoose()

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12)
  let providerUser = await User.findOne({ email: 'e2e-provider@itvision.sn' }).lean() as any
  if (!providerUser) {
    providerUser = await User.create({
      email: 'e2e-provider@itvision.sn',
      username: 'e2e_provider',
      name: 'E2E Provider',
      passwordHash,
      role: 'TECHNICIAN',
      isActive: true,
      phone: '+221770000002'
    })
  }

  const profile = await ProviderProfile.findOneAndUpdate(
    { userId: providerUser._id },
    {
      $set: {
        userId: providerUser._id,
        kycVerified: true,
        serviceCategories: ['vidéosurveillance', 'maintenance'],
        zone: { city: 'Dakar', region: 'Dakar' },
        currentLoad: 0,
        maxConcurrentMissions: 5,
        providerStats: {
          completedMissions: 12,
          cancelledByProvider: 0,
          cancelledByClient: 1,
          reliabilityScore: 92,
          lastUpdatedAt: new Date()
        }
      }
    },
    { new: true, upsert: true }
  )

  return { userId: String(providerUser._id), providerId: String(profile._id) }
}

export async function cleanupNamespaceTestData() {
  await connectMongoose()
  const providerUser = await User.findOne({ email: 'e2e-provider@itvision.sn' }).lean() as any
  await Promise.all([
    Product.deleteMany({ name: /^E2E-NAMESPACE-/ }),
    User.deleteMany({ email: 'e2e-provider@itvision.sn' }),
    providerUser
      ? ProviderProfile.deleteMany({ userId: providerUser._id })
      : Promise.resolve()
  ])
}
