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

// scripts/migrate-shipping-costs.ts
var import_mongodb = require("mongodb");
var import_mongoose5 = __toESM(require("mongoose"));
var import_node_path = require("node:path");
var import_node_fs = require("node:fs");
var import_zod5 = require("zod");

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

// src/lib/pricing/tiered-service-fees.ts
var DEFAULT_SINGLE_IMPORT_SERVICE_FEE_RATE = 15;

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

// src/lib/pricing/platform-rate.ts
var KEY = "__ddmPlatformExchangeRate";
function registerPlatformExchangeRate(getter) {
  ;
  globalThis[KEY] = getter;
}
function registerPlatformSingleImportServiceFeeRate(getter) {
  ;
  globalThis.__ddmSingleImportServiceFeeRate = getter;
}

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
var import_zod = require("zod");

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
var internalShippingCostSchema = import_zod.z.object({
  rate: import_zod.z.number().finite().int().min(0).max(1e9),
  minimumCharge: import_zod.z.number().finite().int().min(0).max(1e9).optional()
}).strict();
var internalShippingCostsSchema = import_zod.z.object({
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
var import_zod2 = require("zod");

// src/lib/mongoose.ts
var import_mongoose2 = __toESM(require("mongoose"));
async function syncAllIndexes() {
  try {
    const modelNames = import_mongoose2.default.modelNames();
    for (const name of modelNames) {
      try {
        await import_mongoose2.default.model(name).syncIndexes();
      } catch (err) {
        console.warn(`[MongoDB] syncIndexes("${name}") failed:`, err instanceof Error ? err.message : err);
      }
    }
    console.log(`[MongoDB] \u2705 Indexes synchronis\xE9s (${modelNames.length} mod\xE8les)`);
  } catch (err) {
    console.warn("[MongoDB] syncAllIndexes global error:", err instanceof Error ? err.message : err);
  }
}
async function connectMongoose(uri) {
  const mongoUri = uri || process.env.MONGODB_URI || (process.env.NODE_ENV === "production" ? "" : "mongodb://localhost:27017/itvision");
  if (!mongoUri) {
    throw new Error("MONGODB_URI non d\xE9finie en production");
  }
  const safeUri = mongoUri.replace(/:[^:@]+@/, ":****@");
  const globalForMongoose = globalThis;
  if (!globalForMongoose.__mongooseCache) {
    globalForMongoose.__mongooseCache = { conn: null, promise: null, uri: null };
  }
  const cache = globalForMongoose.__mongooseCache;
  if (cache.conn && cache.uri === mongoUri && import_mongoose2.default.connection.readyState === 1) {
    return import_mongoose2.default.connection;
  }
  if (!cache.promise || cache.uri !== mongoUri) {
    cache.uri = mongoUri;
    console.log("[MongoDB] Connexion \xE0 MongoDB\u2026", safeUri);
    const isDev = process.env.NODE_ENV !== "production";
    const options = {
      autoIndex: true,
      serverSelectionTimeoutMS: isDev ? 3e3 : 1e4,
      connectTimeoutMS: isDev ? 3e3 : 1e4,
      socketTimeoutMS: 45e3
    };
    cache.promise = import_mongoose2.default.connect(mongoUri, options).then(async (m) => {
      cache.conn = m;
      console.log("[MongoDB] \u2705 Connexion r\xE9ussie");
      syncAllIndexes().catch(() => {
      });
      return m;
    });
  }
  try {
    await cache.promise;
    return import_mongoose2.default.connection;
  } catch (error) {
    cache.conn = null;
    cache.promise = null;
    console.error("[MongoDB] \u274C Erreur de connexion:", error);
    throw new Error(
      `Erreur de connexion MongoDB: ${error instanceof Error ? error.message : "Erreur inconnue"} (URI: ${safeUri})`
    );
  }
}

// src/lib/shipping/shared-costs.ts
var methods = Object.keys(REAL_SHIPPING_COSTS);
var completeCostsSchema = internalShippingCostsSchema.refine((costs) => methods.every((method) => costs[method] !== void 0), "Tous les modes de transport sont requis").transform((costs) => costs);
var shippingCostsSnapshotSchema = import_zod2.z.object({
  version: import_zod2.z.number().int().positive(),
  costs: completeCostsSchema,
  updatedAt: import_zod2.z.coerce.date()
}).strict();
async function readSharedShippingCosts() {
  await connectMongoose();
  const config = await AppConfig_default.findOne({ key: "global" }).select("shippingCosts").read("primary").lean();
  if (!config?.shippingCosts) throw new Error("Couts transporteur partages non initialises : executer la migration depuis le serveur admin.");
  return shippingCostsSnapshotSchema.parse(config.shippingCosts);
}
async function initializeSharedShippingCosts(costs) {
  const validated = completeCostsSchema.parse(costs);
  await connectMongoose();
  await AppConfig_default.init();
  try {
    await AppConfig_default.updateOne({ key: "global" }, { $setOnInsert: { key: "global" } }, { upsert: true });
  } catch (error) {
    if (error.code !== 11e3) throw error;
  }
  await AppConfig_default.updateOne(
    { key: "global", shippingCosts: { $exists: false } },
    { $set: { shippingCosts: { version: 1, costs: validated, updatedAt: /* @__PURE__ */ new Date() } } },
    { runValidators: true }
  );
  return readSharedShippingCosts();
}

// src/lib/pricing/shared-settings.ts
var import_zod4 = require("zod");

// src/lib/validation.ts
var import_zod3 = require("zod");
var pricingPercentageSchema = import_zod3.z.number().finite().min(0).max(100);
var pricingDefaultsUpdateSchema = import_zod3.z.object({
  defaultExchangeRate: import_zod3.z.number().finite().min(1).optional(),
  defaultServiceFeeRate: pricingPercentageSchema.optional(),
  singleImportServiceFeeRate: pricingPercentageSchema.optional(),
  defaultInsuranceRate: pricingPercentageSchema.optional(),
  defaultB2BDiscountPercent: import_zod3.z.number().finite().min(1).max(50).optional(),
  serviceFeeTiers: import_zod3.z.array(import_zod3.z.object({
    minAmount: import_zod3.z.number().finite().int().min(0),
    maxAmount: import_zod3.z.number().finite().int().min(0).optional(),
    feeRate: pricingPercentageSchema,
    label: import_zod3.z.string().trim().min(1).max(100),
    description: import_zod3.z.string().trim().max(500)
  }).strict()).min(1).max(20).refine((tiers) => tiers.length > 0 && tiers[0].minAmount === 0, "Le premier palier doit commencer \xE0 0 FCFA.").refine((tiers) => tiers.every((tier, index) => index === 0 || tier.minAmount > tiers[index - 1].minAmount), "Les seuils des paliers doivent \xEAtre strictement croissants.").optional()
}).strict().refine((data) => Object.values(data).some((value) => value !== void 0), "Aucun r\xE9glage fourni.");
var orderCreateSchema = import_zod3.z.object({
  cart: import_zod3.z.array(
    import_zod3.z.object({
      id: import_zod3.z.string().min(1),
      qty: import_zod3.z.number().int().min(1).default(1),
      name: import_zod3.z.string().optional(),
      variantId: import_zod3.z.string().max(128).optional(),
      variantIds: import_zod3.z.array(import_zod3.z.string().max(128)).max(10).optional(),
      variantLabels: import_zod3.z.array(import_zod3.z.string().max(200)).max(10).optional(),
      shipping: import_zod3.z.record(import_zod3.z.string(), import_zod3.z.any()).optional()
    })
  ).min(1),
  name: import_zod3.z.string().min(2),
  phone: import_zod3.z.string().min(8),
  email: import_zod3.z.string().email().optional().or(import_zod3.z.literal("")),
  address: import_zod3.z.object({
    region: import_zod3.z.string().min(1),
    department: import_zod3.z.string().min(1),
    neighborhood: import_zod3.z.string().min(1),
    street: import_zod3.z.string().min(1),
    city: import_zod3.z.string().optional(),
    postalCode: import_zod3.z.string().optional(),
    country: import_zod3.z.string().optional(),
    additionalInfo: import_zod3.z.string().optional(),
    notes: import_zod3.z.string().optional()
  }),
  shippingMethod: import_zod3.z.string().optional(),
  grainsAmount: import_zod3.z.number().int().min(0).optional(),
  promo: import_zod3.z.object({ code: import_zod3.z.string(), discount: import_zod3.z.number().min(0) }).optional()
});
var paymentInitSchema = import_zod3.z.object({
  orderId: import_zod3.z.string().min(1),
  provider: import_zod3.z.enum(["wave", "orange_money", "free_money", "cash", "wave_qr"]),
  clientPhone: import_zod3.z.string().min(8),
  phase: import_zod3.z.enum(["deposit", "balance", "full"]).optional().default("full"),
  token: import_zod3.z.string().optional()
});
var offerPaymentInitSchema = import_zod3.z.object({
  offerId: import_zod3.z.string().min(1),
  provider: import_zod3.z.enum(["wave", "orange_money", "free_money", "cash", "wave_qr"]),
  clientPhone: import_zod3.z.string().min(8).optional(),
  phase: import_zod3.z.enum(["deposit", "balance", "full"]).optional().default("full"),
  useEscrow: import_zod3.z.boolean().optional()
});

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
async function readSharedPricing() {
  await connectMongoose();
  const document = await AppConfig_default.findOne({ key: "global" }).select("marketPricing").read("primary").lean();
  if (!document?.marketPricing) throw new Error("Tarifs partages non initialises : executer la migration depuis le serveur de reference.");
  return sharedPricingSnapshotSchema.parse(document.marketPricing);
}
async function initializeSharedPricing(config) {
  const validated = sharedPricingConfigSchema.parse(config);
  await connectMongoose();
  await AppConfig_default.init();
  try {
    await AppConfig_default.updateOne({ key: "global" }, { $setOnInsert: { key: "global" } }, { upsert: true });
  } catch (error) {
    if (error.code !== 11e3) throw error;
  }
  await AppConfig_default.updateOne({ key: "global", marketPricing: { $exists: false } }, {
    $set: { marketPricing: { version: 1, updatedAt: /* @__PURE__ */ new Date(), config: validated } }
  }, { runValidators: true });
  return readSharedPricing();
}

// src/lib/pricing/settings.ts
var import_node_crypto2 = require("node:crypto");
var _req2 = eval("require");
var fs2 = _req2("fs");
var path2 = _req2("path");
var FILE_PATH2 = path2.resolve(process.cwd(), "data", "pricing-settings.json");
var DEFAULT_SERVICE_FEE_TIERS = [
  { minAmount: 0, maxAmount: 5e5, feeRate: 10, label: "Standard", description: "Frais standard pour commandes < 500 000 FCFA" },
  { minAmount: 5e5, maxAmount: 2e6, feeRate: 8, label: "Volume", description: "R\xE9duction volume pour commandes 500k - 2M FCFA" },
  { minAmount: 2e6, maxAmount: 5e6, feeRate: 6, label: "Pro", description: "Tarif professionnel pour commandes 2M - 5M FCFA" },
  { minAmount: 5e6, feeRate: 5, label: "Entreprise", description: "Tarif entreprise pour commandes > 5M FCFA" }
];
var DEFAULTS = {
  defaultExchangeRate: 100,
  defaultServiceFeeRate: 10,
  singleImportServiceFeeRate: DEFAULT_SINGLE_IMPORT_SERVICE_FEE_RATE,
  defaultInsuranceRate: 2.5,
  defaultB2BDiscountPercent: 15,
  serviceFeeTiers: DEFAULT_SERVICE_FEE_TIERS
};
function ensureFile2() {
  const dir = path2.dirname(FILE_PATH2);
  if (!fs2.existsSync(dir)) fs2.mkdirSync(dir, { recursive: true });
  if (!fs2.existsSync(FILE_PATH2)) fs2.writeFileSync(FILE_PATH2, JSON.stringify(DEFAULTS, null, 2));
}
function normalizeServiceFeeTiers(raw, standardRateFallback) {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_SERVICE_FEE_TIERS;
  const parsed = raw.map((item, index) => {
    const row = item;
    const minAmount = Number(row.minAmount);
    const feeRate = Number(row.feeRate);
    if (!Number.isFinite(minAmount) || minAmount < 0) return null;
    if (!Number.isFinite(feeRate) || feeRate < 0 || feeRate > 100) return null;
    const label = typeof row.label === "string" && row.label.trim() ? row.label.trim() : `Palier ${index + 1}`;
    const description = typeof row.description === "string" && row.description.trim() ? row.description.trim() : `Palier ${index + 1}`;
    return { minAmount: Math.round(minAmount), feeRate: Number(feeRate), label, description };
  }).filter((tier) => tier !== null).sort((a, b) => a.minAmount - b.minAmount);
  if (parsed.length === 0) return DEFAULT_SERVICE_FEE_TIERS;
  const deduped = [];
  for (const tier of parsed) {
    if (deduped.length === 0 || tier.minAmount > deduped[deduped.length - 1].minAmount) {
      deduped.push(tier);
    }
  }
  if (deduped.length === 0) return DEFAULT_SERVICE_FEE_TIERS;
  if (deduped[0].minAmount > 0) {
    deduped.unshift({
      minAmount: 0,
      feeRate: standardRateFallback,
      label: "Standard",
      description: "Palier standard"
    });
  } else {
    deduped[0] = { ...deduped[0], minAmount: 0 };
  }
  return deduped.map((tier, index) => ({
    ...tier,
    maxAmount: index < deduped.length - 1 ? deduped[index + 1].minAmount : void 0
  }));
}
function sanitizePricingDefaults(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const defaultExchangeRate = Number(source.defaultExchangeRate);
  const defaultServiceFeeRate = Number(source.defaultServiceFeeRate);
  const singleImportServiceFeeRate = source.singleImportServiceFeeRate;
  const defaultInsuranceRate = Number(source.defaultInsuranceRate);
  const defaultB2BDiscountPercent = Number(source.defaultB2BDiscountPercent);
  const resolvedDefaultServiceFeeRate = Number.isFinite(defaultServiceFeeRate) && defaultServiceFeeRate >= 0 && defaultServiceFeeRate <= 100 ? Number(defaultServiceFeeRate) : DEFAULTS.defaultServiceFeeRate;
  return {
    defaultExchangeRate: Number.isFinite(defaultExchangeRate) && defaultExchangeRate > 0 ? Math.round(defaultExchangeRate) : DEFAULTS.defaultExchangeRate,
    defaultServiceFeeRate: resolvedDefaultServiceFeeRate,
    singleImportServiceFeeRate: typeof singleImportServiceFeeRate === "number" && Number.isFinite(singleImportServiceFeeRate) && singleImportServiceFeeRate >= 0 && singleImportServiceFeeRate <= 100 ? singleImportServiceFeeRate : DEFAULTS.singleImportServiceFeeRate,
    defaultInsuranceRate: Number.isFinite(defaultInsuranceRate) && defaultInsuranceRate >= 0 && defaultInsuranceRate <= 100 ? Number(defaultInsuranceRate) : DEFAULTS.defaultInsuranceRate,
    defaultB2BDiscountPercent: Number.isFinite(defaultB2BDiscountPercent) && defaultB2BDiscountPercent >= 1 && defaultB2BDiscountPercent <= 50 ? Number(defaultB2BDiscountPercent) : DEFAULTS.defaultB2BDiscountPercent,
    serviceFeeTiers: normalizeServiceFeeTiers(source.serviceFeeTiers, resolvedDefaultServiceFeeRate)
  };
}
function readPricingDefaults(options = {}) {
  try {
    ensureFile2();
    const raw = fs2.readFileSync(FILE_PATH2, "utf-8");
    const parsed = JSON.parse(raw);
    if (options.strict) pricingDefaultsUpdateSchema.parse(parsed);
    return sanitizePricingDefaults({ ...DEFAULTS, ...parsed });
  } catch (error) {
    if (options.strict) throw error;
    return DEFAULTS;
  }
}
function writePricingDefaults(payload) {
  const validated = pricingDefaultsUpdateSchema.parse(payload);
  const temporaryPath = `${FILE_PATH2}.${(0, import_node_crypto2.randomUUID)()}.tmp`;
  try {
    ensureFile2();
    const current = readPricingDefaults({ strict: true });
    const updated = sanitizePricingDefaults({ ...current, ...validated });
    fs2.writeFileSync(temporaryPath, JSON.stringify(updated, null, 2), { flag: "wx", mode: fs2.statSync(FILE_PATH2).mode });
    fs2.renameSync(temporaryPath, FILE_PATH2);
    rateCache = null;
    return updated;
  } finally {
    if (fs2.existsSync(temporaryPath)) fs2.unlinkSync(temporaryPath);
  }
}
var rateCache = null;
registerPlatformExchangeRate(() => {
  if (!rateCache || Date.now() - rateCache.at > 6e4) {
    rateCache = { rate: readPricingDefaults().defaultExchangeRate, at: Date.now() };
  }
  return rateCache.rate;
});
registerPlatformSingleImportServiceFeeRate(() => readPricingDefaults().singleImportServiceFeeRate);

// scripts/migrate-shipping-costs.ts
function readLegacy(name) {
  const path3 = (0, import_node_path.resolve)(process.cwd(), "data", name);
  if (!(0, import_node_fs.existsSync)(path3)) return void 0;
  const data = JSON.parse((0, import_node_fs.readFileSync)(path3, "utf8"));
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error(`Fichier invalide : ${path3}`);
  return data;
}
function legacyPricing() {
  const defaults = readLegacy("pricing-settings.json");
  const overrides = shippingRatesSchema.partial().parse(readLegacy("shipping-rates.json") ?? {});
  const adjust = import_zod5.z.object({ tolerance: import_zod5.z.number().finite().min(0).max(0.5) }).strict().parse(readLegacy("shipping-adjust.json") ?? {
    tolerance: process.env.SHIPPING_ADJUST_TOLERANCE ? Number(process.env.SHIPPING_ADJUST_TOLERANCE) : 0.1
  });
  return sharedPricingConfigSchema.parse({
    defaults: { ...DEFAULTS, ...defaults === void 0 ? {} : pricingDefaultsUpdateSchema.parse(defaults) },
    sourceCurrencyRates: SOURCE_CURRENCY_RATES,
    shippingRates: Object.fromEntries(Object.keys(BASE_SHIPPING_RATES).map((method) => [method, { rate: BASE_SHIPPING_RATES[method].rate, minimumCharge: BASE_SHIPPING_RATES[method].minimumCharge, ...overrides[method] }])),
    seaFreightEligibility: { ...DEFAULT_SEA_FREIGHT_ELIGIBILITY_SETTINGS, ...seaEligibilitySchema.partial().parse(readLegacy("sea-freight-eligibility.json") ?? {}) },
    adjustTolerance: adjust.tolerance
  });
}
async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => !["--apply", "--dry-run"].includes(arg)) || args.includes("--apply") && args.includes("--dry-run")) {
    throw new Error("Usage : migrate-shipping-costs.ts [--dry-run | --apply]");
  }
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI doit etre fournie explicitement");
  const client = new import_mongodb.MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 1e4 });
  try {
    await client.connect();
    const current = await client.db().collection(AppConfig_default.collection.name).findOne({ key: "global" }, { projection: { shippingCosts: 1, marketPricing: 1 } });
    const pricing = current?.marketPricing === void 0 ? legacyPricing() : void 0;
    if (current?.marketPricing !== void 0) {
      const snapshot = sharedPricingSnapshotSchema.parse(current.marketPricing);
      console.log(`Tarifs commerciaux deja initialises, version ${snapshot.version}. Aucune modification.`);
    }
    if (current?.shippingCosts !== void 0) {
      const snapshot = shippingCostsSnapshotSchema.parse(current.shippingCosts);
      console.log(`Couts partages deja initialises, version ${snapshot.version}. Aucune modification.`);
    }
    const filePath = (0, import_node_path.resolve)(process.cwd(), "data", "shipping-costs.json");
    const costs = current?.shippingCosts === void 0 ? getConfiguredInternalShippingCosts(filePath) : void 0;
    if (costs) {
      console.log(`Source : ${(0, import_node_fs.existsSync)(filePath) ? filePath : "valeurs transporteur par defaut"}`);
      console.log(JSON.stringify(costs, null, 2));
    }
    if (pricing) {
      console.log(`Tarifs commerciaux : fichiers du dossier ${(0, import_node_path.resolve)(process.cwd(), "data")} ou valeurs par defaut si absents.`);
      console.log(JSON.stringify(pricing, null, 2));
    }
    if (!args.includes("--apply")) {
      console.log("DRY-RUN : aucune ecriture MongoDB ni fichier. Relancer avec --apply pour initialiser.");
      return;
    }
    if (costs) {
      const snapshot = await initializeSharedShippingCosts(costs);
      console.log(`Couts partages disponibles, version ${snapshot.version}. Fichier local conserve.`);
    }
    if (pricing) {
      const snapshot = await initializeSharedPricing(pricing);
      console.log(`Tarifs commerciaux disponibles, version ${snapshot.version}. Fichiers locaux conserves.`);
    }
  } finally {
    await client.close();
    await import_mongoose5.default.disconnect();
  }
}
main().catch((error) => {
  console.error("Migration des couts interrompue :", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
