## Backlog des fonctionnalités à câbler ou améliorer

Date: 2025-10-17

### Projets (Gestion de Projets IT Vision)

| Élément | Description | Faisabilité | Apport |
| --- | --- | --- | --- |
| Brancher endpoints granulaires | Connecter l’UI aux endpoints `/api/projects/[id]/milestones`, `/timeline`, `/products`, `/documents`, `/quote` pour créer/modifier/supprimer sans recharger | Moyenne | Élevé |
| Persistance côté serveur | Remplacer le fallback `localStorage` par une source serveur par défaut (Mongo) + pagination/tri/filtre serveur | Moyenne | Élevé |
| Recherche et filtres avancés | Filtres par statut, service, dates; recherche texte côté serveur | Facile | Moyen |
| Progression de phase sync | Utiliser `/api/projects/advance` partout (modale, liste) avec retours d’état et toasts | Facile | Moyen |
| Notifications projet | Notification admin/assignés lors de changement de phase/milestone; intégration `notifications-memory` (ou persistant) | Moyenne | Élevé |
| Pièces jointes | Upload/preview documents (contrats, devis, photos) via `/documents` avec validations MIME/taille | Moyenne | Élevé |
| Quote ↔ Projet | Synchroniser le devis attaché (PATCH `/quote`) + export PDF + envoi client | Moyenne | Élevé |
| Rôles et droits | RBAC: visibilité/édition par rôle (ADMIN, PM, TECH) sur champs critiques | Difficile | Élevé |
| Historique & audit | Alimentation automatique de `timeline` et audit trail (qui a fait quoi/quand) | Moyenne | Élevé |
| UX modales | Deep-link pour ouvrir directement création/édition via query (`?new=1`/`?id=PRJ-xxx`) | Facile | Moyen |

### Rapports & Validation Admin

| Élément | Description | Faisabilité | Apport |
| --- | --- | --- | --- |
| File d’attente fiable | Vérifier/étendre le GET `/api/admin/reports/validate` (filtres, pagination, tri) | Facile | Élevé |
| Analytics validation | Finaliser `/api/admin/analytics/validation` (taux d’acceptation, délais, urgents) | Moyenne | Élevé |
| Notifications validation | À la soumission/validation: in-app + email (admin/technicien) | Moyenne | Élevé |
| Aperçu enrichi | Visualisation photos, signatures, GPS, diff entre versions | Moyenne | Moyen |
| Règles métiers | Règles d’acceptation (champs obligatoires, score qualité) | Moyenne | Moyen |

### Devis & Catalogue

| Élément | Description | Faisabilité | Apport |
| --- | --- | --- | --- |
| Unifier prix | Lier pages admin Prix/Catalogue au Générateur: sources de vérité (coût, vente, marge) | Moyenne | Élevé |
| Marges & alertes | Calculs de marge avec seuils et warnings | Facile | Moyen |
| Export PDF | Devis PDF brandé + options (conditions, signature) | Moyenne | Élevé |
| Sauvegarde & attachement | Sauvegarder devis et l’attacher au projet (PATCH `/quote`) | Facile | Élevé |

### Wizard Diagnostic (Digitalisation)

| Élément | Description | Faisabilité | Apport |
| --- | --- | --- | --- |
| Persistance BDD | Sauvegarder chaque soumission (Mongo) + ID de suivi | Facile | Élevé |
| RDV & planning | Bouton "Planifier" vers module planning, pré-rempli | Facile | Moyen |
| Emails transactionnels | Gabarits HTML (admin + accusé client) via `Nodemailer` (env requis) | Facile | Moyen |
| PDF brandé | Améliorer le PDF (charte, sections, sommaire, QR) | Moyenne | Élevé |
| Captcha & anti-spam | reCAPTCHA ou hCaptcha côté client/serveur | Moyenne | Moyen |
| Analytics wizard | Événements (taux complétion, étapes abandonnées) | Moyenne | Moyen |

### Notifications (Système)

| Élément | Description | Faisabilité | Apport |
| --- | --- | --- | --- |
| Persistance | Remplacer in-memory par collection Mongo (TTL pour anciens) | Moyenne | Élevé |
| Temps réel | SSE/WebSocket pour push live (admin/tech) | Difficile | Élevé |
| Ciblage | Notifications par rôle/utilisateur + préférences | Moyenne | Moyen |
| Centre notifs | Marquer comme lu/filtrer/archives, visible partout | Moyenne | Moyen |

### Authentification & Sécurité

| Élément | Description | Faisabilité | Apport |
| --- | --- | --- | --- |
| Unifier tokens | Harmoniser `auth-token`/`admin-auth-token`/`tech-auth-token`; plan Keycloak | Moyenne | Élevé |
| CSRF | Généraliser `csrf-protection` sur POST/PUT/PATCH/DELETE | Facile | Élevé |
| Rate limiting | Limiter routes sensibles + logs sécurité | Facile | Moyen |
| RBAC central | Middleware rôle/permissions réutilisable | Moyenne | Élevé |

### UI/UX transversal

| Élément | Description | Faisabilité | Apport |
| --- | --- | --- | --- |
| En-têtes & fil d’Ariane | Uniformiser header/breadcrumb (ex: devis projet déjà corrigé) | Facile | Moyen |
| Toasts & états | États de chargement, succès/erreur uniformes | Facile | Moyen |
| Skeletons | Placeholders sur listes et tableaux | Facile | Moyen |
| Accessibilité | Focus states, aria-labels, contraste | Moyenne | Moyen |
| Design tokens | Harmoniser couleurs/espacements (Tailwind) | Facile | Moyen |

### Opérations & Observabilité

| Élément | Description | Faisabilité | Apport |
| --- | --- | --- | --- |
| Variables d’env | Vérifier SMTP, ADMIN_EMAIL, JWT_SECRET en env | Facile | Élevé |
| Logs & métrologie | Journaux structurés + métriques (latences, erreurs) | Moyenne | Moyen |
| Erreurs contrôlées | Pages d’erreur amicales + boundary React | Facile | Moyen |

### Portail Client & Techniciens (Roadmap)

- ✅ **Vue Project Live** (Phase 1 livrée) : résumé projet client, timeline, docs, techniciens assignés, création de ticket directe.
- 🔜 **Module Tickets client complet** : fil de discussion, pièces jointes, suivi SLA et routage admin (phase 1.2).
- 🔜 **Job Dispatch temps réel** : diffusion d’interventions aux techniciens, réponses/négociation, notifications push/SMS (phase 1.3).
- 🔜 **Tableau de pilotage admin** : liste priorisée tickets & interventions, filtres SLA, assignation rapide.
