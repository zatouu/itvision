"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/lib/mongoose.ts
var mongoose_exports = {};
__export(mongoose_exports, {
  connectMongoose: () => connectMongoose
});
async function syncAllIndexes() {
  try {
    const modelNames = import_mongoose3.default.modelNames();
    for (const name of modelNames) {
      try {
        await import_mongoose3.default.model(name).syncIndexes();
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
  const cache2 = globalForMongoose.__mongooseCache;
  if (cache2.conn && cache2.uri === mongoUri && import_mongoose3.default.connection.readyState === 1) {
    return import_mongoose3.default.connection;
  }
  if (!cache2.promise || cache2.uri !== mongoUri) {
    cache2.uri = mongoUri;
    console.log("[MongoDB] Connexion \xE0 MongoDB\u2026", safeUri);
    const isDev = process.env.NODE_ENV !== "production";
    const options = {
      autoIndex: true,
      serverSelectionTimeoutMS: isDev ? 3e3 : 1e4,
      connectTimeoutMS: isDev ? 3e3 : 1e4,
      socketTimeoutMS: 45e3
    };
    cache2.promise = import_mongoose3.default.connect(mongoUri, options).then(async (m) => {
      cache2.conn = m;
      console.log("[MongoDB] \u2705 Connexion r\xE9ussie");
      syncAllIndexes().catch(() => {
      });
      return m;
    });
  }
  try {
    await cache2.promise;
    return import_mongoose3.default.connection;
  } catch (error) {
    cache2.conn = null;
    cache2.promise = null;
    console.error("[MongoDB] \u274C Erreur de connexion:", error);
    throw new Error(
      `Erreur de connexion MongoDB: ${error instanceof Error ? error.message : "Erreur inconnue"} (URI: ${safeUri})`
    );
  }
}
var import_mongoose3;
var init_mongoose = __esm({
  "src/lib/mongoose.ts"() {
    "use strict";
    import_mongoose3 = __toESM(require("mongoose"));
  }
});

// src/lib/models/AppConfig.ts
var import_mongoose4, AI_FEATURE_KEYS, AI_AUTO_FEATURES, AppConfigSchema, AppConfig, AppConfig_default;
var init_AppConfig = __esm({
  "src/lib/models/AppConfig.ts"() {
    "use strict";
    import_mongoose4 = require("mongoose");
    AI_FEATURE_KEYS = ["clarify_request", "enhance_request", "photo_analysis", "analyze_request", "mission_coach", "mission_help", "suggest_offer", "daily_tips", "general_chat"];
    AI_AUTO_FEATURES = ["mission_coach", "daily_tips"];
    AppConfigSchema = new import_mongoose4.Schema({
      key: { type: String, required: true, unique: true, default: "global" },
      shippingCosts: {
        type: new import_mongoose4.Schema({
          version: { type: Number, required: true, min: 1 },
          costs: { type: import_mongoose4.Schema.Types.Mixed, required: true },
          updatedAt: { type: Date, required: true }
        }, { _id: false }),
        default: void 0
      },
      marketPricing: {
        type: new import_mongoose4.Schema({
          version: { type: Number, required: true, min: 1 },
          config: { type: import_mongoose4.Schema.Types.Mixed, required: true },
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
        premiumCategories: { type: import_mongoose4.Schema.Types.Mixed, default: {} },
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
          type: import_mongoose4.Schema.Types.Mixed,
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
          events: { type: import_mongoose4.Schema.Types.Mixed, default: {} }
        },
        sourcingAutoSend: {
          enabled: { type: Boolean, default: false },
          minRelevance: { type: Number, default: 0.8, min: 0.5, max: 1 }
        }
      }
    }, { timestamps: true });
    AppConfig = import_mongoose4.models.AppConfig || (0, import_mongoose4.model)("AppConfig", AppConfigSchema);
    AppConfig_default = AppConfig;
  }
});

// src/lib/models/User.ts
var import_mongoose9, UserSchema, User_default;
var init_User = __esm({
  "src/lib/models/User.ts"() {
    "use strict";
    import_mongoose9 = __toESM(require("mongoose"));
    UserSchema = new import_mongoose9.Schema({
      username: { type: String, required: true, unique: true, trim: true },
      email: { type: String, required: true, unique: true, lowercase: true, trim: true },
      passwordHash: { type: String, required: true },
      sessionVersion: { type: Number, default: 0, min: 0 },
      name: { type: String, required: true },
      avatarUrl: { type: String },
      phone: { type: String },
      company: { type: String, trim: true },
      address: { type: String, trim: true },
      city: { type: String, trim: true },
      country: { type: String, trim: true },
      companyClientId: { type: import_mongoose9.Schema.Types.ObjectId, ref: "Client", index: true },
      companyRole: { type: String, enum: ["owner", "admin", "finance", "technical", "viewer"] },
      // Droits personnalisés dans l'espace entreprise ; absent = droits du rôle
      companyCapabilities: { type: [String], default: void 0 },
      // Invité par son entreprise, compte pas encore activé (levé par /api/auth/reset)
      companyInvitePending: { type: Boolean },
      // Visites du portail entreprise : portalLastSeenAt = début de la visite précédente (encart « depuis votre dernière visite »)
      portalSeenAt: { type: Date },
      portalLastSeenAt: { type: Date },
      // Catégories de notifications du portail que le membre ne veut plus recevoir en push
      portalNotifyMuted: { type: [String], default: void 0 },
      marketplaceProfileId: { type: import_mongoose9.Schema.Types.ObjectId, ref: "MarketplaceProfile", sparse: true, index: true },
      corporateProfileId: { type: import_mongoose9.Schema.Types.ObjectId, ref: "CorporateProfile", sparse: true, index: true },
      providerProfileId: { type: import_mongoose9.Schema.Types.ObjectId, ref: "ProviderProfile", sparse: true, index: true },
      vendorProfileId: { type: import_mongoose9.Schema.Types.ObjectId, ref: "VendorProfile", sparse: true, index: true },
      favoriteProductIds: { type: [String], default: [] },
      savedAddresses: {
        type: [{
          label: { type: String, trim: true, default: "Domicile" },
          fullName: { type: String, trim: true, required: true },
          phone: { type: String, trim: true, required: true },
          region: { type: String, trim: true, required: true },
          department: { type: String, trim: true, required: true },
          neighborhood: { type: String, trim: true, required: true },
          street: { type: String, trim: true, required: true },
          additionalInfo: { type: String, trim: true },
          isDefault: { type: Boolean, default: false }
        }],
        default: []
      },
      role: { type: String, enum: ["CLIENT", "TECHNICIAN", "PRODUCT_MANAGER", "ACCOUNTANT", "ADMIN", "SUPER_ADMIN", "VENDOR", "PROVIDER"], default: "CLIENT", index: true },
      marketplaceTier: { type: String, enum: ["standard", "pro", "reseller", "partner"], default: "standard", index: true },
      proRequestedAt: { type: Date },
      proValidatedAt: { type: Date },
      totalMarketplacePurchases: { type: Number, default: 0 },
      marketplaceOrderCount: { type: Number, default: 0 },
      isActive: { type: Boolean, default: true, index: true },
      loginAttempts: { type: Number, default: 0 },
      lockedUntil: { type: Date },
      twoFactorEnabled: { type: Boolean, default: false },
      twoFactorCode: { type: String },
      twoFactorExpires: { type: Date },
      passwordResetToken: { type: String },
      passwordResetExpires: { type: Date },
      forcePasswordReset: { type: Boolean, default: false },
      kycVerified: { type: Boolean, default: false },
      tier: { type: String, enum: ["Bronze", "Argent", "Or", "Platine"], default: "Bronze" },
      referralCode: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
      referredBy: { type: String, uppercase: true, trim: true },
      referrals: { type: [import_mongoose9.Schema.Types.ObjectId], default: [], index: true },
      referralBalance: { type: Number, default: 0, min: 0 },
      referralCount: { type: Number, default: 0, min: 0 },
      providerStats: {
        completedMissions: { type: Number, default: 0, min: 0 },
        cancelledByProvider: { type: Number, default: 0, min: 0 },
        cancelledByClient: { type: Number, default: 0, min: 0 },
        reliabilityScore: { type: Number, default: 100, min: 0, max: 100 },
        lastUpdatedAt: { type: Date }
      },
      privacy: {
        profilePublic: { type: Boolean, default: true },
        preciseLocation: { type: Boolean, default: true },
        smsNotifications: { type: Boolean, default: false },
        whatsappNotifications: { type: Boolean, default: false }
      },
      deletedAt: { type: Date },
      anonymizedAt: { type: Date }
    }, { timestamps: true });
    UserSchema.index({ referredBy: 1 });
    User_default = import_mongoose9.default.models.User || import_mongoose9.default.model("User", UserSchema);
  }
});

// lib/redis-geo.js
var require_redis_geo = __commonJS({
  "lib/redis-geo.js"(exports2, module2) {
    "use strict";
    var STALE_POSITION_MS2 = 10 * 60 * 1e3;
    var memPresence = /* @__PURE__ */ new Map();
    var redis = null;
    var redisConnected = false;
    var RedisCtor = void 0;
    var redisLoadingPromise = null;
    async function loadIORedis() {
      if (RedisCtor !== void 0) return RedisCtor;
      if (redisLoadingPromise) return redisLoadingPromise;
      const redisUrl = process.env.REDIS_URL;
      if (!redisUrl) {
        console.log("[Redis] REDIS_URL not set, using in-memory fallback");
        RedisCtor = null;
        return RedisCtor;
      }
      redisLoadingPromise = import("ioredis").then((mod) => {
        RedisCtor = mod.default || mod.Redis || mod;
        return RedisCtor;
      }).catch((err) => {
        console.warn("[Redis] ioredis not available, using in-memory fallback:", err.message);
        RedisCtor = null;
        return RedisCtor;
      });
      return redisLoadingPromise;
    }
    async function getRedis() {
      if (redis !== null) return redis;
      const Redis = await loadIORedis();
      if (!Redis) {
        redis = false;
        return null;
      }
      try {
        redis = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: 2,
          enableReadyCheck: true,
          retryStrategy: (times) => Math.min(times * 200, 2e3),
          lazyConnect: false
        });
        redis.on("connect", () => {
          redisConnected = true;
          console.log("[Redis] Connected for geofencing");
        });
        redis.on("error", (err) => {
          redisConnected = false;
          console.warn("[Redis] Error:", err.message);
        });
        redis.on("close", () => {
          redisConnected = false;
        });
        return redis;
      } catch (err) {
        console.warn("[Redis] ioredis not available, using in-memory fallback:", err.message);
        redis = false;
        return null;
      }
    }
    function isRedisAvailable() {
      return redis !== false && redisConnected;
    }
    async function updateProviderPosition(providerId, { lat, lng, status, name, email, viewingRequestId, missionRequestId }) {
      const now = Date.now();
      const meta = { status: status || "available", name: name || "", email: email || "", updatedAt: String(now) };
      if (viewingRequestId) meta.viewingRequestId = viewingRequestId;
      if (missionRequestId) meta.missionRequestId = missionRequestId;
      const r = await getRedis();
      if (r && isRedisAvailable()) {
        try {
          const pipeline = r.pipeline();
          pipeline.geoadd("geo:providers", lng, lat, providerId);
          pipeline.hset(`provider:meta:${providerId}`, meta);
          pipeline.expire(`provider:meta:${providerId}`, Math.ceil(STALE_POSITION_MS2 / 1e3));
          await pipeline.exec();
          return;
        } catch (err) {
          console.warn("[Redis] updateProviderPosition failed, fallback:", err.message);
        }
      }
      const existing = memPresence.get(providerId) || {};
      memPresence.set(providerId, { ...existing, lat, lng, ...meta, updatedAt: now });
    }
    async function updateProviderMeta(providerId, patch) {
      const now = Date.now();
      const r = await getRedis();
      if (r && isRedisAvailable()) {
        try {
          const key = `provider:meta:${providerId}`;
          const meta = { ...patch, updatedAt: String(now) };
          await r.hset(key, meta);
          await r.expire(key, Math.ceil(STALE_POSITION_MS2 / 1e3));
          return;
        } catch (err) {
          console.warn("[Redis] updateProviderMeta failed, fallback:", err.message);
        }
      }
      const existing = memPresence.get(providerId) || {};
      memPresence.set(providerId, { ...existing, ...patch, updatedAt: now });
    }
    async function findNearbyProviders(lat, lng, radiusKm = 10) {
      const now = Date.now();
      const r = await getRedis();
      if (r && isRedisAvailable()) {
        try {
          const results = await r.geosearch(
            "geo:providers",
            "FROMLONLAT",
            lng,
            lat,
            "BYRADIUS",
            radiusKm,
            "km",
            "WITHCOORD",
            "WITHDIST",
            "ASC"
          );
          const providers2 = [];
          if (results && results.length > 0) {
            for (const [providerId, dist, coords] of results) {
              const meta = await r.hgetall(`provider:meta:${providerId}`);
              if (!meta || !meta.updatedAt) continue;
              if (now - Number(meta.updatedAt) > STALE_POSITION_MS2) continue;
              providers2.push({
                providerId,
                lat: Number(coords[1]),
                lng: Number(coords[0]),
                dist: Number(dist),
                status: meta.status || "available",
                name: meta.name || "",
                email: meta.email || "",
                viewingRequestId: meta.viewingRequestId || null,
                missionRequestId: meta.missionRequestId || null
              });
            }
            providers2.sort((a, b) => {
              const score = (p) => p.status === "available" ? 0 : p.status === "viewing" ? 1 : p.status === "on_mission" ? 2 : 3;
              return score(a) - score(b);
            });
            return providers2;
          }
        } catch (err) {
          console.warn("[Redis] findNearbyProviders failed, fallback:", err.message);
        }
      }
      const providers = [];
      for (const [providerId, pos] of memPresence.entries()) {
        if (typeof pos.lat !== "number" || typeof pos.lng !== "number") continue;
        if (now - (pos.updatedAt || 0) > STALE_POSITION_MS2) continue;
        const dist = haversineKm2(lat, lng, pos.lat, pos.lng);
        if (dist <= radiusKm) {
          providers.push({
            providerId,
            lat: pos.lat,
            lng: pos.lng,
            dist,
            status: pos.status || "available",
            name: pos.name || "",
            email: pos.email || "",
            viewingRequestId: pos.viewingRequestId || null,
            missionRequestId: pos.missionRequestId || null
          });
        }
      }
      providers.sort((a, b) => {
        const score = (p) => p.status === "available" ? 0 : p.status === "viewing" ? 1 : p.status === "on_mission" ? 2 : 3;
        return score(a) - score(b);
      });
      return providers;
    }
    async function setProviderOffline(providerId) {
      await updateProviderMeta(providerId, { status: "offline" });
    }
    async function removeProvider(providerId) {
      const r = await getRedis();
      if (r && isRedisAvailable()) {
        try {
          const pipeline = r.pipeline();
          pipeline.zrem("geo:providers", providerId);
          pipeline.del(`provider:meta:${providerId}`);
          await pipeline.exec();
          return;
        } catch (err) {
          console.warn("[Redis] removeProvider failed, fallback:", err.message);
        }
      }
      memPresence.delete(providerId);
    }
    async function cleanupStale() {
      const now = Date.now();
      const r = await getRedis();
      if (r && isRedisAvailable()) {
        try {
          const members = await r.zrange("geo:providers", 0, -1);
          let cleaned2 = 0;
          for (const providerId of members) {
            const meta = await r.hgetall(`provider:meta:${providerId}`);
            if (!meta || !meta.updatedAt || now - Number(meta.updatedAt) > STALE_POSITION_MS2) {
              await removeProvider(providerId);
              cleaned2++;
            }
          }
          if (cleaned2 > 0) console.log(`[Redis] Cleaned ${cleaned2} stale provider position(s)`);
          return;
        } catch (err) {
          console.warn("[Redis] cleanupStale failed, fallback:", err.message);
        }
      }
      let cleaned = 0;
      for (const [id, pos] of memPresence.entries()) {
        if (now - (pos.updatedAt || 0) > STALE_POSITION_MS2) {
          memPresence.delete(id);
          cleaned++;
        }
      }
      if (cleaned > 0) console.log(`[Redis] Cleaned ${cleaned} stale provider position(s) [memory]`);
    }
    async function getProviderCount() {
      const r = await getRedis();
      if (r && isRedisAvailable()) {
        try {
          return await r.zcard("geo:providers");
        } catch (err) {
          console.warn("[Redis] getProviderCount failed, fallback:", err.message);
        }
      }
      return memPresence.size;
    }
    function haversineKm2(lat1, lng1, lat2, lng2) {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    module2.exports = {
      getRedis,
      isRedisAvailable,
      updateProviderPosition,
      updateProviderMeta,
      findNearbyProviders,
      setProviderOffline,
      removeProvider,
      cleanupStale,
      getProviderCount,
      STALE_POSITION_MS: STALE_POSITION_MS2
    };
  }
});

// src/lib/models/InAppNotification.ts
var InAppNotification_exports = {};
__export(InAppNotification_exports, {
  default: () => InAppNotification_default
});
var import_mongoose13, InAppNotificationSchema, InAppNotification_default;
var init_InAppNotification = __esm({
  "src/lib/models/InAppNotification.ts"() {
    "use strict";
    import_mongoose13 = __toESM(require("mongoose"));
    InAppNotificationSchema = new import_mongoose13.Schema({
      userId: { type: String },
      roles: { type: [String], enum: ["ADMIN", "SUPER_ADMIN", "TECHNICIAN", "CLIENT", "PROVIDER", "VENDOR"], default: void 0 },
      teamId: { type: String },
      type: { type: String, enum: ["info", "success", "warning", "error"], required: true },
      title: { type: String, required: true },
      message: { type: String, required: true },
      actionUrl: { type: String },
      metadata: { type: import_mongoose13.Schema.Types.Mixed },
      readBy: { type: [String], default: [] },
      deletedBy: { type: [String], default: [] }
    }, { timestamps: true });
    InAppNotificationSchema.index({ createdAt: -1 });
    InAppNotification_default = import_mongoose13.default.models.InAppNotification || import_mongoose13.default.model("InAppNotification", InAppNotificationSchema);
  }
});

// src/lib/models/Wallet.ts
var import_mongoose14, WalletTxnSchema, WalletSchema, Wallet, Wallet_default;
var init_Wallet = __esm({
  "src/lib/models/Wallet.ts"() {
    "use strict";
    import_mongoose14 = require("mongoose");
    WalletTxnSchema = new import_mongoose14.Schema({
      type: { type: String, enum: ["escrow_hold", "escrow_release", "payout", "refund", "topup"], required: true },
      amount: { type: Number, required: true },
      ref: { type: String },
      meta: { type: import_mongoose14.Schema.Types.Mixed },
      createdAt: { type: Date, default: Date.now }
    }, { _id: false });
    WalletSchema = new import_mongoose14.Schema({
      userId: { type: import_mongoose14.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
      // Solde en FCFA (escrow cash, payouts providers)
      balance: { type: Number, default: 0 },
      escrow: { type: Number, default: 0 },
      // Système de points (monétisation providers — style Yango/InDrive)
      points: { type: Number, default: 0, min: 0 },
      reservedPoints: { type: Number, default: 0, min: 0 },
      lifetimePointsEarned: { type: Number, default: 0, min: 0 },
      lifetimePointsSpent: { type: Number, default: 0, min: 0 },
      txns: { type: [WalletTxnSchema], default: [] },
      // Clés des derniers crédits appliqués : un reversement rejoué (retry, double appel) n'est jamais crédité deux fois
      opsApplied: { type: [String], default: [], select: false },
      updatedAt: { type: Date, default: Date.now }
    }, { timestamps: { createdAt: false, updatedAt: "updatedAt" } });
    Wallet = import_mongoose14.models.Wallet || (0, import_mongoose14.model)("Wallet", WalletSchema);
    Wallet_default = Wallet;
  }
});

// src/lib/models/WalletTransaction.ts
var import_mongoose15, WalletTransactionSchema, WalletTransaction;
var init_WalletTransaction = __esm({
  "src/lib/models/WalletTransaction.ts"() {
    "use strict";
    import_mongoose15 = require("mongoose");
    WalletTransactionSchema = new import_mongoose15.Schema({
      userId: { type: import_mongoose15.Schema.Types.ObjectId, ref: "User", required: true },
      kind: {
        type: String,
        enum: ["welcome", "topup", "mission_spend", "referral_bonus", "refund", "admin_adjust", "escrow_charge", "escrow_refund", "unlock_spend", "unlock_refund", "mission_reserve", "mission_release", "promo", "ai_spend"],
        required: true
      },
      points: { type: Number, required: true },
      balanceAfter: { type: Number, required: true },
      reservedPointsAfter: { type: Number, min: 0 },
      description: { type: String },
      relatedMissionId: { type: import_mongoose15.Schema.Types.ObjectId, ref: "ServiceRequest" },
      paymentRef: { type: String },
      createdAt: { type: Date, default: Date.now }
    }, { timestamps: { createdAt: "createdAt", updatedAt: false } });
    WalletTransactionSchema.index({ userId: 1, createdAt: -1 });
    WalletTransaction = import_mongoose15.models.WalletTransaction || (0, import_mongoose15.model)("WalletTransaction", WalletTransactionSchema);
  }
});

// src/lib/models/MissionUnlock.ts
var import_mongoose16, MissionUnlockSchema, MissionUnlock;
var init_MissionUnlock = __esm({
  "src/lib/models/MissionUnlock.ts"() {
    "use strict";
    import_mongoose16 = require("mongoose");
    MissionUnlockSchema = new import_mongoose16.Schema({
      requestId: { type: import_mongoose16.Schema.Types.ObjectId, ref: "ServiceRequest", required: true },
      providerId: { type: import_mongoose16.Schema.Types.ObjectId, ref: "User", required: true },
      points: { type: Number, required: true, min: 0 },
      status: { type: String, enum: ["active", "reserved", "released", "refunded", "spent", "expired"], default: "active" },
      offerSentAt: { type: Date },
      reservedAt: { type: Date },
      releasedAt: { type: Date },
      releaseReason: { type: String },
      refundedAt: { type: Date },
      refundReason: { type: String },
      spentAt: { type: Date }
    }, { timestamps: { createdAt: "createdAt", updatedAt: false } });
    MissionUnlockSchema.index({ requestId: 1, providerId: 1 }, { unique: true });
    MissionUnlockSchema.index({ providerId: 1, status: 1, createdAt: -1 });
    MissionUnlock = import_mongoose16.models.MissionUnlock || (0, import_mongoose16.model)("MissionUnlock", MissionUnlockSchema);
  }
});

// src/lib/wallet.ts
async function getAppConfig() {
  const now = Date.now();
  if (_cfgCache.value && now - _cfgCache.at < CFG_TTL_MS) {
    return _cfgCache.value;
  }
  await connectMongoose();
  let cfg = await AppConfig_default.findOne({ key: "global" });
  if (!cfg) {
    cfg = await AppConfig_default.create({ key: "global" });
  }
  _cfgCache = { value: cfg, at: now };
  return cfg;
}
async function creditCashBalance(userId, amount, opts = {}) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Montant de cr\xE9dit cash invalide");
  }
  await connectMongoose();
  const key = opts.idempotencyKey || (opts.paymentRef ? `credit:${opts.paymentRef}` : null);
  const update = {
    $inc: { balance: amount },
    $push: {
      txns: { type: opts.txnType || "payout", amount, ref: opts.paymentRef, meta: { description: opts.description, relatedMissionId: opts.relatedMissionId }, createdAt: /* @__PURE__ */ new Date() },
      ...key ? { opsApplied: { $each: [key], $slice: -2e3 } } : {}
    },
    $setOnInsert: { escrow: 0, points: 0, reservedPoints: 0, lifetimePointsEarned: 0, lifetimePointsSpent: 0 }
  };
  const filter = key ? { userId, opsApplied: { $ne: key } } : { userId };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const wallet = await Wallet_default.findOneAndUpdate(filter, update, { new: true, upsert: true });
      return { balance: wallet?.balance || 0, applied: true };
    } catch (e) {
      if (e?.code !== 11e3 || !key) throw e;
      const existing = await Wallet_default.findOne({ userId }).select("+opsApplied balance").lean();
      if (existing?.opsApplied?.includes(key)) return { balance: existing.balance || 0, applied: false };
    }
  }
  throw new Error("Cr\xE9dit cash impossible (conflit)");
}
var _cfgCache, CFG_TTL_MS;
var init_wallet = __esm({
  "src/lib/wallet.ts"() {
    "use strict";
    init_mongoose();
    init_Wallet();
    init_WalletTransaction();
    init_AppConfig();
    init_MissionUnlock();
    _cfgCache = { value: null, at: 0 };
    CFG_TTL_MS = 60 * 1e3;
  }
});

