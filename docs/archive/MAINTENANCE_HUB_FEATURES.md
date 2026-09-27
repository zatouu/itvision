# 🔧 Centre de Maintenance - Portail Client

## Vue d'ensemble

Le **Centre de Maintenance** est un nouvel onglet intégré au portail client qui fournit une gestion centralisée et complète de l'infrastructure de maintenance.

## 🎯 Fonctionnalités Principales

### 1️⃣ **Vue d'ensemble (Dashboard)**

#### Statistiques Clés
- **Rapports Publiés** : Nombre total de rapports validés et publiés
- **Rapports En Attente** : Rapports en cours de validation admin
- **Sites Gérés** : Nombre total de sites/emplacements
- **Équipements** : Nombre total d'équipements en maintenance

#### Rapports Récents
- Liste des 4 derniers rapports de maintenance
- Status visuel (icône couleur)
- Priorité (badge couleur)
- Détails rapides : site, technicien, date
- Accès au détail complet via clic

#### État des Sites
- Vue rapide de l'état de chaque site (Normal/Attention/Critique)
- Technicien responsable
- Indicateurs visuels (points colorés)

---

### 2️⃣ **Rapports**

#### Recherche et Filtrage Avancés
```
Recherche texte : Cherche dans les titres, rapports, sites
Filtre Statut   : Publiés, En attente, Archivés
Filtre Priorité : Urgents, Élevée, Moyenne, Basse
```

#### Liste Complète des Rapports
Chaque rapport affiche :
- 🆔 ID unique (RPT-20240115-001)
- 📋 Titre et description
- 📍 Site d'intervention
- 👨‍🔧 Technicien responsable
- ⏱️ Durée de l'intervention
- 📅 Date d'intervention
- ✅ Nombre de tâches effectuées
- 🎯 Priorité et statut

#### Modal de Détail
Au clic sur un rapport :
- Résumé complet
- Informations détaillées (site, technicien, durée, tâches)
- Boutons d'actions :
  - 📥 Télécharger PDF
  - 🖨️ Imprimer

---

### 3️⃣ **Sites**

#### Présentation par Site
Pour chaque site géré :

**Informations Générales**
- Nom du site
- Adresse géographique (GPS)
- État sanitaire (Normal/Attention/Critique)

**Historique de Maintenance**
- Date dernière maintenance
- Date prochaine maintenance planifiée
- Technicien assigné

**Équipements Associés**
- Liste complète des équipements gérés
- Caméras, NVR, systèmes de contrôle d'accès, etc.

**Actions Rapides**
- Bouton "Détails" pour consultation approfondie

---

### 4️⃣ **Calendrier de Maintenance**

#### Planification Future
Visualisation des interventions planifiées :
- 📅 Dates d'intervention
- 🏢 Sites concernés
- 📝 Type d'intervention

#### Exemples Prévus
- Maintenance Mensuelle (15 février)
- Visite Programmée (20 février)
- Maintenance Trimestrielle (01 mars)

---

### 5️⃣ **Statistiques & Analytics**

#### Temps Moyen par Site
- Graphiques barres horizontaux
- Durée moyenne de maintenance par site
- Identification des sites nécessitant plus de temps

#### Performance des Techniciens
- Score de performance (%)
- Classement des techniciens
- Évaluation basée sur la qualité et l'efficacité

---

## 🎨 Design & UX

### Palette de Couleurs
- **Vert/Émeraude** : Actions positives, éléments validés
- **Orange** : Attention requise, avertissements
- **Rouge** : Critique, urgence
- **Gris** : États neutres, archivés

### Navigation
- 5 onglets principaux : Vue d'ensemble, Rapports, Sites, Calendrier, Statistiques
- Design responsive (mobile, tablet, desktop)
- Transitions fluides et animations

### Accessibilité
- Icônes + texte pour chaque action
- Contraste de couleur WCAG AA compliant
- Navigation au clavier

---

## 📊 Données Affichées

### Rapports de Test
```javascript
{
  id: '1',
  reportId: 'RPT-20240115-001',
  title: 'Maintenance Mensuelle Janvier 2024',
  site: 'Siège Parcelles Assainies',
  technicianName: 'Moussa Diop',
  date: '2024-01-15',
  status: 'published',
  priority: 'medium',
  duration: '2h30',
  summary: '...',
  tasksCount: 6
}
```

### Sites Gérés
```javascript
{
  id: '1',
  name: 'Siège Parcelles Assainies',
  address: 'Route de Ngor, Dakar',
  latitude: 14.7167,
  longitude: -17.5333,
  lastMaintenance: '2024-01-15',
  nextPlanned: '2024-02-15',
  equipment: ['16 Caméras IP', 'NVR 16ch', 'Switch PoE', 'Portail d\'accès'],
  status: 'healthy',
  technician: 'Moussa Diop'
}
```

