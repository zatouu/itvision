# Variables a preparer avant le deploiement audit

Branche : `feat/suivi-audit-2026-10`. Perimetre : backend partage, DDM+ et APK
Xeuy. Inventaire du code et du workflow local au 12 octobre 2026, sans lecture
ni verification des secrets reels. Aucun secret n'a ete cree ou modifie.

Ce lot ne demande pas de renouveler les secrets existants. Conserver les valeurs
de production fonctionnelles ; toute rotation doit etre preparee separement.
Le [guide de build](BUILD_AUDIT_2026-10.md) couvre migration, bascule et recette.

## Ou renseigner les valeurs

| Emplacement | Usage |
| --- | --- |
| GitHub > Settings > Secrets and variables > Actions > Secrets | Valeurs lues par `secrets.NOM` dans le workflow, y compris certaines valeurs non confidentielles historiquement rangees ici |
| GitHub > Settings > Secrets and variables > Actions > Variables | Valeurs lues par `vars.NOM` ; creer un Secret du meme nom ne les remplace pas |
| EC2, fichier `.env.ec2` du projet Compose | Configuration locale. Le workflow le reecrit a chaque deploiement ; les ajouts manuels non repris par le workflow seront perdus |
| `mobile/app/.env` et environnement du build EAS | Valeurs integrees a l'APK, distinctes des secrets du backend et de GitHub Actions |

**Une variable dans `.env.ec2` n'est pas automatiquement disponible dans le
conteneur.** Elle doit etre referencee dans `environment` du Compose ou transmise
explicitement. Les ecarts connus sont listes plus bas. Ne pas mettre de cle
privee dans un nom commencant par `NEXT_PUBLIC_` ou `EXPO_PUBLIC_` : ces valeurs
sont publiques dans les bundles distribues.

## Nouveautes du lot

| Variable | Statut et valeur | Ou / effet |
| --- | --- | --- |
| `XEUY_AUDIT_BUILD` | Nouvelle, `1` | Deja definie par le profil EAS `audit` ; selectionne le runtime `audit-2026-10`. Ne pas l'ajouter a l'environnement du backend ni aux autres profils |
| `SENTRY_DISABLE_AUTO_UPLOAD` | `true` pour l'APK audit | Deja definie par ce profil ; evite l'upload des sourcemaps tant que l'organisation Sentry n'est pas configuree. Ne desactive pas le reporting applicatif |
| `ADDRESS_GEOCODING_URL` | Nouvelle surcharge optionnelle | Endpoint du geocodeur d'adresses DDM+. Pas necessaire pour utiliser le fournisseur par defaut ; non transmis par le workflow/Compose actuels |
| `SMOKE_BASE_URL` | Nouvelle surcharge optionnelle | URL visee par `scripts/check-production-runtime.cjs`, defaut `http://127.0.0.1:3000`. Aucun secret a creer pour la verification dans le conteneur |
| `MAINTENANCE_CRON_DISABLED` | Existante, maintenant transmise au conteneur ; `true` pendant suspension, `false` en fonctionnement | GitHub Secret. Prevoir explicitement la reprise apres la migration |
| `AGENT_WORKER_ENABLED` | Activation a confirmer ; defaut `false` | GitHub Variable. Activer le worker embarque seulement apres validation de la capacite de la machine ; sinon exploiter un worker externe |
| `MONGODB_URI`, `REDIS_URL`, `JWT_SECRET`, `NEXTAUTH_SECRET`, `CRON_SECRET` | Existantes, requises par le nouveau precontrole | Emplacements detailles ci-dessous. Pas de nouvelle cle de session a inventer pour la revocation des connexions |

## Socle obligatoire

Les valeurs marquees GitHub Secret sont deja referencees par le workflow.