// src/lib/whatsapp-cloud.ts
function isWhatsAppCloudConfigured() {
  return !!(process.env.WHATSAPP_CLOUD_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}
function toWaId(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 9) return `221${digits}`;
  if (digits.startsWith("00")) return digits.slice(2);
  return digits.length >= 11 ? digits : null;
}
async function sendWhatsAppTemplate(phone, template, bodyParams, opts = {}) {
  const token = process.env.WHATSAPP_CLOUD_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const to = toWaId(phone);
  if (!token || !phoneId || !to) return false;
  const components = [];
  if (opts.imageUrl) components.push({ type: "header", parameters: [{ type: "image", image: { link: opts.imageUrl } }] });
  if (bodyParams.length) components.push({ type: "body", parameters: bodyParams.map((text) => ({ type: "text", text: text.slice(0, 1e3) })) });
  if (opts.buttonUrlSuffix) components.push({ type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: opts.buttonUrlSuffix }] });
  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: { name: template, language: { code: opts.lang || "fr" }, components }
      }),
      signal: AbortSignal.timeout(1e4)
    });
    if (!res.ok) console.warn("[whatsapp-cloud] envoi refus\xE9", res.status, (await res.text().catch(() => "")).slice(0, 300));
    return res.ok;
  } catch (err) {
    console.warn("[whatsapp-cloud] envoi impossible", err instanceof Error ? err.message : err);
    return false;
  }
}
var GRAPH_VERSION;
var init_whatsapp_cloud = __esm({
  "src/lib/whatsapp-cloud.ts"() {
    "use strict";
    GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || "v21.0";
  }
});

