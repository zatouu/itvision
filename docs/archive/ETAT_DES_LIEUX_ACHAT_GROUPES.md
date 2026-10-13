# État des lieux (branche `achat-groupes`)

## Périmètre
- Application Next.js (App Router) + serveur custom Socket.io.
- Persistance principale MongoDB (mongoose), Prisma présent mais optionnel.
- Focus: stabilité, sécurité, dette technique et axes d’amélioration (avec zoom sur le module **Achats groupés**).

## Cartographie rapide
- Point d’entrée runtime: `server.js` (Next + Socket.io + auth JWT côté socket) + exposition `global.io`.
- Middleware sécurité/auth: `src/middleware.ts` (contrôle routes publiques/protégées + headers sécurité + CSRF sur API).
- API: `src/app/api/**` (beaucoup de routes “feature-oriented”).
- Libs partagées: `src/lib/**` (auth, DB, notifications, pricing, sécurité, etc.).
- UI achats groupés:
  - Liste: `src/app/achats-groupes/page.tsx`
  - Détail: `src/app/achats-groupes/[groupId]/page.tsx`
  - API: `src/app/api/group-orders/route.ts` + `src/app/api/group-orders/[groupId]/route.ts`
  - Modèle: `src/lib/models/GroupOrder.ts`

## Points forts
- Module achats groupés déjà bien structuré (modèle + endpoints + pages dédiées).
- Bon réflexe “privacy-by-default” côté API achats groupés: exclusion explicite des champs PII/transactions (`.select('-participants.phone ...')`).
- Chat d’achat groupé: stockage d’un **hash** de token (`sha256`) dans la DB (meilleure pratique) plutôt que le token en clair.
- Présence de briques sécurité: rate limiting (`src/lib/rate-limiter.ts`), security logger (`src/lib/security-logger.ts`), CSRF (double-submit).

---

## Risques / dettes techniques prioritaires

### P0 — Sécurité (à traiter en premier)
1) **Fuite de secrets côté client**
- `next.config.mjs` expose des secrets via `env` (ex: `JWT_SECRET`, `NEXTAUTH_SECRET`).
- Dans Next.js, `env` est injecté dans le bundle et peut fuiter côté navigateur.
- Impact: compromission potentielle de sessions JWT / NextAuth.

2) **Secrets par défaut / fallback “dangereux”**
- Nombreux `process.env.JWT_SECRET || 'default-secret-key'` / `|| 'your-secret-key'` dans:
  - `server.js`
  - `src/middleware.ts`
  - `src/lib/auth-server.ts`
  - plusieurs routes API (`src/app/api/**/route.ts`)
- Impact: si un env manque en prod → token forgeable.

3) **JWT: incohérence d’implémentations**
- Mélange `jsonwebtoken` (login / verify server) et `jose` (middleware + socket).
- Risque: divergences (algos, clock skew, payload typing), duplication de logique.

4) **CSP trop permissive**
- `src/middleware.ts` définit `script-src 'unsafe-inline' 'unsafe-eval'`.
- C’est souvent nécessaire en dev, mais très risqué en prod.

5) **2FA: code affiché en logs**
- `src/app/api/auth/login/route.ts` log le code 2FA en clair.
- Impact: fuite possible via logs (hébergeur/CI/observabilité).

### P1 — Robustesse / scalabilité
1) **Connexions DB en doublon / incohérentes**
- Plusieurs helpers différents:
  - `src/lib/db.ts` (mongoose + fallback URI local)
  - `src/lib/mongoose.ts` (mongoose + fallback avec credentials hardcodés)
  - `src/lib/mongodb.ts` (MongoClient natif)
- Risques: comportements différents selon routes, difficulté de maintenance, surprises en prod.

2) **Rate limiter en mémoire + `setInterval`**
- `src/lib/rate-limiter.ts` stocke en mémoire locale (par instance) et lance un `setInterval`.
- Si scaling horizontal / serverless: compteur non partagé et reset fréquent.

3) **Duplication headers sécurité**
- Headers de sécurité définis à la fois dans `src/middleware.ts` et `next.config.mjs`.
- Risque: incohérences, overrides, debug compliqué.

### P2 — DX / qualité / maintenabilité
1) **Composants UI très volumineux (Achats groupés)**
- `src/app/achats-groupes/page.tsx` (~1100 lignes) et `src/app/achats-groupes/[groupId]/page.tsx` (~600+).
- Refactor en composants + hooks faciliterait tests, lisibilité et évolutions.

2) **ESLint désactivé pendant le build**
- `next.config.mjs` → `eslint.ignoreDuringBuilds: true`.
- Bonne pratique: réactiver en CI / PR au moins (même si on garde permissif localement).

---

## Améliorations recommandées (plan pragmatique)

### P0 (sécurité) — 1 à 2h chacune
- Retirer `JWT_SECRET` / `NEXTAUTH_SECRET` de `next.config.mjs.env` et utiliser uniquement les variables d’environnement côté serveur.
- Interdire les secrets par défaut en production:
  - créer un helper unique `getJwtSecret()` qui throw si `JWT_SECRET` manquant en prod.
  - remplacer toutes les occurrences `|| 'default...'`.
- Unifier la vérif JWT (idéalement `jose`) et fournir un helper `requireAuthApi()` / `requireAdminApi()` commun.
- CSP:
  - en prod: supprimer `unsafe-eval`/`unsafe-inline` (ou passer à des nonces / hashes si nécessaire).
  - en dev: garder permissif si besoin.
- 2FA: ne jamais logguer le code; envoyer via email/SMS ou stocker hash + TTL.

### P1 (robustesse) — 0.5 à 2 jours
- Consolider la couche DB:
  - choisir une seule stratégie (mongoose) + un seul point d’entrée (`connectMongoose`) sans URI hardcodée.
  - renommer `connectDB` (actuellement ambigu entre `db.ts` et `mongodb.ts`).
- Rate limiting:
  - si prod derrière Nginx/Cloudflare: préférer rate limiting au proxy.
  - sinon: store partagé (Redis) ou au minimum désactiver `setInterval` en edge.
- Clarifier responsabilités headers:
  - soit middleware unique, soit headers Next config, mais éviter double définition.

### P2 (maintenabilité / UX) — 0.5 à 3 jours
- Refactor pages achats groupés:
  - extraire `GroupCard`, `CreateGroupModal`, `FiltersBar`, `useGroupOrders()`.
  - centraliser `formatCurrency`, `statusConfig` dans `src/lib/group-orders/*`.
- Ajouter tests ciblés:
  - API group orders: création, join, règles deadline/status, sélection safe fields.
  - modèle `GroupOrder.calculateUnitPrice()`.
- Observabilité:
  - logger structuré (requestId), niveaux de logs, et éventuellement Sentry.

---

## Questions de cadrage (si tu veux qu’on implémente tout de suite)
1) En prod, le site tourne-t-il derrière Nginx/Cloudflare (pour rate limiting/WAF) ?
2) L’app doit-elle être multi-instance (scaling horizontal) ?
3) Tu veux une auth unique (NextAuth) ou bien JWT maison (cookie `auth-token`) ? Aujourd’hui les 2 coexistent.

## Prochaine étape proposée
Si tu es ok, je peux appliquer directement les correctifs **P0** les plus sûrs (sans changement fonctionnel visible):
- supprimer l’exposition des secrets dans `next.config.mjs`
- supprimer tous les fallback secrets en prod
- retirer le log du code 2FA
