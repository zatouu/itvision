# Build et transfert du lot audit

## Etat du dossier

Branche locale : `feat/suivi-audit-2026-10`. Les modifications sont locales,
sans commit ni push. Copier le depot `vit`, pas le dossier voisin `Proj`.
Ce document ne constitue pas une validation de production.

Avant de configurer les secrets, consulter la
[checklist des variables d'environnement](ENV_DEPLOIEMENT_AUDIT_2026-10.md) :
emplacements GitHub/EC2/EAS, valeurs obligatoires et options non transmises.

Conserver les fichiers caches du projet (`.github`, `.gitignore`,
`.dockerignore`) et TOUS les fichiers non suivis listes par
`git ls-files --others --exclude-standard`. Un `git diff` ou `git archive`
seul ne transporte pas ces nouveaux fichiers. Les nouveaux helpers de session,
tarification, theme, tests et scripts operationnels font partie du lot.
Conserver les deux manifestes et lockfiles : racine et `mobile/app`.

Si le depot Git est copie avec son historique, inclure son vrai dossier `.git`.
Si `.git` est un fichier de worktree pointant ailleurs, ou si la destination
possede deja un clone, y reporter les sources sans ecraser ses metadonnees Git.
Verifier la branche et `git status --short` sur la machine de destination avant
de committer ; le commit et le push seront effectues par l'operateur.

Ne pas transporter dans le paquet source : `node_modules`, `.next`, `.ops`,
`test-results`, rapports Playwright, caches Expo et archives de build.
Ne pas committer de `.env`, cookies de session, cles SSH, sauvegardes ou donnees
de production. Configurer les secrets separement. Les fichiers tarifaires reels
du serveur de reference doivent etre sauvegardes pour la migration, sans etre
remplaces par les exemples du poste de developpement.

## Verification sur l'autre machine

Node 20 et npm sont requis. Les commandes suivantes sont en Bash.
Les installations racine utilisent `--legacy-peer-deps`, comme Docker et CI,
car le lockfile de ce projet a ete genere avec ce mode.

```bash
set -euo pipefail
git branch --show-current
git status --short
npm ci --legacy-peer-deps --no-audit --no-fund
DATABASE_URL=file:/tmp/build-only.db npm run db:generate
npm run type-check
npm run lint
npm run test:domains
npm run test:boundaries
npm run test:capabilities
npm run test:sourcing-policy
npm run test:pricing
npm run test:production-readiness
DATABASE_URL=file:/tmp/build-only.db npm run build
node scripts/check-production-runtime.cjs --files-only
```

`db:generate` genere le client Prisma, sans migration ni ouverture de base.
Le build produit aussi `.ops/production-preflight.cjs`,
`.ops/migrate-shipping-costs.cjs` et `.ops/dispatch.cjs`.
Pour les E2E, utiliser exclusivement une base jetable Mongo en replica set et
Redis, ainsi que des secrets de test. Ne pas pointer les helpers E2E vers la
production. Le workflow ci-dessous fournit cet environnement et Chromium.

```bash
cd mobile/app
npm ci --no-audit --no-fund
npm run type-check
npm test -- --runInBand --silent
```

## Pipeline de la branche

[Le workflow GHCR/EC2](../.github/workflows/deploy-ghcr-ec2.yml) inclut cette
branche. Apres le push, il execute les controles metier et TypeScript,
les E2E marketplace/corporate sur une base jetable et les controles mobile,
puis construit et publie l'image ARM64. Une recette distincte teste l'image
par digest : fichiers, migration jetable, Mongo/Redis, HTTP et handshake
Socket.io. Une image publiee dont `image-check` echoue n'est pas validable.

Un push sur cette branche ne declenche PAS le job de deploiement EC2 de ce
workflow. La bascule exige un lancement manuel sur cette branche avec
`deploy=true`, apres les controles et la preparation ci-dessous. Les branches
historiques gardent leur comportement. Les secrets GHCR/SSH et applicatifs
doivent deja etre configures dans GitHub ; aucun secret n'a ete ajoute ici.

L'image utilise le serveur personnalise `server.js`, ses dependances de
production et le dispatch Xeuy compile, pas le serveur standalone genere par
Next. TypeScript et ESLint restent bloquants. Le digest construit puis teste
est celui deploye, sans reutiliser un tag mutable pour la bascule.

## Avant la bascule EC2

Cette procedure vise une mise a jour d'une infrastructure existante, pas son
premier demarrage. MongoDB doit deja avoir un primaire en replica set et Redis
doit etre accessible depuis le reseau Compose.

1. Sauvegarder Mongo, les volumes `settings_data` et `uploads_data`, le Compose,
   le fichier `.env.ec2` et le digest actuellement deploye. Conserver ces
   sauvegardes hors du depot. Le workflow reecrit `.env.ec2` a la bascule.
2. Suspendre les changements de tarifs, commandes et traitements en arriere-plan
   pendant la migration. Les instances et workers doivent utiliser la meme
   revision et la meme base. Le Compose transmet maintenant
   `MAINTENANCE_CRON_DISABLED` ; ce drapeau ne remplace pas l'arret des workers
   externes. Ne pas laisser d'ancienne instance verifier les sessions web.
3. Depuis le dossier Compose du serveur de reference, exporter `IMAGE` avec le
   digest exact valide dans GHCR. Conserver le meme projet Compose et ses volumes.
   Examiner le dry-run : si des fichiers tarifaires attendus manquent et que
   des valeurs par defaut apparaissent, arreter et retrouver la bonne source.

```bash
set -euo pipefail
: "${IMAGE:?Exporter IMAGE avec le digest GHCR valide avant execution}"
export IMAGE
docker compose --env-file .env.ec2 -f docker-compose.ec2.yml pull app
docker compose --env-file .env.ec2 -f docker-compose.ec2.yml run --rm --no-deps app node .ops/migrate-shipping-costs.cjs --dry-run
```

Apres examen et autorisation de la migration seulement :

```bash
docker compose --env-file .env.ec2 -f docker-compose.ec2.yml run --rm --no-deps app node .ops/migrate-shipping-costs.cjs --apply
docker compose --env-file .env.ec2 -f docker-compose.ec2.yml run --rm --no-deps app node .ops/production-preflight.cjs
```

La migration est additive et idempotente : les blocs deja initialises sont
conserves. Le precontrole ne fait aucune ecriture et refuse la bascule si
Mongo, Redis, les secrets requis ou les deux blocs tarifaires sont invalides.
Il ne valide pas les cles de paiement/SMS, le DNS, TLS ou les droits fonctionnels.
Aucune migration de production n'est executee automatiquement par la CI.

Le deploiement manuel attend la sante Compose puis controle HTTP et le
handshake Socket.io. Verifier aussi via le domaine public : connexion,
deconnexion de sessions, OTP, prix admin/client, commande, paiement et mission
sur deux appareils. Un handshake Engine.IO seul ne prouve pas ces parcours.
Restaurer le digest et la configuration sauvegardes en cas de retour arriere ;
revenir a un ancien code lisant les fichiers tarifaires demande une reconciliation
avec les tarifs Mongo. Aucun rollback de donnees automatique n'est prevu.

## APK Xeuy d'audit

Le profil `audit` de [mobile/app/eas.json](../mobile/app/eas.json) herite de
`ec2` : APK interne, canal `audit-2026-10`, runtime `audit-2026-10`.
Les profils existants gardent le runtime `1.0.0` ; ne pas envoyer ce lot en OTA
sur le canal `ec2`. Un nouvel APK est requis pour cette recette.

Le profil herite aussi de l'API `https://itvisionplus.sn` et du meme identifiant
Android : il ne cree ni backend de recette ni application installable cote a cote.
Verifier la cible avant toute action sur des donnees reelles. La cle Maps est
obligatoire pour ce profil. La fournir dans l'environnement local/EAS, avec
les restrictions de package et signature Android appropriees, sans la committer.
L'upload Sentry est desactive sur ce seul profil tant que son organisation
n'est pas configuree ; cela ne desactive pas le reporting applicatif.

Apres la validation du backend, depuis `mobile/app` :

```bash
set -euo pipefail
set -a
. ./.env
set +a
: "${EXPO_PUBLIC_GOOGLE_MAPS_API_KEY:?Cle Maps requise}"
npx eas build --platform android --profile audit --non-interactive --no-wait
```

Aucun build EAS ni aucune OTA n'ont ete lances pendant cette preparation.

## Preuves et limites locales

- Domaines, frontieres, capacites, politique sourcing et tarification : passes.
- Tests readiness : enum Payment, pieces jointes et cinq refus du precontrole
  passes avec dependances simulees, sans reseau.
- Bundles operationnels compiles et export du dispatch chargeable.
- Mobile : TypeScript passe, 83 tests Jest passes ; isolation du runtime et
  refus de configuration sans cle Maps verifies.
- Web/backend : 24 diagnostics TypeScript reduits a un seul, client Prisma
  non genere localement. Sentry et le lockfile sont corriges. Le telechargement
  du moteur Windows retourne HTTP 403, y compris avec `--no-engine`.
  Aucune verification TLS ou regle de compilation n'a ete desactivee.
- Lint des sources Next et nouveaux scripts sans erreur bloquante ; avertissements
  existants. Le lint supplementaire du serveur CommonJS signale ses appels
  `require`, hors du perimetre Next par defaut ; sa syntaxe Node est valide.
- Les 30 tests de compte/produit/admin du lot precedent restent documentes dans
  l'audit. L'image Docker, le build Next complet et les E2E integres ne sont
  pas valides sur ce poste : leur execution Linux/CI reste obligatoire.