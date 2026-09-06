# Audit global & stratégie de sortie du monolithe

> Complète `PLAN_ARCHITECTURE_3_DOMAINES.md`. Objectif : sortir du monolithe **sans casser l'existant** et **sans fermer les interactions inter-domaines** (ex. prestataire Xeuy achetant des pièces DDM+).
> Date : 2026-09-05

---

## 1. État des lieux quantifié

- **1 application** Next.js + `server.js` custom (Next + Socket.io), déployée en **1 process PM2** (`ligey`) derrière nginx, sur **1 MongoDB** (`ecosystem.config.js`, `docker/`)
- **~70 modèles** Mongoose dans `src/lib/models` (+ un `prisma/schema.prisma` quasi inutilisé — 3 fichiers, dette à éliminer)
- **~80 groupes de routes API** dans `src/app/api`, dont **76 routes `/api/admin/*`**
- **3 frontends** : site/app web Next (corporate + marketplace + compte), apps Expo `mobile/consumer` + `mobile/provider` (dossiers et `package.json` déjà séparés — bon point)
- **1 extension navigateur** (`extension/`, scraping import → marketplace)

## 2. Les 5 soudures du monolithe

| # | Soudure | Détail | Difficulté à défaire |
|---|---|---|---|
| 1 | **`User` monolithique** | 1 `role` unique + 5 pointeurs de profils + champs croisés (`providerStats`, `marketplaceTier`, `tier`, `referral*`) | Moyenne — les profils découplés existent déjà |
| 2 | **Back-office `/admin` transversal** | 33 sections d'admin mélangent corporate (clients, devis, planning, techniciens), marketplace (produits, commandes, achats-chine) et Xeuy (services, litiges, plateforme) | Élevée — plus gros nœud |
| 3 | **Auth unique** | `/api/auth/*` sert web + mobile + corporate (login, mobile OTP, register, register-corporate, guest-checkout, nextauth) | Moyenne |
| 4 | **Socle partagé** | `server.js` socket.io, `src/lib` (db, email, notifications, socket-emit), middleware unique | Faible — à garder partagé volontairement |
| 5 | **MongoDB unique** | Toutes les collections mélangées | Faible — acceptable même en cible modulaire |

**Bonne nouvelle** : l'API Xeuy (`/api/services/*`) n'importe **aucun** modèle marketplace/corporate — le couplage est surtout concentré dans `/admin`, `User` et l'auth, pas dans la donnée métier.

## 3. Stratégie : strangler progressif, pas big bang

```
Aujourd'hui          Étape intermédiaire              Cible
┌──────────────┐     ┌──────────────────────┐        ┌─────────────────────────┐
│  Monolithe   │     │ Monolithe MODULAIRE  │        │ Noyau partagé (identité │
│  3 domaines  │ ──▶ │ frontières internes  │ ──▶    │ + auth + notifications  │
│  fusionnés   │     │ strictes + events    │        │ + bus d'événements)     │
└──────────────┘     └──────────────────────┘        │                         │
                                                     │ ┌─ corporate (web+admin)│
                                                     │ ├─ market DDM+ (market.*)│
                                                     │ └─ XEUY : SERVICE SÉPARÉ│
                                                     │   api.xeuy.* + socket   │
                                                     │   dédié + collections   │
                                                     │   propres (forte charge)│
                                                     └─────────────────────────┘
```

**Décision révisée** : contrairement à la première version de ce plan, l'extraction **physique** de Xeuy est justifiée dès le départ — application grand public à fort potentiel de charge (temps réel, géolocalisation, matching). Xeuy devient le seul domaine extrait en service/process dédié ; corporate et DDM+ restent dans le monolithe modulaire. Les apps mobiles restent des clients séparés — c'est le modèle : *frontend séparé, backend par domaine*.

## 3bis. Décision produit — une seule app Xeuy (client + prestataire)

**Recommandation : oui, fusionner `mobile/consumer` + `mobile/provider` en une seule app** — modèle inDrive (un utilisateur = client par défaut, bascule prestataire après onboarding/KYC). Uber a 2 apps, inDrive/Bolt-food-style 1 app à double mode : pour un marché jeune, la seule app est le bon choix.

**Avantages** : 1 listing App Store/Play, 1 pipeline de review/OTA, funnel unique (tout client est un prestataire potentiel → CAC réduit côté offre), parcours « devenir prestataire » in-app.

**Points de vigilance à intégrer dès la refonte** :
- **Switcher de mode** (client ⇄ prestataire) façon Airbnb hôte/voyageur — pas deux UIs empilées
- **Permissions contextuelles** : ne demander la géoloc en arrière-plan que lors de l'activation du mode prestataire (demander d'emblée ferait fuir les clients)
- **KYC gating** : mode prestataire verrouillé tant que `providerProfileId` n'existe pas — cohérent avec l'autorisation par profils
- **Poids de l'app** : code-splitting des écrans prestataire (lazy) pour ne pas alourdir le parcours client
- **Le modèle `User` le permet déjà** : `providerProfileId` optionnel = exactement ce pattern