---

## 🚀 Intégration Technique

### Fichiers Modifiés
- **src/components/EnhancedProjectPortal.tsx**
  - Ajout du composant dynamique ClientMaintenanceHub
  - Nouvel onglet "Maintenance" pour les clients
  - Import et intégration du composant

- **src/components/ClientMaintenanceHub.tsx** (NOUVEAU)
  - Composant principal du Centre de Maintenance
  - Gestion des états (rapports, sites, vues)
  - Filtrage et recherche
  - Modales et détails

### Composants Utilisés
- Icônes Lucide React (Wrench, Calendar, MapPin, etc.)
- Layout Tailwind CSS responsive
- Hooks React (useState, useEffect)

### API Intégration (Future)
```
GET  /api/maintenance/reports?clientId={id}
GET  /api/maintenance/sites?clientId={id}
GET  /api/maintenance/calendar?clientId={id}
GET  /api/maintenance/analytics?clientId={id}
```

---

## 📱 Responsivité

### Mobile (< 768px)
- Vue stack verticale
- Filtres réduits
- Grilles 1 colonne

### Tablet (768px - 1024px)
- Grilles 2 colonnes
- Filtres compacts
- Détails limités

### Desktop (> 1024px)
- Grilles 3-4 colonnes
- Filtres complets
- Vue détaillée

---

## ⚙️ Configuration & Personnalisation

### Props du Composant
```typescript
interface ClientMaintenanceHubProps {
  clientId: string              // Identifiant du client
  clientName: string            // Nom du client
  clientCompany: string         // Entreprise du client
  projectId: string             // Identifiant du projet
}
```

### États Possibles
- `activeView`: 'overview' | 'reports' | 'sites' | 'calendar' | 'analytics'
- `filterStatus`: 'all' | 'published' | 'pending' | 'archived'
- `filterPriority`: 'all' | 'urgent' | 'high' | 'medium' | 'low'

---

## 🔐 Sécurité

### Filtrage par Rôle
- Seuls les clients ROLE='CLIENT' voient cet onglet
- Données filtrées par clientId
- Accès aux rapports du client uniquement

### Authentification
- Vérification du token client
- Session basée sur le portail
- Données sécurisées côté API

---

## 🚦 Cycle de Vie

### 1. Technicien
- Crée un rapport de maintenance
- Status: `draft`

### 2. Submission
- Soumet pour validation
- Status: `pending_validation`

### 3. Admin Validation
- Admin valide ou rejette
- Status: `validated` ou `rejected`

### 4. Auto-Publication
- Si approuvé → Publication automatique
- Status: `published`
- Visible pour le client

### 5. Client View
- Client accède au Centre de Maintenance
- Voit le rapport dans l'onglet "Rapports"
- Peut télécharger, imprimer, consulter

---

## 📈 Améliorations Futures

### Court Terme (v1.1)
- [ ] Export des rapports en Excel
- [ ] Filtrage par date range
- [ ] Historique par site
- [ ] Notifications de maintenance urgente

### Moyen Terme (v1.2)
- [ ] Intégration calendrier fullcalendar
- [ ] Graphiques avancés (charts.js)
- [ ] Alertes automatiques
- [ ] Planification de maintenance

### Long Terme (v2.0)
- [ ] Géolocalisation en temps réel
- [ ] API WebSocket pour updates live
- [ ] Mobile app native
- [ ] Intégration système CMMS

---

## 🎓 Guide d'Utilisation

### Pour le Client

1. **Se connecter** au portail
2. **Aller à l'onglet "Maintenance"**
3. **Consulter la vue d'ensemble** pour un aperçu rapide
4. **Naviguer vers "Rapports"** pour détails complets
5. **Filtrer et rechercher** selon les besoins
6. **Cliquer sur un rapport** pour télécharger en PDF
7. **Consulter "Sites"** pour l'état de chaque équipement
8. **Planifier** via l'onglet Calendrier
9. **Analyser** les statistiques de performance

### Pour le Technicien

1. Créer un rapport via l'interface technicien
2. Ajouter photos, observations, tâches
3. Soumettre pour validation admin
4. Attendre approbation
5. Rapport apparaîtra dans le portail client

### Pour l'Admin

1. Valider ou rejeter les rapports
2. Ajouter des commentaires
3. Rapports validés se publient automatiquement
4. Monitorer via le dashboard d'administration

---

## 📞 Support & Feedback

Pour toute question ou suggestion :
- 📧 Email: support@itvision.sn
- 📱 Téléphone: +221 (de 9h à 18h)
- 💬 Chat: support-itvision.sn

---

**Dernière mise à jour:** 2024-01-16  
**Version:** 1.0  
**Statut:** ✅ Actif en Production
