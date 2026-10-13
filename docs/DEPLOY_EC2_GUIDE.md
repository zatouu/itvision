# 🚀 GUIDE DÉPLOIEMENT EC2 - IT Vision

## 📍 Cible
- **IP**: 3.208.16.12
- **Domaine**: itvisionplus.sn
- **Utilisateur**: ubuntu

---

## ÉTAPE 1: Préparer la clé SSH

```bash
# Vérifier que vous avez la clé .pem
ls -la ~/.ssh/*.pem

# Si la clé s'appelle autrement, créer un lien ou renommer
# Exemple: si vous avez 'mykey.pem'
cp ~/.ssh/mykey.pem ~/.ssh/itvision.pem
chmod 600 ~/.ssh/itvision.pem
```

---

## ÉTAPE 2: Lancer le déploiement

```bash
cd /mnt/d/itvision-1
./scripts/deploy-ec2.sh
```

---

## ÉTAPE 3: Manuel (si le script échoue)

### A. Build local
```bash
cd /mnt/d/itvision-1
npm run build
```

### B. Sync fichiers (rsync)
```bash
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  -e "ssh -i ~/.ssh/itvision.pem" \
  /mnt/d/itvision-1/ \
  ubuntu@3.208.16.12:/home/ubuntu/itvision-1/
```

### C. Redémarrer sur EC2
```bash
ssh -i ~/.ssh/itvision.pem ubuntu@3.208.16.12 << 'EOF'
cd /home/ubuntu/itvision-1
docker-compose down
docker-compose up -d --build
docker-compose ps
EOF
```

---

## ÉTAPE 4: Vérifier le déploiement

```bash
# Test local
curl https://itvisionplus.sn/api/health

# Ou via SSH
ssh -i ~/.ssh/itvision.pem ubuntu@3.208.16.12 'docker-compose logs --tail 20'
```

---

## 🔧 Commandes de secours

### Voir logs
```bash
ssh -i ~/.ssh/itvision.pem ubuntu@3.208.16.12
cd itvision-1
docker-compose logs -f
```

### Redémarrer complètement
```bash
ssh -i ~/.ssh/itvision.pem ubuntu@3.208.16.12
sudo reboot
```

### Vérifier MongoDB
```bash
ssh -i ~/.ssh/itvision.pem ubuntu@3.208.16.12
docker exec itvision-mongodb mongosh -u itvision_app -p AppPassword123 --authenticationDatabase itvision_db --eval "db.products.countDocuments()"
```

---

## ⚠️ Problèmes courants

### "Permission denied (publickey)"
```bash
chmod 600 ~/.ssh/itvision.pem
```

### "Could not resolve hostname"
```bash
# Utiliser IP directement au lieu du domaine
ssh -i ~/.ssh/itvision.pem ubuntu@3.208.16.12
```

### Port 3000 déjà utilisé
```bash
ssh -i ~/.ssh/itvision.pem ubuntu@3.208.16.12
sudo lsof -ti:3000 | xargs kill -9
docker-compose up -d
```

---

## 📋 Post-déploiement

Après déploiement réussi:

1. **Vérifier site**: https://itvisionplus.sn
2. **Vérifier API**: https://itvisionplus.sn/api/health
3. **Tester import**: Aller sur `/admin/import-produits`
4. **Setup backup cron**:
   ```bash
   ssh -i ~/.ssh/itvision.pem ubuntu@3.208.16.12
   crontab -e
   # Ajouter: 0 2 * * * cd /home/ubuntu/itvision-1 && ./scripts/backup.sh
   ```

---

## 🎯 Récap fichiers déployés

- ✅ Application Next.js buildée
- ✅ API routes (/api/scrape/*)
- ✅ Scripts scraping (Playwright)
- ✅ Extension Chrome (dossier extension/)
- ✅ MongoDB init-safe.js
- ✅ Scripts backup

---

**Prêt à déployer ?**
```bash
./scripts/deploy-ec2.sh
```

**Ou manuel étape par étape ?**
Voir section "ÉTAPE 3: Manuel" ci-dessus.
