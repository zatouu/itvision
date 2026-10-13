/**
 * Met à jour (sans drop) le validator de la collection `users` pour matcher les rôles applicatifs.
 *
 * Usage (sur la VM/EC2):
 *   docker exec -i itvision-mongodb mongosh -u admin -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin < scripts/fix-users-validator.js
 *
 * Note: nécessite d'exécuter dans un contexte où les vars d'env sont chargées (ou remplace $MONGO_ROOT_PASSWORD).
 */

print('🛠️  Mise à jour du validator MongoDB: users');

db = db.getSiblingDB('itvision_db');

const validator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['email', 'role'],
    properties: {
      email: {
        bsonType: 'string',
        pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
      },
      role: {
        bsonType: 'string'
      },
      name: { bsonType: 'string' },
      company: { bsonType: 'string' },
      phone: { bsonType: 'string' },
      isActive: { bsonType: 'bool' },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' }
    }
  }
};

const res = db.runCommand({
  collMod: 'users',
  validator,
  validationLevel: 'moderate'
});

printjson(res);

if (res.ok !== 1) {
  throw new Error('❌ collMod users a échoué');
}

print('✅ Validator users mis à jour');
