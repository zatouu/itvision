# 🧪 Guide de Test - Socket.io Temps Réel

## ✅ Ce qui a été fait

### **1. Infrastructure Socket.io** 🔌
- ✅ Serveur Socket.io personnalisé (`server.js`)
- ✅ Authentification JWT automatique
- ✅ Client Socket.io TypeScript (`src/lib/socket-client.ts`)
- ✅ Émetteurs d'événements (`src/lib/socket-emit.ts`)
- ✅ React Hot Toast pour notifications

### **2. Scripts npm mis à jour** 📦
```json
{
  "dev": "node server.js",          // ← Avec Socket.io
  "dev:turbo": "next dev --turbopack", // ← Sans Socket.io
  "start": "NODE_ENV=production node server.js"
}
```

---

## 🚀 Test Rapide

### **1. Vérifier que le serveur démarre**

```bash
npm run dev
```

**Vous devriez voir** :
```
======================================================================
🚀 SERVEUR TEMPS RÉEL DÉMARRÉ
======================================================================
📡 Next.js: http://localhost:3000
🔌 Socket.io: ws://localhost:3000
🌍 Environnement: development
======================================================================
```

---

### **2. Tester la connexion Socket.io**

#### **Option A : Console navigateur (Quick Test)**

1. Ouvrez http://localhost:3000
2. Ouvrez la console (F12)
3. Collez ce code :

```javascript
// 1. Créer une connexion Socket.io
const socket = io('http://localhost:3000', {
  auth: { token: 'VOTRE-JWT-TOKEN' },
  transports: ['websocket', 'polling']
})

// 2. Écouter les événements
socket.on('connect', () => {
  console.log('✅ Connecté !', socket.id)
})

socket.on('connected', (data) => {
  console.log('✅ Authentifié:', data)
})

socket.on('connect_error', (error) => {
  console.error('❌ Erreur:', error.message)
})

// 3. Rejoindre un projet (exemple)
socket.emit('join-project', '691e25ee89bb10e50d7e9f1a')

// 4. Écouter les mises à jour
socket.on('project-updated', (data) => {
  console.log('📡 Projet mis à jour:', data)
})
```

---

#### **Option B : Test avec `client@itvision.sn`**

1. **Se connecter** :
   - Email : `client@itvision.sn`
   - Mot de passe : (celui configuré)

2. **Aller sur le portail** :
   - http://localhost:3000/client-portal

3. **Ouvrir la console** (F12) et regarder :
```
✅ Socket.io connecté: abc123
✅ Authentification réussie: client@itvision.sn
```

---

### **3. Tester l'émission d'événements (API)**

#### **A. Depuis le terminal** :

```bash
# Utiliser curl pour mettre à jour un projet
curl -X PATCH http://localhost:3000/api/projects/[id]/update-realtime \
  -H "Content-Type: application/json" \
  -d '{"progress": 75, "status": "in_progress"}'
```

#### **B. Depuis la console navigateur** :

```javascript
// Simuler une mise à jour de projet
fetch('/api/projects/691e25ee89bb10e50d7e9f1a/update-realtime', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    progress: 85,
    status: 'in_progress'
  })
})
```

**Résultat attendu** :
- Console serveur : `📡 Événement émis: project-updated pour 691e25ee...`
- Console client : `📡 Projet mis à jour: { progress: 85, ... }`

---

### **4. Tester le chat en direct**

```javascript
// Dans la console navigateur

// 1. Rejoindre un ticket
socket.emit('join-ticket', 'TICKET_ID_123')

// 2. Écouter les nouveaux messages
socket.on('new-message', (data) => {
  console.log('💬 Nouveau message:', data)
})

// 3. Envoyer un message
socket.emit('send-message', {
  ticketId: 'TICKET_ID_123',
  message: 'Hello from Socket.io!'
})

// 4. Tester l'indicateur d'écriture
socket.emit('typing-start', {
  ticketId: 'TICKET_ID_123',
  userName: 'Client IT Vision'
})

// Écouter
socket.on('user-typing', (data) => {
  console.log('✍️ En train d\'écrire:', data)
})
```