// src/lib/whatsapp-relay-events.ts
function relayEventForType(type) {
  if (!type) return null;
  const ev = WHATSAPP_RELAY_EVENTS.find((e) => e.types.includes(type));
  return ev ? ev.key : null;
}
var WHATSAPP_RELAY_EVENTS;
var init_whatsapp_relay_events = __esm({
  "src/lib/whatsapp-relay-events.ts"() {
    "use strict";
    WHATSAPP_RELAY_EVENTS = [
      { key: "newRequest", label: "Nouvelle demande proche (prestataire)", types: ["request:new"] },
      { key: "offerReceived", label: "Offre re\xE7ue (client)", types: ["offer:new"] },
      { key: "offerAccepted", label: "Offre accept\xE9e (prestataire)", types: ["offer:accepted"] },
      { key: "counterOffer", label: "Contre-offre et r\xE9ponse", types: ["offer:counter", "offer:counter-accepted", "offer:counter-rejected"] },
      { key: "validationReminder", label: "Relance de validation (client)", types: ["mission:validation-reminder"] },
      { key: "stockReminder", label: "Rappel de stock (prestataire)", types: ["stock:low"] }
    ];
  }
});

// src/lib/whatsapp-relay.ts
var whatsapp_relay_exports = {};
__export(whatsapp_relay_exports, {
  relayToWhatsApp: () => relayToWhatsApp
});
async function relayToWhatsApp(userId, message, pushDelivered) {
  if (pushDelivered > 0 || !isWhatsAppCloudConfigured()) return false;
  const event = relayEventForType(message.data?.type);
  if (!event) return false;
  const cfg = await getAppConfig();
  const relay = cfg.integrations?.whatsappRelay;
  if (relay?.enabled !== true || relay?.events?.[event] === false) return false;
  const key = `${userId}:${event}`;
  const now = Date.now();
  if (now - (lastSent.get(key) || 0) < COOLDOWN_MS) return false;
  await connectMongoose();
  const user = await User_default.findById(userId).select("phone privacy").lean();
  if (!user?.phone || user.privacy?.whatsappNotifications !== true) return false;
  lastSent.set(key, now);
  const template = process.env.WHATSAPP_TEMPLATE_NOTIFICATION || "xeuy_notification";
  return sendWhatsAppTemplate(user.phone, template, [message.title, message.body]);
}
var COOLDOWN_MS, lastSent;
var init_whatsapp_relay = __esm({
  "src/lib/whatsapp-relay.ts"() {
    "use strict";
    init_mongoose();
    init_User();
    init_wallet();
    init_whatsapp_cloud();
    init_whatsapp_relay_events();
    COOLDOWN_MS = 10 * 60 * 1e3;
    lastSent = /* @__PURE__ */ new Map();
  }
});

// src/lib/models/ScheduledTask.ts
var import_mongoose20, ScheduledTaskSchema, ScheduledTask, ScheduledTask_default;
var init_ScheduledTask = __esm({
  "src/lib/models/ScheduledTask.ts"() {
    "use strict";
    import_mongoose20 = require("mongoose");
    ScheduledTaskSchema = new import_mongoose20.Schema({
      type: { type: String, required: true, index: true },
      requestId: { type: import_mongoose20.Schema.Types.ObjectId, ref: "ServiceRequest", index: true },
      stage: { type: Number },
      runAt: { type: Date, required: true },
      status: { type: String, enum: ["pending", "running", "done", "cancelled", "failed"], default: "pending" },
      payload: { type: import_mongoose20.Schema.Types.Mixed, default: {} },
      attempts: { type: Number, default: 0 },
      maxAttempts: { type: Number, default: 3 },
      lockedAt: { type: Date },
      lastError: { type: String }
    }, { timestamps: true });
    ScheduledTaskSchema.index({ status: 1, runAt: 1 });
    ScheduledTask = import_mongoose20.models.ScheduledTask || (0, import_mongoose20.model)("ScheduledTask", ScheduledTaskSchema);
    ScheduledTask_default = ScheduledTask;
  }
});

// src/lib/visibility/scheduler.ts
function getScheduler() {
  const g = global;
  if (!g.__visibilityScheduler) {
    g.__visibilityScheduler = new InProcessScheduler();
  }
  return g.__visibilityScheduler;
}
var HORIZON_MS, SWEEP_MS, STALE_RUNNING_MS, BACKOFF_MS, InProcessScheduler;
var init_scheduler = __esm({
  "src/lib/visibility/scheduler.ts"() {
    "use strict";
    init_ScheduledTask();
    init_mongoose();
    HORIZON_MS = 6 * 60 * 1e3;
    SWEEP_MS = 15e3;
    STALE_RUNNING_MS = 2 * 60 * 1e3;
    BACKOFF_MS = 3e4;
    InProcessScheduler = class {
      constructor() {
        this.handlers = /* @__PURE__ */ new Map();
        this.timers = /* @__PURE__ */ new Map();
        this.sweepInterval = null;
        this.started = false;
      }
      register(type, handler) {
        this.handlers.set(type, handler);
      }
      async schedule(input) {
        await connectMongoose();
        const task = await ScheduledTask_default.create({
          type: input.type,
          runAt: input.runAt,
          requestId: input.requestId,
          stage: input.stage,
          payload: input.payload || {},
          maxAttempts: input.maxAttempts ?? 3,
          status: "pending"
        });
        this.arm(String(task._id), task.runAt);
        return String(task._id);
      }
      async cancelForRequest(requestId, types) {
        await connectMongoose();
        const filter = { requestId, status: "pending" };
        if (types?.length) filter.type = { $in: types };
        const pending = await ScheduledTask_default.find(filter).select("_id").lean();
        for (const t of pending) this.clearTimer(String(t._id));
        const res = await ScheduledTask_default.updateMany(filter, { $set: { status: "cancelled" } });
        return res.modifiedCount || 0;
      }
      start() {
        if (this.started) return;
        this.started = true;
        void this.sweep();
        this.sweepInterval = setInterval(() => {
          void this.sweep();
        }, SWEEP_MS);
        console.log("[VisibilityScheduler] d\xE9marr\xE9 (in-process timers + sweep)");
      }
      stop() {
        this.started = false;
        if (this.sweepInterval) {
          clearInterval(this.sweepInterval);
          this.sweepInterval = null;
        }
        for (const t of this.timers.values()) clearTimeout(t);
        this.timers.clear();
      }
      /** Exécute immédiatement toutes les tâches échues (utilisé par le recovery/tests). */
      async runDue() {
        await connectMongoose();
        const now = /* @__PURE__ */ new Date();
        const due = await ScheduledTask_default.find({ status: "pending", runAt: { $lte: now } }).select("_id").lean();
        for (const t of due) await this.fire(String(t._id));
      }
      clearTimer(taskId) {
        const t = this.timers.get(taskId);
        if (t) {
          clearTimeout(t);
          this.timers.delete(taskId);
        }
      }
      arm(taskId, runAt) {
        if (this.timers.has(taskId)) return;
        const delay = new Date(runAt).getTime() - Date.now();
        if (delay > HORIZON_MS) return;
        const timer = setTimeout(() => {
          void this.fire(taskId);
        }, Math.max(0, delay));
        this.timers.set(taskId, timer);
      }
      /** Réconciliation : requeue les tâches bloquées et arme celles à venir/échues. */
      async sweep() {
        try {
          await connectMongoose();
          const now = Date.now();
          await ScheduledTask_default.updateMany(
            { status: "running", lockedAt: { $lt: new Date(now - STALE_RUNNING_MS) } },
            { $set: { status: "pending" }, $unset: { lockedAt: 1 } }
          );
          const horizon = new Date(now + HORIZON_MS);
          const tasks = await ScheduledTask_default.find({ status: "pending", runAt: { $lte: horizon } }).select("_id runAt").limit(500).lean();
          for (const t of tasks) {
            const id = String(t._id);
            if (new Date(t.runAt).getTime() <= now) {
              void this.fire(id);
            } else {
              this.arm(id, t.runAt);
            }
          }
        } catch (err) {
          console.warn("[VisibilityScheduler] sweep error:", err?.message);
        }
      }
      async fire(taskId) {
        this.clearTimer(taskId);
        await connectMongoose();
        const task = await ScheduledTask_default.findOneAndUpdate(
          { _id: taskId, status: "pending" },
          { $set: { status: "running", lockedAt: /* @__PURE__ */ new Date() }, $inc: { attempts: 1 } },
          { new: true }
        );
        if (!task) return;
        const handler = this.handlers.get(task.type);
        if (!handler) {
          await ScheduledTask_default.updateOne({ _id: taskId }, { $set: { status: "failed", lastError: `Aucun handler pour type ${task.type}` } });
          console.warn(`[VisibilityScheduler] aucun handler pour type=${task.type}`);
          return;
        }
        try {
          await handler(task);
          await ScheduledTask_default.updateOne({ _id: taskId }, { $set: { status: "done" }, $unset: { lockedAt: 1 } });
        } catch (err) {
          const msg = err?.message || String(err);
          if (task.attempts < task.maxAttempts) {
            const nextRun = new Date(Date.now() + BACKOFF_MS * task.attempts);
            await ScheduledTask_default.updateOne({ _id: taskId }, { $set: { status: "pending", runAt: nextRun, lastError: msg }, $unset: { lockedAt: 1 } });
            this.arm(taskId, nextRun);
            console.warn(`[VisibilityScheduler] t\xE2che ${taskId} (${task.type}) \xE9chou\xE9e, retry #${task.attempts}: ${msg}`);
          } else {
            await ScheduledTask_default.updateOne({ _id: taskId }, { $set: { status: "failed", lastError: msg }, $unset: { lockedAt: 1 } });
            console.error(`[VisibilityScheduler] t\xE2che ${taskId} (${task.type}) d\xE9finitivement \xE9chou\xE9e: ${msg}`);
          }
        }
      }
    };
  }
});

