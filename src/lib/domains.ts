/**
 * ═══════════════════════════════════════════════════════════════════════════
 * REGISTRE DES DOMAINES — source unique de vérité (cf. AUDIT_GLOBAL_SORTIE_MONOLITHE.md)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le dépôt héberge 3 produits distincts :
 *
 *   corporate → IT Vision B2B : portail-entreprise, interventions, contrats,
 *               devis/factures, projets, support, tech-interface
 *   market    → DDM+ : marketplace import Chine (market.itvisionplus.sn),
 *               commandes, achats groupés, grains, vendeurs
 *   xeuy      → App mobile de mise en relation de services (consumer+provider,
 *               fusion prévue EN DERNIER sur branche dédiée)
 *
 *   admin     → back-office transversal (à namespacer : admin/corporate|market|xeuy)
 *   shared    → socle commun : identité, auth, notifications, messagerie, upload
 *   public    → pages publiques / marketing
 *   deprecated→ code mort à supprimer (ne plus rien ajouter ici)
 *
 * RÈGLES POUR LES AGENTS :
 * - 1 tâche = 1 domaine. Ne jamais importer un modèle d'un autre domaine
 *   (sauf modèles 'shared') depuis une route de ce domaine.
 * - Toute nouvelle route DOIT être déclarée ici.
 * - Les interactions inter-domaines passent par le bus d'événements
 *   ou /api/internal/* — jamais par un import direct de modèle.
 */

export type Domain =
  | 'corporate'
  | 'market'
  | 'xeuy'
  | 'admin'
  | 'shared'
  | 'public'
  | 'deprecated'

/**
 * Accès requis par profil — remplace progressivement la logique de rôle global.
 * 'companyClient' = user.companyClientId (client B2B portail-entreprise)
 * 'corporate'     = user.corporateProfileId (personnel IT Vision)
 * 'marketplace'   = user.marketplaceProfileId
 * 'provider'      = user.providerProfileId (prestataire Xeuy)
 * 'vendor'        = user.vendorProfileId (vendeur DDM+)
 */
export type RequiredProfile =
  | 'companyClient'
  | 'corporate'
  | 'marketplace'
  | 'provider'
  | 'vendor'

export interface RouteRule {
  /** Préfixe de route (match sur pathname === prefix || pathname.startsWith(prefix + '/')) */
  prefix: string
  domain: Domain
  /** Accès : 'public' | 'auth' (connecté) | profil requis | rôles staff interne */
  access: 'public' | 'auth' | { profile: RequiredProfile } | { staffRoles: string[] }
  /** Marqueur de revue : classification incertaine, à confirmer */
  review?: boolean
  note?: string
}

// ─── PAGES ──────────────────────────────────────────────────────────────────
// IMPORTANT : ordre = priorité. Les préfixes les plus longs en premier.

