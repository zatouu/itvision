#!/bin/bash
# Script pour créer un utilisateur admin directement dans MongoDB via Docker
# Usage: bash scripts/create-admin-direct.sh

echo "🔌 Connexion à MongoDB via Docker..."

# Créer un script temporaire qui utilise Node.js dans le conteneur ou via tsx local
# Pour l'instant, utilisons une approche avec mongosh et un hash pré-calculé

# Le hash bcrypt de "admin123" (12 rounds)
PASSWORD_HASH='$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqJqZqZqZq'

DB_PASS="${DB_PASS:?Variable DB_PASS requise (mot de passe MongoDB itvision_app)}"

docker exec -i itvision-mongodb mongosh -u itvision_app -p "$DB_PASS" --authenticationDatabase itvision_db itvision_db <<EOF
// Vérifier si l'utilisateur existe
const existing = db.users.findOne({ \$or: [{ username: 'admin' }, { email: 'admin@itvision.sn' }] });

if (existing) {
  print('⚠️  Utilisateur admin existe déjà');
  print('   Email: ' + existing.email);
  print('   Role: ' + existing.role);
} else {
  // Note: Ce hash est un exemple, il faut utiliser bcrypt pour un vrai hash
  print('⚠️  Ce script nécessite un hash bcrypt valide.');
  print('⚠️  Utilisez plutôt: npm run create:admin');
}
EOF

echo ""
echo "💡 Pour créer l'utilisateur avec un hash bcrypt valide, utilisez:"
echo "   npm run create:admin"



