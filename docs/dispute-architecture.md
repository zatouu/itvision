# Architecture du module Dispute

> Statut : proposition à valider avant implémentation.

## 1. Contexte & contraintes

Stack existante : Next.js 15 (App Router), TypeScript strict, MongoDB/Mongoose, authentification JWT (`@/lib/jwt`), base de code dans `src/`.

Contraintes :
- Ne pas casser l'existant.
- Aucune dépendance vers Kafka/Redis/microservices.
- Communications inter-modules via événements internes + interfaces.
- Les routes REST respectent `/api/disputes/*` (convention Next.js App Router).

## 2. Objectif métier

Transformer le litige en workflow métier complet autour des missions de services (`ServiceRequest`) et de leurs paiements (`Payment`).

Un litige concerne :
- une mission (`missionId`)
- un client (`clientId`)
- un prestataire (`providerId`)
- un paiement en escrow (`Payment`)

## 3. Arborescence du module (`src/dispute/`)

```
src/dispute/
├── index.ts                    # API publique du module (facade)
├── config/
│   └── dispute.config.ts       # SLA, priorités, seuils
├── model/
│   ├── Dispute.ts              # Mongoose schemas + types
│   ├── DisputeMessage.ts
│   ├── DisputeEvidence.ts
│   ├── DisputeHistory.ts
│   └── DisputeDecision.ts
├── domain/
│   ├── enums/
│   │   ├── DisputeStatus.ts
│   │   ├── DisputePriority.ts
│   │   ├── DisputeReason.ts
│   │   └── DisputeDecision.ts
│   ├── entity/
│   │   └── DisputeEntity.ts    # Entité pure (règles métier clés)
│   ├── exception/
│   │   ├── DisputeError.ts
│   │   ├── DisputeTransitionError.ts
│   │   ├── DisputeValidationError.ts
│   │   └── DisputeBusinessError.ts
│   └── vo/
│       ├── Reference.ts
│       └── EvidenceType.ts
├── workflow/
│   ├── DisputeWorkflowEngine.ts          # interface
│   ├── DefaultDisputeWorkflowEngine.ts   # implémentation
│   ├── state-machine.ts                  # graphe des transitions
│   └── transition-guards.ts              # règles de transition
├── repository/
│   ├── DisputeRepository.ts      # interface
│   └── MongooseDisputeRepository.ts
├── service/
│   ├── DisputeService.ts         # interface
│   └── DisputeServiceImpl.ts     # orchestration use-cases
├── dto/
│   ├── CreateDisputeDto.ts
│   ├── UpdateDisputeDto.ts
│   ├── AddMessageDto.ts
│   ├── AddEvidenceDto.ts
│   ├── AssignDisputeDto.ts
│   ├── TakeDecisionDto.ts
│   ├── AppealDisputeDto.ts
│   ├── CloseDisputeDto.ts
│   └── ListDisputeQueryDto.ts
├── mapper/
│   └── DisputeMapper.ts
├── validation/
│   └── DisputeZodSchemas.ts      # Zod (déjà utilisé)
├── event/
│   ├── DisputeEvent.ts           # types d'événements
│   └── EventPublisher.ts         # interface + implémentation in-memory
├── listener/
│   ├── DisputeNotificationListener.ts
│   ├── DisputeEscrowListener.ts
│   ├── DisputeAuditListener.ts
│   └── DisputeSlaListener.ts
├── audit/
│   └── AuditService.ts           # interface + implémentation
├── sla/
│   ├── SlaEngine.ts              # interface
│   └── DefaultSlaEngine.ts
├── notification/
│   └── DisputeNotificationAdapter.ts   # ports vers module notifications
├── controller/
│   └── DisputeController.ts      # handlers Next.js
└── __tests__/
    ├── workflow.engine.test.ts
    └── dispute.api.test.ts
```

Routes exposées via `src/app/api/disputes/` (fines couches Next.js qui délèguent au `controller`).

## 4. Modèle de données

### 4.1 Dispute

```ts
interface Dispute {
  id: string;
  reference: string;              // DIS-YYYYMM-XXXXXX
  missionId: string;              // ServiceRequest._id
  clientId: string;
  providerId: string;
  paymentId?: string;             // Payment._id lié
  status: DisputeStatus;
  priority: DisputePriority;
  reason: DisputeReason;
  description: string;
  assignedAdminId?: string;
  decision?: DisputeDecision;     // dernière décision
  decisionId?: string;            // référence DisputeDecision
  openedAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  slaDeadlineAt?: Date;
  escalationCount: number;
  metadata?: Record<string, unknown>;
}
```

### 4.2 DisputeMessage

```ts
interface DisputeMessage {
  id: string;
  disputeId: string;
  authorType: 'CLIENT' | 'PROVIDER' | 'ADMIN' | 'SYSTEM';
  authorId: string;
  message: string;
  createdAt: Date;
  readAt?: Date;
}
```

### 4.3 DisputeEvidence