export const PAGE_RULES: RouteRule[] = [
  // ── Racine : homepage du site corporate ──
  { prefix: '/', domain: 'corporate', access: 'public', note: 'Homepage (DigitalHomepage) — app/(corporate)/page.tsx' },

  // ── Corporate : portail B2B ──
  { prefix: '/portail-entreprise', domain: 'corporate', access: { profile: 'companyClient' }, note: 'Portail client entreprise — le portail B2B officiel' },
  { prefix: '/tech-interface', domain: 'corporate', access: { staffRoles: ['TECHNICIAN', 'ADMIN', 'SUPER_ADMIN'] } },
  { prefix: '/validation-rapports', domain: 'corporate', access: { staffRoles: ['ADMIN', 'SUPER_ADMIN'] } },
  { prefix: '/workflow-engine', domain: 'corporate', access: { staffRoles: ['ADMIN', 'SUPER_ADMIN'] }, review: true },
  { prefix: '/workflows', domain: 'corporate', access: { staffRoles: ['ADMIN', 'SUPER_ADMIN'] } },

  // ── Back-office transversal (à namespacer par domaine) ──
  { prefix: '/admin', domain: 'admin', access: { staffRoles: ['ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER', 'ACCOUNTANT'] }, note: 'Console unique des 3 domaines — à éclater en sections namespacées' },
  { prefix: '/admin-reports', domain: 'admin', access: { staffRoles: ['ADMIN', 'SUPER_ADMIN'] } },
  { prefix: '/admin-prix', domain: 'admin', access: { staffRoles: ['ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER'] }, note: 'Édition prix produits → sous-domaine market' },
  { prefix: '/admin-produits', domain: 'deprecated', access: 'public', note: 'Redirect vers /admin/produits — supprimer' },

  // ── Corporate : vitrine publique ──
  { prefix: '/services', domain: 'corporate', access: 'public' },
  { prefix: '/realisations', domain: 'corporate', access: 'public' },
  { prefix: '/digitalisation', domain: 'corporate', access: 'public' },
  { prefix: '/domotique', domain: 'corporate', access: 'public' },
  { prefix: '/maintenance-digital', domain: 'corporate', access: 'public' },
  { prefix: '/gestion-projets', domain: 'corporate', access: 'public' },
  { prefix: '/portail-valeur', domain: 'corporate', access: 'public' },
  { prefix: '/generateur-devis', domain: 'corporate', access: 'public' },
  { prefix: '/intervention', domain: 'corporate', access: 'public', note: 'Formulaire public de demande d\'intervention' },
  { prefix: '/mobile-app', domain: 'deprecated', access: 'public', note: 'Ancien portail tech terrain (MobileInterventionApp, 46 Ko, orphelin, non utilisé). DÉCISION : supprimer — le besoin terrain sera refait proprement via tech-interface rendu responsive (une seule interface, pas deux)' },
  { prefix: '/about', domain: 'corporate', access: 'public' },
  { prefix: '/contact', domain: 'corporate', access: 'public' },

  // ── Marketplace DDM+ ──
  { prefix: '/market/compte', domain: 'market', access: 'auth' },
  { prefix: '/market', domain: 'market', access: 'public' },
  { prefix: '/produits', domain: 'market', access: 'public', note: 'Sur itvisionplus.sn : réécrit → /corporate-produits (vitrine B2B)' },
  { prefix: '/corporate-produits', domain: 'market', access: 'public' },
  { prefix: '/boutiques', domain: 'market', access: 'public' },
  { prefix: '/tarification', domain: 'market', access: 'public' },
  { prefix: '/prix-transparent', domain: 'market', access: 'public' },
  { prefix: '/retrouver-ma-commande', domain: 'market', access: 'public' },
  { prefix: '/suivi', domain: 'market', access: 'public', review: true },
  { prefix: '/devenir-vendeur', domain: 'market', access: 'public' },
  { prefix: '/vendeur', domain: 'market', access: 'public' },
  { prefix: '/panier', domain: 'market', access: 'public' },
  { prefix: '/checkout', domain: 'market', access: 'auth' },
  { prefix: '/commandes', domain: 'market', access: 'auth' },
  { prefix: '/achats-groupes', domain: 'market', access: 'auth' },
  { prefix: '/grains', domain: 'market', access: 'auth' },
  { prefix: '/compte', domain: 'market', access: 'auth', note: 'Compte client marketplace. Règle : CLIENT+companyClientId → redirect /portail-entreprise' },
  { prefix: '/espace-vendeur', domain: 'market', access: { profile: 'vendor' } },
  { prefix: '/paiement', domain: 'market', access: 'auth' },
  { prefix: '/payment', domain: 'market', access: 'auth' },
  { prefix: '/messages', domain: 'shared', access: 'auth', note: 'Messagerie transversale' },

  // ── Auth & légal (publics) ──
  { prefix: '/login', domain: 'shared', access: 'public' },
  { prefix: '/register', domain: 'shared', access: 'public' },
  { prefix: '/register-corporate', domain: 'shared', access: 'public' },
  { prefix: '/forgot-password', domain: 'shared', access: 'public' },
  { prefix: '/reset-password', domain: 'shared', access: 'public' },
  { prefix: '/cgv', domain: 'shared', access: 'public' },
  { prefix: '/mentions-legales', domain: 'shared', access: 'public' },
  { prefix: '/politique-confidentialite', domain: 'shared', access: 'public' },

  // ── Code mort ──
  { prefix: '/client-portal-v2', domain: 'deprecated', access: 'public', note: 'Doublon de portail-entreprise (ModernClientPortal, 107 Ko)' },
  { prefix: '/client-portal', domain: 'deprecated', access: 'public', note: 'Doublon de portail-entreprise' },
  { prefix: '/test-inputs', domain: 'deprecated', access: 'public', note: 'Page de test dev' },
]

// ─── API ────────────────────────────────────────────────────────────────────

