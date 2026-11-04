# Gestion des Techniciens - IT Vision

## 📋 Vue d'ensemble

La gestion des techniciens a été **séparée de la gestion des utilisateurs** pour offrir une interface dédiée aux techniciens de terrain avec des fonctionnalités spécifiques à leur activité.

## 🔄 Séparation Utilisateurs vs Techniciens

### Avant
- ❌ Tout mélangé dans `/admin/users`
- ❌ Pas de gestion spécifique pour les techniciens
- ❌ Fonctionnalités limitées

### Après
- ✅ **`/admin/users`** : Gestion des utilisateurs (ADMIN, CLIENT)
- ✅ **`/admin/technicians`** : Gestion dédiée aux techniciens
- ✅ Fonctionnalités spécialisées pour les techniciens

## 🎯 Fonctionnalités Spécifiques aux Techniciens

### 1. **Informations de Base**
- ID Technicien unique (TECH0001, TECH0002, etc.)
- Nom, email, téléphone
- Photo de profil
- Mot de passe sécurisé

### 2. **Compétences et Qualifications**
- **Spécialités** :
  - Fibre Optique
  - Réseau
  - Électricité
  - Domotique
  - Vidéosurveillance
  - Contrôle d'Accès
  - Téléphonie
  - Installation
  - Maintenance
  - Dépannage
  - (personnalisables)

- **Certifications** :
  - Liste de certifications professionnelles
  - Ajout libre

- **Années d'expérience** : Champ numérique

### 3. **Disponibilité et Statut**
- **Statut actif/inactif** : Activé/désactivé dans le système
- **Disponibilité en temps réel** : Disponible 🟢 / Occupé 🔴
- Toggle rapide de disponibilité sur chaque carte

### 4. **Horaires de Travail**
- Heure de début (ex: 08:00)
- Heure de fin (ex: 18:00)
- Travail le week-end (oui/non)

### 5. **Statistiques de Performance**
- **Total des rapports** : Nombre d'interventions effectuées
- **Note moyenne** : Sur 5 étoiles
- **Taux de complétion** : Pourcentage de tâches terminées
- **Temps de réponse moyen** : En minutes
- **Ponctualité** : Pourcentage d'interventions à l'heure

### 6. **Géolocalisation** (prêt pour future implémentation)
- Position actuelle (lat, lng)
- Historique des positions
- Tracking en temps réel

## 📊 Interface de Gestion

### Design
- **Gradient orange/rouge** : Thème distinct des autres sections
- **Cartes modernes** : Layout responsive avec hover effects
- **4 KPIs visuels** :
  - Total techniciens (bleu)
  - Actifs (vert)
  - Disponibles (orange)
  - Note moyenne (jaune)

### Fonctionnalités de la Liste
- **Recherche** : Par nom, email, téléphone, ID
- **Filtres** :
  - Statut : Tous / Actifs / Inactifs / Disponibles / Occupés
  - Spécialité : Toutes ou spécifique
- **Actions** :
  - Voir détails
  - Modifier
  - Supprimer
  - Toggle disponibilité
- **Export CSV** : Toutes les données en un clic
- **Pagination** : 12 techniciens par page

### Modale de Création/Édition

#### Onglet Informations de Base
- Nom complet *
- Email *
- Téléphone *
- Mot de passe * (requis uniquement à la création)
- Années d'expérience

#### Onglet Spécialités
- Liste actuelle avec suppression rapide
- Champ d'ajout avec bouton
- Raccourcis pour spécialités prédéfinies

#### Onglet Certifications
- Liste actuelle avec suppression rapide
- Champ d'ajout libre

#### Onglet Horaires de Travail
- Début / Fin (time picker)
- Checkbox week-ends

### Modale de Visualisation
- Avatar circulaire
- ID technicien
- Badges de statut (Actif, Disponible)
- Grille d'informations colorées :
  - Email (bleu)
  - Téléphone (vert)
  - Expérience (violet)
  - Note (jaune)
- Section spécialités (badges bleus)
- Section certifications (badges verts)
- Statistiques détaillées en 4 colonnes
- Bouton "Modifier" rapide

## 🔌 API Endpoints