// src/lib/models/Payment.ts
var import_mongoose22, PaymentSchema, Payment, Payment_default;
var init_Payment = __esm({
  "src/lib/models/Payment.ts"() {
    "use strict";
    import_mongoose22 = require("mongoose");
    PaymentSchema = new import_mongoose22.Schema({
      // Lien vers une offre de service (services)
      requestId: { type: import_mongoose22.Schema.Types.ObjectId, ref: "ServiceRequest" },
      offerId: { type: import_mongoose22.Schema.Types.ObjectId, ref: "Offer" },
      // Lien vers une commande marketplace/standard
      orderId: { type: String, index: true },
      orderType: { type: String, enum: ["marketplace", "group"] },
      domain: { type: String, enum: ["services", "marketplace", "group"], default: "services" },
      clientId: { type: String, required: true },
      providerId: { type: String },
      amount: { type: Number, required: true, min: 100 },
      depositAmount: { type: Number, default: 0, min: 0 },
      balanceAmount: { type: Number, default: 0, min: 0 },
      currency: { type: String, default: "XOF" },
      provider: { type: String, enum: ["wave", "orange_money", "free_money", "cash", "wave_qr"], required: true },
      phase: { type: String, enum: ["deposit", "balance", "full"], default: "full" },
      status: { type: String, enum: ["pending", "held", "released", "refunded", "failed"], default: "pending" },
      useEscrow: { type: Boolean, default: true },
      // Provider-specific reference IDs
      externalId: { type: String },
      checkoutUrl: { type: String },
      // Paiement manuel (QR statique) : en attente de validation admin
      manualConfirm: { type: Boolean, default: false },
      reference: { type: String },
      // référence unique à indiquer par le client (ex: XEUY-AB12CD)
      // Points system
      escrowPointsCharged: { type: Number, default: 0, min: 0 },
      // Timestamps
      heldAt: { type: Date },
      releasedAt: { type: Date },
      releasedBy: { type: String },
      refundedAt: { type: Date },
      refundedBy: { type: String },
      refundAmount: { type: Number, default: 0, min: 0 },
      // Statut 'refunded' = décision ; l'argent ne revient au client qu'une fois le virement effectué (refundStatus 'done')
      refundStatus: { type: String, enum: ["none", "pending", "done"], default: "none" },
      refundReason: { type: String },
      refundReference: { type: String },
      refundMethod: { type: String },
      refundDoneAt: { type: Date },
      refundDoneBy: { type: String },
      failedAt: { type: Date },
      failReason: { type: String },
      confirmedBy: { type: String, enum: ["webhook", "client", "system_reconcile", "admin"], default: null }
    }, { timestamps: true });
    PaymentSchema.index({ requestId: 1, status: 1 });
    PaymentSchema.index({ offerId: 1 });
    PaymentSchema.index({ clientId: 1, createdAt: -1 });
    PaymentSchema.index({ domain: 1, status: 1, createdAt: -1 });
    PaymentSchema.index({ externalId: 1 }, { sparse: true });
    PaymentSchema.index({ status: 1, createdAt: -1 });
    PaymentSchema.index({ refundStatus: 1, refundedAt: -1 });
    Payment = import_mongoose22.models.Payment || (0, import_mongoose22.model)("Payment", PaymentSchema);
    Payment_default = Payment;
  }
});

// src/lib/payment-reconcile.ts
var payment_reconcile_exports = {};
__export(payment_reconcile_exports, {
  handlePaymentReconcile: () => handlePaymentReconcile,
  payProvider: () => payProvider,
  schedulePaymentReconcile: () => schedulePaymentReconcile
});
async function handlePaymentReconcile(task) {
  await connectMongoose();
  const paymentId = task.payload?.paymentId;
  const providerId = task.payload?.providerId;
  const amount = task.payload?.amount;
  const requestId = task.payload?.requestId;
  if (!paymentId || !providerId || !amount) {
    throw new Error("Payload incomplet pour payment_reconcile");
  }
  const payment = await Payment_default.findById(paymentId).lean();
  if (!payment) throw new Error(`Paiement ${paymentId} introuvable`);
  if (!["released", "refunded"].includes(payment.status)) {
    return;
  }
  await creditCashBalance(providerId, amount, {
    relatedMissionId: requestId,
    paymentRef: paymentId,
    description: `Reversement mission (retry r\xE9conciliation)`
  });
  console.log(`[payment_reconcile] Cr\xE9dit r\xE9ussi pour payment=${paymentId} provider=${providerId} amount=${amount}`);
}
async function payProvider(payment, net, requestId, description) {
  if (!(net > 0) || !payment.providerId) return false;
  try {
    await creditCashBalance(String(payment.providerId), net, { relatedMissionId: requestId, paymentRef: String(payment._id), description });
    return true;
  } catch (err) {
    console.error(`[payProvider] cr\xE9dit \xE9chou\xE9 payment=${payment._id}, r\xE9essai planifi\xE9`, err);
    await schedulePaymentReconcile(String(payment._id), String(payment.providerId), net, requestId);
    return false;
  }
}
async function schedulePaymentReconcile(paymentId, providerId, amount, requestId) {
  try {
    const scheduler = getScheduler();
    const taskId = await scheduler.schedule({
      type: "payment_reconcile",
      runAt: new Date(Date.now() + 3e4),
      requestId,
      payload: { paymentId, providerId, amount, requestId },
      maxAttempts: 5
    });
    console.warn(`[payment_reconcile] T\xE2che planifi\xE9e pour payment=${paymentId} (retry dans 30s)`);
    return taskId;
  } catch (err) {
    console.error("[payment_reconcile] Impossible de planifier la t\xE2che:", err);
    return null;
  }
}
var init_payment_reconcile = __esm({
  "src/lib/payment-reconcile.ts"() {
    "use strict";
    init_mongoose();
    init_Payment();
    init_wallet();
    init_scheduler();
  }
});

// src/lib/visibility/dispatch.ts
var dispatch_exports = {};
__export(dispatch_exports, {
  closeDispatch: () => closeDispatch,
  enqueueDispatch: () => enqueueDispatch,
  ensureVisibilityStarted: () => ensureVisibilityStarted,
  onOffer: () => onOffer,
  runVisibilityWave: () => runVisibilityWave
});
module.exports = __toCommonJS(dispatch_exports);
var import_mongoose24 = __toESM(require("mongoose"));

