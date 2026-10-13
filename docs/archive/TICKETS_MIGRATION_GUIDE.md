# Guide de Migration et Gestion des Tickets

## 🎯 Problème Résolu

Les tickets avaient des **catégories et statuts incohérents** entre :
- L'API client (`/api/client/tickets`)
- L'API admin (`/api/tickets`)
- Le modèle Mongoose (`Ticket.ts`)

Cela causait des erreurs de validation lors de la sauvegarde des tickets existants.

---

## ✅ Solution Implémentée

### 1. **Schéma Unifié** (`src/lib/models/Ticket.ts`)

#### Catégories Acceptées
```typescript
category: 'incident' | 'request' | 'change' | 'general' | 'technical' | 'billing' | 'urgent'
```

**Mapping Logique :**
- `incident` : Problème technique, panne, bug
- `request` : Demande de service, information
- `change` : Demande de changement/évolution
- `general` → mappé vers `request` (compatible ancien système)
- `technical` → mappé vers `incident`
- `billing` → mappé vers `request`
- `urgent` → mappé vers `incident`

#### Statuts Acceptés
```typescript
status: 'open' | 'in_progress' | 'waiting_client' | 'resolved' | 'closed' | 'waiting'
```

**Note :** `'waiting'` est un alias de `'waiting_client'`

---

### 2. **Script de Migration**

Le script `scripts/migrate-tickets.js` normalise les tickets existants.

#### Exécution

```bash
# Avec la variable d'environnement
MONGODB_URI="mongodb://localhost:27017/itvision_db" node scripts/migrate-tickets.js

# Ou avec .env
node scripts/migrate-tickets.js
```

#### Actions du Script

1. ✅ Convertit les catégories obsolètes :
   - `'general'` → `'request'`
   - `'technical'` → `'incident'`
   - `'billing'` → `'request'`
   - `'urgent'` → `'incident'`

2. ✅ Normalise les statuts :
   - `'waiting'` → `'waiting_client'`

3. ✅ Initialise les champs requis :
   - `messages: []`
   - `history: []`
   - `assignedTo: []`
   - `watchers: []`
   - `tags: []`

4. ✅ Affiche des statistiques détaillées

---

### 3. **API Unifiée**

#### `/api/client/tickets` (Portail Client)

**GET** - Liste des tickets du client
```typescript
// Filtres disponibles
?status=open|in_progress|waiting_client|resolved|closed
?category=incident|request|change
```

**POST** - Créer un ticket
```json
{
  "title": "Problème de connexion",
  "description": "Description détaillée...",
  "category": "technical",  // Sera mappé vers 'incident'
  "priority": "high",
  "projectId": "optional-project-id"  // Optionnel
}
```

**Comportement :**
- Si `projectId` non fourni, cherche automatiquement un projet du client
- Catégorie mappée automatiquement vers le schéma unifié
- Crée automatiquement message initial et history

#### `/api/tickets` (Admin/Technicien)

**GET** - Liste globale avec filtres avancés
```typescript
?clientId=...&projectId=...&status=...&priority=...
&assignedTo=...&search=...&limit=20&skip=0
```

**POST** - Créer un ticket (admin)
```json
{
  "title": "Titre",
  "category": "incident",
  "priority": "high",
  "clientId": "id-client",
  "projectId": "id-projet",
  "message": "Message initial",
  "assignedTo": ["id-tech1", "id-tech2"],
  "tags": ["urgent", "vip"]
}
```

**PATCH** - Mettre à jour un ticket
```json
{
  "id": "ticket-id",
  "status": "in_progress",
  "priority": "urgent",
  "assignedTo": ["new-tech-id"],
  "addMessage": "Pris en charge",
  "internalNote": "Note interne",
  "tags": ["tag1", "tag2"]
}
```

#### `/api/tickets/[id]` (Détails & Messages)

**GET** - Détails complets d'un ticket

**POST** - Ajouter un message
```json
{
  "message": "Voici ma réponse",
  "attachments": [
    { "name": "fichier.pdf", "url": "/uploads/..." }
  ],
  "internal": false  // true pour note interne
}
```

---

## 🔄 Flux de Données

### Création de Ticket (Client)

```
1. Client remplit formulaire (portail)
   ↓
2. POST /api/client/tickets
   - Validation des champs
   - Mapping catégorie (technical → incident)
   - Recherche projet automatique si nécessaire
   - Initialisation messages/history/sla
   ↓
3. Sauvegarde en base
   ↓
4. Retour ticket créé avec ticketNumber
```

### Ajout de Message