export const API_RULES: RouteRule[] = [
  // ── Xeuy (mobile) — futur service séparé api.xeuy.* ──
  { prefix: '/api/services', domain: 'xeuy', access: 'auth' },
  { prefix: '/api/provider', domain: 'xeuy', access: { profile: 'provider' } },
  { prefix: '/api/ai', domain: 'xeuy', access: 'auth', note: 'Matching/assistance services' },
  { prefix: '/api/escrow', domain: 'xeuy', access: 'auth' },
  { prefix: '/api/wallet', domain: 'xeuy', access: 'auth' },
  { prefix: '/api/kyc', domain: 'xeuy', access: 'auth', review: true },

  // ── Corporate B2B ──
  { prefix: '/api/client-enterprise', domain: 'corporate', access: { profile: 'companyClient' } },
  { prefix: '/api/clients', domain: 'corporate', access: { staffRoles: ['ADMIN', 'SUPER_ADMIN'] } },
  { prefix: '/api/interventions', domain: 'corporate', access: 'auth' },
  { prefix: '/api/maintenance', domain: 'corporate', access: 'auth' },
  { prefix: '/api/installations', domain: 'corporate', access: 'auth' },
  { prefix: '/api/scheduling', domain: 'corporate', access: 'auth' },
  { prefix: '/api/technicians', domain: 'corporate', access: { staffRoles: ['ADMIN', 'SUPER_ADMIN', 'TECHNICIAN'] } },
  { prefix: '/api/tech', domain: 'corporate', access: { staffRoles: ['TECHNICIAN', 'ADMIN', 'SUPER_ADMIN'] } },
  { prefix: '/api/projects', domain: 'corporate', access: 'auth' },
  { prefix: '/api/workflows', domain: 'corporate', access: 'auth' },
  { prefix: '/api/tickets', domain: 'corporate', access: 'auth' },
  { prefix: '/api/support', domain: 'corporate', access: 'auth', note: 'SupportTicket — quasi mort, fusionner dans Ticket', review: true },
  { prefix: '/api/reports', domain: 'corporate', access: 'auth' },
  { prefix: '/api/accounting', domain: 'corporate', access: { staffRoles: ['ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT'] } },
  { prefix: '/api/realizations', domain: 'corporate', access: 'public' },
  { prefix: '/api/quotes', domain: 'corporate', access: 'auth', note: 'Modèle Quote legacy MAIS en usage (admin, EnhancedProjectManager) — fusionner dans AdminQuote puis supprimer', review: true },

  // ── Marketplace DDM+ ──
  { prefix: '/api/market', domain: 'market', access: 'public' },
  { prefix: '/api/account', domain: 'market', access: 'auth' },
  { prefix: '/api/catalog', domain: 'market', access: 'public' },
  { prefix: '/api/products', domain: 'market', access: 'public' },
  { prefix: '/api/pricing', domain: 'market', access: 'public' },
  { prefix: '/api/shops', domain: 'market', access: 'public' },
  { prefix: '/api/promo-slides', domain: 'market', access: 'public' },
  { prefix: '/api/order', domain: 'market', access: 'auth' },
  { prefix: '/api/order-chat', domain: 'market', access: 'auth' },
  { prefix: '/api/group-orders', domain: 'market', access: 'auth' },
  { prefix: '/api/grains', domain: 'market', access: 'auth' },
  { prefix: '/api/favorites', domain: 'market', access: 'auth' },
  { prefix: '/api/returns', domain: 'market', access: 'auth' },
  { prefix: '/api/reviews', domain: 'market', access: 'auth' },
  { prefix: '/api/vendor', domain: 'market', access: { profile: 'vendor' } },
  { prefix: '/api/payment', domain: 'market', access: 'auth' },
  { prefix: '/api/scrape', domain: 'market', access: { staffRoles: ['ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER'] } },
  { prefix: '/api/shipping', domain: 'market', access: 'auth' },
  { prefix: '/api/shipping-rates', domain: 'market', access: 'public' },
  { prefix: '/api/exchange-rate', domain: 'market', access: 'public' },
  { prefix: '/api/corporate', domain: 'market', access: 'public', note: 'Catalogue produits B2B (corporate-produits)', review: true },

  // ── Back-office transversal ──
  { prefix: '/api/admin', domain: 'admin', access: { staffRoles: ['ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER', 'ACCOUNTANT'] } },

  // ── Partagé / socle ──
  { prefix: '/api/auth', domain: 'shared', access: 'public', note: 'Login web+mobile, OTP, register — point d\'entrée des 3 domaines' },
  { prefix: '/api/notifications', domain: 'shared', access: 'auth' },
  { prefix: '/api/messages', domain: 'shared', access: 'auth' },
  { prefix: '/api/payments', domain: 'shared', access: 'auth', note: 'Gateway transversale : Order (market) + ServiceRequest (xeuy) — candidat module payment séparé', review: true },
  { prefix: '/api/users', domain: 'shared', access: 'auth' },
  { prefix: '/api/feedback', domain: 'shared', access: 'auth' },
  { prefix: '/api/analytics', domain: 'shared', access: 'public' },
  { prefix: '/api/upload', domain: 'shared', access: 'auth' },
  { prefix: '/api/uploads', domain: 'shared', access: 'auth' },
  { prefix: '/api/booking', domain: 'shared', access: 'auth', review: true },
  { prefix: '/api/cron', domain: 'shared', access: { staffRoles: ['ADMIN', 'SUPER_ADMIN'] } },
  { prefix: '/api/csrf', domain: 'shared', access: 'public' },
  { prefix: '/api/diagnostic', domain: 'shared', access: { staffRoles: ['ADMIN', 'SUPER_ADMIN'] } },
  { prefix: '/api/health', domain: 'shared', access: 'public' },
  { prefix: '/api/security', domain: 'shared', access: { staffRoles: ['ADMIN', 'SUPER_ADMIN'] } },
  { prefix: '/api/test-email', domain: 'shared', access: { staffRoles: ['ADMIN', 'SUPER_ADMIN'] } },

  // ── Compte client marketplace (les endpoints corporate du client-portal ont été supprimés) ──
  { prefix: '/api/client', domain: 'market', access: 'auth', note: 'Reste : profile + request-pro (compte/checkout/panier + mobile CORS)' },
]