```ts
interface DisputeEvidence {
  id: string;
  disputeId: string;
  type: 'image' | 'video' | 'audio' | 'pdf' | 'other';
  url: string;
  comment?: string;
  uploadedBy: string;
  uploadedByType: 'CLIENT' | 'PROVIDER' | 'ADMIN';
  createdAt: Date;
}
```

### 4.4 DisputeHistory

```ts
interface DisputeHistory {
  id: string;
  disputeId: string;
  action: string;                 // ex: 'status_changed', 'evidence_added'
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  performedBy: string;
  performedByType: 'CLIENT' | 'PROVIDER' | 'ADMIN' | 'SYSTEM';
  performedAt: Date;
  metadata?: Record<string, unknown>;
}
```

### 4.5 DisputeDecision

```ts
interface DisputeDecision {
  id: string;
  disputeId: string;
  decision: DisputeDecision;
  reason: string;
  adminId: string;
  amount?: number;                // pour PARTIAL_REFUND
  createdAt: Date;
  isFinal: boolean;
}
```

## 5. Énumérations

```ts
enum DisputeStatus {
  OPEN = 'OPEN',
  WAITING_PROVIDER = 'WAITING_PROVIDER',
  WAITING_CLIENT = 'WAITING_CLIENT',
  UNDER_REVIEW = 'UNDER_REVIEW',
  DECIDED = 'DECIDED',
  APPEALED = 'APPEALED',
  CLOSED = 'CLOSED',
}

enum DisputePriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

enum DisputeReason {
  MISSION_NOT_COMPLETED = 'MISSION_NOT_COMPLETED',
  BAD_QUALITY = 'BAD_QUALITY',
  DELAY = 'DELAY',
  OVERCHARGE = 'OVERCHARGE',
  BEHAVIOR = 'BEHAVIOR',
  FRAUD = 'FRAUD',
  OTHER = 'OTHER',
}

enum DisputeDecision {
  RELEASE_ESCROW = 'RELEASE_ESCROW',
  REFUND = 'REFUND',
  PARTIAL_REFUND = 'PARTIAL_REFUND',
  REJECT = 'REJECT',
  CANCEL = 'CANCEL',
  OTHER = 'OTHER',
}
```

## 6. Machine à états

```text
OPEN
  → WAITING_PROVIDER   (assign / reply by admin)
  → WAITING_CLIENT     (request evidence from client)
  → UNDER_REVIEW       (enough evidence collected)

WAITING_PROVIDER
  → OPEN               (provider answered, back to admin triage)
  → UNDER_REVIEW       (provider sent evidence)

WAITING_CLIENT
  → OPEN               (client answered)
  → UNDER_REVIEW       (client sent evidence)

UNDER_REVIEW
  → DECIDED            (admin decision)
  → WAITING_PROVIDER   (admin asks more info)
  → WAITING_CLIENT     (admin asks more info)

DECIDED
  → CLOSED             (no appeal within window)
  → APPEALED           (party appeals)

APPEALED
  → UNDER_REVIEW       (reopened for review)
  → CLOSED             (final decision after appeal)

CLOSED
  → (terminal)
```

Transitions interdites (non exhaustive) :
- `OPEN → CLOSED`
- `OPEN → DECIDED`
- `CLOSED → *`
- `DECIDED → WAITING_PROVIDER` (doit passer par `APPEALED` puis `UNDER_REVIEW`)

## 7. Interfaces publiques

### 7.1 Workflow Engine

```ts
interface DisputeWorkflowEngine {
  open(context: OpenContext): Promise<Dispute>;
  assign(disputeId: string, adminId: string, actor: Actor): Promise<Dispute>;
  reply(disputeId: string, actor: Actor, message: string): Promise<Dispute>;
  requestEvidence(disputeId: string, target: 'CLIENT' | 'PROVIDER', actor: Actor): Promise<Dispute>;
  takeDecision(disputeId: string, decision: DecisionInput, actor: Actor): Promise<Dispute>;
  appeal(disputeId: string, reason: string, actor: Actor): Promise<Dispute>;
  close(disputeId: string, actor: Actor): Promise<Dispute>;
  changeState(disputeId: string, to: DisputeStatus, actor: Actor, reason?: string): Promise<Dispute>;
  canTransition(from: DisputeStatus, to: DisputeStatus): boolean;
}
```

### 7.2 Service

```ts
interface DisputeService {
  create(dto: CreateDisputeDto, actor: Actor): Promise<Dispute>;
  list(query: ListDisputeQueryDto): Promise<Paginated<Dispute>>;
  getById(id: string, actor: Actor): Promise<Dispute | null>;
  addMessage(id: string, dto: AddMessageDto, actor: Actor): Promise<DisputeMessage>;
  addEvidence(id: string, dto: AddEvidenceDto, actor: Actor): Promise<DisputeEvidence>;
  assign(id: string, dto: AssignDisputeDto, actor: Actor): Promise<Dispute>;
  takeDecision(id: string, dto: TakeDecisionDto, actor: Actor): Promise<Dispute>;
  appeal(id: string, dto: AppealDisputeDto, actor: Actor): Promise<Dispute>;
  close(id: string, dto: CloseDisputeDto, actor: Actor): Promise<Dispute>;
}
```

### 7.3 Event Publisher

