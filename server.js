/**
 * Serveur Socket.io personnalisé pour Next.js
 * Phase 2B - Temps Réel
 */

const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')
const { jwtVerify } = require('jose')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

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

// ── GEOFENCING : positions des providers en mémoire ──
const providerPositions = new Map() // userId → { lat, lng, updatedAt }
const STALE_POSITION_MS = 10 * 60 * 1000 // 10 min sans update = considéré stale

/**
 * Haversine distance between two points in km
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
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
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
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
      providerPositions.delete(userId)
    })

    // Provider envoie sa position GPS pour le geofencing
    socket.on('provider:gps', (data) => {
      if (!data?.lat || !data?.lng) return
      providerPositions.set(userId, { lat: data.lat, lng: data.lng, updatedAt: Date.now() })
    })

    socket.on('provider:location', (data) => {
      if (!data?.requestId || !data?.lat || !data?.lng) return
      socket.to(`request-${data.requestId}`).emit('provider:location', {
        lat: data.lat,
        lng: data.lng,
        heading: data.heading || null,
        speed: data.speed || null,
        timestamp: Date.now(),
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
  setInterval(() => {
    const now = Date.now()
    let cleaned = 0
    for (const [id, pos] of providerPositions.entries()) {
      if (now - pos.updatedAt > STALE_POSITION_MS) {
        providerPositions.delete(id)
        cleaned++
      }
    }
    if (cleaned > 0) console.log(`[GF] Cleaned ${cleaned} stale provider position(s)`)
  }, STALE_POSITION_MS)

  // Exposer io globalement pour pouvoir l'utiliser dans les API routes
  global.io = io

  /**
   * Notify only providers within radiusKm of the request location.
   * Fallback broadcast only when NO provider has ever reported a position.
   */
  global.notifyNearbyProviders = function (requestData, radiusKm = 10) {
    const { lng, lat, requestId } = requestData
    if (!lng || !lat || !requestId) return 0
    const now = Date.now()
    let notified = 0
    let inRadius = 0
    for (const [providerId, pos] of providerPositions.entries()) {
      const dist = haversineKm(lat, lng, pos.lat, pos.lng)
      if (dist <= radiusKm) inRadius++
      if (now - pos.updatedAt > STALE_POSITION_MS) continue
      if (dist <= radiusKm) {
        io.to(`provider-${providerId}`).emit('request:nearby', requestData)
        notified++
      }
    }
    // Fallback: broadcast ONLY if zero providers have ever reported a position.
    // If providers exist but all positions are stale, do NOT broadcast —
    // they will re-emit positions on next heartbeat and start receiving again.
    if (notified === 0 && providerPositions.size === 0) {
      console.log(`[GF] No provider positions known — broadcasting request ${requestId} to all online providers`)
      io.to('providers-online').emit('request:nearby', requestData)
      return 'broadcast'
    }
    console.log(`[GF] Notified ${notified}/${inRadius} providers within ${radiusKm}km for request ${requestId} (total tracked: ${providerPositions.size})`)
    return notified
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
})





