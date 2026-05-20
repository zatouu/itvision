#!/bin/bash
# setup-ec2.sh - Script de setup automatique pour nouvelle EC2
# Supporte: Amazon Linux 2023, Ubuntu 22.04
# À exécuter sur la EC2 après connexion SSH

set -e

echo "🚀 Setup automatique EC2 pour IT Vision"
echo "========================================"

# Couleurs
GREEN='\033[0;32m'
NC='\033[0m'

# Détection OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
else
    echo "❌ Impossible de détecter l'OS"
    exit 1
fi

echo "OS détecté: $OS"

# Variables selon OS
if [[ "$OS" == *"Amazon Linux"* ]]; then
    USER="ec2-user"
    DOCKER_INSTALL="sudo yum install -y docker"
else
    USER="ubuntu"
    DOCKER_INSTALL="curl -fsSL https://get.docker.com | sh"
fi

# 1. Mise à jour système
echo -e "${GREEN}[1/7] Mise à jour système...${NC}"
if [[ "$OS" == *"Amazon Linux"* ]]; then
    sudo yum update -y
else
    sudo apt update -qq && sudo apt upgrade -y -qq
fi

# 2. Installation Docker
echo -e "${GREEN}[2/7] Installation Docker...${NC}"
if ! command -v docker &> /dev/null; then
    if [[ "$OS" == *"Amazon Linux"* ]]; then
        sudo yum install -y docker
        sudo systemctl start docker
        sudo systemctl enable docker
    else
        curl -fsSL https://get.docker.com | sh
    fi
    sudo usermod -aG docker $USER
    echo "✅ Docker installé"
else
    echo "✅ Docker déjà présent"
fi

# 3. Installation Docker Compose
echo -e "${GREEN}[3/7] Installation Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "✅ Docker Compose installé"
else
    echo "✅ Docker Compose déjà présent"
fi

# 4. Installation Node.js
echo -e "${GREEN}[4/7] Installation Node.js 20...${NC}"
if ! command -v node &> /dev/null; then
    if [[ "$OS" == *"Amazon Linux"* ]]; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        sudo yum install -y nodejs
    else
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - >/dev/null 2>&1
        sudo apt install -y nodejs -qq
    fi
    echo "✅ Node.js $(node -v) installé"
else
    echo "✅ Node.js $(node -v) déjà présent"
fi

# 5. Création répertoire application
echo -e "${GREEN}[5/7] Création répertoire...${NC}"
mkdir -p ~/itvision-1
cd ~/itvision-1

# 6. Installation outils utiles
echo -e "${GREEN}[6/7] Installation outils...${NC}"
if [[ "$OS" == *"Amazon Linux"* ]]; then
    sudo yum install -y git htop
else
    sudo apt install -y git htop ncdu -qq
fi

# 7. Configuration firewall basique
echo -e "${GREEN}[7/7] Configuration firewall...${NC}"
if [[ "$OS" == *"Amazon Linux"* ]]; then
    sudo systemctl enable firewalld 2>/dev/null || true
    sudo systemctl start firewalld 2>/dev/null || true
    sudo firewall-cmd --permanent --add-service=ssh 2>/dev/null || true
    sudo firewall-cmd --permanent --add-service=http 2>/dev/null || true
    sudo firewall-cmd --permanent --add-service=https 2>/dev/null || true
    sudo firewall-cmd --permanent --add-port=3000/tcp 2>/dev/null || true
    sudo firewall-cmd --reload 2>/dev/null || true
    echo "✅ Firewall (firewalld) configuré"
else
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    sudo ufw allow ssh
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw allow 3000/tcp  # Pour test direct
    sudo ufw --force enable
    echo "✅ Firewall (ufw) configuré"
fi

echo ""
echo "========================================"
echo -e "${GREEN}✅ Setup terminé !${NC}"
echo ""
echo "⚠️  IMPORTANT: Déconnecte-toi et reconnecte-toi pour le groupe docker"
echo "   ou exécute: newgrp docker"
echo ""
echo "Prochaines étapes:"
echo "  1. Copier les fichiers de l'application"
echo "  2. Configurer .env sur EC2"
echo "  3. Démarrer: cd ~/itvision-1 && docker-compose up -d"
