"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// scripts/production-preflight.ts
var import_mongodb = require("mongodb");
var import_ioredis = __toESM(require("ioredis"));

// src/lib/models/AppConfig.ts
var import_mongoose = require("mongoose");
var AI_FEATURE_KEYS = ["clarify_request", "enhance_request", "photo_analysis", "analyze_request", "mission_coach", "mission_help", "suggest_offer", "daily_tips", "general_chat"];
var AI_AUTO_FEATURES = ["mission_coach", "daily_tips"];
var AppConfigSchema = new import_mongoose.Schema({
  key: { type: String, required: true, unique: true, default: "global" },
  shippingCosts: {
    type: new import_mongoose.Schema({
      version: { type: Number, required: true, min: 1 },
      costs: { type: import_mongoose.Schema.Types.Mixed, required: true },
      updatedAt: { type: Date, required: true }
    }, { _id: false }),
    default: void 0
  },
  marketPricing: {
    type: new import_mongoose.Schema({
      version: { type: Number, required: true, min: 1 },
      config: { type: import_mongoose.Schema.Types.Mixed, required: true },
      updatedAt: { type: Date, required: true }
    }, { _id: false }),
    default: void 0
  },
  monetization: {
    mode: { type: String, enum: ["free", "points", "commission"], default: "free" },
    freeUntil: { type: Date },
    pointsPerWonMission: { type: Number, default: 0, min: 0 },
    welcomePoints: { type: Number, default: 25, min: 0 },
    referralBonusPoints: { type: Number, default: 1e3, min: 0 },
    commissionRate: { type: Number, default: 0, min: 0, max: 100 },
    fcfaPerPoint: { type: Number, default: 100, min: 1 },
    escrowCostPoints: { type: Number, default: 25, min: 0 }
  },
  escrow: {
    enabled: { type: Boolean, default: true },
    mandatory: { type: Boolean, default: false },
    disputeWindowHours: { type: Number, default: 48, min: 1 }
  },
  credits: {
    unlockEnabled: { type: Boolean, default: false },
    minUnlockCost: { type: Number, default: 1, min: 0 },
    maxUnlockCost: { type: Number, default: 8, min: 1 },
    budgetTiers: {
      type: [{ maxBudget: { type: Number, required: true }, cost: { type: Number, required: true }, _id: false }],
      default: [
        { maxBudget: 1e4, cost: 1 },
        { maxBudget: 3e4, cost: 2 },
        { maxBudget: 75e3, cost: 3 },
        { maxBudget: 2e5, cost: 5 },
        { maxBudget: 1e9, cost: 6 }
      ]
    },
    premiumCategories: { type: import_mongoose.Schema.Types.Mixed, default: {} },
    urgencySurcharge: { type: Number, default: 1, min: 0 },
    refundWindowMinutes: { type: Number, default: 10, min: 0 },
    packs: {
      type: [{
        id: { type: String, required: true },
        credits: { type: Number, required: true, min: 1 },
        bonusCredits: { type: Number, default: 0, min: 0 },
        priceFcfa: { type: Number, required: true, min: 100 },
        popular: { type: Boolean, default: false },
        _id: false
      }],
      default: [
        { id: "starter", credits: 10, bonusCredits: 0, priceFcfa: 2e3, popular: false },
        { id: "standard", credits: 25, bonusCredits: 2, priceFcfa: 4500, popular: false },
        { id: "popular", credits: 60, bonusCredits: 8, priceFcfa: 1e4, popular: true },
        { id: "pro", credits: 150, bonusCredits: 30, priceFcfa: 22500, popular: false }
      ]
    }
  },
  visibility: {
    enabled: { type: Boolean, default: true },
    requireKycForNotification: { type: Boolean, default: false },
    browseScope: { type: String, enum: ["all", "category"], default: "category" },
    defaultRadiusKm: { type: Number, default: 10, min: 1 },
    maxRadiusKm: { type: Number, default: 200, min: 1 },
    presenceFreshnessSec: { type: Number, default: 600, min: 30 },
    maxProvidersPerWave: { type: Number, default: 50, min: 1 },
    escalation: {
      type: [{
        stage: { type: Number, required: true },
        radiusKm: { type: Number, required: true },
        delaySec: { type: Number, required: true },
        minOffersToStop: { type: Number, default: 1 },
        minProvidersToStop: { type: Number, default: 5 },
        _id: false
      }],
      default: [
        { stage: 0, radiusKm: 10, delaySec: 0, minOffersToStop: 1, minProvidersToStop: 5 },
        { stage: 1, radiusKm: 20, delaySec: 120, minOffersToStop: 1, minProvidersToStop: 8 },
        { stage: 2, radiusKm: 30, delaySec: 120, minOffersToStop: 1, minProvidersToStop: 12 },
        { stage: 3, radiusKm: 60, delaySec: 180, minOffersToStop: 1, minProvidersToStop: 20 },
        { stage: 4, radiusKm: 150, delaySec: 300, minOffersToStop: 1, minProvidersToStop: 40 }
      ]
    },
    scoreWeights: {
      distance: { type: Number, default: 0.4, min: 0 },
      availability: { type: Number, default: 0.2, min: 0 },
      category: { type: Number, default: 0.2, min: 0 },
      rating: { type: Number, default: 0.1, min: 0 },
      responsiveness: { type: Number, default: 0.1, min: 0 }
    },
    tiers: {
      type: [{
        id: { type: String, required: true },
        label: { type: String, required: true },
        radiusKm: { type: Number, required: true },
        priorityLevel: { type: Number, default: 0 },
        boostMultiplier: { type: Number, default: 1 },
        _id: false
      }],
      default: [
        { id: "free", label: "Gratuit", radiusKm: 10, priorityLevel: 0, boostMultiplier: 1 },
        { id: "plus", label: "Plus", radiusKm: 20, priorityLevel: 1, boostMultiplier: 1.2 },
        { id: "pro", label: "Pro", radiusKm: 30, priorityLevel: 2, boostMultiplier: 1.5 },
        { id: "unlimited", label: "Illimit\xE9", radiusKm: -1, priorityLevel: 3, boostMultiplier: 2 }
      ]
    },
    fallback: {
      useLastKnownPosition: { type: Boolean, default: true },
      useProfileCity: { type: Boolean, default: true }
    }
  },
  ai: {
    enabled: { type: Boolean, default: true },
    freeUntil: { type: Date },
    features: {
      type: import_mongoose.Schema.Types.Mixed,
      // Les features automatiques (coach mission par étape, conseils du jour) sont gratuites par défaut :
      // déclenchées par l'app et mises en cache, elles ne doivent pas manger le quota de l'utilisateur.
      default: () => Object.fromEntries(AI_FEATURE_KEYS.map((k) => [k, { enabled: true, mode: AI_AUTO_FEATURES.includes(k) ? "free" : "quota" }]))
    },
    eligibility: {
      minCompletedMissions: { type: Number, default: 10, min: 0 },
      minScoreXeuy: { type: Number, default: 70, min: 0, max: 100 },
      minReliability: { type: Number, default: 80, min: 0, max: 100 },
      requireKyc: { type: Boolean, default: true }
    },
    pricing: {
      textCostPoints: { type: Number, default: 1, min: 0 },
      visionCostPoints: { type: Number, default: 3, min: 0 }
    },
    dailyFreeQuota: {
      client: { type: Number, default: 2, min: 0 },
      provider: { type: Number, default: 2, min: 0 }
    },
    maxImagesPerCall: { type: Number, default: 3, min: 1, max: 5 }
  },
  autoImport: {
    enabled: { type: Boolean, default: false },
    schedule: { type: String, default: "0 2 * * *" },
    urls: { type: [String], default: [] },
    concurrency: { type: Number, default: 1, min: 1, max: 10 },
    dryRun: { type: Boolean, default: false },
    apiBaseUrl: { type: String, default: "" },
    apiToken: { type: String, default: "" },
    lastRun: {
      startedAt: String,
      finishedAt: String,
      created: Number,
      failed: Number,
      urls: Number,
      errors: [String],
      _id: false
    }
  },
  integrations: {
    ddmBridge: {
      enabled: { type: Boolean, default: false }
    },
    onlinePayments: {
      enabled: { type: Boolean, default: false }
    },
    whatsappRelay: {
      enabled: { type: Boolean, default: false },
      events: { type: import_mongoose.Schema.Types.Mixed, default: {} }
    },
    sourcingAutoSend: {
      enabled: { type: Boolean, default: false },
      minRelevance: { type: Number, default: 0.8, min: 0.5, max: 1 }
    }
  }
}, { timestamps: true });
var AppConfig = import_mongoose.models.AppConfig || (0, import_mongoose.model)("AppConfig", AppConfigSchema);
var AppConfig_default = AppConfig;

