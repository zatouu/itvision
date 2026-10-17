/**
 * Script sécurisé pour réexécuter init.js sans erreurs
 * Gère les cas où les données existent déjà
 * Usage: docker exec -i itvision-mongodb sh -c 'mongosh -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin' < scripts/reinit-mongodb-safe.js
 */

print('🚀 Réinitialisation sécurisée de la base de données IT Vision...');

// Connexion à la base de données
db = db.getSiblingDB('itvision_db');

// Création de l'utilisateur applicatif (si n'existe pas)
try {
  db.createUser({
    user: 'itvision_app',
    pwd: process.env.MONGO_APP_PASSWORD,
    roles: [
      {
        role: 'readWrite',
        db: 'itvision_db'
      }
    ]
  });
  print('✅ Utilisateur itvision_app créé avec succès');
} catch (e) {
  if (e.code === 51003) {
    print('ℹ️  Utilisateur itvision_app existe déjà');
  } else {
    throw e;
  }
}

// Création des collections avec validation (si n'existent pas)
const collections = ['users', 'projects', 'reports'];
collections.forEach(collName => {
  try {
    db.createCollection(collName);
    print(`✅ Collection ${collName} créée`);
  } catch (e) {
    if (e.code === 48) {
      print(`ℹ️  Collection ${collName} existe déjà`);
    } else {
      throw e;
    }
  }
});

// Création des index (idempotent - pas d'erreur si existe déjà)
try {
  db.users.createIndex({ email: 1 }, { unique: true });
  db.users.createIndex({ role: 1 });
  db.projects.createIndex({ projectId: 1 }, { unique: true });
  db.projects.createIndex({ clientId: 1 });
  db.projects.createIndex({ status: 1 });
  db.reports.createIndex({ reportId: 1 }, { unique: true });
  db.reports.createIndex({ projectId: 1 });
  db.reports.createIndex({ status: 1 });
  db.reports.createIndex({ technicianId: 1 });
  print('✅ Index créés/mis à jour');
} catch (e) {
  print(`⚠️  Erreur lors de la création des index: ${e.message}`);
}

// Données de démonstration (uniquement si n'existent pas)
const adminExists = db.users.findOne({ email: 'admin@itvision.sn' });
if (!adminExists) {
  const adminUser = {
    email: 'admin@itvision.sn',
    name: 'Administrateur IT Vision',
    role: 'admin',
    passwordHash: '$2a$12$example.hash.for.admin123',
    isActive: true,
    permissions: ['all'],
    createdAt: new Date(),
    updatedAt: new Date()
  };
  db.users.insertOne(adminUser);
  print('✅ Utilisateur admin de démonstration créé');
} else {
  print('ℹ️  Utilisateur admin existe déjà');
}

print('🎉 Réinitialisation sécurisée terminée!');