| Variable | Ou renseigner | Valeur attendue / vigilance |
| --- | --- | --- |
| `SSH_HOST` | GitHub Secret | Hote EC2 accessible depuis le runner |
| `SSH_USER` | GitHub Secret | Compte de deploiement avec les droits requis sur Docker et les services |
| `SSH_KEY` | GitHub Secret | Cle privee de ce compte ; jamais dans les sources |
| `MONGO_ROOT_PASSWORD` | GitHub Secret | Mot de passe root Mongo existant ; changer l'env ne change pas le mot de passe d'un volume deja initialise |
| `MONGO_APP_PASSWORD` | GitHub Secret | Mot de passe de l'utilisateur Mongo `itvision_app` existant. Il est interpole dans une URI : les caracteres reserves exigent un traitement adapte, non ajoute par ce document |
| `JWT_SECRET` | GitHub Secret | Secret signeur existant, identique sur toutes les instances Next, Socket.io et workers concernes ; conserver sa valeur |
| `NEXTAUTH_SECRET` | GitHub Secret | Secret NextAuth existant, stable entre instances et redemarrages |
| `CRON_SECRET` | GitHub Secret | Secret des appels internes/cron ; meme valeur chez leurs appelants |
| `NEXT_PUBLIC_SITE_URL` | GitHub Secret | URL HTTPS du site, actuellement `https://itvisionplus.sn`, sans chemin. Le workflow la reutilise pour l'API et `APP_BASE_URL` |
| `REDIS_URL` | GitHub Secret, facultatif avec le Redis Compose | Laisser vide pour le repli Compose `redis://redis:6379`, ou fournir l'URI du Redis reel. Requis dans le processus applicatif, notamment pour le quota de geocodage |
| `MONGODB_URI` | Automatique dans le conteneur Compose | Construit depuis `MONGO_APP_PASSWORD`, hote `mongodb`, base `itvision_db`, `authSource=itvision_db&replicaSet=rs0`. Hors Compose, fournir explicitement l'URI correcte aux scripts/workers |
| `IMAGE` | Automatique par le workflow | Digest exact de l'image construite et testee. Pour une migration manuelle, exporter ce digest comme explique dans le guide de build |
| `DATABASE_URL` | Deja definie dans le build Docker | `file:/tmp/build-only.db` pour generer Prisma pendant la compilation. Ce n'est pas l'URI Mongo de production ; meme valeur pour la generation locale si Prisma reste inutilise au runtime |

Le registre GHCR utilise le `GITHUB_TOKEN` fourni par GitHub Actions. Pour ce
workflow, ne pas creer un nouveau `GHCR_TOKEN` ou `DOCKER_PASSWORD` uniquement
pour ce lot. Verifier les permissions de lecture/ecriture des packages et
l'acces du runner aux secrets necessaires.

Pour un nouvel environnement seulement, generer separement les secrets avec
un generateur cryptographique, par exemple `openssl rand -hex 32`. Ne pas
copier les secrets factices des tests CI et ne pas regenerer ceux de production
simplement pour faire passer le precontrole.

## Xeuy : OTP et APK

### Backend SMS

| Variable | Ou renseigner | Valeur attendue |
| --- | --- | --- |
| `SMS_PROVIDER` | GitHub Secret | `twilio` pour le chemin SMS configure par ce Compose ; obligatoire avant lancement |
| `TWILIO_ACCOUNT_SID` | GitHub Secret | SID du compte autorise a envoyer les SMS de recette/production |
| `TWILIO_AUTH_TOKEN` | GitHub Secret | Jeton prive Twilio |
| `TWILIO_FROM_NUMBER` | GitHub Secret | Numero expediteur autorise, au format international |
| `OTP_TEST_PHONES` | GitHub Secret | Vide pour le fonctionnement normal. Une whitelist de test donne un acces avec code fixe : ne pas y mettre de numeros clients ou administrateurs reels |
| `ALLOW_TEST_CODES` | Deja force a `false` dans le Compose | Ne pas activer en production ; le Secret homonyme ne remplace pas cette valeur explicite du Compose |
| `DEV_MOBILE_TOKEN`, `DEV_PROVIDER_TOKEN` | Aucun ajout en production | Laisser absents/vides ; jetons de developpement, pas des identifiants a distribuer avec l'APK |

Un APK installe ne suffit pas a prouver le fonctionnement des SMS : verifier
l'envoi et la reception sur les numeros de recette, les droits du compte et
les restrictions geographiques du fournisseur.

### Configuration du build mobile

| Variable | Ou renseigner | Valeur attendue / effet |
| --- | --- | --- |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | `mobile/app/.env` pour la resolution locale et environnement du build EAS | Obligatoire pour le profil audit ; cle Google Maps autorisee pour les API utilisees. Restreindre par application/API et verifier package + certificat de signature de l'APK |
| `EXPO_PUBLIC_API_BASE_URL` | Profil EAS et configuration locale mobile | Le profil audit herite de `https://itvisionplus.sn`. Pour une recette isolee, modifier la cible du profil avant build ; une simple variable concurrente ne garantit pas de remplacer celle du profil |
| `EXPO_PUBLIC_PROJECT_ID` | Environnement mobile/EAS, seulement si absent de la configuration | ID du projet EAS. `extra.eas.projectId` deja configure est prioritaire ; verifier sa coherence avec le projet de build/push |
| `EXPO_PUBLIC_SENTRY_DSN` | Environnement mobile/EAS | DSN public du projet Sentry mobile, recommande pour observer la recette. Vide = reporting mobile desactive. Independant de `SENTRY_DSN` et du DSN web |
| `XEUY_AUDIT_BUILD` | Profil audit, deja `1` | Aucun remplissage manuel en usage normal du profil |
| `SENTRY_DISABLE_AUTO_UPLOAD` | Profil audit, deja `true` | Aucun jeton d'upload Sentry requis pour ce profil dans l'etat actuel |

