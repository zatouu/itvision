# 🔌 Portail Client - Phase 2B : Temps Réel avec Socket.io

## 🎯 Vue d'ensemble

La **Phase 2B** ajoute des fonctionnalités **temps réel** au portail client en utilisant **Socket.io**. Les clients reçoivent maintenant des mises à jour instantanées sans recharger la page.

---

## ✨ Fonctionnalités Implémentées

### 1. 🔌 **Serveur Socket.io Personnalisé**
**Fichier**: `server.js`

Serveur Node.js personnalisé qui :
- ✅ Remplace `next dev` pour ajouter Socket.io
- ✅ Authentification JWT automatique
- ✅ Gestion des rooms (utilisateurs, projets, tickets)
- ✅ Reconnexion automatique
- ✅ Heartbeat / keep-alive

**Événements serveur** :
- `connection` - Nouvelle connexion
- `join-project` - Rejoindre un projet
- `join-ticket` - Rejoindre un ticket
- `typing-start/stop` - Indicateur d'écriture
- `send-message` - Message de chat
- `disconnect` - Déconnexion

---

### 2. 📡 **Client Socket.io**
**Fichier**: `src/lib/socket-client.ts`

Bibliothèque client TypeScript pour :
- ✅ Connexion automatique avec token JWT
- ✅ Gestion des événements
- ✅ Helpers pour rejoindre/quitter des rooms
- ✅ Indicateurs d'écriture
- ✅ Reconnexion automatique

**Fonctions principales** :
```typescript
initSocket(token)          // Initialiser la connexion
joinProject(projectId)     // Rejoindre un projet
joinTicket(ticketId)       // Rejoindre un ticket
startTyping(ticketId)      // Commencer à écrire
sendMessage(ticketId, msg) // Envoyer un message
onProjectUpdate(callback)  // Écouter les mises à jour
onNewMessage(callback)     // Écouter les messages
```

---

### 3. 🔥 **Émetteurs d'événements (API)**
**Fichier**: `src/lib/socket-emit.ts`

Helpers pour émettre des événements depuis les API routes :

```typescript
emitProjectUpdate(projectId, { progress, status })
emitTicketUpdate(ticketId, { status, priority })
emitNewMessage(ticketId, message)
emitUserNotification(userId, notification)
emitDocumentAdded(projectId, document)
```

---

### 4. 🔔 **Notifications Toast**
**Package**: `react-hot-toast`

Notifications élégantes pour :
- ✅ Mise à jour de projet
- ✅ Nouveau message
- ✅ Document ajouté
- ✅ Intervention terminée
- ✅ Changement de statut

---

## 🚀 Démarrage

### **1. Installer les dépendances** ✅
```bash
npm install socket.io socket.io-client react-hot-toast
```

### **2. Démarrer le serveur avec Socket.io**
```bash
npm run dev
```

Au lieu de `next dev`, cela lance maintenant `node server.js` qui inclut Socket.io.

### **3. Le serveur démarre sur**
```
📡 Next.js: http://localhost:3000
🔌 Socket.io: ws://localhost:3000
```

---

## 💻 Utilisation dans le Code

### **Côté Client (React)**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { 
  initSocket, 
  joinProject, 
  onProjectUpdate, 
  disconnectSocket 
} from '@/lib/socket-client'
import toast, { Toaster } from 'react-hot-toast'

export default function MyComponent() {
  const [projectProgress, setProjectProgress] = useState(0)

  useEffect(() => {
    // 1. Initialiser Socket.io avec le token
    const token = 'votre-jwt-token'
    const socket = initSocket(token)

    // 2. Rejoindre un projet
    joinProject('project-id-123')

    // 3. Écouter les mises à jour
    const cleanup = onProjectUpdate((data) => {
      console.log('📡 Projet mis à jour:', data)
      setProjectProgress(data.progress)
      
      // Afficher une notification
      toast.success(`Progression: ${data.progress}%`)
    })

    // 4. Nettoyage
    return () => {
      cleanup()
      disconnectSocket()
    }
  }, [])

  return (
    <div>
      <Toaster position="top-right" />
      <p>Progression: {projectProgress}%</p>
    </div>
  )
}
```

---

### **Côté Serveur (API Route)**

```typescript
// src/app/api/projects/[id]/route.ts
import { emitProjectUpdate, emitUserNotification } from '@/lib/socket-emit'

