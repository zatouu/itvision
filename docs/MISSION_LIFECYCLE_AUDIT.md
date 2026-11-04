# Audit & Durcissement du Cycle de Vie des Missions

## Résumé exécutif

Audit complet et durcissement du lifecycle manager des missions (`src/lib/mission-lifecycle.ts`) et des points d'entrée associés. Les règles métier sont désormais centralisées, atomiques, tracées et protégées contre les transitions illégales, doubles opérations et usurpations de rôle. Le flux de validation à deux niveaux (`AWAITING_CLIENT_VALIDATION`) est implémenté, le litige verrouille l'escrow, et un journal d'audit immuable + un moteur d'anomalies sont en place.

**Validation :** `tsc --noEmit` passe (0 erreur).

---

## 1. Matrice des transitions autorisées

`X` = autorisé, `R` = réservé admin/systeme, `-` = interdit.

| From / To         | broadcasted | accepted | on_the_way | arrived | in_progress | paused | awaiting_validation | completed | cancelled | dispute | expired | archived |
|-------------------|-------------|----------|------------|---------|-------------|--------|---------------------|-----------|-----------|---------|---------|----------|
| created           | X           | -        | -          | -       | -           | -      | -                   | -         | X         | -       | R       | -        |
| broadcasted       | -           | X        | -          | -       | -           | -      | -                   | -         | X         | -       | R       | -        |
| accepted          | -           | -        | X          | -       | -           | -      | -                   | -         | X         | X       | -       | -        |
| on_the_way        | -           | -        | -          | X       | -           | -      | -                   | -         | X         | X       | -       | -        |
| arrived           | -           | -        | -          | -       | X           | X      | -                   | -         | X         | X       | -       | -        |
| in_progress       | -           | -        | -          | -       | -           | X      | X                   | -         | X         | X       | -       | -        |
| paused            | -           | -        | -          | -       | X           | -      | -                   | -         | X         | X       | -       | -        |
| awaiting_validation | -         | -        | -          | -       | X           | -      | -                   | X         | X         | X       | -       | -        |
| completed         | -           | -        | -          | -       | -           | -      | -                   | -         | -         | -       | -       | R        |
| cancelled         | -           | -        | -          | -       | -           | -      | -                   | -         | -         | -       | -       | R        |
| expired           | -           | -        | -          | -       | -           | -      | -                   | -         | -         | -       | -       | R        |
| dispute           | -           | -        | -          | -       | -           | -      | -                   | R         | R         | -       | -       | R        |
| archived          | -           | -        | -          | -       | -           | -      | -                   | -         | -         | -       | -       | -        |

## 2. Matrice rôles × actions

| Action                         | Client | Provider | Admin/System | Règle métier clé |
|--------------------------------|--------|----------|--------------|------------------|
| `created → broadcasted`        | -      | (auto, 1ère offre) | - | Provider crée la 1ère offre |
| `broadcasted → accepted`       | X      | -        | X            | Via acceptation d'offre avec `selectedOfferId` + `assignedProviderId` |
| `accepted → on_the_way`        | -      | X        | X            | Provider en route |
| `on_the_way → arrived`         | -      | X        | X            | Provider sur place |
| `arrived → in_progress`        | -      | X        | X            | Provider démarre |
| `in_progress → awaiting_validation` | -   | X        | X            | Provider déclare terminé |
| `awaiting_validation → completed` | X    | -        | X            | Seul le client valide (validation 2 niveaux) |
| `awaiting_validation → in_progress` | X  | -        | X            | Client demande des corrections |
| `* → cancelled`                | X      | avant démarrage uniquement | X | Provider ne peut plus annuler une mission démarrée |
| `* → dispute`                  | X      | X        | X            | Bloque l'escrow et le paiement |
| `dispute → *`                  | -      | -        | X            | Seul l'admin résout un litige |
| `* → expired`                  | -      | -        | R            | Job d'inactivité / `expiresAt` |
| `* → archived`                 | -      | -        | R            | Archivage admin/systeme |
| Pause                          | X      | X        | X            | Uniquement `arrived` ou `in_progress`, raison obligatoire |
| Resume                         | X      | X        | X            | Reprend le statut avant pause |

## 3. Matrice Paiement × Statut