// src/lib/pricing/shared-settings.ts
var import_zod4 = require("zod");

// src/lib/mongoose.ts
var import_mongoose2 = __toESM(require("mongoose"));

// src/lib/validation.ts
var import_zod = require("zod");
var pricingPercentageSchema = import_zod.z.number().finite().min(0).max(100);
var pricingDefaultsUpdateSchema = import_zod.z.object({
  defaultExchangeRate: import_zod.z.number().finite().min(1).optional(),
  defaultServiceFeeRate: pricingPercentageSchema.optional(),
  singleImportServiceFeeRate: pricingPercentageSchema.optional(),
  defaultInsuranceRate: pricingPercentageSchema.optional(),
  defaultB2BDiscountPercent: import_zod.z.number().finite().min(1).max(50).optional(),
  serviceFeeTiers: import_zod.z.array(import_zod.z.object({
    minAmount: import_zod.z.number().finite().int().min(0),
    maxAmount: import_zod.z.number().finite().int().min(0).optional(),
    feeRate: pricingPercentageSchema,
    label: import_zod.z.string().trim().min(1).max(100),
    description: import_zod.z.string().trim().max(500)
  }).strict()).min(1).max(20).refine((tiers) => tiers.length > 0 && tiers[0].minAmount === 0, "Le premier palier doit commencer \xE0 0 FCFA.").refine((tiers) => tiers.every((tier, index) => index === 0 || tier.minAmount > tiers[index - 1].minAmount), "Les seuils des paliers doivent \xEAtre strictement croissants.").optional()
}).strict().refine((data) => Object.values(data).some((value) => value !== void 0), "Aucun r\xE9glage fourni.");
var orderCreateSchema = import_zod.z.object({
  cart: import_zod.z.array(
    import_zod.z.object({
      id: import_zod.z.string().min(1),
      qty: import_zod.z.number().int().min(1).default(1),
      name: import_zod.z.string().optional(),
      variantId: import_zod.z.string().max(128).optional(),
      variantIds: import_zod.z.array(import_zod.z.string().max(128)).max(10).optional(),
      variantLabels: import_zod.z.array(import_zod.z.string().max(200)).max(10).optional(),
      shipping: import_zod.z.record(import_zod.z.string(), import_zod.z.any()).optional()
    })
  ).min(1),
  name: import_zod.z.string().min(2),
  phone: import_zod.z.string().min(8),
  email: import_zod.z.string().email().optional().or(import_zod.z.literal("")),
  address: import_zod.z.object({
    region: import_zod.z.string().min(1),
    department: import_zod.z.string().min(1),
    neighborhood: import_zod.z.string().min(1),
    street: import_zod.z.string().min(1),
    city: import_zod.z.string().optional(),
    postalCode: import_zod.z.string().optional(),
    country: import_zod.z.string().optional(),
    additionalInfo: import_zod.z.string().optional(),
    notes: import_zod.z.string().optional()
  }),
  shippingMethod: import_zod.z.string().optional(),
  grainsAmount: import_zod.z.number().int().min(0).optional(),
  promo: import_zod.z.object({ code: import_zod.z.string(), discount: import_zod.z.number().min(0) }).optional()
});
var paymentInitSchema = import_zod.z.object({
  orderId: import_zod.z.string().min(1),
  provider: import_zod.z.enum(["wave", "orange_money", "free_money", "cash", "wave_qr"]),
  clientPhone: import_zod.z.string().min(8),
  phase: import_zod.z.enum(["deposit", "balance", "full"]).optional().default("full"),
  token: import_zod.z.string().optional()
});
var offerPaymentInitSchema = import_zod.z.object({
  offerId: import_zod.z.string().min(1),
  provider: import_zod.z.enum(["wave", "orange_money", "free_money", "cash", "wave_qr"]),
  clientPhone: import_zod.z.string().min(8).optional(),
  phase: import_zod.z.enum(["deposit", "balance", "full"]).optional().default("full"),
  useEscrow: import_zod.z.boolean().optional()
});

