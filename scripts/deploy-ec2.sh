#!/bin/bash
# Script de déploiement automatique sur EC2
# Usage: ./scripts/deploy-ec2.sh

set -e

# Configuration
EC2_IP="3.208.16.12"
EC2_USER="ubuntu"
DOMAIN="itvisionplus.sn"
LOCAL_DIR="/mnt/d/itvision-1"
REMOTE_DIR="/home/ubuntu/itvision-1"

echo "🚀 Déploiement IT Vision sur EC2"
echo "================================"
echo "IP: $EC2_IP"
echo "Domaine: $DOMAIN"
echo ""

# Vérifier que la clé SSH existe
if [ ! -f ~/.ssh/itvision.pem ]; then
    echo "❌ Clé SSH ~/.ssh/itvision.pem non trouvée"
    echo "Placez votre fichier .pem dans ~/.ssh/ et renommez-le itvision.pem"
    exit 1
fi

chmod 600 ~/.ssh/itvision.pem

# 1. Build local
echo "📦 Étape 1: Build local..."
cd "$LOCAL_DIR"
npm run build
echo "✅ Build terminé"
echo ""

# 2. Sync fichiers
echo "📤 Étape 2: Copie fichiers sur EC2..."
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude '*.log' \
  -e "ssh -i ~/.ssh/itvision.pem" \
  "$LOCAL_DIR/" \
  "$EC2_USER@$EC2_IP:$REMOTE_DIR/"
echo "✅ Fichiers copiés"
echo ""

# 3. Connexion SSH et redémarrage
echo "🔧 Étape 3: Redémarrage services..."
ssh -i ~/.ssh/itvision.pem "$EC2_USER@$EC2_IP" << 'EOF'
    cd /home/ubuntu/itvision-1
    
    echo "  → Pull images Docker..."
    docker-compose pull
    
    echo "  → Rebuild app..."
    docker-compose build --no-cache app
    
    echo "  → Redémarrage..."
    docker-compose down
    docker-compose up -d
    
    echo "  → Attente démarrage..."
    sleep 10
    
    echo "  → Vérification..."
    docker-compose ps
    
    echo ""
    echo "✅ Déploiement terminé!"
EOF

echo ""
echo "================================"
echo "🎉 Déploiement complet!"
echo ""
echo "URLs:"
echo "  Site: https://$DOMAIN"
echo "  API Health: https://$DOMAIN/api/health"
echo ""
echo "Vérifier logs:"
echo "  ssh -i ~/.ssh/itvision.pem $EC2_USER@$EC2_IP 'docker-compose logs -f'"
