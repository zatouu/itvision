/**
 * Helper pour créer des données de test en DB depuis les tests E2E.
 * Utilise Mongoose directement (pas d'API publique pour créer des users).
 */
import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'
import Client from '@/lib/models/Client'
import Technician from '@/lib/models/Technician'
import Intervention from '@/lib/models/Intervention'
import Project from '@/lib/models/Project'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import MaintenanceReport from '@/lib/models/MaintenanceReport'
import AdminQuote from '@/lib/models/AdminQuote'
import AgentDecision from '@/lib/models/AgentDecision'
import AgentRun from '@/lib/models/AgentRun'
import Ticket from '@/lib/models/Ticket'
import SourcingRequest from '@/lib/models/SourcingRequest'
import AgentJob from '@/lib/models/AgentJob'
import Product from '@/lib/models/Product'
import ProviderProfile from '@/lib/models/ProviderProfile'
import ServiceRequest from '@/lib/models/ServiceRequest'
import Offer from '@/lib/models/Offer'
import Payment from '@/lib/models/Payment'
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

  // Société liée (obligatoire pour le portail entreprise / scoping companyScope)
  let clientCompany = await Client.findOne({ email: 'e2e-client@itvision.sn' }).lean() as any
  if (!clientCompany) {
    clientCompany = await Client.create({
      clientId: 'CL-E2E-001',
      name: 'E2E Client',
      email: 'e2e-client@itvision.sn',
      phone: '+221770000000',
      company: 'E2E Company SARL',
      city: 'Dakar',
      country: 'Sénégal',
      isActive: true,
      permissions: { canAccessPortal: true }
    })
  }
  if (String(clientUser.companyClientId) !== String(clientCompany._id)) {
    await User.updateOne({ _id: clientUser._id }, { $set: { companyClientId: clientCompany._id } })
  }

  // Projet actif — requis par /api/maintenance/reports pour résoudre projectId
  const existingProject = await Project.findOne({ clientId: clientUser._id }).lean() as any
  if (!existingProject) {
    await Project.create({
      name: 'Projet E2E',
      address: 'Site E2E, Dakar',
      clientId: clientUser._id,
      clientCompanyId: clientCompany._id,
      status: 'in_progress',
      startDate: new Date()
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
    Product.deleteMany({ name: /^E2E-NAMESPACE-/ }),
    Ticket.deleteMany({ title: /^E2E / }),
    User.deleteMany({ email: /^e2e-member-/ })
  ])
}

/**
 * Membre d'entreprise de test (portail corporate) rattaché à la société E2E.
 * Sert à vérifier l'application des companyRole/permissions côté API.
 */
export async function ensureCompanyMember(opts: {
  email: string
  name: string
  companyRole: 'owner' | 'admin' | 'finance' | 'technical' | 'viewer'
}): Promise<TestUser> {
  await connectMongoose()

  const clientUser = await User.findOne({ email: 'e2e-client@itvision.sn' }).select('companyClientId').lean() as any
  const companyClientId = clientUser?.companyClientId
  if (!companyClientId) throw new Error('Société E2E introuvable — lancer ensureTestUsers() d’abord')

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12)

  let user = await User.findOne({ email: opts.email }).lean() as any
  if (!user) {
    user = await User.create({
      email: opts.email,
      username: opts.email.split('@')[0],
      name: opts.name,
      passwordHash,
      role: 'CLIENT',
      companyClientId,
      companyRole: opts.companyRole,
      isActive: true
    })
  } else {
    await User.updateOne(
      { _id: user._id },
      { $set: { companyClientId, companyRole: opts.companyRole, passwordHash, isActive: true } }
    )
  }

  return { email: opts.email, password: DEFAULT_PASSWORD, role: 'CLIENT', userId: String(user._id) }
}

/** Fixe les interrupteurs Client.permissions de la société E2E. */
export async function setCompanyPermissions(permissions: Partial<{
  canAccessPortal: boolean
  canViewReports: boolean
  canRequestMaintenance: boolean
}>): Promise<void> {
  await connectMongoose()
  await Client.updateOne({ email: 'e2e-client@itvision.sn' }, { $set: { permissions } })
}

