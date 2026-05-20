#!/bin/bash
# deploy-new-ec2.sh - Déploiement complet vers nouvelle EC2
# Usage: ./deploy-new-ec2.sh <EC2_IP> <KEY_PATH> [EC2_USER]
# EC2_USER defaults to ec2-user (Amazon Linux). Use ubuntu for Ubuntu AMI.

set -e

EC2_IP=${1:-}
KEY_PATH=${2:-}
EC2_USER=${3:-ec2-user}
LOCAL_DIR="/mnt/d/itvision-1"

if [ -z "$EC2_IP" ] || [ -z "$KEY_PATH" ]; then
    echo "Usage: ./deploy-new-ec2.sh <EC2_IP> <KEY_PATH> [EC2_USER]"
    echo "Example: ./deploy-new-ec2.sh 54.90.187.148 ~/.ssh/itvision.pem ec2-user"
    exit 1
fi

SSH_CMD="ssh -o StrictHostKeyChecking=no -i $KEY_PATH $EC2_USER@$EC2_IP"

echo "🚀 Déploiement IT Vision vers $EC2_USER@$EC2_IP"
echo "========================================"

# Vérifier clé
if [ ! -f "$KEY_PATH" ]; then
    echo "❌ Clé non trouvée: $KEY_PATH"
    exit 1
fi

# 1. Sync fichiers (sans node_modules/.next/.git)
echo "📤 Étape 1: Copie fichiers sur EC2..."
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.git' \
    --exclude '*.log' \
    --exclude 'data/backups' \
    -e "ssh -o StrictHostKeyChecking=no -i $KEY_PATH" \
    "$LOCAL_DIR/" \
    "$EC2_USER@$EC2_IP:/home/$EC2_USER/itvision-1/"

echo "✅ Fichiers copiés"

# 2. Configurer .env + démarrer Docker sur EC2
echo "🐳 Étape 2: Configuration et démarrage Docker..."
$SSH_CMD << REMOTE_EOF
    cd ~/itvision-1
    
    # Vérifier .env existe
    if [ ! -f .env ]; then
        echo "⚠️  Fichier .env manquant! Création template..."
        cat > .env << 'ENV_EOF'
MONGO_ROOT_PASSWORD=ChangeMeRoot123
MONGO_APP_PASSWORD=ChangeMeApp123
JWT_SECRET=$(openssl rand -hex 32)
NEXTAUTH_SECRET=$(openssl rand -hex 32)
NEXTAUTH_URL=https://itvisionplus.sn
APIFY_API_KEY=your_apify_key_here
ALIEXPRESS_RAPIDAPI_KEY=your_rapidapi_key_here
ENV_EOF
        echo "📝 Template .env créé. Éditez-le: nano ~/itvision-1/.env"
    fi
    
    # S'assurer que Docker tourne
    sudo systemctl start docker 2>/dev/null || true
    
    # Build et démarrage (le build Next.js se fait dans le conteneur Docker)
    docker-compose down 2>/dev/null || true
    docker-compose up -d --build
    
    echo "⏳ Attente démarrage (30s)..."
    sleep 30
    
    # Vérification
    echo ""
    echo "📊 Status conteneurs:"
    docker-compose ps
    
    echo ""
    echo "🌐 Test local:"
    curl -s http://localhost:3000/api/health || echo "⚠️  API pas encore prête (peut prendre 1-2 min)"
    
    echo ""
    echo "📋 Logs récents app:"
    docker-compose logs --tail 15 app 2>/dev/null || true
REMOTE_EOF

echo ""
echo "========================================"
echo "🎉 Déploiement lancé!"
echo ""
echo "URLs (après propagation DNS):"
echo "  Site:      https://itvisionplus.sn"
echo "  Direct:    http://$EC2_IP:3000"
echo "  API:       http://$EC2_IP:3000/api/health"
echo ""
echo "Commandes utiles:"
echo "  Logs:      $SSH_CMD 'cd itvision-1 && docker-compose logs -f app'"
echo "  Shell:     $SSH_CMD"
echo "  Restart:   $SSH_CMD 'cd itvision-1 && docker-compose restart'"
echo "  Status:    $SSH_CMD 'cd itvision-1 && docker-compose ps'"
