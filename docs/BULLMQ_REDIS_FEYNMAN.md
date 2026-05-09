# BullMQ + Redis expliqué simplement (avec analogies Kafka)

## Objectif

Ce document explique **comment BullMQ + Redis fonctionne réellement**, son **positionnement**, et **quand l’utiliser** dans ce projet.

Public cible: développeur connaissant Kafka.

---

## 1) Résumé en une phrase

- **Kafka** = un **journal d’événements** distribué, durable, rejouable.
- **BullMQ** = une **file de travail** pour exécuter des tâches asynchrones de manière fiable.

Analogie courte:
- Kafka = bibliothèque d’archives (on conserve l’historique et on peut relire).
- BullMQ = tableau de tickets en cuisine (on prend un ticket, on le traite, on passe au suivant).

---

## 2) Feynman: imagine un restaurant

Tu as:
- la salle (tes routes API HTTP),
- la cuisine (tes workers Node.js),
- le tableau de commandes (Redis),
- les tickets (jobs BullMQ).

### Sans queue
Le serveur HTTP fait tout lui-même:
- valider la commande,
- envoyer les emails,
- pousser les notifications,
- faire les relances.

Résultat: latence élevée et risques de timeout.

### Avec BullMQ + Redis
Le serveur HTTP fait uniquement le critique, puis poste des tickets:
- `send_order_email`,
- `notify_ops`,
- `payment_reminder_24h`.

Les workers traitent les tickets en arrière-plan.

Résultat: UX plus rapide, et tâches non critiques plus robustes.

---

## 3) Mécanique exacte (cycle de vie d’un job)

1. Producteur (API) appelle `queue.add(name, data, options)`.
2. BullMQ stocke le job dans Redis (`waiting` ou `delayed`).
3. Un worker prend le job et le met en `active`.
4. Le worker exécute le handler.
5. Fin de traitement:
   - succès -> `completed`,
   - erreur -> `failed` + retry si configuré.
6. Si le worker plante, BullMQ détecte un job `stalled` et le reprogramme.

États usuels:
- `waiting`, `delayed`, `active`, `completed`, `failed`.

---

## 4) Garanties et limites (comparaison Kafka)

### Livraison
- BullMQ: **at-least-once**.
- Kafka consumer classique: aussi at-least-once (hors exactly-once E2E complexe).

Conséquence: handlers **idempotents** obligatoires.

### Ordre
- BullMQ ne donne pas un ordre global de log comme Kafka.
- Tu peux améliorer l’ordre local via `concurrency`, découpage des queues, et clés métier.

### Replay
- BullMQ n’est pas un event log pour replay historique long terme.
- C’est une queue opérationnelle orientée exécution de tâches.

### Débit et usage
- BullMQ: excellent pour tâches applicatives (emails, webhooks, relances).
- Kafka: meilleur pour backbone événementiel, analytics streaming, multi-consommateurs à grande échelle.

---

## 5) Mapping mental Kafka -> BullMQ

- `topic` Kafka -> `queue` BullMQ (proche conceptuellement, mais pas même sémantique log).
- `consumer group` -> plusieurs workers sur la même queue.
- `offset/commit` -> transition d’état (`active` vers `completed/failed`).
- `retry` -> `attempts + backoff`.
- `DLQ` -> jobs failed + queue d’échec dédiée (patron applicatif).

---

## 6) Positionnement recommandé dans ce projet

### À mettre en queue (BullMQ)
- envoi email/SMS/WhatsApp après commande,
- notifications achat groupé (deadline, objectif atteint),
- relances paiement (`delay`),
- synchronisations externes non bloquantes (CRM, ERP, analytics).

### À garder synchrone (API directe)
- validation panier,
- calcul pricing/frais,
- création commande,
- vérifications critiques pré-paiement.

Règle: si l’utilisateur attend la réponse pour continuer son parcours, garde en synchrone.

---

## 7) Concepts BullMQ clés à connaître

- **Queue**: point d’entrée des jobs.
- **Worker**: consommateur exécutant les handlers.
- **QueueEvents**: écoute des événements de job.
- **Scheduler (vérification stalled/delayed)**: gestion des jobs retardés/récupération.
- **Job options**:
  - `attempts`,
  - `backoff` (fixe/exponentiel),
  - `delay`,
  - `priority`,
  - `jobId` (idempotence logique),
  - `removeOnComplete` / `removeOnFail`.

---

## 8) Idempotence (point le plus important)

Comme la livraison est at-least-once, un job peut être traité plus d’une fois.

Il faut donc:
- utiliser un `jobId` métier stable quand pertinent,
- vérifier en base si l’action a déjà été faite,
- rendre les effets externes idempotents (ex: clé de déduplication pour email/webhook).

Exemple:
- Job `send_order_email` avec `jobId = order:{orderId}:email:confirmation`.
- Si le job est rejoué, la logique détecte que l’email confirmation est déjà émis.

---

## 9) Fiabilité prod: pratiques minimales

- Worker séparé du process web.
- Redis managé avec persistance (AOF) et supervision.
- Retry maîtrisé (pas infini) + backoff exponentiel.
- Monitoring (bull-board + alertes sur failed spikes).
- Timeouts explicites des appels externes.
- Dead letter strategy (queue dédiée ou traitement manuel des failed).

---

## 10) Où Kafka reste préférable

Kafka devient préférable si tu as besoin de:
- bus événementiel central multi-services,
- replay historique long terme,
- analytics streaming en temps réel,
- grand nombre de consommateurs indépendants,
- contrats d’événements inter-domaines.

En pratique, beaucoup d’équipes combinent:
- BullMQ pour l’exécution opérationnelle,
- Kafka pour l’event backbone.

---

## 11) Mini pseudo-flow adapté au projet

```text
POST /api/order
  -> validations + pricing (sync)
  -> persist order (sync)
  -> enqueue jobs:
       - order.email.confirmation
       - order.ops.notify
       - order.payment.reminder (delay 24h)
  -> return 200 rapidement

Worker order.email.confirmation
  -> check idempotence
  -> send email provider
  -> mark sent
```

---

## 12) TL;DR décision

Si ton besoin principal est: "découpler et fiabiliser les tâches async métier" -> **BullMQ + Redis est le bon choix**.

Si ton besoin principal est: "log d’événements global rejouable à grande échelle" -> **Kafka**.