// src/lib/models/ServiceRequest.ts
var import_mongoose = require("mongoose");
var MediaSchema = new import_mongoose.Schema({
  url: { type: String, required: true },
  type: { type: String, enum: ["image", "video", "audio", "file"], default: "image" },
  title: { type: String }
}, { _id: false });
var GeoPointSchema = new import_mongoose.Schema({
  type: { type: String, enum: ["Point"], default: "Point" },
  coordinates: { type: [Number], required: true },
  // [lng, lat]
  address: { type: String }
}, { _id: false });
var PauseLogSchema = new import_mongoose.Schema({
  startedAt: { type: Date, required: true },
  endedAt: { type: Date },
  pausedBy: { type: String, enum: ["client", "provider", "admin", "system"], required: true },
  pausedById: { type: String, required: true },
  reason: { type: String, required: true },
  comment: { type: String, maxlength: 1e3 },
  estimatedResumeAt: { type: Date }
}, { _id: true });
var ServiceRequestSchema = new import_mongoose.Schema({
  clientId: { type: String, required: true },
  category: { type: String, required: true },
  urgent: { type: Boolean, default: false },
  subcategory: { type: String },
  description: { type: String },
  media: { type: [MediaSchema], default: [] },
  location: { type: GeoPointSchema, required: true },
  budget: { type: Number, min: 0 },
  channel: { type: String, enum: ["web", "pwa", "mobile", "whatsapp", "callcenter"], default: "web" },
  attributes: { type: import_mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, enum: [
    "created",
    "broadcasted",
    "pending_offers",
    "accepted",
    "assigned",
    "on_the_way",
    "provider_arriving",
    "arrived",
    "in_progress",
    "paused",
    "awaiting_validation",
    "completed",
    "cancelled",
    "expired",
    "dispute",
    "archived"
  ], default: "created" },
  assignedProviderId: { type: import_mongoose.Schema.Types.ObjectId, ref: "User" },
  selectedOfferId: { type: import_mongoose.Schema.Types.ObjectId, ref: "Offer" },
  assignedAt: { type: Date },
  providerArrivingAt: { type: Date },
  arrivedAt: { type: Date },
  startedAt: { type: Date },
  completedAt: { type: Date },
  validatedByClientAt: { type: Date },
  providerCompletedAt: { type: Date },
  cancelledAt: { type: Date },
  cancelledBy: { type: String, enum: ["client", "provider", "admin", "system"] },
  cancelReason: { type: String, maxlength: 500 },
  // Réservation planifiée : le client demande un créneau futur (ex. demain 15h).
  // Mutuellement exclusif avec `urgent`. En cas de contre-proposition horaire
  // acceptée, contient l'horaire convenu (pas forcément le demandé).
  scheduledFor: { type: Date },
  // Durée de validité d'une demande (par défaut 24h après création)
  expiresAt: { type: Date },
  expiredAt: { type: Date },
  broadcastedAt: { type: Date },
  archivedAt: { type: Date },
  archivedReason: { type: String },
  disputeOpenedAt: { type: Date },
  disputeReason: { type: String },
  disputeStatus: { type: String, enum: ["open", "under_review", "resolved", "closed"] },
  disputeDecision: { type: String, enum: ["release_escrow", "refund", "partial_refund", "reject", "cancel", "other"] },
  disputeRefundAmount: { type: Number, min: 0 },
  disputeAdminId: { type: String },
  disputeAdminNote: { type: String, maxlength: 2e3 },
  disputeResolvedAt: { type: Date },
  escrowLocked: { type: Boolean, default: false },
  escrowLockedAt: { type: Date },
  escrowLockedBy: { type: String },
  pausedFromStatus: { type: String },
  anomalyFlags: { type: [String], default: [] },
  anomalyScore: { type: Number, default: 0 },
  pauseLog: { type: [PauseLogSchema], default: [] },
  // Coach IA prestataire : contenu généré une fois par étape (clé = statut), pour ne pas re-facturer ni re-générer
  aiCoach: { type: import_mongoose.Schema.Types.Mixed, default: {} },
  // Fiche d'analyse IA de la demande (analyze_request) : générée une seule fois, partagée par
  // tous les prestataires qui consultent la demande. { advice, materials, model, generatedAt, descriptionHash }
  aiBrief: { type: import_mongoose.Schema.Types.Mixed },
  // Quand le client a consulté ses offres pour cette demande (déduplique les badges)
  clientOffersReadAt: { type: Date },
  // Quand chaque partie a lu le chat de mission (badges inbox "Messages")
  clientChatReadAt: { type: Date },
  providerChatReadAt: { type: Date },
  // Clé d'idempotence client (file offline) : déduplique la création en cas de replay
  idempotencyKey: { type: String },
  lastActivityAt: { type: Date, default: Date.now },
  lastActivityType: { type: String },
  lastActivityBy: { type: String },
  inactivityReminderCount: { type: Number, default: 0 },
  inactivityReminderAt: { type: Date },
  // Validation automatique d'une mission terminée non validée par le client
  // (cash : ~24h, escrow mobile : ~72h — cf. mission-inactivity-job).
  autoValidationWarnCount: { type: Number, default: 0 },
  autoValidationWarnAt: { type: Date },
  autoValidatedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } });
ServiceRequestSchema.index({ "location": "2dsphere" });
ServiceRequestSchema.index({ status: 1, createdAt: -1 });
ServiceRequestSchema.index({ status: 1, expiresAt: 1 });
ServiceRequestSchema.index({ clientId: 1, status: 1, createdAt: -1 });
ServiceRequestSchema.index({ clientId: 1, idempotencyKey: 1 }, {
  unique: true,
  partialFilterExpression: { idempotencyKey: { $type: "string" } }
});
ServiceRequestSchema.index({ status: 1, category: 1, expiresAt: 1 });
ServiceRequestSchema.index({ status: 1, lastActivityAt: 1 });
var ServiceRequest = (0, import_mongoose.model)("ServiceRequest", ServiceRequestSchema, void 0, { overwriteModels: true });
var ServiceRequest_default = ServiceRequest;

// src/lib/models/VisibilityDispatch.ts
var import_mongoose2 = require("mongoose");
var WaveAuditSchema = new import_mongoose2.Schema({
  stage: { type: Number, required: true },
  radiusKm: { type: Number, required: true },
  at: { type: Date, default: Date.now },
  providerIds: { type: [String], default: [] },
  socketCount: { type: Number, default: 0 },
  pushDelivered: { type: Number, default: 0 },
  pushTokenCount: { type: Number, default: 0 }
}, { _id: false });
var VisibilityDispatchSchema = new import_mongoose2.Schema({
  requestId: { type: import_mongoose2.Schema.Types.ObjectId, ref: "ServiceRequest", required: true, unique: true, index: true },
  clientId: { type: String, required: true },
  category: { type: String, required: true },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  status: { type: String, enum: ["active", "stopped", "completed", "expired", "failed"], default: "active", index: true },
  currentStage: { type: Number, default: -1 },
  offersReceived: { type: Number, default: 0 },
  providersNotified: { type: [String], default: [] },
  totalNotified: { type: Number, default: 0 },
  waves: { type: [WaveAuditSchema], default: [] },
  stopReason: { type: String },
  nextRunAt: { type: Date }
}, { timestamps: true });
var VisibilityDispatch = import_mongoose2.models.VisibilityDispatch || (0, import_mongoose2.model)("VisibilityDispatch", VisibilityDispatchSchema);
var VisibilityDispatch_default = VisibilityDispatch;

// src/lib/visibility/dispatch.ts
init_mongoose();

// src/lib/visibility/config.ts
init_AppConfig();
init_mongoose();
var DEFAULT_VISIBILITY_CONFIG = {
  enabled: true,
  requireKycForNotification: false,
  browseScope: "category",
  defaultRadiusKm: 10,
  maxRadiusKm: 200,
  presenceFreshnessSec: 600,
  maxProvidersPerWave: 50,
  escalation: [
    { stage: 0, radiusKm: 10, delaySec: 0, minOffersToStop: 1, minProvidersToStop: 5 },
    { stage: 1, radiusKm: 20, delaySec: 120, minOffersToStop: 1, minProvidersToStop: 8 },
    { stage: 2, radiusKm: 30, delaySec: 120, minOffersToStop: 1, minProvidersToStop: 12 },
    { stage: 3, radiusKm: 60, delaySec: 180, minOffersToStop: 1, minProvidersToStop: 20 },
    { stage: 4, radiusKm: 150, delaySec: 300, minOffersToStop: 1, minProvidersToStop: 40 }
  ],
  scoreWeights: {
    distance: 0.4,
    availability: 0.2,
    category: 0.2,
    rating: 0.1,
    responsiveness: 0.1
  },
  tiers: [
    { id: "free", label: "Gratuit", radiusKm: 10, priorityLevel: 0, boostMultiplier: 1 },
    { id: "plus", label: "Plus", radiusKm: 20, priorityLevel: 1, boostMultiplier: 1.2 },
    { id: "pro", label: "Pro", radiusKm: 30, priorityLevel: 2, boostMultiplier: 1.5 },
    { id: "unlimited", label: "Illimit\xE9", radiusKm: -1, priorityLevel: 3, boostMultiplier: 2 }
  ],
  fallback: {
    useLastKnownPosition: true,
    useProfileCity: true
  }
};
function mergeVisibilityConfig(partial) {
  const d = DEFAULT_VISIBILITY_CONFIG;
  if (!partial) return { ...d };
  return {
    enabled: partial.enabled ?? d.enabled,
    requireKycForNotification: partial.requireKycForNotification ?? d.requireKycForNotification,
    browseScope: partial.browseScope === "all" ? "all" : partial.browseScope === "category" ? "category" : d.browseScope,
    defaultRadiusKm: partial.defaultRadiusKm ?? d.defaultRadiusKm,
    maxRadiusKm: partial.maxRadiusKm ?? d.maxRadiusKm,
    presenceFreshnessSec: partial.presenceFreshnessSec ?? d.presenceFreshnessSec,
    maxProvidersPerWave: partial.maxProvidersPerWave ?? d.maxProvidersPerWave,
    escalation: partial.escalation?.length ? [...partial.escalation].sort((a, b) => a.stage - b.stage) : d.escalation,
    scoreWeights: { ...d.scoreWeights, ...partial.scoreWeights || {} },
    tiers: partial.tiers?.length ? partial.tiers : d.tiers,
    fallback: { ...d.fallback, ...partial.fallback || {} }
  };
}
var cache = null;
var CACHE_TTL_MS = 3e4;
async function getVisibilityConfig(forceReload = false) {
  if (!forceReload && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.value;
  }
  try {
    await connectMongoose();
    const doc = await AppConfig_default.findOne({ key: "global" }).select("visibility").lean();
    const value = mergeVisibilityConfig(doc?.visibility);
    cache = { value, at: Date.now() };
    return value;
  } catch (err) {
    console.warn("[Visibility] getVisibilityConfig failed, using defaults:", err?.message);
    return { ...DEFAULT_VISIBILITY_CONFIG };
  }
}
function resolveTier(config, tierId) {
  const tiers = config.tiers.length ? config.tiers : DEFAULT_VISIBILITY_CONFIG.tiers;
  return tiers.find((t) => t.id === tierId) || tiers[0];
}

// src/lib/visibility/presence.ts
var import_mongoose10 = require("mongoose");

// src/lib/models/ProviderProfile.ts
var import_mongoose6 = __toESM(require("mongoose"));
var ProviderProfileSchema = new import_mongoose6.Schema({
  userId: {
    type: import_mongoose6.Schema.Types.ObjectId,
    required: true,
    unique: true,
    index: true,
    ref: "User"
  },
  kycVerified: { type: Boolean, default: false, index: true },
  providerStats: {
    completedMissions: { type: Number, default: 0, min: 0 },
    cancelledByProvider: { type: Number, default: 0, min: 0 },
    cancelledByClient: { type: Number, default: 0, min: 0 },
    reliabilityScore: { type: Number, default: 100, min: 0, max: 100 },
    lastUpdatedAt: { type: Date }
  },
  serviceCategories: { type: [String], default: [] },
  secondaryCategories: { type: [String], default: [] },
  zone: {
    city: { type: String, trim: true },
    region: { type: String, trim: true },
    coordinates: { type: [Number], index: "2dsphere" },
    radiusKm: { type: Number, default: 10, min: 1 },
    departments: { type: [String], default: [] },
    regions: { type: [String], default: [] }
  },
  coverUrl: { type: String },
  currentLoad: { type: Number, default: 0, min: 0 },
  maxConcurrentMissions: { type: Number, min: 1 },
  availabilityStatus: { type: String, default: "Disponible" },
  visible: { type: Boolean, default: true, index: true },
  scoreXeuy: { type: Number, default: 0, min: 0, max: 100 },
  preferences: { type: import_mongoose6.Schema.Types.Mixed, default: {} },
  stock: {
    type: [new import_mongoose6.Schema({
      name: { type: String, required: true, trim: true, maxlength: 60 },
      qty: { type: Number, default: 0, min: 0, max: 9999 },
      minQty: { type: Number, default: 0, min: 0, max: 9999 },
      unit: { type: String, trim: true, maxlength: 12 },
      updatedAt: { type: Date }
    }, { _id: false })],
    default: []
  },
  stockReminderAt: { type: Date }
}, { timestamps: true });
var ProviderProfile_default = import_mongoose6.default.models.ProviderProfile || import_mongoose6.default.model("ProviderProfile", ProviderProfileSchema);

