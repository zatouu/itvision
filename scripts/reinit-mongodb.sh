#!/bin/bash
# Script pour réexécuter init.js dans MongoDB
# Usage: bash scripts/reinit-mongodb.sh

echo "🔄 Réexécution du script d'initialisation MongoDB..."

# Option 1: Exécuter le script directement
echo "📝 Exécution du script init.js..."
docker exec -i itvision-mongodb mongosh -u admin -p AdminPassword123 --authenticationDatabase admin < docker/mongodb/init.js

echo ""
echo "✅ Script d'initialisation exécuté!"