### `GET /api/admin/technicians`
Récupère la liste des techniciens avec filtres et pagination.

**Query params** :
- `q` : Recherche textuelle
- `status` : active | inactive | available | unavailable
- `specialty` : Nom de spécialité
- `limit` : Nombre de résultats (défaut: 20)
- `skip` : Offset pour pagination (défaut: 0)

**Réponse** :
```json
{
  "success": true,
  "technicians": [...],
  "total": 25,
  "skip": 0,
  "limit": 20
}
```

### `POST /api/admin/technicians`
Crée un nouveau technicien.

**Corps** :
```json
{
  "name": "Jean Dupont",
  "email": "jean@email.com",
  "phone": "+221771234567",
  "password": "motdepasse123",
  "specialties": ["Fibre Optique", "Réseau"],
  "certifications": ["Certification Cisco", "Fibres Optiques L1"],
  "experience": 5,
  "workingHours": {
    "start": "08:00",
    "end": "18:00",
    "weekends": false
  }
}
```

**Réponse** :
```json
{
  "success": true,
  "technician": {...},
  "message": "Technicien créé avec succès"
}
```

### `GET /api/admin/technicians/[id]`
Récupère les détails d'un technicien.

### `PUT /api/admin/technicians/[id]`
Met à jour un technicien.

**Corps** : Mêmes champs que POST (tous optionnels sauf pour les champs requis)

### `DELETE /api/admin/technicians/[id]`
Supprime un technicien.

### `PUT /api/admin/technicians/[id]/availability`
Change la disponibilité d'un technicien.

**Corps** :
```json
{
  "isAvailable": true
}
```

## 💾 Modèle de Données

### Interface `ITechnician`

```typescript
interface ITechnician {
  _id: string
  technicianId: string            // Auto-généré (TECH0001)
  name: string
  email: string
  phone: string
  passwordHash: string
  
  // Profil
  profilePhoto?: string
  specialties: string[]
  certifications: string[]
  experience: number              // années
  
  // Statut
  isActive: boolean
  isAvailable: boolean
  currentLocation?: {
    lat: number
    lng: number
    lastUpdate: Date
  }
  
  // Permissions
  permissions: {
    canCreateReports: boolean
    canEditOwnReports: boolean
    canDeleteDrafts: boolean
    allowedInterventionTypes: string[]
    maxReportValue?: number
  }
  
  // Statistiques
  stats: {
    totalReports: number
    averageRating: number
    completionRate: number
    averageResponseTime: number    // minutes
    onTimeRate: number             // pourcentage
  }
  
  // Préférences
  preferences: {
    notifications: {
      email: boolean
      sms: boolean
      push: boolean
    }
    workingHours: {
      start: string              // "08:00"
      end: string                // "18:00"
      weekends: boolean
    }
    language: string
  }
  
  // Géolocalisation
  locationHistory: Array<{
    timestamp: Date
    lat: number
    lng: number
    accuracy: number
    activity?: 'traveling' | 'on_site' | 'break'
  }>
  
  // Sessions
  lastLogin?: Date
  lastLocationUpdate?: Date
  deviceTokens: string[]
  
  // Hiérarchie
  teamId?: ObjectId
  supervisorId?: ObjectId
  
  createdAt: Date
  updatedAt: Date
}
```

## 🔐 Sécurité

- **Authentification requise** : Toutes les routes nécessitent un token admin
- **Mots de passe hashés** : Utilisation de bcrypt avec salt
- **Validation des données** : Vérification des champs requis
- **Pas de données sensibles** : passwordHash et deviceTokens exclus des réponses

## 📱 Navigation

### Sidebar Admin
```
Dashboard
├── Clients
├── 🔧 Techniciens          ← NOUVEAU
├── 👥 Utilisateurs         ← Séparé
├── Projets
├── Services & Produits
├── Devis & Tarification
├── Tickets Support
├── Planning
└── Administration
```

### URLs
- **Liste techniciens** : `/admin/technicians`
- **Utilisateurs** : `/admin/users`

## 🎨 Personnalisation

