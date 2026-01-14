/**
 * Script de seed pour créer un projet d'exemple complet
 * pour le client client@itvision.sn
 * 
 * Ce projet permet de tester toutes les fonctionnalités du portail client
 */

// Charger les variables d'environnement
require('dotenv').config({ path: '.env.local' })

const mongoose = require('mongoose')

// Connexion MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/securite-electronique'

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connexion MongoDB réussie')
  } catch (error) {
    console.error('❌ Erreur connexion MongoDB:', error)
    process.exit(1)
  }
}

// Définir uniquement User (les autres modèles seront pris depuis la collection directement)
const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String,
  phone: String,
  company: String,
  address: String
}, { collection: 'users', strict: false })

const User = mongoose.models.User || mongoose.model('User', UserSchema)

// Pour les autres, on travaillera directement avec les collections
const db = mongoose.connection

async function seedProject() {
  console.log('\n🌱 Démarrage du seed du projet d\'exemple...\n')

  // 1. Trouver le client
  const client = await User.findOne({ email: 'client@itvision.sn' })
  if (!client) {
    console.error('❌ Client client@itvision.sn non trouvé')
    console.log('💡 Créez d\'abord le client avec le script de register ou via l\'interface')
    return
  }
  console.log(`✅ Client trouvé: ${client.name} (${client._id})`)

  // 2. Trouver un technicien (ou créer un exemple)
  let technician = await User.findOne({ role: 'TECHNICIAN' })
  if (!technician) {
    console.log('📝 Création d\'un technicien d\'exemple...')
    const bcrypt = require('bcryptjs')
    technician = await User.create({
      name: 'Mamadou Diallo',
      email: 'mamadou.tech@itvision.sn',
      password: await bcrypt.hash('Tech2024!', 10),
      role: 'TECHNICIAN',
      phone: '+221 77 123 45 67',
      company: 'IT Vision',
      createdAt: new Date()
    })
    console.log(`✅ Technicien créé: ${technician.name}`)
  } else {
    console.log(`✅ Technicien trouvé: ${technician.name}`)
  }

  // 3. Créer le projet d'exemple
  const projectData = {
    name: 'Installation Complète Système de Sécurité - Siège Dakar',
    description: 'Déploiement d\'un système de sécurité complet incluant vidéosurveillance IP, contrôle d\'accès biométrique, système d\'alarme incendie, et infrastructure réseau. Le projet couvre 3 étages (900m²) avec 24 caméras 4K, 12 points de contrôle d\'accès, détection incendie et câblage structuré Cat6A.',
    clientId: client._id,
    status: 'in_progress',
    progress: 65,
    startDate: new Date('2024-10-15'),
    endDate: new Date('2025-01-31'),
    budget: 45000000, // 45M FCFA
    address: 'Immeuble Les Almadies, Route de Ngor, Dakar, Sénégal',
    serviceType: 'Installation complète multi-systèmes',
    currentPhase: 'Installation Vidéosurveillance et Contrôle d\'accès',
    
    // Jalons du projet (format Mongoose avec ID)
    milestones: [
      {
        id: new mongoose.Types.ObjectId().toString(),
        name: 'Étude technique et plans',
        description: 'Relevé sur site, élaboration des plans techniques, validation client',
        dueDate: new Date('2024-11-01'),
        status: 'completed',
        completedDate: new Date('2024-11-01'),
        clientNotified: true
      },
      {
        id: new mongoose.Types.ObjectId().toString(),
        name: 'Câblage structuré et infrastructure',
        description: 'Installation des chemins de câbles, câblage Cat6A, armoires techniques',
        dueDate: new Date('2024-11-20'),
        status: 'completed',
        completedDate: new Date('2024-11-20'),
        clientNotified: true
      },
      {
        id: new mongoose.Types.ObjectId().toString(),
        name: 'Installation Vidéosurveillance',
        description: 'Pose des 24 caméras IP 4K, configuration NVR, paramétrage réseau',
        dueDate: new Date('2024-12-10'),
        status: 'in_progress',
        clientNotified: false
      },
      {
        id: new mongoose.Types.ObjectId().toString(),
        name: 'Système Contrôle d\'Accès',
        description: 'Installation lecteurs biométriques, gâches électriques, logiciel de gestion',
        dueDate: new Date('2024-12-20'),
        status: 'in_progress',
        clientNotified: false
      },
      {
        id: new mongoose.Types.ObjectId().toString(),
        name: 'Détection Incendie',
        description: 'Installation détecteurs, centrale incendie, sirènes, tests',
        dueDate: new Date('2025-01-10'),
        status: 'pending',
        clientNotified: false
      },
      {
        id: new mongoose.Types.ObjectId().toString(),
        name: 'Tests et Formation',
        description: 'Tests finaux, formation utilisateurs, documentation technique',
        dueDate: new Date('2025-01-25'),
        status: 'pending',
        clientNotified: false
      },
      {
        id: new mongoose.Types.ObjectId().toString(),
        name: 'Livraison et Garantie',
        description: 'Recette finale, PV de livraison, activation garantie 2 ans',
        dueDate: new Date('2025-01-31'),
        status: 'pending',
        clientNotified: false
      }
    ],

    // Documents du projet (format avec ID)
    documents: [
      {
        id: new mongoose.Types.ObjectId().toString(),
        name: 'Devis Détaillé - Sécurité Siège.pdf',
        type: 'quote',
        url: '/uploads/documents/devis-securite-siege.pdf',
        uploadDate: new Date('2024-10-10'),
        clientVisible: true,
        size: 245780
      },
      {
        id: new mongoose.Types.ObjectId().toString(),
        name: 'Plans Techniques - Vidéosurveillance.pdf',
        type: 'technical',
        url: '/uploads/documents/plans-videosurveillance.pdf',
        uploadDate: new Date('2024-10-28'),
        clientVisible: true,
        size: 1024000
      },
      {
        id: new mongoose.Types.ObjectId().toString(),
        name: 'Schéma Réseau - Infrastructure IT.pdf',
        type: 'technical',
        url: '/uploads/documents/schema-reseau.pdf',
        uploadDate: new Date('2024-11-05'),
        clientVisible: true,
        size: 512000
      },
      {
        id: new mongoose.Types.ObjectId().toString(),
        name: 'Rapport Installation Câblage.pdf',
        type: 'technical',
        url: '/uploads/documents/rapport-cablage.pdf',
        uploadDate: new Date('2024-11-22'),
        clientVisible: true,
        size: 387900
      },
      {
        id: new mongoose.Types.ObjectId().toString(),
        name: 'Photos Installation - Étage 1.zip',
        type: 'photo',
        url: '/uploads/documents/photos-etage1.zip',
        uploadDate: new Date('2024-11-25'),
        clientVisible: true,
        size: 8900000
      },
      {
        id: new mongoose.Types.ObjectId().toString(),
        name: 'Certificats Matériel - Caméras Hikvision.pdf',
        type: 'technical',
        url: '/uploads/documents/certificats-hikvision.pdf',
        uploadDate: new Date('2024-12-01'),
        clientVisible: true,
        size: 156000
      },
      {
        id: new mongoose.Types.ObjectId().toString(),
        name: 'PV Recette Intermédiaire - Câblage.pdf',
        type: 'contract',
        url: '/uploads/documents/pv-recette-cablage.pdf',
        uploadDate: new Date('2024-11-20'),
        clientVisible: true,
        size: 89000
      }
    ],

    // Timeline des événements (format avec ID et author)
    timeline: [
      {
        id: new mongoose.Types.ObjectId().toString(),
        type: 'created',
        title: 'Projet créé',
        description: 'Projet initié suite à la validation du devis',
        date: new Date('2024-10-15'),
        author: technician._id.toString(),
        clientVisible: true
      },
      {
        id: new mongoose.Types.ObjectId().toString(),
        type: 'milestone',
        title: 'Étude technique terminée',
        description: 'Plans validés par le client - Lancement de la phase travaux',
        date: new Date('2024-11-01'),
        author: technician._id.toString(),
        clientVisible: true
      },
      {
        id: new mongoose.Types.ObjectId().toString(),
        type: 'started',
        title: 'Équipe technique assignée',
        description: '2 techniciens réseau + 1 électricien mobilisés',
        date: new Date('2024-11-05'),
        author: technician._id.toString(),
        clientVisible: true
      },
      {
        id: new mongoose.Types.ObjectId().toString(),
        type: 'milestone',
        title: 'Intervention - Installation câblage',
        description: 'Pose des chemins de câbles et câblage Cat6A - Étages 1 et 2',
        date: new Date('2024-11-12'),
        author: technician._id.toString(),
        clientVisible: true
      },
      {
        id: new mongoose.Types.ObjectId().toString(),
        type: 'milestone',
        title: 'Câblage structuré terminé',
        description: 'Tests réseau OK - 450 points RJ45 opérationnels',
        date: new Date('2024-11-20'),
        author: technician._id.toString(),
        clientVisible: true
      },
      {
        id: new mongoose.Types.ObjectId().toString(),
        type: 'milestone',
        title: 'Intervention - Installation caméras',
        description: 'Installation 16 caméras IP + configuration NVR principal',
        date: new Date('2024-11-28'),
        author: technician._id.toString(),
        clientVisible: true
      },
      {
        id: new mongoose.Types.ObjectId().toString(),
        type: 'milestone',
        title: 'Intervention - Suite vidéosurveillance',
        description: 'Installation 8 caméras restantes + tests enregistrement',
        date: new Date('2024-12-05'),
        author: technician._id.toString(),
        clientVisible: true
      },
      {
        id: new mongoose.Types.ObjectId().toString(),
        type: 'milestone',
        title: 'Document ajouté',
        description: 'Certificats matériel Hikvision',
        date: new Date('2024-12-01'),
        author: technician._id.toString(),
        clientVisible: true
      },
      {
        id: new mongoose.Types.ObjectId().toString(),
        type: 'milestone',
        title: 'Mise à jour statut',
        description: 'Phase vidéosurveillance à 80% - Contrôle d\'accès en cours',
        date: new Date('2024-12-08'),
        author: technician._id.toString(),
        clientVisible: true
      }
    ],

    // Techniciens assignés (juste les IDs)
    assignedTo: [technician._id.toString()],
    
    // Valeur et budget
    value: 45000000,

    createdAt: new Date('2024-10-15'),
    updatedAt: new Date()
  }

  // Supprimer les anciens projets d'exemple du même client
  await db.collection('projects').deleteMany({ 
    clientId: client._id,
    name: /Installation Complète Système de Sécurité/
  })

  const project = await db.collection('projects').insertOne(projectData)
  const projectId = project.insertedId
  console.log(`\n✅ Projet créé: "${projectData.name}"`)
  console.log(`   ID: ${projectId}`)
  console.log(`   Progression: ${projectData.progress}%`)
  console.log(`   Budget: ${(projectData.value / 1000000).toFixed(1)}M FCFA`)
  console.log(`   Jalons: ${projectData.milestones.length}`)
  console.log(`   Documents: ${projectData.documents.length}`)
  console.log(`   Timeline: ${projectData.timeline.length} événements`)

  // 4. Créer des interventions liées
  console.log('\n📋 Création des interventions...')
  
  const interventions = [
    {
      interventionNumber: `INT-${Date.now()}-001`,
      projectId: projectId,
      technicienId: technician._id,
      date: new Date('2024-11-12'),
      heureDebut: '08:00',
      heureFin: '17:30',
      duree: 9.5,
      site: project.address,
      typeIntervention: 'Installation',
      status: 'completed',
      equipments: [
        {
          name: 'Câble Cat6A UTP',
          brand: 'Nexans',
          model: 'LANmark-6A',
          serialNumber: 'LOT-2024-11-A',
          status: 'Installé'
        },
        {
          name: 'Chemin de câbles',
          brand: 'Legrand',
          model: 'DLP 100x50',
          serialNumber: 'N/A',
          status: 'Installé'
        }
      ],
      tasksPerformed: [
        'Pose de 120m de chemin de câbles métalliques',
        'Tirage de 450 points RJ45 Cat6A',
        'Installation de 3 armoires de brassage 19"',
        'Tests de continuité et certification réseau',
        'Étiquetage complet des prises et panneaux'
      ],
      observations: 'Installation conforme aux normes. Tests réseau validés à 100%. Client satisfait.',
      clientSignature: {
        name: client.name,
        date: new Date('2024-11-12'),
        signed: true
      },
      photos: ['/uploads/interventions/int001-01.jpg', '/uploads/interventions/int001-02.jpg'],
      createdAt: new Date('2024-11-12')
    },
    {
      interventionNumber: `INT-${Date.now()}-002`,
      projectId: projectId,
      technicienId: technician._id,
      date: new Date('2024-11-28'),
      heureDebut: '08:30',
      heureFin: '18:00',
      duree: 9.5,
      site: project.address,
      typeIntervention: 'Installation',
      status: 'completed',
      equipments: [
        {
          name: 'Caméra IP 4K',
          brand: 'Hikvision',
          model: 'DS-2CD2387G2-LU',
          serialNumber: 'HK-2024-CAM-001-016',
          status: 'Installé et opérationnel'
        },
        {
          name: 'NVR 32 canaux',
          brand: 'Hikvision',
          model: 'DS-7732NI-I4/16P',
          serialNumber: 'HK-NVR-2024-001',
          status: 'Configuré'
        }
      ],
      tasksPerformed: [
        'Installation de 16 caméras IP 4K extérieures',
        'Configuration du NVR principal 32 canaux',
        'Paramétrage du réseau VLAN vidéosurveillance',
        'Configuration enregistrement en continu 24/7',
        'Tests de vision nocturne et détection de mouvement',
        'Formation utilisateur - Visualisation basique'
      ],
      observations: 'Caméras opérationnelles. Qualité d\'image excellente jour/nuit. Enregistrement stable.',
      clientSignature: {
        name: client.name,
        date: new Date('2024-11-28'),
        signed: true
      },
      photos: ['/uploads/interventions/int002-01.jpg', '/uploads/interventions/int002-02.jpg', '/uploads/interventions/int002-03.jpg'],
      createdAt: new Date('2024-11-28')
    },
    {
      interventionNumber: `INT-${Date.now()}-003`,
      projectId: projectId,
      technicienId: technician._id,
      date: new Date('2024-12-05'),
      heureDebut: '09:00',
      heureFin: '16:30',
      duree: 7.5,
      site: project.address,
      typeIntervention: 'Installation',
      status: 'completed',
      equipments: [
        {
          name: 'Caméra IP 4K',
          brand: 'Hikvision',
          model: 'DS-2CD2387G2-LU',
          serialNumber: 'HK-2024-CAM-017-024',
          status: 'Installé'
        }
      ],
      tasksPerformed: [
        'Installation 8 caméras restantes (intérieures)',
        'Configuration analytique vidéo (comptage, intrusion)',
        'Optimisation angles de vue et focus',
        'Tests d\'enregistrement 4K en continu',
        'Vérification bande passante réseau'
      ],
      observations: 'Phase vidéosurveillance quasiment terminée. 24/24 caméras opérationnelles.',
      clientSignature: {
        name: client.name,
        date: new Date('2024-12-05'),
        signed: true
      },
      photos: ['/uploads/interventions/int003-01.jpg'],
      createdAt: new Date('2024-12-05')
    }
  ]

  for (const intData of interventions) {
    await db.collection('interventions').insertOne(intData)
    console.log(`   ✅ ${intData.interventionNumber} - ${intData.typeIntervention}`)
  }

  // 5. Créer un devis lié
  console.log('\n💰 Création du devis associé...')
  
  const quoteData = {
    numero: `DEV-2024-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
    clientId: client._id,
    clientName: client.name,
    clientEmail: client.email,
    status: 'accepted',
    products: [
      {
        description: 'Caméra IP 4K ColorVu - Hikvision DS-2CD2387G2-LU',
        quantity: 24,
        unitPrice: 185000,
        total: 4440000
      },
      {
        description: 'NVR 32 canaux 4K PoE+ - Hikvision DS-7732NI-I4/16P',
        quantity: 1,
        unitPrice: 1450000,
        total: 1450000
      },
      {
        description: 'Disque dur 8TB surveillance - WD Purple',
        quantity: 4,
        unitPrice: 175000,
        total: 700000
      },
      {
        description: 'Switch PoE+ 24 ports - Cisco CBS350-24P',
        quantity: 2,
        unitPrice: 485000,
        total: 970000
      },
      {
        description: 'Lecteur biométrique - ZKTeco ProCapture-X',
        quantity: 12,
        unitPrice: 125000,
        total: 1500000
      },
      {
        description: 'Gâche électrique 12V fail-secure',
        quantity: 12,
        unitPrice: 45000,
        total: 540000
      },
      {
        description: 'Centrale contrôle d\'accès - ZKTeco C3-400',
        quantity: 1,
        unitPrice: 850000,
        total: 850000
      },
      {
        description: 'Câble Cat6A UTP - Nexans (bobine 305m)',
        quantity: 12,
        unitPrice: 95000,
        total: 1140000
      },
      {
        description: 'Panneau de brassage 48 ports Cat6A',
        quantity: 6,
        unitPrice: 35000,
        total: 210000
      },
      {
        description: 'Armoire réseau 19" 42U',
        quantity: 3,
        unitPrice: 375000,
        total: 1125000
      },
      {
        description: 'Installation, configuration et formation',
        quantity: 1,
        unitPrice: 8500000,
        total: 8500000
      }
    ],
    subtotal: 21425000,
    taxAmount: 3856500, // TVA 18%
    total: 25281500,
    validUntil: new Date('2024-11-15'),
    notes: 'Devis valable 30 jours. Installation sur 3 mois. Garantie 2 ans pièces et main d\'œuvre.',
    createdAt: new Date('2024-10-10')
  }

  quoteData.total = quoteData.subtotal + quoteData.taxAmount

  await db.collection('quotes').insertOne(quoteData)
  console.log(`   ✅ Devis ${quoteData.numero} - ${(quoteData.total / 1000000).toFixed(2)}M FCFA`)
  console.log(`   Statut: ${quoteData.status}`)

  // 6. Créer des tickets de support
  console.log('\n🎫 Création des tickets de support...')
  
  const ticketNumber1 = `TKT-${Date.now()}-001`
  const ticketNumber2 = `TKT-${Date.now()}-002`
  
  const tickets = [
    {
      clientId: client._id,
      projectId: projectId,
      ticketNumber: ticketNumber1,
      title: 'Demande de rapport d\'avancement détaillé',
      description: 'Bonjour, pourriez-vous me transmettre un rapport détaillé de l\'avancement du projet avec les photos des installations réalisées ? Merci.',
      category: 'request',
      priority: 'medium',
      status: 'resolved',
      messages: [
        {
          authorId: client._id.toString(),
          authorName: client.name,
          authorRole: 'CLIENT',
          message: 'Bonjour, pourriez-vous me transmettre un rapport détaillé de l\'avancement du projet avec les photos des installations réalisées ? Merci.',
          createdAt: new Date('2024-11-25T10:30:00'),
          isStaff: false,
          internal: false
        },
        {
          authorId: technician._id.toString(),
          authorName: 'Support IT Vision',
          authorRole: 'ADMIN',
          message: 'Bonjour, nous vous remercions pour votre demande. Le rapport d\'avancement complet avec photos a été ajouté dans l\'onglet Documents de votre projet. Vous y trouverez également les certificats du matériel installé.',
          createdAt: new Date('2024-11-25T14:20:00'),
          isStaff: true,
          internal: false
        },
        {
          authorId: client._id.toString(),
          authorName: client.name,
          authorRole: 'CLIENT',
          message: 'Parfait, j\'ai bien reçu les documents. Merci pour votre réactivité !',
          createdAt: new Date('2024-11-25T15:00:00'),
          isStaff: false,
          internal: false
        }
      ],
      history: [
        {
          action: 'created',
          performedBy: client._id,
          timestamp: new Date('2024-11-25T10:30:00'),
          details: 'Ticket créé'
        },
        {
          action: 'status_changed',
          performedBy: technician._id,
          timestamp: new Date('2024-11-25T14:20:00'),
          details: 'Statut changé: open → resolved'
        }
      ],
      sla: {
        targetResolutionTime: new Date('2024-11-26T10:30:00'),
        actualResolutionTime: new Date('2024-11-25T14:20:00'),
        breached: false
      },
      createdAt: new Date('2024-11-25T10:30:00')
    },
    {
      clientId: client._id,
      projectId: projectId,
      ticketNumber: ticketNumber2,
      title: 'Accès à l\'interface de visualisation caméras',
      description: 'Bonjour, j\'aimerais avoir accès à l\'interface web pour visualiser les caméras à distance. Pouvez-vous me transmettre les identifiants ?',
      category: 'technical',
      priority: 'high',
      status: 'in_progress',
      messages: [
        {
          authorId: client._id.toString(),
          authorName: client.name,
          authorRole: 'CLIENT',
          message: 'Bonjour, j\'aimerais avoir accès à l\'interface web pour visualiser les caméras à distance. Pouvez-vous me transmettre les identifiants ?',
          createdAt: new Date('2024-12-06T09:15:00'),
          isStaff: false,
          internal: false
        },
        {
          authorId: technician._id.toString(),
          authorName: 'Support IT Vision',
          authorRole: 'ADMIN',
          message: 'Bonjour, nous allons configurer votre accès distant sécurisé (VPN). Un technicien passera demain pour finaliser la configuration et vous former à l\'utilisation. Identifiants transmis par email sécurisé.',
          createdAt: new Date('2024-12-06T11:00:00'),
          isStaff: true,
          internal: false
        }
      ],
      history: [
        {
          action: 'created',
          performedBy: client._id,
          timestamp: new Date('2024-12-06T09:15:00'),
          details: 'Ticket créé'
        },
        {
          action: 'status_changed',
          performedBy: technician._id,
          timestamp: new Date('2024-12-06T11:00:00'),
          details: 'Statut changé: open → in_progress'
        }
      ],
      sla: {
        targetResolutionTime: new Date('2024-12-06T13:15:00'),
        breached: false
      },
      createdAt: new Date('2024-12-06T09:15:00')
    }
  ]

  for (const ticketData of tickets) {
    await db.collection('tickets').insertOne(ticketData)
    console.log(`   ✅ Ticket: ${ticketData.title} (${ticketData.status})`)
  }

  // 7. Résumé final
  console.log('\n' + '='.repeat(70))
  console.log('✅ SEED TERMINÉ AVEC SUCCÈS !')
  console.log('='.repeat(70))
  console.log(`
📊 RÉSUMÉ DES DONNÉES CRÉÉES:
   
   🏢 Client: ${client.name} (${client.email})
   📁 Projet: ${projectData.name}
      - Progression: ${projectData.progress}%
      - Budget: ${(projectData.value / 1000000).toFixed(1)}M FCFA
      - Jalons: ${projectData.milestones.length}
      - Documents: ${projectData.documents.length}
      - Timeline: ${projectData.timeline.length} événements
      
   🔧 Interventions: ${interventions.length} terminées
   💰 Devis: ${quoteData.numero} (${(quoteData.total / 1000000).toFixed(2)}M FCFA)
   🎫 Tickets: ${tickets.length} de support
   
📱 CONNEXION AU PORTAIL CLIENT:
   URL: http://localhost:3000/login
   Email: ${client.email}
   
🎯 FONCTIONNALITÉS À TESTER:
   ✓ Dashboard avec KPIs et graphiques
   ✓ Vue détaillée du projet (modal)
   ✓ Timeline des événements
   ✓ Documents téléchargeables
   ✓ Téléchargement PDF du devis
   ✓ Chat des tickets de support
   ✓ Historique des interventions
   ✓ Équipe assignée
  `)
  console.log('='.repeat(70) + '\n')
}

async function main() {
  try {
    await connectDB()
    await seedProject()
    console.log('✅ Script terminé avec succès')
    process.exit(0)
  } catch (error) {
    console.error('❌ Erreur lors du seed:', error)
    process.exit(1)
  }
}

main()