| Statut mission | Paiement held | Action possible | Verrou escrow |
|----------------|---------------|-----------------|---------------|
| created/broadcasted | pending | Initier acompte/total | Non |
| assigned/provider_arriving/in_progress | deposit held | Payer solde | Non |
| awaiting_validation | deposit/balance held | Client valide → completed | Non |
| completed | non-cash auto released; cash reste held | Provider confirme cash via `/api/payments/release` | Non |
| dispute | held (non libérable) | Résolution admin | Oui |
| cancelled | refunded (sauf annulation tardive client) | - | Non |

## 4. Matrice Notifications

| Événement | Socket rooms | Push | Notes |
|-----------|--------------|------|-------|
| Changement de statut | `request-{id}`, `user-{clientId}`, `provider-{providerId}` | Client + Provider | Admin/systeme notifie les deux parties |
| Pause / Resume | `request-{id}` | Client + Provider | Raison incluse |
| Litige | `request-{id}` | Client + Provider | Motif inclus |
| Paiement libéré | - | Provider | Montant crédité |
| Paiement remboursé | - | Client | Montant remboursé |
| Inactivité | - | Client + Provider | 3 relances escaladées |
| Provider en route | `request-{id}` | Client | `provider:location` + push |

---

## 5. Vulnérabilités identifiées et corrections

| # | Vulnérabilité | Impact | Correction |
|---|---------------|--------|------------|
| 1 | `completed` atteignable directement depuis `in_progress` / `paused` | Le prestataire pouvait court-circuiter la validation client | Retiré `completed` de ces transitions ; oblige `awaiting_validation` |
| 2 | Provider pouvait valider la fin de mission | Paiement libéré sans accord client | `canTransition` interdit `to=completed` pour provider/admin ; `validateCompletion` restreint |
| 3 | Sortie de `dispute` non restreinte | Client/provider pouvait clore un litige et libérer les fonds | Sorties de litige réservées à admin/systeme |
| 4 | `expired` / `archived` atteignables par un client/provider | Usurpation de l'automatisation | Réservé admin/systeme dans `canTransition` |
| 5 | Ouverture de litige réservée à admin/systeme | Les participants ne pouvaient pas légalement ouvrir un litige | Autorisé client/provider/admin |
| 6 | `transition` non atomique (`findById` + `save`) | Double acceptation, race conditions | `findOneAndUpdate` avec condition `status: from` |
| 7 | `pause` non atomique | Deux pauses simultanées possibles | `findOneAndUpdate` avec `$push pauseLog` |
| 8 | `releaseHeldPayments` non atomique | Double crédit fournisseur possible | Boucle `findOneAndUpdate` status `held → released` |
| 9 | Paiement cash libéré automatiquement | Client valide, prestataire n'a pas encore reçu le cash | Cash maintenu `held` ; confirmation via `/api/payments/release` |
| 10 | `provider:location` non autorisé | N'importe quel provider pouvait spoof la position d'une mission | Vérification `assignedProviderId` + statut actif côté serveur |
| 11 | Offres acceptables sur missions non ouvertes | Provider pouvait offrir sur une mission déjà assignée | `offers` route rejette si statut ∉ `{created,broadcasted,pending_offers}` |
| 12 | `accepted` sans `assignedProviderId`/`selectedOfferId` | Mission acceptée sans prestataire/offre | `transition` exige ces métadonnées et les persiste |
| 13 | `service-acceptance` ne persistait pas `assignedProviderId` | Requête `accepted` sans `selectedOfferId` | Corrigé via `transition` atomique |
| 14 | `payments/refund` modifiait directement `ServiceRequest` | Contournement du lifecycle | Route via `lifecycle.transition('cancelled')` |
| 15 | `payments/initiate` sans vérification litige | Paiement possible en cours de litige | Bloqué si `escrowLocked` |
| 16 | Pas de journal d'audit | Impossible de tracer qui a fait quoi | `MissionAuditLog` + `logAudit()` sur chaque transition/pause/reprise |
| 17 | Pas de détection d'anomalies | Admin sans visibilité sur missions à risque | `MissionAnomaly`/`mission-anomalies.ts` + endpoint admin |
| 18 | `stats/lifecycle` charge toutes les missions | Risque DoS/perf | Mentionné ; recommandation pagination/aggrégation |

---

## 6. Flux de validation à deux niveaux

```
in_progress ──(provider)──> awaiting_validation ──(client)──> completed
                              │
                              └─(client demande corrections)─> in_progress
```