export async function getTestCompanyId(): Promise<string> {
  await connectMongoose()
  const company = await Client.findOne({ email: 'e2e-client@itvision.sn' }).select('_id').lean() as any
  if (!company) throw new Error('Société E2E introuvable')
  return String(company._id)
}

/** Demande de sourcing créée par le portail entreprise (inter-domaines). */
export async function countCompanySourcingRequests(companyClientId: string): Promise<number> {
  await connectMongoose()
  return SourcingRequest.countDocuments({ companyClientId })
}

/** Jobs agent enfilés pour une demande (vérifie l'enchaînement corporate → market → agent). */
export async function countAgentJobsFor(refId: string): Promise<number> {
  await connectMongoose()
  return AgentJob.countDocuments({ refId, type: 'sourcing_request' })
}

export async function cleanupCompanySourcingRequests(companyClientId: string): Promise<void> {
  await connectMongoose()
  const docs = await SourcingRequest.find({ companyClientId }).select('_id').lean() as any[]
  const ids = docs.map(d => String(d._id))
  if (ids.length > 0) {
    await AgentJob.deleteMany({ refId: { $in: ids }, type: 'sourcing_request' })
  }
  await SourcingRequest.deleteMany({ companyClientId })
}

/**
 * Fixtures catalogue corporate : un produit IT Vision (sans shopId) et un
 * produit vendeur tiers (shopId + canal marketplace) taggé corporateVisible.
 * Sert à vérifier que le B2B n'expose JAMAIS un vendeur tiers.
 */
export async function createCorporateCatalogFixtures(): Promise<{ itvProductId: string; vendorProductId: string }> {
  await connectMongoose()

  await Product.deleteMany({ name: /^E2E-CAT-/ })

  const itv = await Product.create({
    name: 'E2E-CAT Camera IP ITV',
    category: 'vidéosurveillance',
    description: 'Produit IT Vision (pas de vendeur tiers)',
    price: 85000,
    b2bPrice: 72000,
    currency: 'FCFA',
    stockStatus: 'in_stock',
    stockQuantity: 12,
    isPublished: true,
  })

  const vendor = await Product.create({
    name: 'E2E-CAT Camera IP vendeur tiers',
    category: 'vidéosurveillance',
    description: 'Produit vendeur DDM+ — ne doit jamais apparaître en B2B',
    price: 80000,
    b2bPrice: 70000,
    currency: 'FCFA',
    stockStatus: 'in_stock',
    stockQuantity: 5,
    isPublished: true,
    shopId: new mongoose.Types.ObjectId(),
    channels: ['marketplace'],
    corporateVisible: true,
  })

  return { itvProductId: String(itv._id), vendorProductId: String(vendor._id) }
}

export async function cleanupCorporateCatalogFixtures(): Promise<void> {
  await connectMongoose()
  await Product.deleteMany({ name: /^E2E-CAT-/ })
}

/**
 * Rapport d'intervention validé (fixture agents corporate) : matériel non
 * chiffré + main d'œuvre → sert à vérifier l'agent `quote_draft`.
 */
