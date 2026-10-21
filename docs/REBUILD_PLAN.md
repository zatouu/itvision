# Plan de Reconstruction - ModernClientPortal.tsx

## Fichier à reconstruire
**Chemin**: `src/components/client/ModernClientPortal.tsx`  
**Taille originale**: ~1373 lignes  
**Taille actuelle**: 1 ligne (écrasé)

## Structure du composant

### 1. Imports (~40 lignes)
- React hooks: useState, useEffect, useRef
- Lucide icons: ~30 icônes
- Toast: react-hot-toast
- Composants locaux: ProjectDetailModal, TicketChatModal, SimpleCharts
- Socket.io: socket-client functions
- Utils: generateQuotePDF

### 2. Interfaces TypeScript (~100 lignes)
- Project
- Quote
- Intervention
- Document
- Ticket
- DashboardData
- Profile
- TabType

### 3. États du composant (~50 lignes)
- activeTab
- dashboardData, projects, quotes, interventions, documents, tickets, profile
- loading, error
- Filtres (projectFilter, quoteFilter, etc.)
- Formulaires (newTicket, profileForm)
- Modals (selectedProjectId, isProjectModalOpen, etc.)
- Socket.io (socketConnected, liveUpdates, socketInitialized)

### 4. Effects (~150 lignes)
- useEffect initial (fetchProfile + fetchDashboard)
- useEffect par activeTab
- useEffect Socket.io (initialisation, listeners)

### 5. Fonctions fetch (~200 lignes)
- fetchProfile
- fetchDashboard
- fetchProjects
- fetchQuotes
- fetchInterventions
- fetchDocuments
- fetchTickets

### 6. Fonctions handlers (~100 lignes)
- handleCreateTicket
- handleUpdateProfile

### 7. JSX (~800 lignes)
#### Header (~50 lignes)
- Logo IT Vision
- Badge LIVE (Socket.io)
- Bell notifications
- User profile

#### Sidebar (~100 lignes)
- 7 onglets de navigation
- Icons + labels

#### Contenu principal par onglet (~600 lignes)
- Dashboard: KPIs + projets actifs + timeline
- Projets: Grille de cartes
- Devis: Liste avec filtres
- Interventions: Cards avec détails
- Documents: Table avec types
- Support: Tickets + formulaire nouveau
- Profile: Form éditable

#### Modals (~50 lignes)
- ProjectDetailModal
- TicketChatModal
- Toaster

## Fonctionnalités Socket.io intégrées

### États ajoutés
```typescript
const [socketConnected, setSocketConnected] = useState(false)
const [liveUpdates, setLiveUpdates] = useState(0)
const socketInitialized = useRef(false)
```

### useEffect Socket.io
- Init avec token
- Listeners: project-updated, ticket-updated, new-message, notification
- Toast pour chaque événement
- Cleanup

### Badge LIVE dans header
- Wifi icon animé
- Compteur d'updates
- Status connecté/déconnecté

## Stratégie de reconstruction

1. Créer la structure complète en une seule fois
2. Utiliser les interfaces des API routes comme référence
3. Reprendre les exemples de PORTAIL_CLIENT_MODERNE.md
4. Ajouter toutes les intégrations Socket.io
5. Tester la compilation

## Temps estimé
~30 minutes pour recréer un fichier de 1373 lignes