// src/lib/pricing/constants.ts
var DEFAULT_EXCHANGE_RATE = 100;
var SOURCE_CURRENCIES = ["CNY", "USD", "EUR", "MAD", "XOF", "XAF", "GBP", "AED", "SAR"];
var SOURCE_CURRENCY_RATES = {
  CNY: Number(process.env.EXCHANGE_RATE_CNY || DEFAULT_EXCHANGE_RATE),
  USD: Number(process.env.EXCHANGE_RATE_USD || 600),
  EUR: Number(process.env.EXCHANGE_RATE_EUR || 656),
  MAD: Number(process.env.EXCHANGE_RATE_MAD || 60),
  XOF: 1,
  XAF: 1,
  GBP: Number(process.env.EXCHANGE_RATE_GBP || 765),
  AED: Number(process.env.EXCHANGE_RATE_AED || 165),
  SAR: Number(process.env.EXCHANGE_RATE_SAR || 160)
};

// src/lib/logistics.ts
var REAL_SHIPPING_COSTS = {
  air_express: {
    rate: 11e3,
    // 11 000 CFA/kg (coût réel interne)
    minimumCharge: 0
  },
  air_15: {
    rate: 8e3,
    minimumCharge: 0
  },
  sea_freight: {
    rate: 18e4,
    minimumCharge: 0
  },
  local_24h: {
    rate: 1e3,
    // ~1 000 CFA forfait coursier local (coût réel interne)
    minimumCharge: 1e3
  }
};
var BASE_SHIPPING_RATES = {
  air_express: {
    id: "air_express",
    label: "Express 3-5 jrs",
    description: "Livraison express porte-\xE0-porte",
    durationDays: 4,
    billing: "per_kg",
    rate: 12e3,
    // 12 000 CFA/kg
    minimumCharge: 12e3
  },
  air_15: {
    id: "air_15",
    label: "A\xE9rien 10-15 jrs",
    description: "Fret a\xE9rien \xE9conomique",
    durationDays: 13,
    billing: "per_kg",
    rate: 8500,
    // 8 500 CFA/kg
    minimumCharge: 8500
  },
  sea_freight: {
    id: "sea_freight",
    label: "Maritime 45-50 jrs",
    description: "Groupage maritime \xE9conomique",
    durationDays: 48,
    billing: "per_cubic_meter",
    rate: 18e4,
    // 180 000 CFA/m³
    minimumCharge: 0
    // Règle de 3 sur le volume
  },
  local_24h: {
    id: "local_24h",
    label: "Livraison locale 24h",
    description: "Produit en stock \xE0 Dakar \u2014 livr\xE9 par coursier sous 24h",
    durationDays: 1,
    billing: "flat",
    rate: 1500,
    // 1 500 CFA forfait
    minimumCharge: 0
  }
};