```ts
interface EventPublisher {
  publish<T extends DisputeEvent>(event: T): void;
  subscribe<T extends DisputeEvent>(
    eventName: string,
    handler: (event: T) => void | Promise<void>
  ): () => void;
}
```

## 8. Règles métier (guards)

Centralisées dans `transition-guards.ts` et `DisputeEntity` :

1. Une seule dispute `OPEN/WAITING_PROVIDER/WAITING_CLIENT/UNDER_REVIEW/DECIDED/APPEALED` par `missionId`.
2. Impossible d'ouvrir si `ServiceRequest.status === 'cancelled'`.
3. Impossible de fermer sans `decision` (sauf `CANCEL` par admin).
4. Aucune suppression d'évidence possible (suppression logique non autorisée).
5. Décision validée (`isFinal: true`) non modifiable.
6. Le statut ne peut être modifié directement : passage obligé par le workflow engine.
7. Gel de l'escrow à l'ouverture : publication `EscrowFreezeRequested`.
8. Mission verrouillée tant que dispute active : `ServiceRequest` conserve `status: 'dispute'`.

## 9. Événements métier

```ts
type DisputeEvent =
  | DisputeOpened
  | DisputeAssigned
  | DisputeEvidenceAdded
  | DisputeMessageSent
  | DisputeDecisionTaken
  | DisputeEscalated
  | DisputeClosed
  | EscrowFreezeRequested
  | EscrowReleaseRequested
  | EscrowRefundRequested;
```

Listeners :
- `DisputeNotificationListener` : écoute `DisputeOpened`, `DisputeClosed`, `DisputeDecisionTaken`.
- `DisputeEscrowListener` : écoute `EscrowFreezeRequested`, `EscrowReleaseRequested`, `EscrowRefundRequested`.
- `DisputeAuditListener` : écoute tous les événements pour écrire `DisputeHistory`.
- `DisputeSlaListener` : écoute `DisputeOpened`/`DisputeMessageSent` pour mettre à jour `slaDeadlineAt`.

## 10. SLA Engine

```ts
interface SlaEngine {
  computeDeadline(status: DisputeStatus, priority: DisputePriority, openedAt: Date): Date;
  shouldEscalate(dispute: Dispute): boolean;
  escalate(dispute: Dispute): Promise<void>;
}
```

Configuration par défaut (overridable via `dispute.config.ts`) :
- `OPEN` → réponse sous 48h, sinon `DisputeEscalated` + notification admin.
- Priorité `CRITICAL` : 4h.
- Priorité `HIGH` : 24h.

## 11. API REST

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| POST | `/api/disputes` | Créer un litige | client, admin |
| GET | `/api/disputes` | Liste paginée + filtres | admin |
| GET | `/api/disputes/:id` | Détail | participant / admin |
| POST | `/api/disputes/:id/messages` | Ajouter un message | participant / admin |
| POST | `/api/disputes/:id/evidence` | Ajouter une preuve | participant / admin |
| POST | `/api/disputes/:id/assign` | Assigner un admin | admin |
| POST | `/api/disputes/:id/decision` | Prendre une décision | admin |
| POST | `/api/disputes/:id/appeal` | Faire appel | client / provider |
| POST | `/api/disputes/:id/close` | Clôturer | admin |

## 12. Audit

`AuditService` écrit dans `DisputeHistory` à chaque action métier.
Exemples d'actions : `DISPUTE_CREATED`, `EVIDENCE_ADDED`, `EVIDENCE_DELETE_REJECTED`, `MESSAGE_SENT`, `DECISION_TAKEN`, `DISPUTE_CLOSED`, `DISPUTE_ESCALATED`, `ASSIGNMENT_CHANGED`.

## 13. Branchement progressif

Phase 1 (ce ticket) : module autonome + routes API.
Phase 2 : `ServiceRequest` passe `status` à `dispute` et `escrowLocked` à `true` via listener escrow.
Phase 3 : `Payment` écoute `EscrowReleaseRequested` / `EscrowRefundRequested` pour libérer/rembourser.
Phase 4 : module Notifications écoute `DisputeOpened`, `DisputeClosed`, `DisputeDecisionTaken`.

## 14. Tests

- **Unitaires** : `workflow.engine.test.ts` (transitions autorisées/interdites, guards).
- **Intégration** : `dispute.api.test.ts` (création, messages, preuves, décision, appel, clôture).

Runner proposé : `vitest` (non présent actuellement, à ajouter en `devDependencies` avec `@vitest/coverage-v8`).

## 15. Questions de validation avant codage

1. Validez-vous l'emplacement `src/dispute/` et les routes `/api/disputes/*` ?
2. Le litige porte-t-il sur `ServiceRequest` (missions services) ou faut-il aussi supporter `EscrowTransaction` marketplace ?
3. Acceptez-vous l'ajout de `vitest` pour les tests ?
4. Préférez-vous `zod` ou `class-validator` pour la validation DTO ? (`zod` est déjà dans les deps)
5. Le SLA doit-il être exécuté par un cron existant (`node-cron`) ou un `ScheduledTask` du module `scheduling` ?
