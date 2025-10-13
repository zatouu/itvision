// Script d'initialisation MongoDB pour IT Vision
print('🚀 Initialisation de la base de données IT Vision...');

// Connexion à la base de données
db = db.getSiblingDB('itvision_db');

// Création de l'utilisateur applicatif
db.createUser({
  user: 'itvision_app',
  pwd: process.env.MONGO_APP_PASSWORD || 'AppPassword123!',
  roles: [
    {
      role: 'readWrite',
      db: 'itvision_db'
    }
  ]
});

print('✅ Utilisateur itvision_app créé avec succès');

// Création des collections avec validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['email', 'role'],
      properties: {
        email: {
          bsonType: 'string',
          pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
        },
        role: {
          bsonType: 'string',
          enum: ['client', 'technician', 'admin']
        },
        name: { bsonType: 'string' },
        company: { bsonType: 'string' },
        phone: { bsonType: 'string' },
        isActive: { bsonType: 'bool' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

db.createCollection('projects', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['projectId', 'clientId', 'name', 'status'],
      properties: {
        projectId: { bsonType: 'string' },
        clientId: { bsonType: 'objectId' },
        name: { bsonType: 'string' },
        status: {
          bsonType: 'string',
          enum: ['pending', 'in_progress', 'completed', 'cancelled']
        },
        progress: { bsonType: 'int', minimum: 0, maximum: 100 },
        value: { bsonType: 'string' },
        technician: { bsonType: 'string' },
        equipment: { bsonType: 'array' },
        documents: { bsonType: 'array' },
        timeline: { bsonType: 'array' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

db.createCollection('reports', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['reportId', 'projectId', 'type', 'status'],
      properties: {
        reportId: { bsonType: 'string' },
        projectId: { bsonType: 'objectId' },
        type: {
          bsonType: 'string',
          enum: ['maintenance', 'installation', 'inspection', 'repair']
        },
        status: {
          bsonType: 'string',
          enum: ['draft', 'submitted', 'validated', 'rejected']
        },
        technicianId: { bsonType: 'objectId' },
        content: { bsonType: 'object' },
        attachments: { bsonType: 'array' },
        validatedBy: { bsonType: 'objectId' },
        validatedAt: { bsonType: 'date' },
        createdAt: { bsonType: 'date' },
        updatedAt: { bsonType: 'date' }
      }
    }
  }
});

print('✅ Collections créées avec validation');

// Index pour performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.projects.createIndex({ projectId: 1 }, { unique: true });
db.projects.createIndex({ clientId: 1 });
db.projects.createIndex({ status: 1 });
db.reports.createIndex({ reportId: 1 }, { unique: true });
db.reports.createIndex({ projectId: 1 });
db.reports.createIndex({ status: 1 });
db.reports.createIndex({ technicianId: 1 });

print('✅ Index créés pour optimiser les performances');

// Données de démonstration
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

const technicianUser = {
  email: 'technicien@itvision.sn',
  name: 'Moussa Diop',
  role: 'technician',
  passwordHash: '$2a$12$example.hash.for.tech123',
  isActive: true,
  permissions: ['create_reports', 'view_projects', 'update_status'],
  createdAt: new Date(),
  updatedAt: new Date()
};

const clientUser = {
  email: 'client@example.com',
  name: 'Amadou Ba',
  company: 'IT Solutions SARL',
  role: 'client',
  passwordHash: '$2a$12$example.hash.for.client123',
  phone: '+221 77 123 45 67',
  isActive: true,
  permissions: ['view_projects', 'view_reports'],
  createdAt: new Date(),
  updatedAt: new Date()
};

// Insertion des utilisateurs de démonstration
const insertedUsers = db.users.insertMany([adminUser, technicianUser, clientUser]);
print('✅ Utilisateurs de démonstration créés');

// Projet de démonstration
const demoProject = {
  projectId: 'PRJ-001',
  clientId: insertedUsers.insertedIds[2], // Client
  name: 'Installation vidéosurveillance siège',
  description: 'Installation complète système vidéosurveillance 16 caméras',
  status: 'in_progress',
  progress: 75,
  startDate: new Date('2024-01-15'),
  value: '2,450,000 FCFA',
  equipment: ['16 caméras IP 4K', 'NVR 32 canaux', 'Switch PoE 24 ports'],
  technician: 'Moussa Diop',
  warranty: '2 ans pièces et main d\'œuvre',
  documents: [],
  timeline: [
    {
      date: new Date('2024-01-15'),
      title: 'Démarrage projet',
      description: 'Réunion de lancement et étude technique',
      type: 'info'
    },
    {
      date: new Date('2024-01-20'),
      title: 'Installation câblage',
      description: 'Câblage réseau et alimentation terminé',
      type: 'success'
    },
    {
      date: new Date('2024-01-25'),
      title: 'Installation caméras',
      description: 'Pose et configuration des 16 caméras',
      type: 'success'
    }
  ],
  createdAt: new Date(),
  updatedAt: new Date()
};

const insertedProject = db.projects.insertOne(demoProject);
print('✅ Projet de démonstration créé');

// Rapport de démonstration
const demoReport = {
  reportId: 'RPT-001',
  projectId: insertedProject.insertedId,
  type: 'installation',
  status: 'validated',
  technicianId: insertedUsers.insertedIds[1], // Technicien
  content: {
    title: 'Rapport d\'installation - Système vidéosurveillance',
    summary: 'Installation réalisée conformément au cahier des charges',
    details: 'Installation de 16 caméras IP 4K avec enregistreur NVR...',
    recommendations: 'Maintenance préventive recommandée tous les 6 mois'
  },
  attachments: [],
  validatedBy: insertedUsers.insertedIds[0], // Admin
  validatedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date()
};

db.reports.insertOne(demoReport);
print('✅ Rapport de démonstration créé');

print('🎉 Base de données IT Vision initialisée avec succès !');
print('');
print('👤 Comptes de démonstration :');
print('   Admin: admin@itvision.sn / admin123');
print('   Technicien: technicien@itvision.sn / tech123');
print('   Client: client@example.com / client123');
print('');