**Conséquence architecture** : `mobile/` devient un seul projet Expo. L'OTP login unique reste ; la distinction client/prestataire devient purement applicative (présence du profil), plus jamais un « rôle ».

**Séquencement** : la fusion consumer+provider se fait **en dernier**, sur une **branche dédiée** — après les étapes 0-2, en parallèle de l'extraction Xeuy (étape 3).

## 4. Garder la porte ouverte aux interactions inter-domaines

C'est le point clé de votre demande. Trois mécanismes à instaurer :

1. **Bus d'événements interne** — collection `DomainEvent` (ou Redis pub/sub via l'infra socket existante). Un domaine émet (`xeuy.mission.completed`), les autres s'abonnent (`corporate` peut générer une facture, `market` proposer des pièces). **Zéro import direct entre domaines.**
2. **Contrats d'API internes** — endpoints `/api/internal/{domain}/*` versionnés, réservés à la communication inter-domaines, protégés par clé de service — pas par le JWT utilisateur.
3. **Identité commune** — `User` reste le socle (compte unique), les **capacités** viennent des profils : `companyClientId` → corporate, `marketplaceProfileId` → DDM+, `providerProfileId` → Xeuy, `vendorProfileId` → vendeur. Un utilisateur peut cumuler les profils → vos liens futurs restent possibles nativement.

## 5. Séquence de sortie (chaque étape déployable seule)

### Étape 0 — Contrat de propriété (fondation) ✅ fait (2026-09-05)
- [x] Cartographie validée : `admin-prix`/`admin-produits` → market ; `AdminQuote`/`Ticket` = modèles actifs, `Quote`/`SupportTicket` → deprecated
- [x] `src/lib/domains.ts` créé : registre route → domaine → profil requis — **52 pages, 61 groupes API, 88 modèles, couverture 100 %**
- [x] Modèles classés via `MODEL_DOMAINS` (registre unique, pas de tags par fichier)
- [x] `scripts/validate-domains.ts` (`npm run test:domains`) : garde le registre synchronisé — à brancher en CI
- [ ] Lever les 7 routes marquées `review` : `/suivi`, `/workflow-engine`, `/api/kyc`, `/api/corporate`, `/api/payments`, `/api/support`, `/api/booking`
- [x] `/mobile-app` tranché → **deprecated** : non utilisé, supprimer à l'Étape 1. Le besoin « tech terrain smartphone » sera refait via `tech-interface` rendu responsive (une seule interface, pas deux) — noté pour le backlog corporate
- [ ] Playwright (`tests/` : maintenance, marketplace-qa, services, xeuy) = filet de non-régression à exécuter avant chaque étape

### Étape 1 — Frontières internes (en cours, 2026-09-05)
- [x] Route groups Next : `src/app/(corporate)`, `(market)`, `(shared)`, `(admin)` — URLs inchangées. Décision : `api/` reste plat (la classification par préfixe dans `domains.ts` suffit ; évite du churn sans gain)
- [x] Code mort supprimé : `client-portal`, `client-portal-v2`, `test-inputs`, `admin-produits`, `mobile-app`, `ModernClientPortal` (107 Ko) + modales orphelines, `MobileInterventionApp`, `EnhancedProjectPortal`, `ModularQuoteGenerator`, `ClientInvoicesView`, `KeycloakClientLogin`, backups `compte`
- [x] Middleware : `routes.ts` dérive désormais de `domains.ts` (listes générées, logique inchangée)
- [x] `scripts/check-domain-boundaries.ts` (`npm run test:boundaries`) : **27 violations cross-domaine + 6 usages de modèles deprecated cartographiés** — mode report, `--strict` dispo pour CI
- [x] `AGENTS.md` : règles permanentes (1 agent = 1 domaine, responsivité globale obligatoire, pas de code mort)
- [x] `/api/client/*` trié : seuls `profile` + `request-pro` (market, live) conservés — 10 endpoints morts supprimés
- [x] Namespaces socket : `src/lib/socket-events.ts` créé (registre des events par domaine + règle « tout nouvel event namespacé »). Renommage des events legacy reporté à la refonte mobile (compat apps déployées)
- [x] Bug VENDOR corrigé : le middleware vérifie désormais les rôles `VENDOR` et `PROVIDER` (avant : `espace-vendeur` accessible à tout utilisateur connecté)
- [ ] Réorganiser `src/lib` en sous-dossiers par domaine — reporté : gros churn, le boundary checker couvre la règle en attendant

