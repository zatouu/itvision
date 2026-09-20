# DAT — Système multi-agents IA (LangGraph) avec Human-in-the-Loop

> **Version** : phase 1 — graphe « modération produit vendeur »
> **Stack** : LangGraph.js + MongoDB (checkpointer) + Next.js existant
> **Principe cardinal** : l'IA *recommande*, l'humain *décide* pour tout ce qui touche l'argent, la confiance ou la publication.

---

## 1. Comprendre les agents — explications Feynman

### C'est quoi un « agent IA » ?

Imagine un **stagiaire très rapide** à qui tu donnes une tâche :

- Il **lit un dossier** (le produit soumis par un vendeur)
- Il **fait des vérifications de routine** tout seul (le prix est-il rempli ? y a-t-il une photo ? le nom existe-t-il déjà ?)
- Pour les questions qui demandent du **jugement** (« cette description est-elle cohérente ? », « ce prix sent l'arnaque ? »), il **réfléchit avec un LLM**
- Il **n'exécute jamais lui-même** la décision importante : il prépare une recommandation et **lève la main** pour qu'un humain tranche.

Un agent ≠ un chatbot. Un chatbot parle ; un agent **agit dans un processus métier** — avec des outils (lire la DB, compter des produits) et un périmètre d'action strictement délimité.

### C'est quoi LangGraph ?

LangGraph = **la carte de métro du travail du stagiaire**.

- Chaque **station** (nœud) est une étape précise : `charger le dossier` → `vérifier les règles` → `analyser au LLM` → `attendre l'humain` → `appliquer la décision`.
- Les **correspondances** (arêtes) disent où aller ensuite — parfois conditionnelles (« si violation grave → directement rejet proposé, sans payer l'appel LLM »).
- Le **ticket de transport** (l'état `State`) transporte tout ce que l'agent a appris en route — chaque station le lit et l'enrichit.

Pourquoi pas juste une fonction `if/else` ? Parce que le processus doit pouvoir **se mettre en pause des jours** (le temps qu'un admin réponde), **reprendre exactement où il était**, et qu'on veut un **historique complet** du raisonnement.

### Le checkpointer : la sauvegarde de partie

Comme dans un jeu vidéo : à chaque station, LangGraph écrit l'état complet dans MongoDB. Le processus peut **mourir, redémarrer, être déployé** — le graphe reprend à la station où il était, jamais au début. C'est ça qui rend l'attente humaine possible sans garder un process vivant 48h.

### `interrupt()` : lever la main

Dans un nœud, `interrupt(payload)` = « je m'arrête là, voici mon dossier, réveillez-moi quand un humain a décidé ». Techniquement : le graphe se fige, l'état est persisté, le worker passe à autre chose. Quand l'admin clique « Approuver », on relance le graphe avec `Command({ resume: decision })` et le nœud reprend à la ligne suivant le `interrupt()`.

### LLM vs règles déterministes : qui fait quoi ?

Règle d'or du design : **tout ce qui est une règle reste du code**.

| Question | Qui répond | Pourquoi |
|---|---|---|
| Prix ≥ 100 F ? | Code (`runChecks`) | C'est une règle binaire — pas besoin d'un cerveau |
| Image présente ? | Code | Idem |
| Mot interdit ? | Regex | Idem, gratuit et instantané |
| « iPhone 15 à 500 F » = suspect ? | **LLM** | Ça demande du jugement : connaître le prix réel du marché |
| Description cohérente avec la catégorie ? | **LLM** | Jugement sémantique |

Résultat : le LLM n'est appelé **que sur les cas qui le méritent** — moins de coût, moins de latence, moins d'erreurs (les règles ne se trompent jamais).

### L'humain dans la boucle (HITL)

Trois niveaux d'autonomie, gravés dans le design :

- **Niveau 0 — Autonome** : lire, résumer, classifier, suggérer. Aucun effet visible → pas de permission nécessaire.
- **Niveau 1 — Semi-auto** : actions réversibles (tag, brouillon). Autorisé mais loggé et annulable.
- **Niveau 2 — HITL obligatoire** : publier un produit, valider une boutique, verser un payout, rembourser, suspendre. → `interrupt()` obligatoire, l'agent ne peut pas se l'auto-accorder.

---

## 2. Architecture

```
┌────────────────────────────────────────────────────────────┐
│  Next.js (server.js — même process)                        │
│                                                            │
│  POST /api/vendor/products ──► Product créé (non publié)   │
│                    │                                       │
│                    ▼ enqueue                                │
│            AgentJob { type, refId, status:'pending' }      │
│                    │                                       │
│  ┌─────────────── Worker agent (polling 15s) ──────────┐   │
│  │ claim job → dispatch(type) → run graphe LangGraph    │   │
│  │                                                      │   │
│  │  loadContext → runChecks → [LLM analyze] → route     │   │
│  │       └────────────┬────────────────────┘            │   │
│  │                    ▼                                 │   │
│  │           AgentDecision créée + notifyAdmins         │   │
│  │                    ▼ interrupt()                     │   │
│  │            ⏸ état figé en Mongo (checkpoint)        │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬───────────────────────────────────┘
                         │  l'admin clique dans /admin/copilot
                         ▼
         POST /api/admin/agent-decisions/[id]/decide
                         │ Command({resume: décision})
                         ▼
              graphe reprend → applyDecision
                    ├─ approuvé → isPublished:true + notifs
                    └─ rejeté   → notif vendeur avec motif
```

### Choix : file `AgentJob` en Mongo plutôt que change streams

Le worker **dépose** une ligne `AgentJob` ; le worker la consomme par `findOneAndUpdate` atomique (claim). Pourquoi pas les change streams ?

- Ça marche **sans replica set** en dev local (le RS n'existe que sous docker)
- Retry trivial : `status: failed` → re-file
- Priorités et délais possibles (`runAfter` pour planifier)
- Audit gratuit : la file est l'historique

Si un jour le volume explose, on migrera vers Redis/BullMQ ou change streams — l'interface `enqueue(type, refId)` reste identique.

---

## 3. Le graphe « product_moderation » en détail

### L'état (ce que le ticket transporte)

```ts
{
  productId: string
  product:   { name, description, price, category, images[], condition }
  vendor:    { slug, name, shopStatus, salesCount, disputeRate, accountAgeDays }
  checks:    { hasImage, priceAboveMin, forbiddenWord, duplicateName, priceVsMedian }
  analysis?: { verdict, confidence, reasons[], suggestedFixes[], riskFlags[] }
  hardViolation?: string           // si une règle bloquante a sauté
}
```

### Les nœuds

| Nœud | Type | Rôle |
|---|---|---|
| `loadContext` | Code | Charge produit + stats vendeur (ventes, litiges, ancienneté) |
| `runChecks` | Code | 5 vérifs déterministes en parallèle |
| `gate` | Routage | Violation dure ? → `proposeReject` sinon → `analyze` |
| `analyze` | **LLM** | Jugement : cohérence, qualité, signaux d'arnaque → verdict structuré |
| `propose` | Code | Construit la proposition + crée `AgentDecision` + notifie les admins |
| `humanReview` | `interrupt()` | ⏸ Attente de la décision admin (peut durer des jours) |
| `apply` | Code | Applique : publier + notifier / rejeter + notifier avec motif |

### Décisions de routage

- **Violation dure** (pas d'image, prix < 100, mot interdit) → rejet proposé **sans appel LLM** (gratuit, instantané)
- **`analyze` verdict `unsure` ou confiance < 0.6** → proposition « revue manuelle » affichée à l'admin
- **LLM absent/en panne** (pas de clé API, timeout) → l'analyse est marquée `unavailable`, les checks déterministes s'affichent quand même → **l'admin modère comme aujourd'hui, dégradation gracieuse**

### Ce que voit l'admin dans `/admin/copilot`

```
┌─ 🤖 Reco : PUBLIER (confiance 87%) ──────────────┐
│ « Sneakers running homme » — Wordshop            │
│ ✓ 4 photos  ✓ prix cohérent  ✓ catégorie ok      │
│ Raisons : fiche complète, prix aligné marché     │
│ [Approuver & publier]  [Rejeter avec motif]      │
└──────────────────────────────────────────────────┘
```

Un clic → la décision reprend le graphe → le vendeur est notifié → si publié, **les abonnés de la boutique sont notifiés** (ShopFollower).

---

## 4. Modèles de données

```ts
AgentJob {        // la file de travail (queue)
  type: 'product_moderation' | ...
  refId: ObjectId               // le produit concerné
  status: 'pending' | 'running' | 'done' | 'failed'
  attempts, runAfter, error
}

AgentRun {        // une exécution de graphe (audit)
  threadId        // = AgentJob._id — clé du checkpoint LangGraph
  graph, refId
  status: 'running' | 'waiting_human' | 'done' | 'failed'
  llmUsed: boolean, durationMs
}

AgentDecision {   // la file HITL — ce que l'admin voit
  type: 'product_moderation'
  refId, runId
  status: 'pending' | 'approved' | 'rejected' | 'modified'
  proposal: { verdict, confidence, reasons, suggestedFixes, checks }
  decidedBy, decidedAt, adminNote
}
```

---

## 5. Exploitation

### Variables d'environnement

| Var | Rôle |
|---|---|
| `AGENT_WORKER_ENABLED` | `true` pour activer le polling dans server.js (défaut off) |
| `ANTHROPIC_API_KEY` | active `analyze` avec Claude Haiku (prioritaire) |
| `OPENAI_API_KEY` | fallback : GPT-4o-mini si pas de clé Anthropic |
| `AGENT_LLM_MODEL` | override du modèle (défaut : `claude-3-5-haiku-latest` / `gpt-4o-mini`) |
| `AGENT_POLL_MS` | intervalle de polling (défaut 15000) |
| `AGENT_CONCURRENCY` | runs LLM parallèles max (défaut 3) |

Aucune clé LLM → les agents tournent quand même en mode **checks déterministes uniquement**.

### Sécurité

- L'agent ne reçoit **que des outils en lecture** — l'écriture (`isPublished`, notifications) ne se fait que dans le nœud `apply`, **après** l'interrupt, **sur décision humaine**
- Le worker ne traite que des `AgentJob` — il ne peut pas être appelé de l'extérieur
- `AgentDecision` garde `decidedBy` + `adminNote` → audit trail complet pour chaque action
- Le LLM ne voit que les champs produit nécessaires — jamais de données clients/paiement

### Métriques à suivre

- **Override rate** : % de décisions admin contraires à la reco. >20% = ajuster le prompt ou couper l'analyse
- **Time-to-publish** : médiane produit créé → publié
- **Fallback rate** : % de runs sans LLM (clé absente, timeout)
- Logs : `[agent]` prefix + `AgentRun.durationMs`

---

## 6. Recette — ajouter un nouvel agent

1. **Définir le job** : nouveau `type` dans `AgentJob` + le déclencheur (`enqueue('mon_type', refId)` dans la route métier)
2. **Écrire l'état** `Annotation.Root` : que transporte le dossier ?
3. **Nœuds déterministes d'abord** : toutes les vérifs codables, avant tout LLM
4. **Un seul nœud LLM** avec sortie structurée zod (verdict + raisons + confiance)
5. **`interrupt()` avant toute action de niveau 2**
6. **`apply`** : applique la décision + notifie via `notifyUser`/`notifyAdmins`
7. **UI admin** : ajouter le type à `/admin/copilot` (la file est générique)
8. **Enregistrer** dans le dispatch du worker

Règle d'or : **si le processus tient en un `if/else`, ne fais pas un agent**. Un agent se justifie quand il y a : jugement + attente humaine + plusieurs étapes + besoin d'audit.

---

## 7. Carte d'opportunités — où d'autres agents peuvent servir

| Agent | Déclencheur | Valeur | Niveau |
|---|---|---|---|
| **Validation boutique** | `vendor/register` | Reco approuver/rejeter avec analyse profil | HITL |
| **Risque payout** | `vendor/payouts` POST | Badge risque + raisons sur la demande | HITL |
| **Triage litiges** | `ReturnRequest` créé | Priorité + proposition de résolution | HITL |
| **Digest quotidien** | cron 8h | Résumé ventes/anomalies → notif admins | Autonome |
| **Enrichissement fiche** | produit créé | Suggère tags/catégorie/points forts | Semi-auto |
| **Veille sourcing** | achats groupés | Produits 1688 similaires + marge suggérée | Semi-auto |
| **Réponse support** | message litige | Brouillon de réponse à valider | Semi-auto |

Ordre suggéré : modération produit (ce doc) → payout → validation boutique → triage litiges.

---

## 8. Glossaire minute

- **Agent** : programme qui enchaîne des étapes avec des outils, et appelle un LLM pour le jugement
- **Graphe** : la carte des étapes et transitions possibles
- **État (State)** : la valise que chaque nœud lit et enrichit
- **Nœud (Node)** : une étape — fonction sync/async
- **Checkpointer** : la sauvegarde auto de l'état en Mongo à chaque nœud
- **`interrupt()`** : pause en attente d'un humain
- **`Command({resume})`** : relancer le graphe avec la réponse humaine
- **HITL** : Human-In-The-Loop — l'humain tranche les décisions à impact
- **Structured output** : forcer le LLM à répondre en JSON validé (zod), pas en texte libre