Le canal et le runtime d'audit isolent les mises a jour OTA, **pas l'API ni les
donnees**. Le package Android reste celui de l'application existante : l'APK
peut la remplacer sur l'appareil. Ne pas envoyer ce lot en OTA sur `ec2`.
Apres modification d'une valeur integree au bundle ou a la configuration native,
reconstruire l'APK d'audit. Ne jamais mettre le secret JWT backend dans l'app.

Pour les push natifs, verifier les credentials Android FCM v1 du projet EAS,
la configuration Firebase de l'application, l'autorisation de notifications
sur l'appareil et l'enregistrement de son token Expo au backend. Ce ne sont
pas des cles a remplacer par une nouvelle variable du lot.
Attention : la configuration Expo conserve son `extra.eas.projectId` s'il
existe, alors que le code de push privilegie `EXPO_PUBLIC_PROJECT_ID` si elle
est definie. Ne jamais laisser deux IDs differents.
L'emetteur Expo actuel n'envoie pas de jeton d'acces d'authentification : si
l'option de securite correspondante est activee dans Expo, il faudra adapter
l'emetteur avant de pouvoir qualifier les notifications ; ajouter un secret
non lu par le code ne suffit pas.
Le reporting Sentry mobile classe actuellement les builds non-dev en
`production`, y compris l'APK audit ; son canal OTA ne change pas ce libelle.

Valeurs a preparer pour le mobile, sans inclure de secret prive :

```dotenv
EXPO_PUBLIC_API_BASE_URL=https://itvisionplus.sn
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=REMPLACER_PAR_LA_CLE_MAPS_RESTREINTE
EXPO_PUBLIC_PROJECT_ID=REMPLACER_PAR_LE_MEME_ID_QUE_LE_PROJET_EAS
EXPO_PUBLIC_SENTRY_DSN=
```

Ce bloc est une fiche de preparation, pas une configuration deja validee.
Les deux placeholders doivent etre remplaces ; le DSN peut rester vide si
le reporting mobile n'est pas encore configure. Le profil EAS `audit` doit
rester la reference pour la cible API utilisee lors du build.

## DDM+ : fournisseurs et notifications

Ces variables ne sont pas toutes nouvelles ; elles doivent etre fonctionnelles
pour exercer les parcours de recette correspondants.

| Groupe / variables | Emplacement actuel | A renseigner pour |
| --- | --- | --- |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_SECURE` | GitHub Secrets, transmis au conteneur | Emails transactionnels, confirmations et recuperation de compte. Utiliser les parametres fournis par le serveur SMTP |
| `PAYMENTS_MOCK` | GitHub Secret | `false` pour des paiements reels ; `true` uniquement sur une recette isolee. Ce mode n'est pas une preuve d'integration du prestataire |
| `PAYDUNYA_MASTER_KEY`, `PAYDUNYA_PRIVATE_KEY`, `PAYDUNYA_TOKEN` | GitHub Secrets | Passerelle PayDunya, avec les identifiants de l'environnement choisi |
| `PAYDUNYA_MODE` | GitHub Secret | Renseigner explicitement le mode du prestataire, ne pas melanger identifiants test et production |
| `PAYDUNYA_STORE_NAME` | GitHub Secret | Nom marchand affiche |
| `WAVE_PAY_URL`, `WAVE_MERCHANT_PHONE` | GitHub Secrets | Paiement manuel Wave, si ce canal est utilise |
| `DEEPSEEK_API_KEY` | GitHub Secret | Fournisseur texte prioritaire du gateway IA |
| `DEEPSEEK_MODEL` | GitHub Variable | ID exact du modele disponible dans l'offre du compte ; verifier sa validite |
| `LLM_TEXT_PROVIDER` | GitHub Variable | `deepseek` pour forcer ce fournisseur, ou laisser vide pour la selection automatique du gateway |
| `QWEN_CLOUD_API_KEY`, `QWEN_CLOUD_BASE_URL`, `QWEN_MODEL` | GitHub Secrets | QwenCloud, notamment les capacites vision selon la configuration du gateway |
| `ALIEXPRESS_RAPIDAPI_KEY` | GitHub Secret | Integration AliExpress RapidAPI lorsqu'elle est utilisee |
| `OPENAI_API_KEY` | GitHub Secret | Integrations existantes qui l'utilisent ; pas un remplacement de la configuration du gateway principal |
| `SENTRY_DSN` | GitHub Secret | Remontee des erreurs serveur, facultatif pour demarrer mais recommande pour la recette |
| `NEXT_PUBLIC_SENTRY_DSN` | GitHub Variable | DSN public du navigateur, injecte lors du build Docker ; changer seulement l'env du conteneur ne modifie pas le bundle existant |

Valeurs de repli observees dans le gateway :

| Variable | Valeur par defaut / recommandation |
| --- | --- |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com/v1` ; garder sauf endpoint contractuel different |
| `DEEPSEEK_MODEL` | `deepseek-chat` dans le code ; confirmer cet ID avec le compte avant de le retenir |
| `QWEN_CLOUD_BASE_URL` | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` ; doit correspondre a la region du compte |
| `QWEN_MODEL` | `qwen-turbo` pour le texte ; verifier sa disponibilite |
| `QWEN_VL_MODEL` | `qwen-vl-max` pour les images ; verifier sa disponibilite. Option non raccordee au Compose actuel |
| `LLM_VISION_PROVIDER` | Vide = selection automatique ; `qwencloud` ou `ollama` pour forcer un fournisseur configure. Option non raccordee au Compose actuel |
| `OLLAMA_BASE_URL` | `http://localhost:11434` dans le code. Dans Docker, localhost designe le conteneur app : fournir une adresse joignable si un serveur Ollama externe est utilise |
| `OLLAMA_MODEL`, `OLLAMA_VL_MODEL` | `qwen3:8b` et `llava:13b` ; les modeles doivent etre installes sur le serveur Ollama |

