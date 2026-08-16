/**
 * Serveur Socket.io personnalisé pour Next.js
 * Phase 2B - Temps Réel
 */

const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')
const { jwtVerify } = require('jose')
const mongoose = require('mongoose')
const geo = require('./lib/redis-geo')

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

// Origines autorisées pour Socket.io en production (apps natives n'envoient pas d'origin)
const DEFAULT_ALLOWED_ORIGINS = 'https://itvisionplus.sn,https://*.itvisionplus.sn,https://staging.itvisionplus.sn,https://*.staging.itvisionplus.sn,http://localhost:3000,http://localhost:8081,http://localhost:8082,http://localhost:8083'
const ALLOWED_ORIGINS = (process.env.ALLOWED_SOCKET_ORIGINS || DEFAULT_ALLOWED_ORIGINS)
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)

function wildcardToRegExp(pattern) {
  // Échappe les caractères spéciaux sauf * qui devient .+
  return new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.+') + '$', 'i')
}

function isAllowedOrigin(origin) {
  if (!origin) return true
  return ALLOWED_ORIGINS.some(allowed => {
    if (allowed === origin) return true
    if (allowed.includes('*')) return wildcardToRegExp(allowed).test(origin)
    return false
  })
}

process.on('unhandledRejection', (reason) => {
  console.error('[UnhandledRejection]', reason)
})

process.on('uncaughtException', (err) => {
  console.error('[UncaughtException]', err)
  process.exit(1)
})

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

// Fonction de vérification du token JWT
async function verifyToken(token) {
  try {
    // Dev mobile tokens statiques (pas un JWT) — acceptés uniquement en dev
    if (process.env.NODE_ENV !== 'production' && process.env.DEV_MOBILE_TOKEN && token === process.env.DEV_MOBILE_TOKEN) {
      console.log('[WS] Dev mobile token accepté (consumer)')
      return { userId: 'dev-mobile-user', role: 'CLIENT', email: 'dev@mobile' }
    }
    if (process.env.NODE_ENV !== 'production' && process.env.DEV_PROVIDER_TOKEN && token === process.env.DEV_PROVIDER_TOKEN) {
      console.log('[WS] Dev provider token accepté')
      return { userId: 'dev-provider-user', role: 'PROVIDER', email: 'dev@provider' }
    }

    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET is required in production')
      }
      console.warn('[SECURITY] JWT_SECRET is missing; using an insecure development fallback. Set JWT_SECRET in your env.')
    }
    const secret = new TextEncoder().encode(jwtSecret || 'dev-insecure-jwt-secret')
    const { payload } = await jwtVerify(token, secret)

    if (!payload.userId) {
      return null
    }

    return {
      userId: payload.userId,
      role: payload.role || 'USER',
      email: payload.email || ''
    }
  } catch (error) {
    console.error('Erreur vérification token:', error.message)
    return null
  }
}

// ── Mongoose (lazy connection for server-side verification) ──
let _mongoConnected = false
async function ensureMongo() {
  if (_mongoConnected) return
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI not set')
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri)
  }
  _mongoConnected = true
}

// Minimal schema — strict:false so it doesn't strip fields written by the full model
// (server.js registers this first, so it becomes the active model for Mongoose)
const ServiceRequestSchema = new mongoose.Schema({
  assignedProviderId: { type: String },
  status: { type: String, default: 'created' },
}, { strict: false, timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } })
const ServiceRequest = mongoose.models.ServiceRequest || mongoose.model('ServiceRequest', ServiceRequestSchema)

// ── GEOFENCING : présence des providers via Redis GEO ──
// Redis GEO commands (GEOADD, GEOSEARCH) for O(log N) spatial queries.
// Fallback: in-memory Map if Redis is unavailable.
// providerPresence Map is kept as a fallback cache for synchronous access.
const providerPresence = new Map() // fallback only
const STALE_POSITION_MS = geo.STALE_POSITION_MS
const EMIT_THROTTLE_MS = 3000 // throttle côté serveur pour limiter les écritures mémoire/batterie

function isStale(pos) {
  return !pos || Date.now() - (pos.updatedAt || 0) > STALE_POSITION_MS
}