export async function createValidatedReportFixture(): Promise<{ reportId: string; projectId: string }> {
  await connectMongoose()

  const clientUser = await User.findOne({ email: 'e2e-client@itvision.sn' }).lean() as any
  const company = await Client.findOne({ email: 'e2e-client@itvision.sn' }).lean() as any
  const tech = await Technician.findOne({ email: 'e2e-tech@itvision.sn' }).lean() as any
  if (!clientUser || !company || !tech) throw new Error('Fixtures E2E manquantes — ensureTestUsers() d’abord')

  let project = await Project.findOne({ clientId: clientUser._id }).lean() as any
  if (!project) {
    project = await Project.create({
      name: 'Projet E2E Agents',
      address: 'Site E2E, Dakar',
      clientId: clientUser._id,
      clientCompanyId: company._id,
      status: 'in_progress',
      startDate: new Date(),
    })
  }

  await MaintenanceReport.deleteMany({ site: /^E2E-AGENT-/ })

  const reportId = `RPT-E2E-AGENT-${Date.now()}`
  const admin = await User.findOne({ email: 'e2e-admin@itvision.sn' }).select('_id').lean() as any
  const report = await MaintenanceReport.create({
    reportId,
    technicianId: tech._id,
    clientId: company._id,
    projectId: project._id,
    interventionDate: new Date(),
    startTime: '09:00',
    endTime: '12:00',
    duration: 3,
    site: 'E2E-AGENT Site Dakar',
    interventionType: 'maintenance',
    templateId: 'e2e-template',
    templateVersion: '1.0',
    initialObservations: 'Contrôle annuel des caméras',
    results: 'Système vérifié, deux caméras remplacées',
    status: 'validated',
    validation: { validatedBy: admin?._id || tech._id, validatedAt: new Date(), action: 'approved', comments: 'ok' },
    tasksPerformed: ['Nettoyage optiques', 'Remplacement caméras'],
    materialsUsed: [
      { name: 'Caméra IP 4MP extérieure', quantity: 2, unitPrice: 0 },
      { name: 'Câble RJ45 20m', quantity: 2, unitPrice: 0 },
    ],
    totalDuration: 3,
  })

  return { reportId: String(report._id), projectId: String(project._id) }
}

export async function cleanupAgentFixtures(): Promise<void> {
  await connectMongoose()
  const reportIds = (await MaintenanceReport.find({ site: /^E2E-AGENT-/ }).select('_id').lean() as any[])
    .map(r => String(r._id))
  if (reportIds.length > 0) {
    await AgentDecision.deleteMany({ refId: { $in: reportIds } })
  }
  await MaintenanceReport.deleteMany({ site: /^E2E-AGENT-/ })
  await AdminQuote.deleteMany({ createdBy: { $in: ['agent:quote_draft', 'agent:contract_renewal'] } })
  await AgentJob.deleteMany({ type: { $in: ['quote_draft', 'contract_renewal', 'client_digest'] } })
  await AgentRun.deleteMany({ graph: { $in: ['quote_draft', 'contract_renewal', 'client_digest'] } })
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

export async function createTestServiceMission(clientId: string, providerId: string, amount = 10000) {
  await connectMongoose()
  const now = new Date()

  const request = await ServiceRequest.create({
    clientId,
    category: 'plomberie',
    description: 'Fuite E2E',
    location: { type: 'Point', coordinates: [-17.467686, 14.716677], address: 'Dakar E2E' },
    budget: amount,
    status: 'in_progress',
    assignedProviderId: new mongoose.Types.ObjectId(providerId),
    startedAt: now,
    lastActivityAt: now,
  })

  const offer = await Offer.create({
    requestId: request._id,
    providerId,
    providerName: 'E2E Provider',
    price: amount,
    etaMinutes: 30,
    validUntil: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    status: 'accepted',
  })

  request.selectedOfferId = offer._id
  await request.save()

  const payment = await Payment.create({
    requestId: request._id,
    offerId: offer._id,
    clientId,
    providerId,
    amount,
    provider: 'wave',
    phase: 'full',
    status: 'held',
    heldAt: now,
    useEscrow: true,
  })

  return { requestId: String(request._id), offerId: String(offer._id), paymentId: String(payment._id) }
}

export async function cleanupServiceTestData(prefix: string | RegExp = /E2E/) {
  await connectMongoose()
  const requests = await ServiceRequest.find({ description: { $regex: prefix } }).lean() as any[]
  const requestIds = requests.map((r) => String(r._id))
  await Promise.all([
    ServiceRequest.deleteMany({ _id: { $in: requestIds } }),
    Offer.deleteMany({ requestId: { $in: requestIds } }),
    Payment.deleteMany({ requestId: { $in: requestIds } }),
  ])
}
