# Blueprint Maintenance — IT Vision Plus

## Objectif
Centraliser, durcir et automatiser le workflow maintenance (contrats, interventions, rapports, techniciens) tout en proposant de la valeur aux clients entreprise et aux techniciens.

---

## 1. Glossaire & Concepts

| Entité | Définition |
|---|---|
| **MaintenanceContract** | Accord commercial couvrant un périmètre d'équipements/sites avec SLA (temps de réponse, interventions incluses, renouvellement). |
| **Intervention** | Tâche planifiée ou curative assignée à un technicien, liée à un contrat ou non. |
| **MaintenanceReport** | Rapport structuré produit par le technicien sur le terrain (observations, problèmes, matériaux, recommandations, photos, signatures). |
| **MaintenanceActivity** | Visite préventive générée automatiquement depuis un contrat ; peut être proposée sur le marketplace interne. |
| **Technician** | Profil autonome avec spécialités, disponibilité, géolocalisation, stats de performance. |
| **Client Enterprise** | Utilisateur avec `role: CLIENT` + `companyClientId` ; accède au portail `/portail-entreprise`. |

---

## 2. Workflow global (cible)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT ENTERPRISE                                │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────┐   ┌─────────────┐   │
│  │ Dashboard   │   │ Contrats     │   │Interventions│   │ Tickets     │   │
│  │ (KPIs)      │   │ (usage/SLA)  │   │(historique) │   │(self-serv.) │   │
│  └─────────────┘   └──────────────┘   └─────────────┘   └─────────────┘   │
│         │                   │                  │                │            │
│         └───────────────────┴──────────────────┴────────────────┘            │
│                                 ▼                                            │
│                      POST /api/client-enterprise/tickets                     │
│                           (Demande d'intervention)                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ADMIN / BACK-OFFICE                            │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────┐   ┌─────────────┐   │
│  │ Maintenance │   │ Planning     │   │ Validation │   │ Facturation │   │
│  │ Center      │   │ (calendrier) │   │ Rapports   │   │ récurrente  │   │
│  └─────────────┘   └──────────────┘   └─────────────┘   └─────────────┘   │
│         │                   │                  │                │            │
│         └───────────────────┴──────────────────┴────────────────┘            │
│                                 ▼                                            │
│         Auto-assign (skills + zone + dispo)  →  POST /api/interventions      │
│         Cron préventif  →  generateMaintenanceVisits()                       │
│         Cron renouvellement  →  renewalNotificationSent / autoRenewal          │
│         Cron facturation  →  AdminInvoice générée                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TECHNICIEN (portail)                           │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────┐   ┌─────────────┐   │
│  │ Dashboard   │   │ Interventions│   │ Rapports     │   │ Marketplace │   │
│  │ (stats)     │   │ assignées    │   │ (draft→sub)  │   │ (enchères)  │   │
│  └─────────────┘   └──────────────┘   └─────────────┘   └─────────────┘   │
│         │                   │                  │                │            │
│         └───────────────────┴──────────────────┴────────────────┘            │
│                                 ▼                                            │
│         POST /api/maintenance/reports  →  linked to Intervention            │
│         PUT /api/maintenance/reports/submit  →  validation admin              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Modèles de données

### 3.1 Intervention (harmonisé)

| Champ | Type | Description |
|---|---|---|
| `interventionNumber` | String unique | Auto-généré (ex: `INT-20250609-0001`) |
| `clientId` | ObjectId → Client | Client bénéficiaire |
| `projectId` | ObjectId → Project | Projet lié (optionnel) |
| `technicienId` | ObjectId → Technician | Technicien assigné |
| `maintenanceContractId` | ObjectId → MaintenanceContract | Contrat couvrant l'intervention |
| `isCoveredByContract` | Boolean | Détecté automatiquement à la création |
| `typeIntervention` | Enum | `emergency`, `maintenance`, `installation`, `inspection`, `other` |
| `service` | String | Catégorie de service |
| `priority` | Enum | `low`, `medium`, `high`, `critical`, `urgent` |
| `requiredSkills` | String[] | Compétences requises pour l'assignation |
| `status` | Enum | `pending`, `scheduled`, `in_progress`, `completed`, `cancelled` |
| `assignedTechnician` | ObjectId → Technician | Redondance pour indexation rapide |
| `date` | Date | Date de l'intervention |
| `heureDebut` / `heureFin` | String | Horaires |
| `duree` | Number (min) | Calculé auto |
| `site` | String | Lieu |
| `photosAvant` / `photosApres` | Array | Photos avec GPS |
| `signatures` | Object | Technician + client |
| `history` | Array | Audit log interne |

### 3.2 MaintenanceReport (enrichi)

| Champ | Type | Description |
|---|---|---|
| `reportId` | String unique | Auto-généré |
| `interventionId` | ObjectId → Intervention | **NOUVEAU** — Lien vers l'intervention source |
| `technicianId` | ObjectId → Technician | Auteur du rapport |
| `clientId` | ObjectId → Client | Client concerné |
| `status` | Enum | `draft`, `pending_validation`, `validated`, `published`, `archived` |
| `interventionType` | Enum | `maintenance`, `installation`, `repair`, `inspection`, `emergency` |
| `initialObservations` | String | Observations terrain |
| `tasksPerformed` | String[] | Tâches réalisées |
| `results` | String | Résultats |
| `issuesDetected` | Array | Problèmes avec sévérité, coût estimé, besoin devis |
| `materialsUsed` | Array | Matériaux consommés |
| `followUpRecommendations` | Array | Recommandations avec `requiresQuote`, `status` |
| `nextActions` | Array | Actions planifiées |
| `billing` | Object | `needsQuote`, `quoteStatus`, `invoiceStatus` |
| `clientAcknowledgement` | Object | Nom, signature, statut |
| `clientFeedback` | Object | **NOUVEAU** — Rating, commentaire, date |
| `photos.before` / `photos.after` | Array | Photos uploadées |
| `signatures` | Object | Technician + client |
| `gpsLocation` | Object | Coordonnées GPS |
| `analytics` | Object | `timeToComplete`, `durationMinutes` |
| `version` | Number | Versioning |
| `history` | Array | Audit log |

### 3.3 MaintenanceContract (inchangé, à compléter)

| Champ | Type | Description |
|---|---|---|
| `clientId` | ObjectId | |
| `projectId` | ObjectId | |
| `status` | Enum | `draft`, `active`, `suspended`, `expired`, `cancelled` |
| `coverage.interventionsIncluded` | Number | Plafond annuel |
| `coverage.interventionsUsed` | Number | Compteur actuel |
| `coverage.responseTime` | Number | Heures SLA |
| `autoRenewal` | Boolean | |
| `renewalNotificationSent` | Boolean | Flag pour éviter spam |

---

## 4. API Routes (cible)

### 4.1 Interventions

| Méthode | Route | Rôle | Description |
|---|---|---|---|
| GET | `/api/interventions` | ADMIN/TECH/PM | Liste filtrée (date, status, service, zone) |
| POST | `/api/interventions` | ADMIN/TECH/PM | Création avec auto-détection contrat + décrémentation compteur |
| PUT | `/api/interventions` | ADMIN/TECH/PM | Assignation avec validation (technicien existe, dispo, skills) |
| PATCH | `/api/interventions/[id]/status` | ADMIN/TECH/PM | Transition de statut avec validation métier |
| POST | `/api/interventions/[id]/auto-assign` | ADMIN | Matching intelligent technicien |

### 4.2 Rapports

| Méthode | Route | Rôle | Description |
|---|---|---|---|
| GET | `/api/maintenance/reports` | TECH/ADMIN | Liste rapports filtrée |
| POST | `/api/maintenance/reports` | TECH | Création liée à une `Intervention` existante |
| PUT | `/api/maintenance/reports` | TECH | Mise à jour draft |
| POST | `/api/maintenance/reports/submit` | TECH | Soumission validation ; vérifie données requises ; notifie admin + client |
| POST | `/api/maintenance/reports/[id]/validate` | ADMIN | Passe à `validated` ; si `followUp.requiresQuote`, auto-génère `AdminQuote` |
| POST | `/api/maintenance/reports/[id]/publish` | ADMIN | Passe à `published` ; notifie client |

### 4.3 Client Enterprise

| Méthode | Route | Rôle | Description |
|---|---|---|---|
| GET | `/api/client-enterprise/dashboard` | CLIENT | KPIs + alertes |
| GET | `/api/client-enterprise/contracts` | CLIENT | Contrats avec usage |
| GET | `/api/client-enterprise/interventions` | CLIENT | Interventions paginées |
| GET | `/api/client-enterprise/interventions/[id]` | CLIENT | Détail intervention + rapport publié |
| POST | `/api/client-enterprise/tickets` | CLIENT | Demande d'intervention / ticket support |
| POST | `/api/client-enterprise/interventions/[id]/feedback` | CLIENT | Signature + rating post-intervention |

### 4.4 Admin / Automation

| Méthode | Route | Rôle | Description |
|---|---|---|---|
| POST | `/api/admin/maintenance/cron/visits` | ADMIN/Super | Déclenche `generateMaintenanceVisits()` |
| POST | `/api/admin/maintenance/cron/renewals` | ADMIN/Super | Notifications renouvellement |
| POST | `/api/admin/maintenance/cron/invoicing` | ADMIN/Super | Facturation récurrente |
| GET | `/api/admin/maintenance/planning` | ADMIN | Vue calendrier agrégée |
| GET | `/api/admin/maintenance/sla` | ADMIN | Contrats en alerte SLA |

---

## 5. Automatisations (Jobs node-cron)

**Pourquoi node-cron et pas BullMQ/Redis ?**
- Le volume maintenance actuel (dizaines de contrats) ne justifie pas l'infra Redis.
- `node-cron` = pure Node.js, pas de service additionnel, cron expressions standard.
- **Migration future** : si le volume explose, on remplace `node-cron` par BullMQ + Redis sans toucher la logique métier des jobs.

### Architecture
- `src/lib/maintenance/cron-runner.ts` — Registre et scheduling.
- `src/instrumentation.ts` — Démarrage auto au boot du serveur Next.js.
- `src/app/api/cron/maintenance/route.ts` — Déclenchement manuel sécurisé (`x-cron-secret`).

### Variables d'environnement
| Variable | Défaut | Description |
|---|---|---|
| `MAINTENANCE_CRON_DISABLED` | `false` | Désactive tous les jobs |
| `MAINTENANCE_CRON_PREVENTIVE` | `true` | Active/désactive le job visites préventives |
| `MAINTENANCE_CRON_RENEWAL` | `true` | Active/désactive le job rappels renouvellement |
| `MAINTENANCE_CRON_SLA` | `true` | Active/désactive le job monitoring SLA |
| `CRON_SECRET` | — | Secret pour l'API de déclenchement manuel |

### 5.1 `maintenance.preventive-visits`
**Schedule** : `0 6 * * *` (6h UTC quotidien)
**Logique** :
1. Lister les `MaintenanceContract` actifs.
2. Pour chaque contrat, appeler `generateMaintenanceVisits(dateStart, dateEnd)` sur 90j.
3. Pour chaque visite future non encore créée :
   - Créer une `Intervention` avec `status='scheduled'`, `isCoveredByContract=true`.
   - Créer une `MaintenanceActivity` avec `category='contract_visit'`.

### 5.2 `maintenance.renewal-reminders`
**Schedule** : `0 8 * * *` (8h UTC quotidien)
**Logique** :
1. Contrats actifs avec `endDate` dans 60/30/7j.
2. Si le seuil n'a pas encore été notifié (`renewalNotifications[]`) : envoyer email admin + marquer.
3. Si `autoRenewal === true` et `endDate` dans 1j : cloner le contrat en `draft`.

### 5.3 `maintenance.sla-monitoring`
**Schedule** : `*/15 * * * *` (toutes les 15 min)
**Logique** :
1. Interventions `pending` couvertes par contrat et non assignées depuis > `responseTime`.
2. Notification admin + escalade email si > 2× SLA.
3. Interventions `scheduled` passées sans passage `in_progress` : notification admin.

---

## 6. Règles métier critiques

### Règle 1 : Auto-détection contrat
Lors de la création d'une `Intervention` avec `clientId` :
- Chercher `MaintenanceContract` avec `clientId`, `status='active'`, `startDate <= now <= endDate`.
- Si trouvé : `maintenanceContractId = contract._id`, `isCoveredByContract = true`.
- Si `typeIntervention !== 'emergency'` : vérifier `coverage.interventionsUsed < interventionsIncluded`. Si plafond atteint : `isCoveredByContract = false` + flag `overageAlert`.

### Règle 2 : Décrémentation compteur
Quand une intervention couverte par contrat passe à `completed` :
- Incrémenter `contract.coverage.interventionsUsed`.
- Si `interventionsUsed === interventionsIncluded` : notifier admin + client.

### Règle 3 : Assignation technicien
Au `PUT` assignation :
1. `Technician.findById(technicianId)` doit exister et `isActive === true`.
2. `isAvailable === true` (ou exception avec override admin).
3. `specialties` du technicien doit couvrir `requiredSkills` de l'intervention (match partiel).
4. Mettre à jour `status = 'scheduled'`.

### Règle 4 : Matching auto
Score = Σ(wi * fi) où :
- `f_skills` = ratio skills requis ∩ skills tech
- `f_distance` = 1 / (1 + km entre tech et site)
- `f_availability` = 1 si dispo, 0.5 si indisponible mais override possible
- `f_load` = 1 - (nb interventions en cours / capacité max)

### Règle 5 : Rapport lié à intervention
Un `MaintenanceReport` doit toujours être lié à une `Intervention` existante (`interventionId`).
- Le technicien crée le rapport depuis sa liste d'interventions assignées.
- La soumission du rapport passe l'intervention à `completed`.

---

## 7. Sécurité & Audit

- **AuditLog** : toute transition de statut Intervention/Rapport/Contrat écrit un document `AuditLog` avec `entityType`, `entityId`, `previousState`, `newState`, `userId`, `ip`, `timestamp`.
- **Snapshots contrat** : à chaque modification majeure d'un contrat, stocker un snapshot JSON immuable dans `contract.history`.
- **Rate-limiting** : soumissions de rapports limitées à 10/min par technicien.
- **Validation JWT** : `companyClientId` obligatoire pour toutes les routes `/api/client-enterprise/*`.

---

## 8. Roadmap implémentation

| Phase | Livrable | Impact | Statut |
|---|---|---|---|
| **P0** | Harmonisation statuts, lien Intervention↔Rapport, auto-détection contrat, vérification assignation | Fiabilité fondamentale | Terminé |
| **P1** | Jobs node-cron (visites préventives, renouvellements, SLA) | Automatisation cœur métier | Terminé |
| **P2** | Portail client self-service (demande intervention, feedback, signature) | Valeur client | Terminé |
| **P3** | Planning admin unifié, matching auto technicien, génération auto devis | Efficacité opérationnelle | Terminé |
| **P4** | WebSocket temps réel, snapshots immuables, audit logs complets | Robustesse & conformité | Terminé |

---

## 9. Fichiers clés

### Modèles
- `src/lib/models/Intervention.ts`
- `src/lib/models/MaintenanceReport.ts`
- `src/lib/models/MaintenanceContract.ts`
- `src/lib/models/Technician.ts`
- `src/lib/models/MaintenanceActivity.ts`
- `src/lib/models/AuditLog.ts` — Audit trail immuable (P4)

### Services métier
- `src/lib/audit.ts` — Service `logAuditEvent()` + `getAuditTrail()` (P4)
- `src/lib/socket-emit.ts` — Émission événements Socket.io (P4)
- `src/lib/maintenance/schedule.ts` — Calcul visite préventives (P1)
- `src/lib/maintenance/cron-runner.ts` — Registre node-cron (P1)

### API
- `src/app/api/interventions/route.ts` — CRUD + auto-contrat + validation tech (P0/P4)
- `src/app/api/maintenance/reports/route.ts` — CRUD rapports
- `src/app/api/maintenance/reports/submit/route.ts` — Soumission + notification + temps réel (P4)
- `src/app/api/admin/reports/validate/route.ts` — Validation/rejet + temps réel (P4)
- `src/app/api/admin/reports/[id]/generate-quote/route.ts` — Génération devis depuis rapport (P3)
- `src/app/api/admin/reports/[id]/snapshot/route.ts` — Snapshots contrat (P4)
- `src/app/api/admin/planning/route.ts` — Planning unifié liste/calendrier (P3)
- `src/app/api/admin/audit/route.ts` — Audit trail filtrable (P4)
- `src/app/api/client-enterprise/interventions/request/route.ts` — Demande intervention client (P2)
- `src/app/api/client-enterprise/interventions/[id]/feedback/route.ts` — Feedback client (P2)
- `src/app/api/client-enterprise/interventions/[id]/acknowledge/route.ts` — Signature digitale (P2)
- `src/app/api/scheduling/auto-assign/route.ts` — Matching auto technicien (P3)
- `src/app/api/cron/maintenance/route.ts` — Trigger manuel jobs + statut (P1)

### Automatisations (node-cron)
- `src/lib/maintenance/jobs/preventive-visits.ts` — Génération visites sur 90j (P1)
- `src/lib/maintenance/jobs/renewal-reminders.ts` — Rappels renouvellement + auto-draft (P1)
- `src/lib/maintenance/jobs/sla-monitoring.ts` — Détection dépassement SLA (P1)
- `src/instrumentation.ts` — Boot automatique jobs (P1)

### UI
- `src/components/TechnicianPortal.tsx` — Portail technicien
- `src/components/admin/MaintenanceCenter.tsx` — Centre maintenance admin
- `src/components/admin/AdminPlanning.tsx` — Planning admin liste/calendrier (P3)
- `src/components/client/RequestInterventionButton.tsx` — Formulaire demande (P2)
- `src/components/client/InterventionFeedback.tsx` — Feedback + signature (P2)
- `src/app/portail-entreprise/interventions/page.tsx` — Portail client (P2)
