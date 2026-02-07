#!/bin/bash
# Script de diagnostic et récupération urgence EC2
# Exécuter sur le serveur: ./scripts/emergency-recover.sh

set -e

echo "🔴 DIAGNOSTIC URGENCE - $(date)"
echo "================================"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

cd ~/itvision-1 2>/dev/null || cd /home/ubuntu/itvision-1 2>/dev/null || {
    echo -e "${RED}❌ Répertoire itvision-1 introuvable${NC}"
    exit 1
}

echo -e "${YELLOW}📂 Répertoire: $(pwd)${NC}"

# 1. Vérifier Docker
echo ""
echo "🐳 État Docker:"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker non installé!${NC}"
    exit 1
fi

# 2. Liste des conteneurs
echo ""
echo "📋 Conteneurs:"
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo -e "${RED}❌ Docker ne répond pas${NC}"

# 3. Volumes
echo ""
echo "💾 Volumes Docker:"
docker volume ls | grep -E "(mongodb|itvision)" || echo "Aucun volume trouvé"

# 4. Test MongoDB
echo ""
echo "🗄️  Test connexion MongoDB:"
if docker exec itvision-mongodb mongosh -u itvision_app -p AppPassword123 --authenticationDatabase itvision_db --eval "db.stats()" --quiet 2>/dev/null | grep -q "collections"; then
    COUNT=$(docker exec itvision-mongodb mongosh -u itvision_app -p AppPassword123 --authenticationDatabase itvision_db --eval "db.products.countDocuments()" --quiet 2>/dev/null | tr -d '[:space:]')
    echo -e "${GREEN}✅ MongoDB OK - $COUNT produits trouvés${NC}"
else
    echo -e "${RED}❌ MongoDB inaccessible${NC}"
    echo "Logs MongoDB (20 dernières lignes):"
    docker logs --tail 20 itvision-mongodb 2>/dev/null || echo "Pas de logs disponibles"
fi

# 5. Test App
echo ""
echo "🚀 Test Application:"
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Application répond sur localhost:3000${NC}"
else
    echo -e "${RED}❌ Application ne répond pas${NC}"
    echo "Logs App (10 dernières lignes):"
    docker logs --tail 10 itvision-app 2>/dev/null || echo "Pas de logs"
fi

# 6. Espace disque
echo ""
echo "💽 Espace disque:"
df -h / | tail -1 | awk '{print "Utilisé: "$5 " (" $3 "/" $2 ")"}'

# 7. Propositions
echo ""
echo "================================"
echo "🔧 ACTIONS POSSIBLES:"
echo ""

if docker ps | grep -q "itvision-mongodb.*Up"; then
    echo -e "${GREEN}1. MongoDB tourne - tes données sont probablement là${NC}"
    echo "   Vérifier: docker exec itvision-mongodb mongosh -u itvision_app -p AppPassword123 --authenticationDatabase itvision_db --eval 'db.products.find().count()'"
else
    echo -e "${RED}1. MongoDB est arrêté${NC}"
    echo "   Redémarrer: docker-compose up -d mongodb"
fi

if docker ps | grep -q "itvision-app.*Up"; then
    echo -e "${GREEN}2. App tourne${NC}"
else
    echo -e "${RED}2. App est arrêtée${NC}"
    echo "   Redémarrer: docker-compose up -d app"
fi

echo ""
echo "3. Redémarrage complet (si nécessaire):"
echo "   docker-compose down && docker-compose up -d"
echo ""
echo "4. Voir logs en temps réel:"
echo "   docker-compose logs -f"
