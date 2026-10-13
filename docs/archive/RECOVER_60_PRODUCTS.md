====================================================
RÉCUPÉRATION 60 PRODUITS - GUIDE D'URGENCE
====================================================

⚠️  EC2 PERDU - 60 PRODUITS À RÉIMPORTER

Ce guide te permet de réimporter rapidement tes 60 produits
avec le nouveau système de scraping robuste (navigateur).

====================================================
1. PRÉPARER L'ENVIRONNEMENT LOCAL
====================================================

A. Cloner le repo sur nouvelle machine
   git clone <ton-repo>
   cd itvision-1

B. Installer dépendances
   npm install

C. Installer Playwright (navigateur pour scraping)
   npx playwright install chromium

D. Copier les URLs à réimporter
   Créer fichier: data/produits-a-importer.txt
   (une URL par ligne, voir exemple ci-dessous)

====================================================
2. STRUCTURE FICHIER URLs (data/produits-a-importer.txt)
====================================================

Format:
- Une URL par ligne
- Commentaires avec #
- URLs 1688 ou AliExpress uniquement

Exemple:
```
# Caméras de surveillance - 1688
https://detail.1688.com/offer/1234567890.html
https://detail.1688.com/offer/0987654321.html

# Systèmes d'alarme - AliExpress
https://www.aliexpress.com/item/1005001234567890.html
https://www.aliexpress.com/item/1005000987654321.html

# Contrôle d'accès - 1688
https://detail.1688.com/offer/1122334455.html
```

====================================================
3. IMPORT BULK - MODE TEST (vérifier avant)
====================================================

A. Mode dry-run (test sans sauvegarde)
   npx tsx scripts/bulk-import.ts \
     --file data/produits-a-importer.txt \
     --dry-run \
     --concurrency 3

B. Vérifier les résultats
   - Liste des produits scannés
   - Erreurs éventuelles
   - URLs non supportées

====================================================
4. IMPORT BULK - RÉEL
====================================================

A. Démarrer MongoDB local (si pas sur EC2)
   docker-compose up -d mongodb

B. Lancer l'import
   npx tsx scripts/bulk-import.ts \
     --file data/produits-a-importer.txt \
     --concurrency 3

C. Options avancées:
   --resume      Reprendre si interruption
   --concurrency 5  Plus rapide (attention anti-bot)

====================================================
5. SUIVI ET RECOVERY
====================================================

A. Le script sauvegarde automatiquement:
   - .import-checkpoint.json (reprise possible)
   - import-results-YYYY-MM-DD.json (rapport)

B. Si interruption, reprendre:
   npx tsx scripts/bulk-import.ts \
     --file data/produits-a-importer.txt \
     --resume

C. Vérifier les imports:
   docker exec itvision-mongodb mongosh \
     -u itvision_app -p AppPassword123 \
     --authenticationDatabase itvision_db \
     --eval "db.products.countDocuments()"

====================================================
6. CONFIGURATION BACKUP AUTO (CRON)
====================================================

A. Une fois l'import terminé, setup backup:

   # 1. Tester le script backup
   ./scripts/backup.sh

   # 2. Lister les backups
   ./scripts/backup.sh list

   # 3. Ajouter au crontab (backup quotidien 2h)
   crontab -e

   # Ajouter cette ligne:
   0 2 * * * cd /home/ubuntu/itvision-1 && ./scripts/backup.sh >> /var/log/itvision-backup.log 2>&1

   # 4. Vérifier crontab installé
   crontab -l

B. Structure backup créée:
   ./backups/
   ├── mongodb_backup_20240115_020000.tar.gz
   ├── mongodb_backup_20240116_020000.tar.gz
   └── ... (14 jours de rétention)

====================================================
7. DÉPLOIEMENT SUR NOUVEL EC2
====================================================

A. Prérequis nouvelle EC2:
   - Ubuntu 22.04
   - Docker & Docker Compose installés
   - Git configuré

B. Déployer:
   git clone <repo>
   cd itvision-1
   
   # Copier les produits importés (si local d'abord)
   # OU réimporter direct sur EC2

   docker-compose up -d

C. Vérifier:
   curl http://localhost:3000/api/health

====================================================
8. RÉCUPÉRATION APRÈS CRASH (AVEC BACKUP)
====================================================

Si tu as un backup et que tout plante:

A. Lister backups disponibles
   ./scripts/backup.sh list

B. Restaurer (⚠️ écrase données actuelles)
   ./scripts/backup.sh restore mongodb_backup_20240115_020000.tar.gz

C. Confirmer avec "OUI" quand demandé

====================================================
9. FICHIER EXEMPLE: data/produits-a-importer.txt
====================================================

# Coller ici tes 60 URLs récupérées depuis:
# - Ton ancien admin (si screenshots/exports)
# - Historique navigateur
# - Fichiers sourcing

# Caméras & Vidéosurveillance (1688)
https://detail.1688.com/offer/XXXXXXXXX.html
https://detail.1688.com/offer/XXXXXXXXX.html

# Systèmes d'alarme (AliExpress)
https://www.aliexpress.com/item/XXXXXXXXX.html

# Contrôle d'accès
https://detail.1688.com/offer/XXXXXXXXX.html

# [ETC... 60 URLs au total]

====================================================
10. ASTUCES POUR RÉCUPÉRER LES URLs
====================================================

A. Si tu as des screenshots de l'ancien admin:
   - Reconnaissance manuelle des URLs
   - Chercher dans emails de sourcing

B. Si tu as l'historique navigateur:
   - Chrome: chrome://history
   - Rechercher "1688.com/offer" et "aliexpress.com/item"

C. Si tu as des fichiers sourcing:
   - Grep dans emails: grep -r "1688.com/offer" *
   - Vérifier Slack/Discord/Telegram historique

D. Contacter fournisseurs directement:
   - Envoyer liste manquante
   - Demander liens produits

====================================================
11. COMMANDES RAPIDES (copier-coller)
====================================================

# Setup complet
npm install && npx playwright install chromium

# Test import
npx tsx scripts/bulk-import.ts -f data/produits.txt -d

# Import réel
npx tsx scripts/bulk-import.ts -f data/produits.txt

# Backup
./scripts/backup.sh

# Restore
./scripts/backup.sh restore backups/mongodb_backup_XXX.tar.gz

# Vérifier nombre produits
docker exec itvision-mongodb mongosh -u itvision_app -p AppPassword123 --authenticationDatabase itvision_db --eval "db.products.countDocuments()"

====================================================
NE JAMAIS OUBLIER:
====================================================

1. ✅ Toujours tester en --dry-run avant import réel
2. ✅ Backup automatique cron quotidien
3. ✅ Stocker backup sur S3 ou autre EC2 (pas même machine)
4. ✅ Documenter les URLs sources dans Git
5. ✅ Checkpoint auto toutes les 5 imports (reprise possible)

====================================================
BESOIN D'AIDE?
====================================================

Si erreur scraping:
- Réduire --concurrency (essayer 1 ou 2)
- Vérifier URLs encore valides
- Essayer --resume pour reprendre

Si backup fail:
- Vérifier docker exec itvision-mongodb mongosh...
- Vérifier espace disque: df -h
- Vérifier permissions: ls -la backups/

====================================================
