/**
 * Script MongoDB pour créer un utilisateur admin
 * Usage: docker exec -i itvision-mongodb mongosh -u itvision_app -p AppPassword123 --authenticationDatabase itvision_db < scripts/create-admin-user-mongo.js
 * Ou: docker exec -i itvision-mongodb mongosh -u admin -p AdminPassword123 --authenticationDatabase admin < scripts/create-admin-user-mongo.js
 */

// Se connecter à la base de données
db = db.getSiblingDB('itvision_db');

// Vérifier si l'utilisateur admin existe déjà
const existingUser = db.users.findOne({
  $or: [
    { username: 'admin' },
    { email: 'admin@itvision.sn' }
  ]
});

if (existingUser) {
  print('⚠️  Un utilisateur avec ce username ou email existe déjà:');
  print(`   Username: ${existingUser.username}`);
  print(`   Email: ${existingUser.email}`);
  print(`   Role: ${existingUser.role}`);
  print('\nPour mettre à jour le mot de passe, utilisez le script TypeScript: npm run create:admin');
} else {
  // Créer l'utilisateur admin avec un mot de passe hashé
  // Note: MongoDB ne peut pas hasher directement, donc on utilise un hash bcrypt pré-calculé
  // Le mot de passe "admin123" hashé avec bcrypt (12 rounds)
  const passwordHash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqJqZqZqZq';
  
  // Pour un vrai hash, il faut utiliser Node.js avec bcrypt
  // Pour l'instant, créons l'utilisateur et indiquons qu'il faut utiliser le script TypeScript
  print('⚠️  Ce script ne peut pas hasher le mot de passe directement.');
  print('⚠️  Utilisez plutôt: npm run create:admin');
  print('\nOu créez l\'utilisateur manuellement avec un hash bcrypt valide.');
}