export async function PATCH(request: NextRequest, context: any) {
  const { id } = await context.params
  const body = await request.json()
  
  // Mettre à jour le projet dans MongoDB
  const project = await Project.findByIdAndUpdate(id, {
    progress: body.progress
  }, { new: true })

  // 🔥 ÉMETTRE L'ÉVÉNEMENT TEMPS RÉEL
  emitProjectUpdate(id, {
    progress: project.progress,
    status: project.status
  })

  // Notifier le client
  emitUserNotification(project.clientId, {
    type: 'success',
    title: 'Projet mis à jour',
    message: `${project.name} - ${project.progress}% complété`
  })

  return NextResponse.json({ success: true, project })
}
```

---

## 📋 Événements Disponibles

### **Événements Client → Serveur**

| Événement | Paramètres | Description |
|-----------|------------|-------------|
| `join-project` | `projectId` | Rejoindre un projet |
| `leave-project` | `projectId` | Quitter un projet |
| `join-ticket` | `ticketId` | Rejoindre un ticket |
| `leave-ticket` | `ticketId` | Quitter un ticket |
| `typing-start` | `{ ticketId, userName }` | Commencer à écrire |
| `typing-stop` | `{ ticketId }` | Arrêter d'écrire |
| `send-message` | `{ ticketId, message }` | Envoyer un message |
| `heartbeat` | - | Ping keep-alive |

---

### **Événements Serveur → Client**

| Événement | Payload | Description |
|-----------|---------|-------------|
| `connected` | `{ userId, email, role }` | Confirmation de connexion |
| `project-updated` | `{ projectId, progress, status }` | Projet mis à jour |
| `ticket-updated` | `{ ticketId, status, priority }` | Ticket mis à jour |
| `new-message` | `{ ticketId, message, author }` | Nouveau message |
| `user-typing` | `{ ticketId, userId, isTyping }` | Indicateur d'écriture |
| `notification` | `{ type, title, message }` | Notification push |
| `document-added` | `{ projectId, document }` | Document ajouté |
| `intervention-updated` | `{ projectId, intervention }` | Intervention mise à jour |
| `quote-updated` | `{ quoteId, status }` | Devis mis à jour |

---

## 🔐 Authentification

Socket.io utilise l'authentification JWT :

```typescript
// Le token est vérifié à chaque connexion
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token
  const user = await verifyToken(token)
  
  if (!user) {
    return next(new Error('Authentication error'))
  }
  
  socket.user = user
  next()
})
```

Les informations utilisateur sont attachées à chaque socket :
- `socket.user.userId`
- `socket.user.email`
- `socket.user.role`

---

## 🏠 Rooms / Namespaces

### **Rooms automatiques** :
- `user-{userId}` - Room personnelle
- `project-{projectId}` - Tous les membres d'un projet
- `ticket-{ticketId}` - Tous les participants d'un ticket
- `clients` - Tous les clients
- `admins` - Tous les admins
- `technicians` - Tous les techniciens

### **Utilisation** :
```typescript
// Envoyer à un utilisateur spécifique
io.to(`user-${userId}`).emit('notification', data)

// Envoyer à tous les membres d'un projet
io.to(`project-${projectId}`).emit('project-updated', data)

// Diffuser à tous les clients
io.to('clients').emit('announcement', data)
```

---

## 🎨 Notifications Toast

### **Types de notifications** :
```typescript
import toast from 'react-hot-toast'

// Succès
toast.success('Projet mis à jour !')

// Erreur
toast.error('Échec de la connexion')

// Info
toast('Nouveau message reçu')

// Warning
toast('Attention : délai dépassé', { icon: '⚠️' })

// Personnalisé
toast.custom((t) => (
  <div className="bg-emerald-500 text-white px-4 py-2 rounded-xl">
    Notification personnalisée
  </div>
))
```

### **Options** :
```typescript
toast.success('Message', {
  duration: 4000,
  position: 'top-right',
  icon: '🎉',
  style: {
    background: '#10b981',
    color: '#fff',
  }
})
```

---

## 📊 Exemple Complet : Chat Temps Réel

```tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { 
  initSocket, 
  joinTicket, 
  sendMessage, 
  onNewMessage,
  startTyping,
  stopTyping,
  onUserTyping
} from '@/lib/socket-client'

