# Support & Tickets V2

## Vue d’ensemble

- **Domaines couverts** : demandes client (incident, requête, changement), affectation techniciens, suivi SLA, historique complet.
- **Interfaces** :
  - Portail client : `ClientProjectLiveView` + `ClientTicketCenter` (vue par projet, réponses, fichiers).
  - Backoffice / techniciens : `/admin/tickets` (filtrage, priorisation, réponses rapides, changement de statut).
- **Objectif microservice** : la logique métier est isolée dans `src/lib/services/tickets.ts`. Cette couche permet de détacher facilement l’API vers un service externe (REST ou file de messages) sans impacter les UI.

## Architecture applicative

```
Client Web ─┬─ /client-portal              (Vue Project Live + tickets)
            └─ /admin/tickets              (Dashboard support)

API Next ───> /api/tickets                (liste, création, update)
            └─ /api/tickets/[id]          (détail, nouveaux messages)

Persistant ─► MongoDB
```

### Modèle Mongo (`src/lib/models/Ticket.ts`)

- **Champs principaux** : `status`, `priority`, `category`, `assignedTo`, `watchers`, `sla`, `history`.
- **Messages** : chaque ticket dispose d’un tableau `messages` (multiples rôles, pièces jointes, notes internes).
- **Historique** : mutations (statut, assignation, notes) enregistrées dans `history` pour audit et export.
- **SLA** : `targetHours` configurable, `deadlineAt` recalculé automatiquement, flags `breached`, `resolvedAt`.

### Service métier (`src/lib/services/tickets.ts`)

- `serialize(ticket)` : transforme le document Mongo en payload JSON stable pour les UI (utile si on déporte vers un microservice REST).
- `canAccess(role, userId, ticket)` : contrôle d’accès par rôle (client, technicien assigné, admin).
- `appendMessage`, `appendHistory` : helpers pour centraliser l’écriture messages/historique.
- `getTicketById(id)` : fonction utilitaire (valide + typed) pour reuse.

## Scénarios utilisateur

### Client (portail)

1. Accède à `/client-portal` ⇒ sélectionne un projet.
2. Onglet “Tickets & support” :
   - Liste de ses tickets + statut/priorité.
   - Formulaire création (titre, catégorie, priorité, description).
   - Thread de conversation (messages non internes).
3. Envoi de message ⇒ POST `/api/tickets/:id`.

### Admin / Technicien

1. `Menu > Tickets Support` ⇒ page `/admin/tickets`.
2. Filtres : statut, priorité, recherche texte.
3. Actions rapides : “Prendre en charge”, “Marquer résolu”, réponse via textarea (POST `/api/tickets/:id`).
4. Historique/export : accessible via `history` (prêt pour future UI).

## Externalisation en microservice

- **Couche API** : `/api/tickets` et `/api/tickets/[id]` sont volontairement minces. On peut :
  - Soit garder le même contrat JSON et appeler un service externe (via `fetch` ou gRPC).
  - Soit déplacer `TicketService` et l’appeler via un SDK interne.
- **File de messages** : les notifications SLA (`Notification.create(...)`) sont centralisées, prêtes à être remplacées par un worker.
- **Sécurité** : le middleware `verifyToken` (rôle + id) reste dans Next, l’API externe peut se baser sur la même payload JWT.

## Tests manuels recommandés

1. Se connecter en client : `/client-portal` ⇒ créer un ticket ⇒ vérifier qu’il apparaît dans la liste.
2. Se connecter en admin : `/admin/tickets` ⇒ voir le ticket créé, modifier statut, répondre ⇒ vérifier le fil côté client.
3. Vérifier les transitions SLA : mettre la deadline proche, vérifier que les notifications console sont créées (logs).
4. Tester la responsivité (mobile vs desktop) sur les deux interfaces.

## Prochaines étapes

- Uploader de vraies pièces jointes (intégration avec `/api/upload`).
- Notifications temps réel (SSE/WebSocket) et alerte mobile/SMS.
- Microservice dédié : exposer l’API via `support.microservice.myapp` et remplacer les helpers par des appels réseau.
- Gestion des templates email (création, résolution, SLA).