// src/lib/models/ProviderSubscription.ts
var import_mongoose7 = require("mongoose");
var ProviderSubscriptionSchema = new import_mongoose7.Schema({
  userId: { type: import_mongoose7.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  tier: { type: String, default: "free", index: true },
  visibilityRadiusKm: { type: Number, default: 10 },
  priorityLevel: { type: Number, default: 0 },
  boostMultiplier: { type: Number, default: 1 },
  features: { type: [String], default: [] },
  status: { type: String, enum: ["active", "expired", "cancelled"], default: "active", index: true },
  activeUntil: { type: Date }
}, { timestamps: true });
var ProviderSubscription = import_mongoose7.models.ProviderSubscription || (0, import_mongoose7.model)("ProviderSubscription", ProviderSubscriptionSchema);
var ProviderSubscription_default = ProviderSubscription;

// src/lib/models/ServiceReview.ts
var import_mongoose8 = require("mongoose");
var ServiceReviewSchema = new import_mongoose8.Schema({
  requestId: { type: import_mongoose8.Schema.Types.ObjectId, ref: "ServiceRequest", required: true },
  reviewerId: { type: String, required: true },
  // clientId
  providerId: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, maxlength: 500 },
  tags: { type: [String], default: [] },
  // ex: ['ponctuel', 'propre', 'pro']
  createdAt: { type: Date, default: Date.now }
}, { timestamps: { createdAt: "createdAt", updatedAt: false } });
ServiceReviewSchema.index({ requestId: 1, reviewerId: 1 }, { unique: true });
ServiceReviewSchema.index({ providerId: 1, createdAt: -1 });
var ServiceReview = import_mongoose8.models.ServiceReview || (0, import_mongoose8.model)("ServiceReview", ServiceReviewSchema);
var ServiceReview_default = ServiceReview;

// src/lib/visibility/presence.ts
init_User();
init_mongoose();
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
async function getGpsPresence(center, radiusKm) {
  let geo = global.geo;
  if (!geo || typeof geo.findNearbyProviders !== "function") {
    try {
      const mod = await Promise.resolve().then(() => __toESM(require_redis_geo()));
      geo = mod.default || mod;
      if (geo && typeof geo.findNearbyProviders === "function") {
        console.log("[Visibility] getGpsPresence: loaded redis-geo.js directly");
      } else {
        console.warn("[Visibility] getGpsPresence: global.geo not available and redis-geo.js export invalid");
        return [];
      }
    } catch (e) {
      console.warn("[Visibility] getGpsPresence: global.geo not available, redis-geo.js load failed:", e?.message);
      return [];
    }
  }
  try {
    let nearby = await geo.findNearbyProviders(center.lat, center.lng, radiusKm);
    if ((!nearby || nearby.length === 0) && global.providerPresence) {
      const now = Date.now();
      const fallbackGps = [];
      const PRESENCE_STALE_MS = 10 * 60 * 1e3;
      for (const [providerId, pos] of global.providerPresence.entries()) {
        if (typeof pos?.lat !== "number" || typeof pos?.lng !== "number") continue;
        if (now - (pos?.updatedAt || 0) > PRESENCE_STALE_MS) continue;
        const dist = haversineKm(center.lat, center.lng, pos.lat, pos.lng);
        if (dist <= radiusKm) {
          fallbackGps.push({
            providerId: String(providerId),
            lat: Number(pos.lat),
            lng: Number(pos.lng),
            dist,
            status: pos.status || "available",
            name: pos.name || "",
            email: pos.email || ""
          });
        }
      }
      if (fallbackGps.length) nearby = fallbackGps;
    }
    console.log(`[Visibility] getGpsPresence lat=${center.lat.toFixed(5)} lng=${center.lng.toFixed(5)} r=${radiusKm}km \u2192 ${(nearby || []).length} GPS provider(s)`);
    return (nearby || []).map((p) => ({
      providerId: String(p.providerId),
      position: { lat: Number(p.lat), lng: Number(p.lng) },
      distanceKm: Number(p.dist),
      status: p.status || "available",
      source: "gps",
      name: p.name || void 0
    }));
  } catch (err) {
    console.warn("[Visibility] getGpsPresence failed:", err?.message);
    return [];
  }
}
async function getProfileFallback(center, radiusKm, excludeIds, config) {
  if (!config.fallback.useLastKnownPosition && !config.fallback.useProfileCity) return [];
  try {
    const docs = await ProviderProfile_default.find({
      "zone.coordinates": {
        $near: {
          $geometry: { type: "Point", coordinates: [center.lng, center.lat] },
          $maxDistance: radiusKm * 1e3
        }
      }
    }).select("userId zone").limit(config.maxProvidersPerWave * 4).lean();
    const out = [];
    for (const d of docs) {
      const uid = String(d.userId);
      if (excludeIds.has(uid)) continue;
      const coords = d.zone?.coordinates;
      if (!Array.isArray(coords) || coords.length !== 2) continue;
      const [lng, lat] = coords;
      out.push({
        providerId: uid,
        position: { lat: Number(lat), lng: Number(lng) },
        distanceKm: haversineKm(center.lat, center.lng, Number(lat), Number(lng)),
        status: "offline",
        source: "last_known"
      });
    }
    console.log(`[Visibility] getProfileFallback r=${radiusKm}km \u2192 ${out.length} provider(s)`);
    return out;
  } catch (err) {
    console.warn("[Visibility] getProfileFallback failed:", err?.message);
    return [];
  }
}
async function getRatingAverages(providerIds) {
  const map = /* @__PURE__ */ new Map();
  if (!providerIds.length) return map;
  try {
    const rows = await ServiceReview_default.aggregate([
      { $match: { providerId: { $in: providerIds } } },
      { $group: { _id: "$providerId", avg: { $avg: "$rating" } } }
    ]);
    for (const r of rows) map.set(String(r._id), Number(r.avg));
  } catch (err) {
    console.warn("[Visibility] getRatingAverages failed:", err?.message);
  }
  return map;
}
function toObjectId(id) {
  try {
    return import_mongoose10.Types.ObjectId.isValid(id) ? new import_mongoose10.Types.ObjectId(id) : null;
  } catch {
    return null;
  }
}
async function getCandidates(center, radiusKm, config) {
  await connectMongoose();
  const gps = await getGpsPresence(center, radiusKm);
  const zoneUpdates = gps.map((p) => {
    const oid = toObjectId(p.providerId);
    if (!oid) return null;
    return {
      updateOne: {
        filter: { userId: oid },
        update: { $set: { "zone.coordinates": [p.position.lng, p.position.lat], "zone.updatedAt": /* @__PURE__ */ new Date() } },
        upsert: true
      }
    };
  }).filter(Boolean);
  if (zoneUpdates.length) {
    ProviderProfile_default.bulkWrite(zoneUpdates).catch(() => {
    });
  }
  const gpsIds = new Set(gps.map((p) => p.providerId));
  const fallback = await getProfileFallback(center, radiusKm, gpsIds, config);
  const raw = [...gps, ...fallback].filter((p) => p.distanceKm <= radiusKm);
  const providerIds = Array.from(new Set(raw.map((p) => p.providerId)));
  if (!providerIds.length) return [];
  const oids = providerIds.map(toObjectId).filter(Boolean);
  const [profiles, users, subs, ratings] = await Promise.all([
    ProviderProfile_default.find({ userId: { $in: oids } }).select("userId kycVerified serviceCategories currentLoad maxConcurrentMissions").lean(),
    User_default.find({ _id: { $in: oids } }).select("name kycVerified providerStats").lean(),
    ProviderSubscription_default.find({ userId: { $in: oids }, status: "active" }).select("userId tier visibilityRadiusKm priorityLevel boostMultiplier").lean(),
    getRatingAverages(providerIds)
  ]);
  const profileByUser = new Map(profiles.map((p) => [String(p.userId), p]));
  const userById = new Map(users.map((u) => [String(u._id), u]));
  const subByUser = new Map(subs.map((s) => [String(s.userId), s]));
  const freeTier = resolveTier(config, "free");
  const candidates = [];
  for (const p of raw) {
    if (candidates.some((c) => c.providerId === p.providerId)) continue;
    const profile = profileByUser.get(p.providerId);
    const user = userById.get(p.providerId);
    const sub = subByUser.get(p.providerId);
    const kycVerified = Boolean(profile?.kycVerified ?? user?.kycVerified ?? false);
    const categories = profile?.serviceCategories || [];
    const secondaryCategories = profile?.secondaryCategories || [];
    const availabilityStatus = profile?.availabilityStatus || "Disponible";
    const visible = profile?.visible !== false;
    const available = visible && availabilityStatus === "Disponible";
    const tierDef = sub ? { radiusKm: sub.visibilityRadiusKm, priorityLevel: sub.priorityLevel, boostMultiplier: sub.boostMultiplier, id: sub.tier } : freeTier;
    candidates.push({
      providerId: p.providerId,
      name: p.name || user?.name,
      position: p.position,
      positionSource: p.source,
      positionAgeSec: null,
      distanceKm: Number(p.distanceKm.toFixed(3)),
      kycVerified,
      categories,
      secondaryCategories,
      availabilityStatus,
      available,
      presenceStatus: available ? p.status : "offline",
      currentLoad: profile?.currentLoad ?? 0,
      maxConcurrentMissions: profile?.maxConcurrentMissions ?? null,
      ratingAvg: ratings.get(p.providerId) ?? null,
      avgResponseSec: null,
      tier: tierDef.id || "free",
      visibilityRadiusKm: tierDef.radiusKm ?? config.defaultRadiusKm,
      priorityLevel: tierDef.priorityLevel ?? 0,
      boostMultiplier: tierDef.boostMultiplier ?? 1
    });
  }
  console.log(`[Visibility] getCandidates gps=${gps.length} fallback=${fallback.length} total=${candidates.length}`);
  return candidates;
}

// src/lib/visibility/ranking.ts
function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}
var AVAILABILITY_SCORE = {
  available: 1,
  viewing: 0.7,
  on_mission: 0.3,
  offline: 0.2
};
var AVAILABILITY_LABEL_SCORE = {
  Disponible: 1,
  Occup\u00E9: 0.2,
  "En pause": 0.1,
  "En vacances": 0.05,
  "Hors ligne": 0
};
var FACTORS = [
  {
    key: "distance",
    compute: (c, _req, config) => {
      if (c.distanceKm == null) return 0;
      const r = Math.max(1, config.maxRadiusKm);
      return clamp01(1 - c.distanceKm / r);
    }
  },
  {
    key: "availability",
    compute: (c) => c.available ? AVAILABILITY_LABEL_SCORE[c.availabilityStatus] ?? AVAILABILITY_SCORE[c.presenceStatus] ?? 0.2 : 0
  },
  {
    key: "category",
    compute: (c, req) => {
      const allCats = [...c.categories, ...c.secondaryCategories || []];
      if (allCats.includes(req.category)) return 1;
      return (c.secondaryCategories || []).includes(req.category) ? 0.5 : 0;
    }
  },
  {
    key: "rating",
    // Neutre (0.6) si aucune note, sinon normalisé sur 5.
    compute: (c) => c.ratingAvg == null ? 0.6 : clamp01(c.ratingAvg / 5)
  },
  {
    key: "responsiveness",
    // Neutre (0.5) si inconnu ; plus rapide = meilleur (référence 120s).
    compute: (c) => c.avgResponseSec == null ? 0.5 : clamp01(1 / (1 + c.avgResponseSec / 120))
  }
];
function scoreProvider(candidate, req, config) {
  const weights = config.scoreWeights;
  const totalWeight = FACTORS.reduce((sum, f) => sum + (weights[f.key] ?? 0), 0) || 1;
  const breakdown = {};
  let weighted = 0;
  for (const factor of FACTORS) {
    const w = weights[factor.key] ?? 0;
    const raw = clamp01(factor.compute(candidate, req, config));
    const contribution = w / totalWeight * raw;
    breakdown[factor.key] = Number(contribution.toFixed(6));
    weighted += contribution;
  }
  const boost = candidate.boostMultiplier > 0 ? candidate.boostMultiplier : 1;
  const score = Number((weighted * boost).toFixed(6));
  breakdown._base = Number(weighted.toFixed(6));
  breakdown._boost = boost;
  return { score, breakdown };
}
function rankProviders(candidates, req, config) {
  const ranked = candidates.map((c) => {
    const { score, breakdown } = scoreProvider(c, req, config);
    return { ...c, score, scoreBreakdown: breakdown };
  });
  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.priorityLevel !== a.priorityLevel) return b.priorityLevel - a.priorityLevel;
    const da = a.distanceKm ?? Number.POSITIVE_INFINITY;
    const db = b.distanceKm ?? Number.POSITIVE_INFINITY;
    return da - db;
  });
  return ranked;
}