// ─── MODÈLES ────────────────────────────────────────────────────────────────

export const MODEL_DOMAINS: Record<string, Domain> = {
  // Corporate
  Client: 'corporate',
  CorporateProfile: 'corporate',
  MaintenanceContract: 'corporate',
  MaintenanceActivity: 'corporate',
  MaintenanceReport: 'corporate',
  MaintenanceBid: 'corporate',
  Intervention: 'corporate',
  Project: 'corporate',
  ProjectImage: 'corporate',
  AdminQuote: 'corporate',
  AdminInvoice: 'corporate',
  Ticket: 'corporate',
  Technician: 'corporate',
  MilestoneKnowledge: 'corporate',
  ReportPhoto: 'corporate',
  Lead: 'corporate',
  Contact: 'corporate',
  Installation: 'corporate',
  AccountingEntry: 'corporate',
  Expense: 'corporate',
  Realization: 'corporate',
  Workflow: 'corporate',
  Quote: 'deprecated',
  SupportTicket: 'deprecated',

  // Market
  Product: 'market',
  'Product.validated': 'market',
  ProductValidated: 'market',
  ProductCategory: 'market',
  ProductQuestion: 'market',
  Order: 'market',
  GroupOrder: 'market',
  Shop: 'market',
  MarketplaceProfile: 'market',
  VendorProfile: 'market',
  GrainsTransaction: 'market',
  Reward: 'market',
  UserReward: 'market',
  WheelSpin: 'market',
  Challenge: 'market',
  UserChallenge: 'market',
  MonthlyContest: 'market',
  DailyCheckIn: 'market',
  Review: 'market',
  ReturnRequest: 'market',
  SourcingRequest: 'market',
  ChinaPurchase: 'market',
  OrderChatMessage: 'market',
  GroupOrderChatMessage: 'market',
  Campaign: 'market',
  PromoSlide: 'market',
  ExternalSearchLog: 'market',
  VisibilityDispatch: 'market',

  // Xeuy
  ServiceRequest: 'xeuy',
  ServiceCategory: 'xeuy',
  Service: 'xeuy',
  ServiceReview: 'xeuy',
  Offer: 'xeuy',
  ProviderProfile: 'xeuy',
  ProviderSubscription: 'xeuy',
  ProviderPortfolio: 'xeuy',
  Assignment: 'xeuy',
  DisputeEvidence: 'xeuy',
  DisputeMessage: 'xeuy',
  EscrowTransaction: 'xeuy',
  MissionAuditLog: 'xeuy',
  MissionUnlock: 'xeuy',
  Payment: 'xeuy',
  TopupPayment: 'xeuy',
  Wallet: 'xeuy',
  WalletTransaction: 'xeuy',
  WithdrawalRequest: 'xeuy',
  KycRequest: 'xeuy',
  ChatMessage: 'xeuy',

  // Shared / socle
  User: 'shared',
  Notification: 'shared',
  InAppNotification: 'shared',
  PushSubscription: 'shared',
  PushToken: 'shared',
  Activity: 'shared',
  AuditLog: 'shared',
  Conversation: 'shared',
  Message: 'shared',
  Feedback: 'shared',
  PageVisit: 'shared',
  AppConfig: 'shared',
  ScheduledTask: 'shared',
  RefreshToken: 'shared',
  SentEmail: 'shared',
  OtpCode: 'shared',
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function matchPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + '/')
}

/** Règle la plus spécifique pour un chemin de page. */
export function getPageRule(pathname: string): RouteRule | null {
  return PAGE_RULES.find(r => matchPrefix(pathname, r.prefix)) ?? null
}

/** Règle la plus spécifique pour un chemin d'API. */
export function getApiRule(pathname: string): RouteRule | null {
  return API_RULES.find(r => matchPrefix(pathname, r.prefix)) ?? null
}

/** Domaine d'un chemin (page ou API). null si non déclaré. */
export function getDomainForPath(pathname: string): Domain | null {
  if (pathname.startsWith('/api/')) return getApiRule(pathname)?.domain ?? null
  return getPageRule(pathname)?.domain ?? null
}

/** Domaine d'un modèle Mongoose. */
export function getModelDomain(modelName: string): Domain | null {
  return MODEL_DOMAINS[modelName] ?? null
}