// src/lib/shipping/settings.ts
var import_node_crypto = require("node:crypto");
var import_zod2 = require("zod");

// src/lib/shipping/sea-freight-eligibility.ts
var DEFAULT_SEA_FREIGHT_ELIGIBILITY_SETTINGS = {
  minVolumeM3: 0.05,
  minBilledWeightKg: 15,
  minOrderValueFcfa: 1e5,
  requireDimensionsOrVolume: true
};
var toFiniteNumber = (value, fallback, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};
function sanitizeSeaFreightEligibilitySettings(raw, fallback = DEFAULT_SEA_FREIGHT_ELIGIBILITY_SETTINGS) {
  return {
    minVolumeM3: Number(toFiniteNumber(raw?.minVolumeM3, fallback.minVolumeM3, 0, 100).toFixed(4)),
    minBilledWeightKg: Number(toFiniteNumber(raw?.minBilledWeightKg, fallback.minBilledWeightKg, 0, 1e5).toFixed(2)),
    minOrderValueFcfa: Math.round(toFiniteNumber(raw?.minOrderValueFcfa, fallback.minOrderValueFcfa, 0, 1e10)),
    requireDimensionsOrVolume: typeof raw?.requireDimensionsOrVolume === "boolean" ? raw.requireDimensionsOrVolume : fallback.requireDimensionsOrVolume
  };
}