// src/lib/visibility/engine.ts
function isEligible(candidate, req, config) {
  if (!candidate.available) return false;
  if (config?.requireKycForNotification && !candidate.kycVerified) return false;
  if (candidate.distanceKm == null) return false;
  const allCats = [...candidate.categories || [], ...candidate.secondaryCategories || []];
  const categoryOk = allCats.length === 0 || allCats.includes(req.category);
  if (!categoryOk) return false;
  if (candidate.maxConcurrentMissions != null && candidate.currentLoad >= candidate.maxConcurrentMissions) return false;
  return true;
}
function filterAndRank(candidates, req, config) {
  const reasons = {};
  const eligible = [];
  for (const c of candidates) {
    const ok = isEligible(c, req, config);
    if (!ok) {
      if (!c.available) reasons[c.providerId] = "unavailable";
      else if (config.requireKycForNotification && !c.kycVerified) reasons[c.providerId] = "kyc_missing";
      else if (c.distanceKm == null) reasons[c.providerId] = "no_distance";
      else {
        const allCats = [...c.categories || [], ...c.secondaryCategories || []];
        const categoryOk = allCats.length === 0 || allCats.includes(req.category);
        if (!categoryOk) reasons[c.providerId] = "category_mismatch";
        else if (c.maxConcurrentMissions != null && c.currentLoad >= c.maxConcurrentMissions) reasons[c.providerId] = "max_load";
        else reasons[c.providerId] = "unknown";
      }
      continue;
    }
    eligible.push(c);
  }
  return { ranked: rankProviders(eligible, req, config), reasons };
}
function selectStageProviders(config, stageIndex, rankedEligible, alreadyNotified) {
  const stage = config.escalation[stageIndex];
  if (!stage) return { stage: stageIndex, radiusKm: 0, providerIds: [] };
  const pool = rankedEligible.filter(
    (p) => !alreadyNotified.has(p.providerId) && p.distanceKm != null && p.distanceKm <= stage.radiusKm
  );
  const providerIds = pool.slice(0, config.maxProvidersPerWave).map((p) => p.providerId);
  return { stage: stage.stage, radiusKm: stage.radiusKm, providerIds };
}
function shouldStopBeforeStage(config, stageIndex, offersReceived, totalNotified) {
  const stage = config.escalation[stageIndex];
  if (!stage) return true;
  if (offersReceived >= stage.minOffersToStop) return true;
  if (totalNotified >= stage.minProvidersToStop) return true;
  return false;
}

// src/lib/push.ts
init_mongoose();

// src/lib/models/PushToken.ts
var import_mongoose12 = __toESM(require("mongoose"));
var PushTokenSchema = new import_mongoose12.Schema(
  {
    userId: { type: String, required: true },
    token: { type: String, required: true, unique: true },
    platform: { type: String, enum: ["ios", "android", "web"], default: "android" },
    appType: { type: String, enum: ["consumer", "provider", "unified"], default: "consumer" }
  },
  { timestamps: true }
);
PushTokenSchema.index({ userId: 1, token: 1 }, { unique: true });
var PushToken_default = import_mongoose12.default.models.PushToken || import_mongoose12.default.model("PushToken", PushTokenSchema);

