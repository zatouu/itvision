# DIAGNOSTIC URGENCE - Site EC2 Down

## 🔴 Vérifications immédiates

### 1. Connexion SSH à l'EC2
```bash
ssh -i /chemin/vers/ta-cle.pem ubuntu@TON_IP_EC2
```

### 2. Vérifier état Docker
```bash
cd ~/itvision-1  # ou ton répertoire d'installation

# Voir les conteneurs
docker ps -a

# Voir les logs MongoDB (critique pour tes 60 produits)
docker logs itvision-mongodb --tail 50

# Voir les logs de l'app
docker logs itvision-app --tail 50
```

### 3. Vérifier volumes Docker (où sont tes données)
```bash
# Liste des volumes
docker volume ls

# Inspecter volume MongoDB
docker volume inspect itvision-1_mongodb_data

# Vérifier espace disque
df -h
docker system df
```

### 4. Redémarrage d'urgence
```bash
# Stop propre
docker-compose down

# Vérifier si volumes existent toujours
docker volume ls | grep mongodb

# Redémarrer
docker-compose up -d

# Attendre et vérifier
docker-compose ps
docker logs -f itvision-mongodb
```

## 🟡 Si les données MongoDB sont corrompues

### Option A: Restore depuis backup
```bash
# Si tu as des backups dans ./backups
ls -la ~/itvision-1/backups/

# Restore dernier backup
docker exec -i itvision-mongodb mongorestore \
  --username itvision_app \
  --password AppPassword123 \
  --authenticationDatabase itvision_db \
  --db itvision_db \
  /backups/DERNIER_BACKUP
```

### Option B: Export/Import des produits
```bash
# Se connecter au container MongoDB
docker exec -it itvision-mongodb mongosh \
  -u itvision_app -p AppPassword123 \
  --authenticationDatabase itvision_db

# Dans mongosh:
use itvision_db
db.products.countDocuments()  # Vérifier si produits existent
```

## 🟢 Si tout est perdu - Restauration rapide

### 1. Réinitialisation complète (DANGER - perte données)
```bash
# SUPPRIMER volumes (perte définitive données)
docker-compose down -v  # -v = delete volumes

# Recréer from scratch
docker-compose up -d mongodb
# Attendre 10s puis:
docker-compose up -d app nginx
```

### 2. Réimporter les produits via admin
- Aller sur `/admin/import-produits`
- Utiliser les URLs 1688/AliExpress précédentes
- Ou bulk import via fichier CSV si tu en as un

## 📋 Diagnostics à me montrer

Copie-colle les résultats de :
```bash
docker ps -a
docker volume ls
docker logs itvision-mongodb --tail 20
docker logs itvision-app --tail 20
```

## 🔧 Créer workflow de backup automatique

Je vais créer un workflow pour éviter ça à l'avenir avec backup quotidien.

---
**Actions que j'ai faites (fichiers uniquement, pas de commandes)**:
- Créé `src/lib/browser-scraper.ts` (nouveau code)
- Créé `src/app/api/scrape/route.ts` (nouveau code)
- Créé `docs/SCRAPING_NAVIGATEUR.md` (documentation)
- Modifié `docker-compose.yml` ligne 19 (init-safe.js)
- Installé packages npm (`playwright`)

**Je n'ai jamais exécuté** : `docker`, `ssh`, `rm`, ou toute commande sur ton serveur.