DeepSeek seul ne fournit pas la vision dans ce gateway : pour les demandes
photo, configurer QwenCloud ou un Ollama vision joignable. `DASHSCOPE_API_KEY`
est un alias accepte par le code, mais le chemin de deploiement actuel transmet
`QWEN_CLOUD_API_KEY` : utiliser ce dernier nom. Ne pas activer automatiquement
les envois clients pour tester simplement la validite d'une cle IA.

Le push web est distinct du push Expo : il utilise
`NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY` et `WEB_PUSH_EMAIL`
(contact par defaut `support@itvisionplus.sn`). Conserver une paire VAPID
coherente si elle existe ; seule la cle publique peut etre distribuee au client.
Ces trois variables ne sont pas injectees par le workflow/Compose actuel.
Le push web demande donc un raccordement de configuration avant recette.

Verifier aussi les reglages dans l'administration : activation des fournisseurs,
validation humaine des propositions, tarification et frais. Une cle d'API ne
remplace pas ces reglages et n'autorise pas automatiquement les envois aux clients.

## Geolocalisation et tarification

- Adresses DDM+ : le navigateur exige HTTPS et le consentement de l'utilisateur.
  Le geocodage inverse utilise `ADDRESS_GEOCODING_URL` si fourni, sinon le service
  `https://nominatim.openstreetmap.org/reverse`, sans cle d'API additionnelle.
  Un endpoint personnalise doit etre HTTPS, compatible Nominatim (`address`
  contenant des chaines), et accessible en sortie depuis le serveur. Le handler
  remplace les parametres de requete de l'URL : une cle mise uniquement dans
  sa query string ne sera pas conservee. Redis doit etre accessible pour le
  quota en production ; son absence provoque un refus 503, pas un contournement.
  Ce parcours n'utilise pas la cle Google Maps de l'APK Xeuy.
- Tarifs : pas de nouvelle variable a recopier pour chaque prix. Les snapshots
  commerciaux et couts transporteur doivent etre initialises dans Mongo par
  la migration, puis administres dans l'application.
- `SHIPPING_ADJUST_TOLERANCE` est reutilisee pour initialiser la tolerance lors
  de la migration si le fichier historique correspondant est absent. Une valeur
  deja en Mongo n'est pas remplacee par un changement d'environnement. Ne pas
  en ajouter une sans verifier les reglages du serveur de reference. Valeur
  de repli : `0.1`, soit 10 %, dans l'intervalle autorise de 0 a 0.5.

## Ecarts de transmission a connaitre

