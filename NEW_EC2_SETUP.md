# 🚀 GUIDE - Créer Nouvelle Instance EC2 + Déploiement

## 📋 ÉTAPES RAPIDES (Console AWS)

### ÉTAPE 1: Créer l'instance EC2
1. Va sur [AWS Console → EC2](https://console.aws.amazon.com/ec2/)
2. Clique **"Launch Instance"**
3. Configuration:
   - **Name**: `itvision-prod`
   - **AMI**: **Amazon Linux 2023** (recommandé) ou **Ubuntu Server 22.04 LTS**
   - **Instance type**: `t3.medium` (2 vCPU, 4 Go) minimum pour Docker
   - **Key pair**: 
     - Clique **"Create new key pair"**
     - Name: `itvision-key`
     - Type: RSA
     - Format: `.pem`
     - **Télécharge et garde précieusement le fichier .pem**
   - **Network**: VPC par défaut
   - **Security Group**: Créer nouveau
     - Name: `itvision-sg`
     - Rules:
       - SSH (22) → Anywhere (ou ton IP)
       - HTTP (80) → Anywhere
       - HTTPS (443) → Anywhere
       - Custom TCP (3000) → Anywhere (pour test)
   - **Storage**: 30 Go gp3 (minimum pour Docker images)

4. Clique **"Launch Instance"**

---

### ÉTAPE 2: Récupérer l'IP publique
- Une fois l'instance **Running**, note l'**IPv4 Public IP** (ex: `54.123.45.67`)
- Ou configure une **Elastic IP** (recommandé pour DNS stable)

---

### ÉTAPE 3: Configurer le DNS (itvisionplus.sn)
Chez ton registrar (SNPT ou autre):
- Type A: `@` → IP de l'EC2
- Type A: `www` → IP de l'EC2
- Attendre propagation (5-30 min)

---

## 🔧 COMMANDES DE SETUP (SSH)

### 1. Connexion initiale
```bash
# Remplace X.X.X.X par l'IP de ta nouvelle EC2
chmod 400 ~/Downloads/itvision-key.pem
ssh -i ~/Downloads/itvision-key.pem ubuntu@X.X.X.X
```

### 2. Script de setup automatique (à copier-coller sur EC2)
```bash
#!/bin/bash
# setup-ec2.sh - Exécuter sur la nouvelle EC2

set -e

echo "🚀 Setup EC2 pour IT Vision..."

# Mise à jour
sudo apt update && sudo apt upgrade -y

# Installation Docker
if [ -f /etc/os-release ]; then
  if grep -q "Amazon Linux" /etc/os-release; then
    # Pour Amazon Linux 2023:
    sudo yum update -y
    sudo yum install docker -y
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker ec2-user
  else
    # Pour Ubuntu:
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker ubuntu
  fi
fi

# Installation Docker Compose
if [ -f /etc/os-release ]; then
  if grep -q "Amazon Linux" /etc/os-release; then
    # Pour Amazon Linux 2023:
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
  else
    # Pour Ubuntu (même commande):
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
  fi
fi

# Installation Node.js (pour build local si besoin)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Création répertoire
mkdir -p ~/itvision-1
cd ~/itvision-1

echo "✅ Setup de base terminé!"
echo "Redémarrage nécessaire pour groupe docker..."
sudo reboot
```

---

## 📤 DÉPLOIEMENT DE L'APPLICATION

### Option A: Via GitHub (recommandé)
```bash
# Sur EC2 (après reboot)
cd ~/itvision-1
git clone https://github.com/zatouu/itvision-1.git .

# Configurer variables d'environnement
cat > .env << 'EOF'
MONGO_ROOT_PASSWORD=your_root_password
MONGO_APP_PASSWORD=your_app_password
JWT_SECRET=your_jwt_secret
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=https://itvisionplus.sn
APIFY_API_KEY=your_apify_key
ALIEXPRESS_RAPIDAPI_KEY=your_rapidapi_key
EOF

# Démarrer
docker-compose up -d
```

### Option B: Via rsync depuis ton local
```bash
# Sur ton PC (WSL/Terminal)
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  -e "ssh -i ~/Downloads/itvision-key.pem" \
  /mnt/d/itvision-1/ \
  ubuntu@X.X.X.X:/home/ubuntu/itvision-1/

# Puis sur EC2
ssh -i ~/Downloads/itvision-key.pem ubuntu@X.X.X.X \
  "cd itvision-1 && docker-compose up -d --build"
```

---

## ✅ VÉRIFICATION POST-DÉPLOIEMENT

```bash
# Tester depuis ton PC
curl https://itvisionplus.sn/api/health
curl https://itvisionplus.sn

# Logs sur EC2
docker-compose logs -f
```

---

## 🔄 AUTOMATISATION AVEC USER DATA (Optionnel)

Quand tu crées l'EC2, dans "Advanced" → "User data", colle:
```bash
#!/bin/bash
apt update
curl -fsSL https://get.docker.com | sh
usermod -aG docker ubuntu
curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
reboot
```

---

## 💾 BACKUP AUTOMATIQUE (à configurer après)

```bash
# Sur EC2
crontab -e
# Ajouter:
0 2 * * * cd ~/itvision-1 && ./scripts/backup.sh >> /var/log/backup.log 2>&1
```

---

## 📊 COÛTS ESTIMÉS (us-east-1)

- **t3.medium**: ~$30/mois (si on 24/7)
- **30 Go gp3**: ~$2.40/mois
- **Elastic IP**: Gratuit (si attachée à instance running)
- **Data Transfer**: ~$5-20/mois selon trafic

**Total**: ~$35-50/mois

---

## 🆘 DÉPANNAGE

### Si "Permission denied"
```bash
chmod 400 ~/Downloads/itvision-key.pem
ssh -i ~/Downloads/itvision-key.pem ubuntu@X.X.X.X
```

### Si Docker ne démarre pas
```bash
sudo systemctl start docker
sudo systemctl enable docker
```

### Si ports non accessibles
Vérifier Security Group sur AWS Console → Inbound rules

---

**Prêt ?** Commence par l'ÉTAPE 1 (créer l'instance), puis envoie-moi:
1. L'IP publique de la nouvelle EC2
2. Le chemin vers ta clé .pem téléchargée

Je te guiderai pour la suite !