// src/lib/shipping/settings.ts
var _req = eval("require");
var fs = _req("fs");
var path = _req("path");
var FILE_PATH = path.resolve(process.cwd(), "data", "shipping-rates.json");
var SEA_FREIGHT_ELIGIBILITY_FILE_PATH = path.resolve(process.cwd(), "data", "sea-freight-eligibility.json");
var ADJUST_FILE_PATH = path.resolve(process.cwd(), "data", "shipping-adjust.json");
var INTERNAL_COSTS_FILE_PATH = path.resolve(process.cwd(), "data", "shipping-costs.json");
var internalShippingCostSchema = import_zod2.z.object({
  rate: import_zod2.z.number().finite().int().min(0).max(1e9),
  minimumCharge: import_zod2.z.number().finite().int().min(0).max(1e9).optional()
}).strict();
var internalShippingCostsSchema = import_zod2.z.object({
  air_express: internalShippingCostSchema.optional(),
  air_15: internalShippingCostSchema.optional(),
  sea_freight: internalShippingCostSchema.optional(),
  local_24h: internalShippingCostSchema.optional()
}).strict().refine((value) => Object.keys(value).length > 0, "Au moins un cout transporteur est requis");
function getConfiguredInternalShippingCosts(filePath = INTERNAL_COSTS_FILE_PATH) {
  const overrides = fs.existsSync(filePath) ? internalShippingCostsSchema.parse(JSON.parse(fs.readFileSync(filePath, "utf-8"))) : {};
  return Object.fromEntries(Object.keys(REAL_SHIPPING_COSTS).map((method) => [
    method,
    { ...REAL_SHIPPING_COSTS[method], ...overrides[method] }
  ]));
}
function writeInternalShippingCosts(payload, filePath = INTERNAL_COSTS_FILE_PATH) {
  const validated = internalShippingCostsSchema.parse(payload);
  const current = getConfiguredInternalShippingCosts(filePath);
  const updated = Object.fromEntries(Object.keys(current).map((method) => [
    method,
    { ...current[method], ...validated[method] }
  ]));
  const temporaryPath = `${filePath}.${(0, import_node_crypto.randomUUID)()}.tmp`;
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(temporaryPath, JSON.stringify(updated, null, 2), {
      flag: "wx",
      mode: fs.existsSync(filePath) ? fs.statSync(filePath).mode : 384
    });
    fs.renameSync(temporaryPath, filePath);
    return updated;
  } finally {
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
  }
}
var DEFAULT_OVERRIDES = {
  // Correction demandée:
  // - Express = 12 000 FCFA/kg (min 12000)
  // - Fret aérien = 8 500 FCFA/kg (min 8500)
  // - Maritime = 180 000 FCFA/m³ (min 0 ou proportional)
  air_express: { rate: 12e3, minimumCharge: 12e3 },
  air_15: { rate: 8500, minimumCharge: 8500 },
  sea_freight: { rate: 18e4, minimumCharge: 0 },
  // Livraison locale (boutiques, stock à Dakar) : forfait coursier ≤ 24h
  local_24h: { rate: 1500, minimumCharge: 0 }
};
function ensureFile() {
  const dir = path.dirname(FILE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(FILE_PATH)) fs.writeFileSync(FILE_PATH, JSON.stringify(DEFAULT_OVERRIDES, null, 2));
}
function ensureSeaFreightEligibilityFile() {
  const dir = path.dirname(SEA_FREIGHT_ELIGIBILITY_FILE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(SEA_FREIGHT_ELIGIBILITY_FILE_PATH)) {
    fs.writeFileSync(
      SEA_FREIGHT_ELIGIBILITY_FILE_PATH,
      JSON.stringify(DEFAULT_SEA_FREIGHT_ELIGIBILITY_SETTINGS, null, 2)
    );
  }
}
function readShippingRateOverrides() {
  try {
    ensureFile();
    const raw = fs.readFileSync(FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_OVERRIDES, ...parsed || {} };
  } catch {
    return DEFAULT_OVERRIDES;
  }
}
function writeShippingRateOverrides(payload) {
  ensureFile();
  const current = readShippingRateOverrides();
  const next = { ...current };
  for (const key of Object.keys(payload || {})) {
    const methodId = key;
    const v = payload[methodId];
    if (!v || typeof v !== "object") continue;
    const allowed = {
      rate: typeof v.rate === "number" && v.rate > 0 ? Math.round(v.rate) : current[methodId]?.rate ?? BASE_SHIPPING_RATES[methodId].rate
    };
    if (typeof v.minimumCharge === "number" && v.minimumCharge >= 0) {
      allowed.minimumCharge = Math.round(v.minimumCharge);
    }
    ;
    next[methodId] = allowed;
  }
  fs.writeFileSync(FILE_PATH, JSON.stringify(next, null, 2));
  return next;
}
function getConfiguredShippingRates() {
  const overrides = readShippingRateOverrides();
  const merged = {
    air_express: { ...BASE_SHIPPING_RATES.air_express },
    air_15: { ...BASE_SHIPPING_RATES.air_15 },
    sea_freight: { ...BASE_SHIPPING_RATES.sea_freight },
    local_24h: { ...BASE_SHIPPING_RATES.local_24h }
  };
  Object.keys(merged).forEach((id) => {
    const o = overrides[id];
    if (!o) return;
    if (typeof o.rate === "number" && o.rate > 0) merged[id].rate = o.rate;
    if (typeof o.minimumCharge === "number" && o.minimumCharge >= 0) merged[id].minimumCharge = o.minimumCharge;
  });
  return merged;
}
function readSeaFreightEligibilitySettings() {
  try {
    ensureSeaFreightEligibilityFile();
    const raw = fs.readFileSync(SEA_FREIGHT_ELIGIBILITY_FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return sanitizeSeaFreightEligibilitySettings(parsed, DEFAULT_SEA_FREIGHT_ELIGIBILITY_SETTINGS);
  } catch {
    return DEFAULT_SEA_FREIGHT_ELIGIBILITY_SETTINGS;
  }
}
function writeSeaFreightEligibilitySettings(payload) {
  ensureSeaFreightEligibilityFile();
  const current = readSeaFreightEligibilitySettings();
  const next = sanitizeSeaFreightEligibilitySettings(payload, current);
  fs.writeFileSync(SEA_FREIGHT_ELIGIBILITY_FILE_PATH, JSON.stringify(next, null, 2));
  return next;
}
function readShippingAdjustTolerance() {
  try {
    if (fs.existsSync(ADJUST_FILE_PATH)) {
      const v = Number(JSON.parse(fs.readFileSync(ADJUST_FILE_PATH, "utf-8"))?.tolerance);
      if (Number.isFinite(v) && v >= 0 && v <= 0.5) return v;
    }
  } catch {
  }
  const env = Number(process.env.SHIPPING_ADJUST_TOLERANCE);
  return Number.isFinite(env) && env >= 0 && env <= 0.5 ? env : 0.1;
}
function writeShippingAdjustTolerance(value) {
  const v = Math.min(0.5, Math.max(0, Math.round(value * 1e3) / 1e3));
  const dir = path.dirname(ADJUST_FILE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(ADJUST_FILE_PATH, JSON.stringify({ tolerance: v }, null, 2));
  return v;
}

// src/lib/shipping/shared-costs.ts
var import_zod3 = require("zod");
var methods = Object.keys(REAL_SHIPPING_COSTS);
var completeCostsSchema = internalShippingCostsSchema.refine((costs) => methods.every((method) => costs[method] !== void 0), "Tous les modes de transport sont requis").transform((costs) => costs);
var shippingCostsSnapshotSchema = import_zod3.z.object({
  version: import_zod3.z.number().int().positive(),
  costs: completeCostsSchema,
  updatedAt: import_zod3.z.coerce.date()
}).strict();

// src/lib/pricing/shared-settings.ts
var defaultsSchema = pricingDefaultsUpdateSchema.refine((value) => [
  "defaultExchangeRate",
  "defaultServiceFeeRate",
  "singleImportServiceFeeRate",
  "defaultInsuranceRate",
  "defaultB2BDiscountPercent",
  "serviceFeeTiers"
].every((key) => Object.hasOwn(value, key)), "Tous les reglages de prix sont requis").transform((value) => {
  const defaults = value;
  return {
    ...defaults,
    defaultExchangeRate: Math.round(defaults.defaultExchangeRate),
    serviceFeeTiers: defaults.serviceFeeTiers.map((tier, index, tiers) => {
      const normalized = { ...tier };
      if (tiers[index + 1]) normalized.maxAmount = tiers[index + 1].minAmount;
      else delete normalized.maxAmount;
      return normalized;
    })
  };
});
var rateSchema = import_zod4.z.object({
  rate: import_zod4.z.number().finite().int().min(0).max(1e9),
  minimumCharge: import_zod4.z.number().finite().int().min(0).max(1e9).optional()
}).strict();
var shippingRatesSchema = import_zod4.z.object({
  air_express: rateSchema,
  air_15: rateSchema,
  sea_freight: rateSchema,
  local_24h: rateSchema
}).strict();
var seaEligibilitySchema = import_zod4.z.object({
  minVolumeM3: import_zod4.z.number().finite().min(0).max(100),
  minBilledWeightKg: import_zod4.z.number().finite().min(0).max(1e5),
  minOrderValueFcfa: import_zod4.z.number().finite().int().min(0).max(1e10),
  requireDimensionsOrVolume: import_zod4.z.boolean()
}).strict();
var sharedPricingConfigSchema = import_zod4.z.object({
  defaults: defaultsSchema,
  sourceCurrencyRates: import_zod4.z.record(import_zod4.z.enum(SOURCE_CURRENCIES), import_zod4.z.number().finite().positive()),
  shippingRates: shippingRatesSchema,
  seaFreightEligibility: seaEligibilitySchema,
  adjustTolerance: import_zod4.z.number().finite().min(0).max(0.5)
}).strict().transform((config) => ({ ...config, sourceCurrencyRates: { ...config.sourceCurrencyRates, CNY: config.defaults.defaultExchangeRate } }));
var sharedPricingUpdateSchema = import_zod4.z.object({
  defaults: pricingDefaultsUpdateSchema.optional(),
  sourceCurrencyRates: import_zod4.z.partialRecord(import_zod4.z.enum(SOURCE_CURRENCIES), import_zod4.z.number().finite().positive()).optional(),
  shippingRates: shippingRatesSchema.partial().optional(),
  seaFreightEligibility: seaEligibilitySchema.partial().optional(),
  adjustTolerance: import_zod4.z.number().finite().min(0).max(0.5).optional()
}).strict().refine((value) => Object.values(value).some((item) => item !== void 0), "Aucun reglage fourni");
var sharedPricingSnapshotSchema = import_zod4.z.object({
  version: import_zod4.z.number().int().positive(),
  updatedAt: import_zod4.z.coerce.date(),
  config: sharedPricingConfigSchema
}).strict();

// scripts/production-preflight.ts
async function main() {
  const mongoUri = process.env.MONGODB_URI;
  const redisUrl = process.env.REDIS_URL;
  if (!mongoUri || !redisUrl) throw new Error("MONGODB_URI et REDIS_URL sont obligatoires");
  if (!process.env.JWT_SECRET || !process.env.NEXTAUTH_SECRET || !process.env.CRON_SECRET) {
    throw new Error("Les secrets JWT, NextAuth et cron doivent etre configures");
  }
  const client = new import_mongodb.MongoClient(mongoUri, { serverSelectionTimeoutMS: 1e4, readPreference: "primary" });
  const redis = new import_ioredis.default(redisUrl, { lazyConnect: true, enableOfflineQueue: false, maxRetriesPerRequest: 0, connectTimeout: 5e3, retryStrategy: () => null });
  redis.on("error", () => {
  });
  try {
    await client.connect();
    const topology = await client.db().command({ hello: 1 });
    if (!topology.setName || !topology.isWritablePrimary) throw new Error("MongoDB doit disposer d'un primaire en replica set");
    const config = await client.db().collection(AppConfig_default.collection.name).findOne({ key: "global" }, { projection: { marketPricing: 1, shippingCosts: 1 } });
    const pricing = sharedPricingSnapshotSchema.safeParse(config?.marketPricing);
    const costs = shippingCostsSnapshotSchema.safeParse(config?.shippingCosts);
    if (!pricing.success || !costs.success) throw new Error("Tarifs absents ou invalides : verifier la migration market-pricing avant la bascule");
    await redis.connect();
    if (await redis.ping() !== "PONG") throw new Error("Redis indisponible");
    console.log(`Precontrole OK : Mongo primaire, Redis, pricingVersion=${pricing.data.version}, internalCostsVersion=${costs.data.version}. Aucune ecriture.`);
  } finally {
    redis.disconnect();
    await client.close();
  }
}
main().catch((error) => {
  console.error("Precontrole refuse :", error instanceof Error && !/mongodb|redis:\/\//i.test(error.message) ? error.message : "connexion indisponible (details masques)");
  process.exitCode = 1;
});