---

## 🔍 Vérifications

### **✅ Checklist**

| Test | Commande/Action | Résultat attendu |
|------|-----------------|------------------|
| Serveur démarre | `npm run dev` | Message "🚀 SERVEUR TEMPS RÉEL DÉMARRÉ" |
| Connexion Socket.io | Ouvrir console | "✅ Socket.io connecté" |
| Authentification | Token valide | "✅ Authentification réussie" |
| Rejoindre un projet | `socket.emit('join-project', id)` | Log serveur "📁 a rejoint le projet" |
| Mise à jour temps réel | API PATCH | Événement `project-updated` reçu |
| Chat | `send-message` | Événement `new-message` reçu |
| Typing indicator | `typing-start` | Événement `user-typing` reçu |
| Reconnexion | Déconnecter/reconnecter | Reconnexion automatique |

---

## 🐛 Troubleshooting

### **Erreur : `Authentication error`**
**Cause** : Token JWT invalide ou expiré

**Solution** :
```javascript
// Récupérer un nouveau token
const token = localStorage.getItem('auth-token')
console.log('Token:', token)

// Ou se reconnecter
// http://localhost:3000/login
```

---

### **Erreur : `Connection timeout`**
**Cause** : Serveur Socket.io non démarré

**Solution** :
```bash
# Vérifier que le serveur tourne
npm run dev

# Vérifier les logs
# Devrait afficher "🚀 SERVEUR TEMPS RÉEL DÉMARRÉ"
```

---

### **Erreur : `CORS policy`**
**Cause** : Configuration CORS Socket.io

**Solution** :
Le serveur est déjà configuré pour accepter `http://localhost:3000`.
Si vous utilisez un autre port, modifiez `server.js` :
```javascript
cors: {
  origin: 'http://localhost:VOTRE_PORT',
  methods: ['GET', 'POST']
}
```

---

### **Pas d'événements reçus**
**Cause** : Pas rejoint la bonne room

**Solution** :
```javascript
// Toujours rejoindre avant d'écouter
socket.emit('join-project', projectId)

// Puis écouter
socket.on('project-updated', (data) => {
  console.log('Reçu:', data)
})
```

---

## 📊 Logs à surveiller

### **Serveur (`server.js`)** :
```
🔌 Client connecté: client@itvision.sn
   Role: CLIENT
   Socket ID: abc123

📁 client@itvision.sn a rejoint le projet: 691e25ee...

📡 Événement émis: project-updated pour 691e25ee...

❌ Client déconnecté: client@itvision.sn
   Raison: client namespace disconnect
```

### **Client (console navigateur)** :
```
✅ Socket.io connecté: abc123
✅ Authentification réussie: client@itvision.sn
📡 Projet mis à jour: { progress: 85, ... }
💬 Nouveau message: { ticketId: '123', message: '...' }
```

---

## 🎯 Prochaine Étape

Une fois les tests validés, nous allons :

1. **Intégrer Socket.io dans `ModernClientPortal`** 
   - Connexion automatique au login
   - Écoute des événements sur le dashboard
   - Notifications toast en temps réel

2. **Améliorer `TicketChatModal`**
   - Chat temps réel
   - Indicateur "en train d'écrire..."
   - Sons de notification

3. **Ajouter des animations**
   - Badge "LIVE" clignotant
   - Compteurs animés
   - Transitions fluides

---

## 📝 Notes

- Le serveur Socket.io écoute sur le **même port** que Next.js (3000)
- Les transports sont : **WebSocket** (prioritaire) et **polling** (fallback)
- La reconnexion est **automatique** (max 5 tentatives)
- L'authentification est **obligatoire** (JWT)

---

**Statut actuel** : ✅ **INFRASTRUCTURE PRÊTE**  
**Prochaine étape** : 🎨 **INTÉGRATION UI**

---

**Besoin d'aide ?**
- Vérifiez les logs serveur
- Activez le debug Socket.io : `localStorage.setItem('debug', 'socket.io-client:*')`
- Consultez `PORTAIL_CLIENT_PHASE2B.md` pour la documentation complète