// Keep in-memory cache in sync for legacy code that reads providerPresence directly
function updatePresence(userId, patch) {
  const existing = providerPresence.get(userId) || {}
  const now = Date.now()
  providerPresence.set(userId, {
    ...existing,
    ...patch,
    updatedAt: now,
  })
  // Also persist to Redis GEO asynchronously
  if (existing.lat != null && existing.lng != null || patch.lat != null && patch.lng != null) {
    geo.updateProviderPosition(userId, {
      lat: patch.lat != null ? patch.lat : existing.lat,
      lng: patch.lng != null ? patch.lng : existing.lng,
      status: patch.status || existing.status,
      name: patch.name || existing.name,
      email: patch.email || existing.email,
      viewingRequestId: patch.viewingRequestId !== undefined ? patch.viewingRequestId : existing.viewingRequestId,
      missionRequestId: patch.missionRequestId !== undefined ? patch.missionRequestId : existing.missionRequestId,
    }).catch(() => {}) // fire-and-forget
  } else {
    geo.updateProviderMeta(userId, patch).catch(() => {})
  }
}

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('Internal server error')
    }
  })

  // Configuration Socket.io
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (dev || isAllowedOrigin(origin)) return callback(null, true)
        console.warn('[WS] CORS refusé:', origin)
        return callback(new Error('CORS origin not allowed'))
      },
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 5 * 1024 * 1024, // limite la taille des paquets WS
  })

  // Middleware d'authentification Socket.io
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '')
    
    if (!token) {
      console.log('❌ Connexion refusée: pas de token')
      return next(new Error('Authentication error: No token provided'))
    }

    const user = await verifyToken(token)
    
    if (!user) {
      console.log('❌ Connexion refusée: token invalide')
      return next(new Error('Authentication error: Invalid token'))
    }

    // Attacher les infos utilisateur au socket
    socket.user = user
    console.log(`✅ Authentification réussie: ${user.email} (${user.role})`)
    next()
  })

  // Gestion des connexions
  io.on('connection', (socket) => {
    const { userId, email, role } = socket.user

    console.log(`\n🔌 Client connecté: ${email}`)
    console.log(`   Role: ${role}`)
    console.log(`   Socket ID: ${socket.id}`)

    // Rejoindre les rooms personnelles
    socket.join(`user-${userId}`)
    
    if (role === 'CLIENT') {
      socket.join('clients')
    } else if (role === 'ADMIN') {
      socket.join('admins')
    } else if (role === 'TECHNICIAN') {
      socket.join('technicians')
    }

    // ── ROOMS MOBILES ──
    // Consumer s'abonne aux offres d'une demande spécifique
    socket.on('join-request-room', (requestId) => {
      socket.join(`request-${requestId}`)
      console.log(`   📋 ${userId} écoute la demande: ${requestId}`)
    })
    socket.on('leave-request-room', (requestId) => {
      socket.leave(`request-${requestId}`)
    })

    // Provider s'abonne à ses notifications
    socket.on('join-provider-channel', () => {
      socket.join(`provider-${userId}`)
      socket.join('providers-online')
      console.log(`   🔧 Provider en ligne: ${userId}`)
    })
    socket.on('leave-provider-channel', () => {
      socket.leave(`provider-${userId}`)
      socket.leave('providers-online')
      const p = providerPresence.get(userId)
      if (p) {
        p.status = 'offline'
        p.updatedAt = Date.now()
      }
      geo.setProviderOffline(userId).catch(() => {})
    })

    // Provider rejoint une zone géofencée pour recevoir les demandes proches
    // Stocke la position + rayon pour les notifications temps réel
    socket.on('join-nearby-room', (data) => {
      if (!data?.lat || !data?.lng) return
      const radiusKm = Number(data.radiusKm) || 10
      socket.join('nearby-providers')
      socket.nearbyRadius = radiusKm
      updatePresence(userId, {
        lat: data.lat,
        lng: data.lng,
        status: providerPresence.get(userId)?.missionRequestId ? 'on_mission' : (providerPresence.get(userId)?.viewingRequestId ? 'viewing' : 'available'),
      })
      console.log(`   📍 ${userId} a rejoint la zone nearby (${radiusKm}km)`)
    })
    socket.on('leave-nearby-room', () => {
      socket.leave('nearby-providers')
      socket.nearbyRadius = null
      console.log(`   📍 ${userId} a quitté la zone nearby`)
    })

    // Provider envoie sa position GPS globale pour le geofencing
    socket.on('provider:gps', (data) => {
      if (typeof data?.lat !== 'number' || typeof data?.lng !== 'number') {
        console.log(`   ⚠️ ${userId} provider:gps missing lat/lng`)
        return
      }
      const now = Date.now()
      const existing = providerPresence.get(userId)
      if (existing && existing.lastEmitAt && now - existing.lastEmitAt < EMIT_THROTTLE_MS) {
        console.log(`   ⏱️ ${userId} provider:gps throttled`)
        return
      }
      // Le status du payload (available/offline) prime sur l'inférence
      const payloadStatus = data?.status === 'offline' ? 'offline'
        : data?.status === 'available' ? 'available'
        : existing?.missionRequestId ? 'on_mission'
        : (existing?.viewingRequestId ? 'viewing' : 'available')
      updatePresence(userId, {
        lat: data.lat,
        lng: data.lng,
        status: payloadStatus,
        name: data.providerName || email?.split('@')[0] || 'Prestataire',
        email,
        lastEmitAt: now,
      })
      console.log(`   📍 ${userId} provider:gps ${data.lat.toFixed(5)},${data.lng.toFixed(5)} status=${payloadStatus}`)
    })

    // Provider signale son statut de disponibilité (toggle en ligne)
    socket.on('provider:status', (data) => {
      const existing = providerPresence.get(userId)
      const newStatus = data?.status === 'offline' ? 'offline'
        : data?.status === 'available' ? 'available'
        : existing?.missionRequestId ? 'on_mission'
        : (existing?.viewingRequestId ? 'viewing' : 'available')
      updatePresence(userId, { status: newStatus })
      console.log(`   🔧 ${userId} statut → ${newStatus}`)
    })

    // Consumer demande le nombre de prestataires en ligne
    socket.on('get-online-providers', () => {
      const now = Date.now()
      let count = 0
      for (const [, p] of providerPresence.entries()) {
        if (p.status !== 'offline' && now - (p.updatedAt || 0) <= STALE_POSITION_MS) count++
      }
      socket.emit('online-providers-count', { count })
    })

    socket.on('provider:location', async (data) => {
      if (!data?.requestId || typeof data?.lat !== 'number' || typeof data?.lng !== 'number') return
      const now = Date.now()
      const existing = providerPresence.get(userId)
      if (existing && existing.lastEmitAt && now - existing.lastEmitAt < EMIT_THROTTLE_MS) return

      // Vérifier que le provider est bien assigné à cette mission
      try {
        await ensureMongo()
        const sr = await ServiceRequest.findById(data.requestId).select('assignedProviderId status').lean()
        if (!sr || String(sr.assignedProviderId) !== String(userId)) return
        if (!['accepted', 'on_the_way', 'provider_arriving', 'arrived', 'in_progress', 'paused', 'awaiting_validation'].includes(sr.status)) return
      } catch (verifyErr) {
        console.error('[WS] provider:location verification error', verifyErr)
        return
      }

      updatePresence(userId, {
        lat: data.lat,
        lng: data.lng,
        missionRequestId: data.requestId,
        status: 'on_mission',
        name: data.providerName || email?.split('@')[0] || 'Prestataire',
        email,
        lastEmitAt: now,
      })
      socket.to(`request-${data.requestId}`).emit('provider:location', {
        providerId: userId,
        providerName: email?.split('@')[0] || data.providerName || 'Prestataire',
        lat: data.lat,
        lng: data.lng,
        heading: data.heading || null,
        speed: data.speed || null,
        distance: data.distance ?? null,
        eta: data.eta ?? null,
        timestamp: now,
      })
    })

    // Chat mission — rejoindre/quitter la room de chat
    socket.on('join-mission-chat', (requestId) => {
      socket.join(`mission-${requestId}`)
      console.log(`   💬 ${userId} a rejoint le chat mission: ${requestId}`)
    })
    socket.on('leave-mission-chat', (requestId) => {
      socket.leave(`mission-${requestId}`)
    })

    // ── PRESENCE VIEWERS ──
    // Provider signale qu'il consulte une demande → relayé au consumer
    socket.on('request:viewing', (data) => {
      const requestId = typeof data === 'string' ? data : data?.requestId
      if (!requestId) return
      const existing = providerPresence.get(userId)
      updatePresence(userId, {
        lat: data?.lat || existing?.lat || null,
        lng: data?.lng || existing?.lng || null,
        viewingRequestId: requestId,
        status: existing?.missionRequestId ? 'on_mission' : 'viewing',
        name: data?.providerName || email?.split('@')[0] || 'Prestataire',
        email,
      })
      socket.to(`request-${requestId}`).emit('request:viewing', {
        providerId: userId,
        providerName: data?.providerName || email?.split('@')[0] || 'Prestataire',
        lat: data?.lat || existing?.lat || null,
        lng: data?.lng || existing?.lng || null,
        timestamp: Date.now(),
      })
    })
    socket.on('request:stop-viewing', (data) => {
      const requestId = typeof data === 'string' ? data : data?.requestId
      if (!requestId) return
      const existing = providerPresence.get(userId)
      if (existing) {
        existing.viewingRequestId = existing.viewingRequestId === requestId ? null : existing.viewingRequestId
        existing.status = existing.missionRequestId ? 'on_mission' : (existing.viewingRequestId ? 'viewing' : 'available')
        existing.updatedAt = Date.now()
      }
      socket.to(`request-${requestId}`).emit('request:stop-viewing', {
        providerId: userId,
      })
    })

    // Provider est en train de rédiger une offre → notifier le client
    socket.on('offer:typing', (data) => {
      const requestId = data?.requestId
      if (!requestId) return
      socket.to(`request-${requestId}`).emit('offer:typing', {
        requestId,
        providerId: userId,
        providerName: data?.providerName || email?.split('@')[0] || 'Prestataire',
        isTyping: data?.isTyping !== false,
      })
    })

    // Mission status updated relay
    socket.on('mission:status_updated', (data) => {
      const requestId = data?.requestId
      if (!requestId) return
      console.log(`   🔄 mission:status_updated pour ${requestId} → ${data.status}`)
      const payload = {
        requestId,
        status: data.status,
        ...data,
      }
      io.to(`request-${requestId}`).emit('request:status-changed', payload)
      io.to(`request-${requestId}`).emit('mission:status_updated', data)
      // Notifier aussi les écrans liste (qui ne rejoignent pas la room request)
      io.to(`user-${userId}`).emit('request:status-changed', payload)
      if (data.clientId) {
        io.to(`user-${data.clientId}`).emit('request:status-changed', payload)
      }
      if (data.providerId) {
        io.to(`user-${data.providerId}`).emit('request:status-changed', payload)
      }
    })

    // Client typing in mission chat
    socket.on('mission:client_typing', (data) => {
      const requestId = data?.requestId
      if (!requestId) return
      socket.to(`request-${requestId}`).emit('mission:client_typing', data)
    })

    // AI Advice broadcast relay
    socket.on('ai:advice_updated', (data) => {
      const requestId = data?.requestId
      if (!requestId) return
      socket.to(`request-${requestId}`).emit('ai:advice_updated', data)
    })

    // Événement: Rejoindre un projet
    socket.on('join-project', (projectId) => {
      socket.join(`project-${projectId}`)
      console.log(`   📁 ${email} a rejoint le projet: ${projectId}`)
      
      // Notifier les autres membres du projet
      socket.to(`project-${projectId}`).emit('user-joined-project', {
        userId,
        email,
        projectId,
        timestamp: new Date()
      })
    })

    // Événement: Quitter un projet
    socket.on('leave-project', (projectId) => {
      socket.leave(`project-${projectId}`)
      console.log(`   📁 ${email} a quitté le projet: ${projectId}`)
    })

    // Événement: Rejoindre un ticket
    socket.on('join-ticket', (ticketId) => {
      socket.join(`ticket-${ticketId}`)
      console.log(`   🎫 ${email} a rejoint le ticket: ${ticketId}`)
    })

    // Événement: Quitter un ticket
    socket.on('leave-ticket', (ticketId) => {
      socket.leave(`ticket-${ticketId}`)
      console.log(`   🎫 ${email} a quitté le ticket: ${ticketId}`)
    })

    // Événement: En train d'écrire (typing indicator)
    socket.on('typing-start', ({ ticketId, userName }) => {
      socket.to(`ticket-${ticketId}`).emit('user-typing', {
        ticketId,
        userId,
        userName: userName || email,
        isTyping: true
      })
    })

    socket.on('typing-stop', ({ ticketId }) => {
      socket.to(`ticket-${ticketId}`).emit('user-typing', {
        ticketId,
        userId,
        isTyping: false
      })
    })

    // Événement: Message de chat en direct
    socket.on('send-message', ({ ticketId, message }) => {
      const messageData = {
        ticketId,
        message,
        authorId: userId,
        authorEmail: email,
        authorRole: role,
        timestamp: new Date()
      }
      
      // Envoyer à tous dans la room du ticket (sauf l'émetteur)
      socket.to(`ticket-${ticketId}`).emit('new-message', messageData)
      
      console.log(`   💬 Message envoyé dans ticket ${ticketId}`)
    })

    // Événement: Heartbeat / Presence
    socket.on('heartbeat', () => {
      socket.emit('heartbeat-ack', { timestamp: new Date() })
    })

    // Événement: Demande de mise à jour des données
    socket.on('request-update', ({ type, id }) => {
      console.log(`   🔄 Demande de mise à jour: ${type} ${id}`)
      socket.emit('update-requested', { type, id, timestamp: new Date() })
    })

    // Déconnexion
    socket.on('disconnect', (reason) => {
      console.log(`\n❌ Client déconnecté: ${email}`)
      console.log(`   Raison: ${reason}`)
      console.log(`   Socket ID: ${socket.id}`)
      // On ne supprime pas immédiatement : permettre un "online/offline" progressif
      // et éviter de perdre la position si reconnect rapide (30-60s).
      // Le cleanup interval supprime les entrées périmées.
      if (role !== 'CLIENT' && role !== 'ADMIN') {
        const p = providerPresence.get(userId)
        if (p) {
          p.status = 'offline'
          p.updatedAt = Date.now()
        }
      }
    })

    // Erreurs
    socket.on('error', (error) => {
      console.error(`❌ Erreur socket pour ${email}:`, error)
    })

    // Envoyer un message de bienvenue
    socket.emit('connected', {
      message: 'Connexion temps réel établie',
      userId,
      email,
      role,
      timestamp: new Date()
    })
  })

  // Periodic cleanup of stale provider positions (every 10 min)
  const cleanupInterval = setInterval(async () => {
    // In-memory cleanup
    const now = Date.now()
    let cleaned = 0
    for (const [id, pos] of providerPresence.entries()) {
      if (now - pos.updatedAt > STALE_POSITION_MS) {
        providerPresence.delete(id)
        cleaned++
      }
    }
    if (cleaned > 0) console.log(`[GF] Cleaned ${cleaned} stale provider position(s) [memory]`)
    // Redis cleanup
    await geo.cleanupStale()
  }, STALE_POSITION_MS)

  // Exposer io et la présence provider globalement pour pouvoir l'utiliser dans les API routes
  global.io = io
  global.providerPresence = providerPresence
  global.geo = geo

  /**
   * ADAPTATEUR LEGACY — délègue au Visibility Engine.
   *
   * Ancien appel direct socket+push → désormais géré par le Visibility Scheduler
   * (vagues d'escalade, ranking, dédup). Cette fonction reste pour la compat
   * ascendante (autres appelants éventuels) mais redirige vers enqueueDispatch.
   */
  global.notifyNearbyProviders = async function (requestData, radiusKm = 10) {
    const { requestId } = requestData
    if (!requestId) return 0
    try {
      const { enqueueDispatch } = require('./src/lib/visibility/dispatch')
      await enqueueDispatch(String(requestId))
      return 1
    } catch (err) {
      console.error('[GF] notifyNearbyProviders (legacy adapter) error:', err.message)
      return 0
    }
  }

  // Démarrer le serveur
  httpServer
    .once('error', (err) => {
      console.error('❌ Erreur serveur:', err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log('\n' + '='.repeat(70))
      console.log('🚀 SERVEUR TEMPS RÉEL DÉMARRÉ')
      console.log('='.repeat(70))
      console.log(`📡 Next.js: http://${hostname}:${port}`)
      console.log(`🔌 Socket.io: ws://${hostname}:${port}`)
      console.log(`🌍 Environnement: ${dev ? 'development' : 'production'}`)
      console.log('='.repeat(70) + '\n')
    })

  // Arrêt gracieux pour éviter les connexions orphelines et les fuites d'interval
  function gracefulShutdown(signal) {
    console.log(`\n${signal} reçu — arrêt gracieux…`)
    if (cleanupInterval) clearInterval(cleanupInterval)
    io.close()
    httpServer.close(() => {
      console.log('✅ Serveur arrêté proprement')
      process.exit(0)
    })
    // Forçage au bout de 10s
    setTimeout(() => {
      console.error('❌ Forçage de l\'arrêt')
      process.exit(1)
    }, 10000).unref()
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
  process.on('SIGINT', () => gracefulShutdown('SIGINT'))
})