### Couleurs
- **Primaire** : Orange (#EA580C)
- **Secondaire** : Rouge/Rose (#DC2626 → #F43F5E)
- **Badges** :
  - Actif : Vert
  - Disponible : Orange
  - Spécialités : Bleu
  - Certifications : Vert
  - Stats : Jaune

### Icônes
- Techniciens : `Wrench` 🔧
- Utilisateurs : `UserCog` ⚙️

## 📈 Évolutions Futures

### Court terme
1. ✅ Interface de gestion complète
2. ✅ CRUD techniciens
3. ✅ Filtres et recherche
4. ✅ Statistiques basiques

### Moyen terme
1. **Tableau de bord technicien** : Interface mobile pour les techniciens
2. **Tracking GPS en temps réel** : Suivi des déplacements
3. **Attribution automatique** : Algorithme d'affectation des interventions
4. **Application mobile** : App dédiée pour les techniciens

### Long terme
1. **IA prédictive** : Prédiction des besoins en maintenance
2. **Optimisation des tournées** : Algorithme d'optimisation des trajets
3. **Gamification** : Système de points et badges
4. **Formation continue** : Suivi des certifications et formations

## 🔗 Intégrations

### Avec Interventions
Les techniciens sont référencés dans :
- `Intervention.technicienId` : Lien vers le technicien
- `Intervention.assignedTechnician` : Affectation

### Avec Planning
- Attribution des interventions aux techniciens disponibles
- Filtrage par spécialités

### Avec Notifications
- Notifications push via `deviceTokens`
- Email et SMS selon préférences

## 📝 Notes d'Implémentation

### Fichiers Créés
1. `src/components/admin/TechnicianManagement.tsx` (1467 lignes)
2. `src/app/admin/technicians/page.tsx`
3. `src/app/api/admin/technicians/route.ts`
4. `src/app/api/admin/technicians/[id]/route.ts`
5. `src/app/api/admin/technicians/[id]/availability/route.ts`
6. `TECHNICIAN_MANAGEMENT.md` (ce fichier)

### Fichiers Modifiés
1. `src/components/admin/AdminSidebar.tsx` : Ajout du lien Techniciens

### Modèle Existant
- `src/lib/models/Technician.ts` : Déjà présent et utilisé

## 🧪 Tests

### Création d'un Technicien
```bash
curl -X POST http://localhost:3000/api/admin/technicians \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=YOUR_TOKEN" \
  -d '{
    "name": "Amadou Diallo",
    "email": "amadou@itvision.sn",
    "phone": "+221771234567",
    "password": "secure123",
    "specialties": ["Fibre Optique", "Réseau"],
    "certifications": ["Cisco CCNA"],
    "experience": 7,
    "workingHours": {
      "start": "08:00",
      "end": "18:00",
      "weekends": false
    }
  }'
```

### Récupération des Techniciens
```bash
curl http://localhost:3000/api/admin/technicians?status=available \
  -H "Cookie: auth-token=YOUR_TOKEN"
```

### Toggle Disponibilité
```bash
curl -X PUT http://localhost:3000/api/admin/technicians/[ID]/availability \
  -H "Content-Type: application/json" \
  -H "Cookie: auth-token=YOUR_TOKEN" \
  -d '{"isAvailable": false}'
```

## 🎓 Guide d'Utilisation

### Pour l'Administrateur

1. **Accéder à la liste** : Cliquer sur "Techniciens" dans le sidebar
2. **Ajouter un technicien** : 
   - Cliquer sur "Nouveau technicien"
   - Remplir le formulaire
   - Ajouter spécialités et certifications
   - Définir les horaires
   - Sauvegarder
3. **Modifier un technicien** :
   - Cliquer sur "Modifier" sur la carte
   - Modifier les informations
   - Sauvegarder
4. **Gérer la disponibilité** :
   - Cliquer sur le badge Disponible/Occupé
   - Toggle instantané
5. **Voir les détails** :
   - Cliquer sur "Voir"
   - Consulter toutes les stats et infos
6. **Exporter les données** :
   - Cliquer sur "Exporter"
   - Fichier CSV téléchargé

---

**Version** : 1.0  
**Date** : Novembre 2024  
**Auteur** : IT Vision