// src/lib/notifications-memory.ts
var notifications = [];
function persistToMongo(note) {
  const isAdminChannel = note.userId === "admin";
  const userId = isAdminChannel || note.userId === "all" ? void 0 : note.userId;
  const roles = isAdminChannel ? ["ADMIN", "SUPER_ADMIN"] : note.userId === "all" ? ["CLIENT"] : void 0;
  const actionUrl = note.actionUrl || note.link?.pathname;
  void Promise.all([
    Promise.resolve().then(() => (init_mongoose(), mongoose_exports)).then((m) => m.connectMongoose()),
    Promise.resolve().then(() => (init_InAppNotification(), InAppNotification_exports))
  ]).then(
    ([, mod]) => mod.default.create({
      userId,
      roles,
      type: note.type,
      title: note.title,
      message: note.message,
      actionUrl,
      metadata: note.metadata
    })
  ).catch((err) => console.error("[notifications] mongo write-through failed:", err));
}
function addAppNotification(userId, kind, title, body, link, metadata) {
  const type = kind === "offer-accepted" || kind === "request-assigned" ? "success" : kind === "offer-rejected" ? "error" : kind === "offer-counter" ? "warning" : "info";
  const note = {
    id: `app-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    type,
    title,
    message: body,
    body,
    kind,
    link,
    metadata,
    read: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  notifications.unshift(note);
  if (notifications.length > 100) notifications = notifications.slice(0, 100);
  persistToMongo(note);
  return note;
}

// src/lib/push.ts
var EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
var EXPO_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts";
async function sendExpoBatch(messages) {
  if (!messages.length) return 0;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1e4);
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate"
      },
      body: JSON.stringify(messages),
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[Push] Expo HTTP ${res.status}: ${text.slice(0, 200)}`);
      return 0;
    }
    const data = await res.json().catch(() => null);
    const tickets = data?.data || [];
    const tokensToRemove = [];
    const ticketIds = [];
    const tokenByTicketId = /* @__PURE__ */ new Map();
    let delivered = 0;
    tickets.forEach((ticket, idx) => {
      const token = messages[idx]?.to;
      if (ticket.status === "ok") {
        delivered++;
        if (ticket.id && token) {
          ticketIds.push(ticket.id);
          tokenByTicketId.set(ticket.id, token);
        }
        console.log(`[Push] \u2705 token ${idx + 1}/${messages.length} accept\xE9 (ticket ${ticket.id})`);
      } else {
        const errorCode = ticket.details?.error;
        console.warn(`[Push] \u274C token ${idx + 1}/${messages.length} erreur: ${ticket.message} (${errorCode})`);
        if (errorCode === "DeviceNotRegistered" && token) {
          tokensToRemove.push(token);
        }
      }
    });
    if (tokensToRemove.length) {
      await PushToken_default.deleteMany({ token: { $in: tokensToRemove } });
      console.log(`[Push] \u{1F5D1}\uFE0F ${tokensToRemove.length} token(s) invalide(s) supprim\xE9(s)`);
    }
    if (ticketIds.length) {
      void checkReceipts(ticketIds, tokenByTicketId);
    }
    return delivered;
  } catch (err) {
    if (err.name === "AbortError") {
      console.error("[Push] Expo timeout (10s)");
    } else {
      console.error("[Push] Erreur envoi:", err.message);
    }
    return 0;
  } finally {
    clearTimeout(timer);
  }
}
async function checkReceipts(ticketIds, tokenMap) {
  if (!ticketIds.length) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1e4);
  try {
    const res = await fetch(EXPO_RECEIPTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ ids: ticketIds }),
      signal: controller.signal
    });
    if (!res.ok) return;
    const data = await res.json().catch(() => null);
    const receipts = data?.data || {};
    const toRemove = [];
    for (const [id, receipt] of Object.entries(receipts)) {
      if (receipt.status === "error" && receipt.details?.error === "DeviceNotRegistered") {
        const token = tokenMap.get(id);
        if (token) toRemove.push(token);
      }
    }
    if (toRemove.length) {
      await PushToken_default.deleteMany({ token: { $in: toRemove } });
      console.log(`[Push] \u{1F5D1}\uFE0F ${toRemove.length} token(s) invalide(s) supprim\xE9(s) via receipts`);
    }
  } catch (err) {
    console.warn("[Push] Receipt check failed:", err.message);
  } finally {
    clearTimeout(timer);
  }
}
function buildAppNotification(message, appType) {
  const requestId = message.data?.requestId ? String(message.data.requestId) : "";
  const role = appType === "provider" ? "provider" : "consumer";
  const link = (pathname, params) => ({ pathname, params });
  switch (message.data?.type) {
    case "offer:new":
      return {
        kind: "offer-received",
        link: role === "consumer" && requestId ? link(`/offers/${requestId}`) : void 0
      };
    case "offer:accepted":
    case "payment:held":
      return {
        kind: "request-assigned",
        link: requestId ? link(role === "provider" ? `/active-mission/${requestId}` : `/mission/${requestId}`) : void 0
      };
    // La contre-offre ne crée pas la mission : le client doit encore accepter l'offre.
    case "offer:counter-accepted":
    case "offer:counter-rejected":
      return {
        kind: "offer-counter",
        link: requestId ? link(role === "provider" ? "/my-offers" : `/offers/${requestId}`) : void 0
      };
    case "mission:validation-reminder":
      return {
        kind: "mission-update",
        link: requestId ? link(`/mission/${requestId}`) : void 0
      };
    case "request:status-changed":
      return {
        kind: "request-status-changed",
        link: requestId ? link(role === "provider" ? `/active-mission/${requestId}` : `/mission/${requestId}`) : void 0
      };
    case "chat:message":
      return {
        kind: "mission-update",
        link: requestId ? link("/mission-chat", { id: requestId }) : void 0
      };
    case "request:new":
      return { kind: "request-new", link: role === "provider" ? link("/nearby-requests") : void 0 };
    case "offer:rejected":
      return { kind: "offer-rejected", link: role === "provider" ? link("/my-offers") : void 0 };
    case "offer:counter":
      return { kind: "offer-counter", link: role === "provider" ? link("/my-offers", { filter: "counter" }) : void 0 };
    default:
      return {
        kind: "mission-update",
        link: requestId ? link(role === "provider" ? `/active-mission/${requestId}` : `/mission/${requestId}`) : void 0
      };
  }
}
function relayAfterPush(userId, message, delivered) {
  Promise.resolve().then(() => (init_whatsapp_relay(), whatsapp_relay_exports)).then((m) => m.relayToWhatsApp(userId, message, delivered)).catch((err) => console.warn("[Push] relais WhatsApp impossible:", err instanceof Error ? err.message : err));
}
async function sendPushToUser(userId, message) {
  try {
    await connectMongoose();
    try {
      const safeAppType = message.appType === "consumer" || message.appType === "provider" ? message.appType : void 0;
      const { kind, link } = buildAppNotification(message, safeAppType);
      addAppNotification(userId, kind, message.title, message.body, link, message.data);
      const io = global.io;
      if (io && typeof io.to === "function") {
        io.to(`user-${userId}`).emit("notification:new", {
          kind,
          title: message.title,
          body: message.body,
          link,
          data: message.data || {},
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    } catch (err) {
      console.warn("[Push] Failed to persist/emit app notification:", err);
    }
    const query = { userId };
    if (message.appType) query.appType = { $in: [message.appType, "unified"] };
    const tokens = await PushToken_default.find(query).select("token").lean();
    if (!tokens.length) {
      console.warn(`[Push] sendPushToUser(${userId}/${message.appType || "any"}): aucun token enregistr\xE9`);
      relayAfterPush(userId, message, 0);
      return { success: false, tokenCount: 0, deliveredCount: 0, error: "Aucun token enregistr\xE9 pour cet utilisateur" };
    }
    console.log(`[Push] \u2192 user ${userId} (${message.appType || "any"}): ${tokens.length} token(s) \u2014 "${message.title}"`);
    const messages = tokens.map((t) => ({
      to: t.token,
      title: message.title,
      body: message.body,
      // audience permet à l'app fusionnée de résoudre le lien vers le bon côté (client/provider)
      data: { ...message.data || {}, audience: message.appType },
      sound: message.sound ?? "default",
      badge: message.badge,
      channelId: message.channelId || "default",
      priority: "high"
    }));
    const chunks = chunkArray(messages, 100);
    let delivered = 0;
    for (const chunk of chunks) delivered += await sendExpoBatch(chunk);
    relayAfterPush(userId, message, delivered);
    return { success: delivered > 0, tokenCount: tokens.length, deliveredCount: delivered };
  } catch (err) {
    console.error("[Push] sendPushToUser error:", err);
    return { success: false, tokenCount: 0, deliveredCount: 0, error: err.message || "Erreur envoi push" };
  }
}
async function sendPushToUsers(userIds, message) {
  const results = await Promise.allSettled(userIds.map((uid) => sendPushToUser(uid, message)));
  return results.map((r) => r.status === "fulfilled" ? r.value : { success: false, tokenCount: 0, deliveredCount: 0, error: String(r.reason) });
}
var STALE_POSITION_MS = 10 * 60 * 1e3;
function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// src/lib/visibility/notification-engine.ts
function buildRealtimePayload(req, stage, radiusKm) {
  return {
    requestId: req.requestId,
    category: req.category,
    description: req.description || "",
    budget: req.budget ?? null,
    location: {
      type: "Point",
      coordinates: [req.location.lng, req.location.lat]
    },
    createdAt: req.createdAt,
    _visibility: { stage, radiusKm }
  };
}
async function notifyWave(input) {
  const { request, stage, radiusKm, providerIds } = input;
  const uniqueIds = Array.from(new Set(providerIds));
  let socketCount = 0;
  let pushDelivered = 0;
  let pushTokenCount = 0;
  if (uniqueIds.length === 0) {
    return { stage, radiusKm, providerIds: uniqueIds, socketCount, pushDelivered, pushTokenCount };
  }
  const io = global.io;
  if (io && typeof io.to === "function") {
    const payload = buildRealtimePayload(request, stage, radiusKm);
    for (const id of uniqueIds) {
      try {
        io.to(`provider-${id}`).emit("request:nearby", payload);
        socketCount++;
      } catch (err) {
        console.warn(`[Visibility] socket emit failed for ${id}:`, err?.message);
      }
    }
  }
  try {
    const results = await sendPushToUsers(uniqueIds, {
      title: "\u{1F514} Nouvelle demande",
      body: `${request.category} \u2014 ${(request.description || "").slice(0, 80) || "Sans description"}`,
      data: { type: "request:new", requestId: request.requestId },
      channelId: "services",
      appType: "provider"
    });
    for (const r of results) {
      pushDelivered += r.deliveredCount || 0;
      pushTokenCount += r.tokenCount || 0;
    }
  } catch (err) {
    console.warn("[Visibility] push wave failed:", err?.message);
  }
  console.log(`[Visibility] wave requestId=${request.requestId} stage=${stage} radius=${radiusKm}km \u2192 ${uniqueIds.length} provider(s) | socket=${socketCount} pushDelivered=${pushDelivered}`);
  return { stage, radiusKm, providerIds: uniqueIds, socketCount, pushDelivered, pushTokenCount };
}

// src/lib/visibility/dispatch.ts
init_scheduler();
var WAVE = "visibility_wave";
function ensureVisibilityStarted() {
  const g = global;
  const scheduler = getScheduler();
  if (!g.__visibilityHandlersRegistered) {
    scheduler.register(WAVE, runVisibilityWave);
    g.__visibilityHandlersRegistered = true;
  }
  if (!g.__paymentReconcileRegistered) {
    Promise.resolve().then(() => (init_payment_reconcile(), payment_reconcile_exports)).then((m) => {
      scheduler.register("payment_reconcile", m.handlePaymentReconcile);
    }).catch(() => {
    });
    g.__paymentReconcileRegistered = true;
  }
  if (!g.__visibilityStarted) {
    scheduler.start();
    g.__visibilityStarted = true;
  }
}
function reqContext(req) {
  const [lng, lat] = req.location?.coordinates || [];
  return {
    requestId: String(req._id),
    clientId: String(req.clientId),
    category: req.category,
    location: { lat: Number(lat), lng: Number(lng) },
    budget: req.budget ?? null,
    description: req.description ?? null,
    createdAt: req.createdAt ? new Date(req.createdAt) : /* @__PURE__ */ new Date()
  };
}
async function enqueueDispatch(requestId) {
  await connectMongoose();
  ensureVisibilityStarted();
  const config = await getVisibilityConfig();
  if (!config.enabled) {
    console.log("[Visibility] d\xE9sactiv\xE9 (config.enabled=false) \u2014 dispatch ignor\xE9");
    return false;
  }
  const req = await ServiceRequest_default.findById(requestId).lean();
  if (!req) return false;
  const [lng, lat] = req.location?.coordinates || [];
  if (typeof lat !== "number" || typeof lng !== "number") {
    console.warn("[Visibility] coordonn\xE9es manquantes, dispatch impossible pour", requestId);
    return false;
  }
  await VisibilityDispatch_default.findOneAndUpdate(
    { requestId: new import_mongoose24.default.Types.ObjectId(requestId) },
    {
      $setOnInsert: {
        requestId: new import_mongoose24.default.Types.ObjectId(requestId),
        clientId: String(req.clientId),
        category: req.category,
        location: { lat: Number(lat), lng: Number(lng) },
        status: "active",
        currentStage: -1,
        offersReceived: 0,
        providersNotified: [],
        totalNotified: 0,
        waves: []
      }
    },
    { upsert: true, new: true }
  );
  await getScheduler().schedule({ type: WAVE, requestId, stage: 0, runAt: /* @__PURE__ */ new Date() });
  console.log(`[Visibility] dispatch enqueued req=${requestId} loc=${lat.toFixed(5)},${lng.toFixed(5)} cat=${req.category}`);
  return true;
}
async function runVisibilityWave(task) {
  await connectMongoose();
  const requestId = String(task.requestId);
  const stageIndex = task.stage ?? 0;
  const dispatch = await VisibilityDispatch_default.findOne({ requestId: new import_mongoose24.default.Types.ObjectId(requestId) });
  if (!dispatch || dispatch.status !== "active") return;
  const req = await ServiceRequest_default.findById(requestId).lean();
  if (!req) return;
  const reqStatus = req.status || "created";
  if (!["created", "pending_offers", "broadcasted"].includes(reqStatus)) {
    dispatch.status = "completed";
    dispatch.stopReason = "request_closed";
    dispatch.nextRunAt = void 0;
    await dispatch.save();
    return;
  }
  const config = await getVisibilityConfig();
  if (shouldStopBeforeStage(config, stageIndex, dispatch.offersReceived, dispatch.totalNotified)) {
    dispatch.status = "stopped";
    dispatch.stopReason = dispatch.offersReceived >= (config.escalation[stageIndex]?.minOffersToStop ?? 1) ? "enough_offers" : "enough_providers";
    dispatch.nextRunAt = void 0;
    await dispatch.save();
    console.log(`[Visibility] escalade stopp\xE9e (${dispatch.stopReason}) req=${requestId} stage=${stageIndex}`);
    return;
  }
  const stage = config.escalation[stageIndex];
  if (!stage) return;
  const ctx = reqContext(req);
  const candidates = await getCandidates(dispatch.location, stage.radiusKm, config);
  const { ranked: rankedEligible, reasons } = filterAndRank(candidates, ctx, config);
  if (candidates.length === 0) {
    console.log(`[Visibility] req=${requestId} stage=${stageIndex} radius=${stage.radiusKm}km \u2192 0 candidate (no presence)`);
  } else {
    const ineligible = Object.entries(reasons).map(([id, r]) => `${id}:${r}`).join(", ");
    console.log(`[Visibility] req=${requestId} stage=${stageIndex} radius=${stage.radiusKm}km \u2192 ${candidates.length} candidate(s), ${rankedEligible.length} eligible | ineligible=${ineligible || "none"}`);
  }
  const alreadyNotified = new Set(dispatch.providersNotified);
  const selection = selectStageProviders(config, stageIndex, rankedEligible, alreadyNotified);
  const result = await notifyWave({
    request: ctx,
    stage: selection.stage,
    radiusKm: selection.radiusKm,
    providerIds: selection.providerIds
  });
  const nextIndex = stageIndex + 1;
  const nextStage = config.escalation[nextIndex];
  const nextRunAt = nextStage ? new Date(Date.now() + nextStage.delaySec * 1e3) : void 0;
  dispatch.waves.push({
    stage: result.stage,
    radiusKm: result.radiusKm,
    at: /* @__PURE__ */ new Date(),
    providerIds: result.providerIds,
    socketCount: result.socketCount,
    pushDelivered: result.pushDelivered,
    pushTokenCount: result.pushTokenCount
  });
  for (const id of result.providerIds) {
    if (!dispatch.providersNotified.includes(id)) dispatch.providersNotified.push(id);
  }
  dispatch.totalNotified = dispatch.providersNotified.length;
  dispatch.currentStage = stageIndex;
  dispatch.nextRunAt = nextRunAt;
  await dispatch.save();
  if (nextStage) {
    await getScheduler().schedule({ type: WAVE, requestId, stage: nextIndex, runAt: nextRunAt });
  }
}
async function onOffer(requestId) {
  try {
    await connectMongoose();
    await VisibilityDispatch_default.updateOne(
      { requestId: new import_mongoose24.default.Types.ObjectId(requestId), status: "active" },
      { $inc: { offersReceived: 1 } }
    );
  } catch (err) {
    console.warn("[Visibility] onOffer error:", err?.message);
  }
}
async function closeDispatch(requestId, reason = "closed") {
  try {
    await connectMongoose();
    await getScheduler().cancelForRequest(requestId, [WAVE]);
    await VisibilityDispatch_default.updateOne(
      { requestId: new import_mongoose24.default.Types.ObjectId(requestId), status: "active" },
      { $set: { status: "completed", stopReason: reason, nextRunAt: null } }
    );
  } catch (err) {
    console.warn("[Visibility] closeDispatch error:", err?.message);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  closeDispatch,
  enqueueDispatch,
  ensureVisibilityStarted,
  onOffer,
  runVisibilityWave
});
