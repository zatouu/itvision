#!/usr/bin/env node
/**
 * Script pour créer les devis TES dans la base de données
 * Usage: node scripts/create-tes-quotes.js
 */

const mongoose = require('mongoose');

// Schéma AdminQuote simplifié pour le script
const AdminQuoteProductSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  taxable: { type: Boolean, default: true },
  total: { type: Number, required: true, min: 0 }
});

const AdminQuoteClientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  rcn: { type: String },
  ninea: { type: String }
});

const AdminQuoteSchema = new mongoose.Schema({
  numero: { type: String, required: true, unique: true, index: true },
  date: { type: Date, required: true },
  client: { type: AdminQuoteClientSchema, required: true },
  clientUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  clientCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', index: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true },
  products: { type: [AdminQuoteProductSchema], default: [] },
  subtotal: { type: Number, default: 0 },
  brsAmount: { type: Number, default: 0 },
  taxAmount: { type: Number, default: 0 },
  other: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  status: { type: String, enum: ['draft', 'sent', 'accepted', 'rejected'], default: 'draft', index: true },
  sentAt: { type: Date },
  acceptedAt: { type: Date },
  rejectedAt: { type: Date },
  notes: { type: String },
  bonCommande: { type: String },
  dateLivraison: { type: String },
  pointExpedition: { type: String },
  conditions: { type: String },
  createdBy: { type: String }
}, { timestamps: true });

const AdminQuote = mongoose.models.AdminQuote || mongoose.model('AdminQuote', AdminQuoteSchema);

// Devis 1: Serrure Antalya
const devisSerrure = {
  numero: '2026-0011-SERRURE',
  date: new Date('2026-02-09'),
  client: {
    name: 'TES',
    address: '11 Cité Lomasé, Nord Foire',
    phone: '774133440 / 774223348',
    email: '',
    rcn: 'SN.DKR.2019.A.10579',
    ninea: '007305734'
  },
  products: [
    {
      description: 'Serrure électronique de porte d\'entrée en Aluminium ultra fin étanche avec empreinte, code, carte, reconnaissance faciale, clé, batterie rechargeable',
      quantity: 1,
      unitPrice: 200000,
      taxable: false,
      total: 200000
    },
    {
      description: 'Groom ferme porte',
      quantity: 1,
      unitPrice: 38000,
      taxable: false,
      total: 38000
    },
    {
      description: 'MO installation et mise en service',
      quantity: 1,
      unitPrice: 52630,
      taxable: true,
      total: 52630
    }
  ],
  subtotal: 290630,
  brsAmount: 14531.50, // 5% de 290630
  taxAmount: 2631.50,
  other: 0,
  total: 287999,
  status: 'sent',
  notes: 'Condition de paiement 100%',
  conditions: 'Paiement 100% à la commande'
};

// Devis 2: Interphone SHIRAMBA
const devisInterphone = {
  numero: '2026-0011-INTERPHONE',
  date: new Date('2026-02-09'),
  client: {
    name: 'TES',
    address: '11 Cité Lomasé, Nord Foire',
    phone: '+221 77 413 34 40 / 221 77 422 33 48',
    email: '',
    rcn: 'SN.DKR.2019.A.10579',
    ninea: '007305734'
  },
  products: [
    {
      description: 'Interphone marque RL pour un immeuble',
      quantity: 28,
      unitPrice: 45000,
      taxable: false,
      total: 1260000
    },
    {
      description: 'Vérification câblage + Installation par immeuble',
      quantity: 28,
      unitPrice: 20000,
      taxable: false,
      total: 560000
    }
  ],
  subtotal: 1820000,
  brsAmount: 91000, // 5% de 1820000
  taxAmount: 28000,
  other: 0,
  total: 1792000,
  status: 'sent',
  notes: 'Total des 7 Immeubles: 12,544,000 CFA | Condition de paiement 70%',
  conditions: 'Paiement 70% à la commande, 30% à la livraison'
};

async function createQuotes() {
  try {
    // Connexion à MongoDB - utiliser l'URI avec credentials depuis l'env
    const mongoUri = process.env.MONGODB_URI || 
      'mongodb://itvision_app:itvision_password@localhost:27017/itvision_db?authSource=admin';
    console.log('Connexion à MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✓ Connecté à MongoDB');

    // Supprimer les devis existants avec ces numéros (ignorer l'erreur si pas de auth)
    try {
      await AdminQuote.deleteMany({ 
        numero: { $in: [devisSerrure.numero, devisInterphone.numero] } 
      });
      console.log('✓ Anciens devis supprimés si existants');
    } catch (e) {
      console.log('⚠ Impossible de supprimer (pas de auth), tentative de création directe...');
    }

    // Créer les devis
    const quote1 = new AdminQuote(devisSerrure);
    const quote2 = new AdminQuote(devisInterphone);

    await quote1.save();
    console.log('✓ Devis Serrure Antalya créé:', quote1.numero);

    await quote2.save();
    console.log('✓ Devis Interphone SHIRAMBA créé:', quote2.numero);

    console.log('\n📊 Résumé des devis créés:');
    console.log('1. Serrure Antalya (2026-0011-SERRURE) - Total: 287,999 CFA');
    console.log('2. Interphone SHIRAMBA (2026-0011-INTERPHONE) - Total: 1,792,000 CFA');
    console.log('   Note: Total des 7 immeubles = 12,544,000 CFA');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n✓ Déconnexion MongoDB');
  }
}

createQuotes();
