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
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key')
    const { payload } = await jwtVerify(token, secret)
    
    if (!payload.userId || !payload.role || !payload.email) {
      return null
    }
    
    return {
      userId: payload.userId,
      role: payload.role,
      email: payload.email
    }
  } catch (error) {
    console.error('Erreur vérification token:', error.message)
    return null
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
      origin: process.env.NEXT_PUBLIC_URL || `http://localhost:${port}`,
      methods: ['GET', 'POST'],
      credentials: true
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

  // Exposer io globalement pour pouvoir l'utiliser dans les API routes
  global.io = io

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