- Le prestataire clique "Terminer" : `PATCH { status: 'awaiting_validation' }`.
- Le client reçoit une notification + bouton "Valider".
- Le client valide : `PATCH { action: 'validate' }` → `completed`.
- Seule la validation client (ou admin) déclenche `releaseHeldPayments`.
- Si le client conteste : `PATCH { action: 'dispute' }` → `dispute` verrouille l'escrow.

---

## 7. Journal d'audit (`MissionAuditLog`)

Modèle `src/lib/models/MissionAuditLog.ts`. Chaque transition/pause/reprise crée une entrée immuable avec :
- `requestId`, `actorId`, `actorRole`
- `action` (`status_changed`, `pause`, `resume`, `payment_released`, …)
- `fromStatus`, `toStatus`, `reason`, `metadata`
- `ip`, `userAgent`, `platform`

Index : `{ requestId, createdAt }`, `{ action, createdAt }`.

---

## 8. Détection d'anomalies

`src/lib/mission-anomalies.ts` + `src/app/api/admin/mission-anomalies/route.ts`.

Anomalies détectées :
- `long_mission` (> 8h actives)
- `long_pause` (> 4h)
- `many_pauses` (≥ 3)
- `long_acceptance` (> 7j création→assignation)
- `long_arrival` (> 4h assignation→arrivée)
- `late_validation` (> 48h en awaiting_validation)
- `payment_not_released` (completed avec paiement encore held)

Recalcul automatique à chaque transition/pause/reprise via `refreshMissionAnomalies()`.

---

## 9. Fichiers modifiés / créés

- `src/lib/mission-lifecycle.ts` — durcissement central
- `src/lib/models/ServiceRequest.ts` — champs `escrowLocked`, `anomalyFlags`, `anomalyScore`
- `src/lib/models/Payment.ts` — `releasedBy`, `refundedBy`
- `src/lib/models/MissionAuditLog.ts` — nouveau modèle audit
- `src/lib/mission-anomalies.ts` — moteur d'anomalies
- `src/lib/service-acceptance.ts` — métadonnées acceptation
- `src/lib/mission-inactivity-job.ts` — expiration automatique
- `src/app/api/services/requests/[id]/route.ts` — admin, contexte audit, exclusion mutuelle
- `src/app/api/services/requests/[id]/accept/route.ts` — déjà revu
- `src/app/api/services/offers/route.ts` — blocage offres sur missions fermées
- `src/app/api/payments/initiate/route.ts` — blocage litige
- `src/app/api/payments/release/route.ts` — atomicité + verrou litige
- `src/app/api/payments/refund/route.ts` — routage lifecycle
- `src/app/api/admin/mission-anomalies/route.ts` — endpoint admin
- `server.js` — vérification `provider:location`
- `mobile/provider/app/active-mission/[id].tsx` — `awaiting_validation`, timeline, annulation
- `mobile/provider/src/i18n/{fr,en,wo}.json` — clé `step_awaiting_validation`
- `mobile/consumer/src/i18n/{fr,en,wo}.json` — clé `step_awaiting_validation`
- `MISSION_LIFECYCLE_AUDIT.md` — ce document

---

## 10. Recommandations complémentaires

### P0 déjà traitées
- [x] Validation à deux niveaux
- [x] Rôles et permissions stricts
- [x] Atomicité des transitions/paiements
- [x] Audit immuable
- [x] Anomalies admin

### P1 recommandées
1. **Signature webhooks paiement** : ajouter la vérification provider-specific (Wave/Orange/Free) dans `payments/webhook`.
2. **Index MongoDB** : s'assurer que `ServiceRequest.status` + `lastActivityAt` et `Payment.requestId` + `status` sont indexés.
3. **Rate limiting** : appliquer `rate-limit` sur `PATCH /requests/[id]` pour éviter double-clics.
4. **Tests automatisés** : ajouter des tests unitaires sur `canTransition`, `releaseHeldPayments`, `detectMissionAnomalies`.
5. **Pagination `stats/lifecycle`** : remplacer le `find().lean()` global par une aggrégation MongoDB avec fenêtre temporelle.
6. **Réconciliation paiement** : si `creditCashBalance` échoue après `status: released`, prévoir un job de retry et un statut `release_failed`.
7. **Interface admin** : page listant `MissionAuditLog` pour une mission et `MissionAnomaly`.

---

## 11. Vérification

```bash
node node_modules\typescript\bin\tsc --noEmit
# Resultat : 0 erreur
```

---

*Document généré après audit et durcissement du cycle de vie des missions.*