export default function ChatTicket({ ticketId }: { ticketId: string }) {
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [userTyping, setUserTyping] = useState<string | null>(null)
  const typingTimeout = useRef<NodeJS.Timeout>()

  useEffect(() => {
    const token = localStorage.getItem('auth-token')
    if (!token) return

    initSocket(token)
    joinTicket(ticketId)

    // Écouter les nouveaux messages
    const cleanupMessages = onNewMessage((data) => {
      if (data.ticketId === ticketId) {
        setMessages(prev => [...prev, data])
      }
    })

    // Écouter l'indicateur d'écriture
    const cleanupTyping = onUserTyping((data) => {
      if (data.ticketId === ticketId) {
        setUserTyping(data.isTyping ? data.userName : null)
      }
    })

    return () => {
      cleanupMessages()
      cleanupTyping()
    }
  }, [ticketId])

  const handleTyping = () => {
    startTyping(ticketId)
    
    // Arrêter après 2 secondes d'inactivité
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current)
    }
    
    typingTimeout.current = setTimeout(() => {
      stopTyping(ticketId)
    }, 2000)
  }

  const handleSend = () => {
    if (!newMessage.trim()) return
    
    sendMessage(ticketId, newMessage)
    setNewMessage('')
    stopTyping(ticketId)
  }

  return (
    <div>
      {/* Messages */}
      <div className="space-y-2">
        {messages.map((msg, idx) => (
          <div key={idx} className="p-3 bg-gray-100 rounded-lg">
            <div className="font-semibold">{msg.authorEmail}</div>
            <div>{msg.message}</div>
          </div>
        ))}
      </div>

      {/* Indicateur d'écriture */}
      {userTyping && (
        <div className="text-sm text-gray-500 italic">
          {userTyping} est en train d'écrire...
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 mt-4">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value)
            handleTyping()
          }}
          className="flex-1 px-4 py-2 border rounded-lg"
          placeholder="Écrivez votre message..."
        />
        <button
          onClick={handleSend}
          className="px-6 py-2 bg-emerald-500 text-white rounded-lg"
        >
          Envoyer
        </button>
      </div>
    </div>
  )
}
```

---

## 🔧 Débogage

### **Logs serveur** :
Le serveur Socket.io affiche des logs détaillés :
```
🔌 Client connecté: client@itvision.sn
   Role: CLIENT
   Socket ID: abc123

📁 client@itvision.sn a rejoint le projet: 691e25ee...
📡 Événement émis: project-updated pour 691e25ee...
```

### **Logs client** :
```javascript
// Activer les logs Socket.io
localStorage.setItem('debug', 'socket.io-client:*')
```

### **Vérifier la connexion** :
```typescript
import { isConnected, getSocket } from '@/lib/socket-client'

console.log('Connecté:', isConnected())
console.log('Socket ID:', getSocket()?.id)
```

---

## 🚀 Prochaines Étapes (Phase 2C)

- [ ] Synchronisation multi-onglets
- [ ] Mode hors ligne avec queue
- [ ] Compression des messages
- [ ] Redis Pub/Sub pour scalabilité
- [ ] Métriques de performance
- [ ] Rate limiting par utilisateur

---

## 📝 Notes Techniques

### **Performance** :
- ✅ Reconnexion automatique (max 5 tentatives)
- ✅ Heartbeat toutes les 25 secondes
- ✅ Timeout de 60 secondes
- ✅ Transport optimal (WebSocket > polling)

### **Sécurité** :
- ✅ Authentification JWT obligatoire
- ✅ Vérification des permissions par room
- ✅ CORS configuré
- ✅ Rate limiting possible (à implémenter)

### **Scalabilité** :
- ✅ 1 serveur = ~10K connexions simultanées
- 🔄 Ajouter Redis Pub/Sub pour > 10K
- 🔄 Load balancing avec sticky sessions

---

## ✅ Checklist d'Intégration

### **Serveur** ✅
- [x] Socket.io installé
- [x] Serveur personnalisé (`server.js`)
- [x] Authentification JWT
- [x] Gestion des rooms
- [x] Événements de base

### **Client** ✅
- [x] `socket-client.ts` créé
- [x] Helpers d'événements
- [x] Gestion de la reconnexion
- [x] react-hot-toast installé

### **API** ✅
- [x] `socket-emit.ts` créé
- [x] Exemple d'API route
- [x] Helpers d'émission

### **À Faire** 🔜
- [ ] Intégrer dans `ModernClientPortal`
- [ ] Ajouter sons de notification
- [ ] Implémenter dans `TicketChatModal`
- [ ] Tests E2E
- [ ] Documentation utilisateur

---

## 🎉 Résumé

La **Phase 2B** transforme le portail en une **application temps réel** :
- 🔌 **Connexion WebSocket** persistante
- 📡 **Mises à jour instantanées** des projets, tickets, documents
- 💬 **Chat en direct** avec indicateur d'écriture
- 🔔 **Notifications push** élégantes
- 🔄 **Reconnexion automatique** robuste

**Le portail est maintenant interactif et réactif !** 🚀

---

**Date de complétion** : 19 novembre 2025  
**Version Socket.io** : 4.8.1  
**Statut** : ✅ **INFRASTRUCTURE COMPLÉTÉE**  
**Prochaine étape** : Intégration UI dans le portail client