| Variable / groupe | Situation dans le deploiement actuel |
| --- | --- |
| `ADDRESS_GEOCODING_URL` | Lue par le code, absente de l'ecriture `.env.ec2` et du Compose. Un fournisseur personnalise demande un raccordement explicite dans ces deux endroits |
| `SHIPPING_ADJUST_TOLERANCE` | Absente du Compose ; pour une surcharge ponctuelle, la transmettre explicitement au processus de migration et verifier le dry-run |
| `QWEN_VL_MODEL`, `LLM_VISION_PROVIDER`, `OLLAMA_VL_MODEL`, `DASHSCOPE_API_KEY` | Lues par le gateway, non transmises par le workflow/Compose. Les valeurs par defaut s'appliquent aux modeles ; utiliser le nom raccorde `QWEN_CLOUD_API_KEY` pour la cle Qwen |
| `DEEPSEEK_BASE_URL`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `SENTRY_ENVIRONMENT`, `SOURCING_MARGIN_RATE` | Acceptees par Compose, non ecrites par le workflow ; leurs valeurs Compose par defaut s'appliquent lors du deploiement automatise |
| `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, `WEB_PUSH_EMAIL` | Absentes de l'ecriture `.env.ec2` et du Compose ; ajouter seulement des secrets GitHub ne configure pas le push web |
| `WAVE_API_KEY`, `OM_API_URL`, `OM_API_TOKEN`, `FREE_MONEY_API_URL`, `FREE_MONEY_API_KEY`, `ORANGE_MERCHANT_PHONE`, `FREE_MONEY_MERCHANT_PHONE` | Variables de canaux alternatifs referencees par Compose mais non ecrites par le workflow. Les raccorder si ces canaux sont retenus, au lieu de supposer qu'ils seront configures |
| `APIFY_TOKEN`, `WAVE_QR_URL`, `ADMIN_EMAIL` | Ecrites dans `.env.ec2` par le workflow, mais non transmises a l'app par ce Compose ; ne pas compter sur cette ecriture pour activer un usage serveur |
| `EXPO_PUBLIC_*` | Les secrets GitHub du backend ne sont pas transmis automatiquement au build EAS |
| Variables Compose non ecrites par le workflow | Un ajout manuel dans `.env.ec2` disparait lors du prochain deploiement. Verifier les deux niveaux avant d'activer un fournisseur alternatif |

Ce document decrit l'etat actuel ; il ne modifie ni le workflow ni le Compose.
Un fournisseur facultatif non raccorde ne doit pas etre annonce comme configure
simplement parce que son secret existe dans GitHub.

## Controle avant autorisation de bascule

- [ ] Secrets GitHub et Variables GitHub renseignes au bon emplacement.
- [ ] Identifiants Mongo existants conserves, replica set primaire disponible.
- [ ] Secrets JWT/NextAuth/cron coherents entre instances et appelants.
- [ ] Redis accessible depuis l'app et les workers.
- [ ] Tarifs migres apres examen du dry-run et sauvegarde des donnees.
- [ ] OTP/SMS et emails testes avec des comptes dedies.
- [ ] Cible API mobile, cle Maps et projet EAS verifies avant l'APK.
- [ ] Modes de paiement et identifiants du meme environnement.
- [ ] Cron/worker explicitement suspendus ou actives selon la phase de recette.
- [ ] Aucun token de developpement ou code OTP de test sur les comptes reels.
- [ ] Controle ci-dessous execute apres preparation, sans afficher les secrets.

```bash
set -euo pipefail
docker compose --env-file .env.ec2 -f docker-compose.ec2.yml config --quiet
docker compose --env-file .env.ec2 -f docker-compose.ec2.yml run --rm --no-deps app node .ops/production-preflight.cjs
```

Le precontrole verifie la presence des secrets requis, Mongo primaire, Redis
et la validite des deux blocs tarifaires. Il ne valide pas les credentials SMS,
paiement, Maps, SMTP ou IA : les tests d'integration restent necessaires.
Ne pas lancer `docker compose config` sans `--quiet` dans un journal partage :
la configuration resolue peut exposer les secrets.

## Sources

- [Workflow GHCR/EC2](../.github/workflows/deploy-ghcr-ec2.yml)
- [Compose EC2](../docker-compose.ec2.yml)
- [Profil EAS](../mobile/app/eas.json) et [configuration Expo](../mobile/app/app.config.js)
- [Precontrole](../scripts/production-preflight.ts)
- [Geocodage d'adresses](../src/app/api/client/address-from-position/route.ts)
- [Migration tarifaire](../scripts/migrate-shipping-costs.ts)
- [Gateway IA](../src/lib/ai/gateway.ts)
- [Push mobile](../mobile/app/src/push.ts), [emetteur Expo](../src/lib/push.ts) et [push web](../src/lib/push-web.ts)
- [Sentry mobile](../mobile/app/src/sentry.ts)