```
1. Utilisateur poste un message
   ↓
2. POST /api/tickets/[id]
   - Vérification accès
   - Appel TicketService.appendMessage()
     • Initialise messages[] si undefined
     • Initialise history[] si undefined
     • Ajoute message avec authorId/authorRole
     • Ajoute entrée dans history
   ↓
3. ticket.save()
   ↓
4. Validation Mongoose ✅ (plus d'erreur)
```

---

## 🛠️ Service Tickets (`src/lib/services/tickets.ts`)

### Méthodes Principales

#### `TicketService.canAccess(role, userId, ticket)`
Vérifie les permissions d'accès :
- `CLIENT` : uniquement ses tickets
- `TECHNICIAN` : tickets assignés ou watched
- `ADMIN` : tous les tickets

#### `TicketService.appendMessage(ticket, message, statusSnapshot?)`
Ajoute un message au ticket :
```typescript
appendMessage(ticket, {
  authorId: new mongoose.Types.ObjectId(userId),
  authorRole: 'CLIENT' | 'TECHNICIAN' | 'ADMIN',
  message: 'Le contenu du message',
  createdAt: new Date(),
  internal: false,
  attachments: []
})
```

**Sécurité :**
- Initialise automatiquement `messages[]` et `history[]` si undefined
- Évite les erreurs `Cannot read property 'push' of undefined`

#### `TicketService.appendHistory(ticket, payload)`
Ajoute une entrée dans l'historique :
```typescript
appendHistory(ticket, {
  authorId: new mongoose.Types.ObjectId(userId),
  authorRole: 'ADMIN',
  action: 'status_change' | 'assignment' | 'note' | 'message',
  details: { status: 'resolved' }
})
```

#### `TicketService.serialize(ticket)`
Formate un ticket pour l'API (nettoie les données sensibles).

---

## 📊 Structure d'un Ticket Complet

```typescript
{
  _id: ObjectId,
  projectId: ObjectId | undefined,  // Optionnel maintenant
  clientId: ObjectId,
  assignedTo: [ObjectId],
  watchers: [ObjectId],
  title: "Problème de connexion",
  category: "incident",  // Valeurs normalisées
  priority: "high",
  status: "open",
  channel: "client_portal",
  tags: ["urgent"],
  
  messages: [{
    authorId: ObjectId,
    authorRole: "CLIENT",
    message: "Description du problème...",
    createdAt: Date,
    internal: false,
    attachments: [{
      name: "screenshot.png",
      url: "/uploads/...",
      uploadedBy: ObjectId,
      uploadedAt: Date
    }]
  }],
  
  history: [{
    authorId: ObjectId,
    authorRole: "ADMIN",
    action: "status_change",
    payload: { status: "in_progress" },
    createdAt: Date
  }],
  
  sla: {
    targetHours: 4,
    startedAt: Date,
    deadlineAt: Date,
    breached: false,
    resolvedAt: Date | undefined
  },
  
  lastResponseAt: Date,
  resolvedAt: Date | undefined,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🚀 Utilisation Recommandée

### Pour les Clients (Portail)

```typescript
// Créer un ticket
const response = await fetch('/api/client/tickets', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Mon problème',
    description: 'Description détaillée',
    category: 'technical',  // Ou 'general', 'billing', 'urgent'
    priority: 'high'
  })
})
```

### Pour les Admins/Techniciens

```typescript
// Assigner un ticket
const response = await fetch('/api/tickets', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: ticketId,
    assignedTo: [technicianId],
    status: 'in_progress',
    addMessage: 'Je m\'en occupe maintenant'
  })
})
```

---

## ✅ Checklist de Validation

- [x] Schéma Mongoose unifié avec toutes les catégories/statuts
- [x] `projectId` rendu optionnel
- [x] Script de migration créé et testé
- [x] API client alignée sur le schéma
- [x] API admin/tech alignée sur le schéma
- [x] Service tickets avec initialisation sécurisée
- [x] Gestion des erreurs de validation corrigée
- [x] Documentation complète

---

## 🔍 Débogage

### Erreur : "category is not a valid enum value"

**Cause :** Ticket existant avec catégorie obsolète

**Solution :**
```bash
node scripts/migrate-tickets.js
```

### Erreur : "Cannot read property 'push' of undefined"

**Cause :** Ticket sans `messages` ou `history` initialisé

**Solution :** Le service initialise automatiquement maintenant. Si persiste :
```bash
node scripts/migrate-tickets.js
```

### Vérifier l'état des tickets

```javascript
// Dans la console MongoDB
db.tickets.find({
  $or: [
    { category: "general" },
    { status: "waiting" },
    { messages: { $exists: false } },
    { history: { $exists: false } }
  ]
})
```

---

**Date de création :** $(date)
**Status :** ✅ Production Ready