### Étape 2 — Auth & cloisonnement des comptes (en cours, 2026-09-05)
- [x] `src/lib/domain-access.ts` créé : `requireDomainAccess(request, domain)` + `resolveUserAccess` (résolution centralisée des profils + fallback `companyClientId` pour vieux tokens) + `companyScope` (couvre la convention mixte `clientId` = userId OU companyId constatée en base)
- [x] `verifyToken` dupliqué supprimé de `/api/client/profile` → `requireAuth` ; `client-enterprise/me` et `enterprise-auth.ts` délestés de leur fallback dupliqué → `resolveUserAccess`
- [x] Middleware : gate `VENDOR`/`PROVIDER` ajouté (bug : `espace-vendeur` n'exigeait que l'auth)
- [x] Scoping : pages `portail-entreprise` + routes `api/client-enterprise` passés à `requireDomainAccess` + `companyScope` — corrige le bug des vieux tokens (401 API alors que les pages acceptaient) et le filtrage mono-user
- [ ] `User.role` → personnel interne uniquement (les profils `marketplaceProfileId`/`corporateProfileId`/`providerProfileId`/`vendorProfileId` existent déjà dans `user-profiles.ts` — bascule progressive)
- [ ] Unifier `connectMongoose` (lib/mongoose) vs `connectDB` (lib/db) — doublon noté
- [ ] Normalisation écriture : les nouveaux docs devraient porter `clientCompanyId` (schéma à étendre) — chantier data séparé

### Étape 3 — Extraction Xeuy (candidat n°1 — extraction **physique** visée)
Justification : API déjà découplée des modèles des autres domaines, auth Bearer/OTP distincte, app **unique** (consumer+provider fusionnés, cf. §3bis), socket rooms propres, et **anticipation d'une forte charge grand public** → isolation maximale voulue.
- [ ] `src/app/(xeuy-api)/api/services/**` → module autonome d'abord (même process, frontière stricte)
- [ ] Puis service séparé : `api.xeuy.*` (ou sous-domaine dédié), propre process PM2, propre gateway socket.io (la géoloc/matching est le gros consommateur temps réel — il doit pouvoir scaler seul)
- [ ] Collections Xeuy regroupées (`xeuy_*`) → base dédiée envisageable ensuite ; `redis-geo` (déjà dans `server.js`) migre avec
- [ ] **Aucun lien direct avec le corporate** — confirmé : le seul point de contact reste l'identité `User` partagée et le bus d'événements (pour les liens futurs *marketplace*↔Xeuy, ex. pièces de rechange)
- [ ] Events `xeuy:*` émis sur le bus au lieu d'appels directs

### Étape 4 — Marketplace (DDM+)
- [ ] Le domaine `market.itvisionplus.sn` est déjà routé par middleware → capitaliser : tout le front marketplace vit derrière ce host
- [ ] `compte` reste marketplace ; `portail-entreprise` corporate — la redirection login par profil (existante) devient la règle générale
- [ ] Évaluer : Next app séparée sur `market.*` partageant l'API — seulement si trafic le justifie

### Étape 5 — Corporate = noyau résiduel + portail premium
- [ ] `/admin` éclaté en 3 consoles (ou sections namespacées `admin/corporate`, `admin/market`, `admin/xeuy` partageant la même coquille)
- [ ] Supprimer `client-portal`/`client-portal-v2` + `/api/client/*` + `prisma/`
- [ ] **Puis attaquer le portail B2B premium** (plan dans `PLAN_ARCHITECTURE_3_DOMAINES.md` §Phase 2)

## 6. Garde-fous permanents

- **Lint inter-domaines** : un import `corporate → market` doit échouer en CI (ESLint `no-restricted-imports` par dossier)
- **Règle agents** : 1 agent = 1 domaine ; `domains.ts` est la frontière contractuelle
- **Migrations DB** : toujours additives (jamais de rename destructeur sans double-écriture)
- **Feature flags** pour chaque bascule (`compte` → portail, nouvelle auth...) avec rollback instantané
- **Audit log** (`AuditLog` existe) sur toutes les actions sensibles inter-domaines

## 7. Réponse directe : qu'en penser ?

Votre intuition est juste sur 3 points :
- **Oui**, il faut l'audit global avant le portail B2B — sinon les agents codent sur des fondations ambiguës (auth, scoping, doublons).
- **Oui** à la sortie progressive — la cible : **Xeuy en service séparé** (forte charge grand public, isolation maximale) + corporate/DDM+ en monolithe modulaire, le tout relié par events + API internes.
- **Oui** à l'app mobile unique (§3bis) — c'est le modèle inDrive, le bon choix pour votre marché.
- **Confirmé** : pas de lien Xeuy↔corporate nécessaire ; le lien utile à préserver est Xeuy↔marketplace (pièces détachées) via le bus d'événements.
- **Attention** sur Keycloak : des realms par domaine isoleraient les comptes et tueraient vos liens futurs. Si Keycloak un jour → **1 realm, 3 clients, rôles par client**. Mais l'autorisation par profils (Étape 2) règle 90 % du problème sans nouvelle infra.

**Ordre final** : `Étape 0 → Étape 1 → Étape 2 → portail B2B premium peut démarrer en parallèle dès que le design system portal-ui est posé → Étape 3 (Xeuy isolé) → Étapes 4-5.`
