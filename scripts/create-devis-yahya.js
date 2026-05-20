/**
 * Devis Vidéosurveillance + TV pour M. Yahya
 * 
 * Exécuter sur le serveur EC2 :
 *   docker exec -i itvision-mongodb mongosh -u itvision_app -p "$MONGO_APP_PASSWORD" --authenticationDatabase itvision_db itvision_db < scripts/create-devis-yahya.js
 * 
 * Ou localement si MONGODB_URI est configuré :
 *   mongosh "$MONGODB_URI" < scripts/create-devis-yahya.js
 */

const db = db.getSiblingDB('itvision_db');

// Supprimer si existe déjà
db.adminquotes.deleteMany({ numero: '2026-YAHYA-VS01' });

const now = new Date();

db.adminquotes.insertOne({
  numero: '2026-YAHYA-VS01',
  date: now,
  client: {
    name: 'M. Yahya',
    address: '',
    phone: '',
    email: ''
  },
  products: [
    {
      description: 'NVR Dahua IP 8 ports POE',
      quantity: 1,
      unitPrice: 150000,
      taxable: false,
      total: 150000
    },
    {
      description: 'Caméra POE Dahua 4MP',
      quantity: 1,
      unitPrice: 45000,
      taxable: false,
      total: 45000
    },
    {
      description: 'Disque dur 2To surveillance',
      quantity: 1,
      unitPrice: 65000,
      taxable: false,
      total: 65000
    },
    {
      description: 'Rouleau câble FTP Cat6 (50m)',
      quantity: 1,
      unitPrice: 60000,
      taxable: false,
      total: 60000
    },
    {
      description: 'TV 32 pouces',
      quantity: 1,
      unitPrice: 110000,
      taxable: false,
      total: 110000
    },
    {
      description: 'Coffret mural 4U',
      quantity: 1,
      unitPrice: 25000,
      taxable: false,
      total: 25000
    },
    {
      description: "Main d'oeuvre installation et mise en service",
      quantity: 1,
      unitPrice: 120000,
      taxable: false,
      total: 120000
    }
  ],
  // Sous-total: 575 000
  subtotal: 575000,
  // BRS 5%: 28 750
  brsAmount: 28750,
  taxAmount: 0,
  other: 0,
  // Total: 575 000 - 28 750 = 546 250
  total: 546250,
  status: 'draft',
  notes: "Vidéosurveillance + TV\n\nCoûts d'achat de référence:\n  NVR Dahua 8 POE: 90 000 CFA\n  Caméra POE 4MP: 35 000 CFA\n  Disque 2To: 35 000 CFA\n  Câble FTP 50m: 50 000 CFA\n  TV 32P: 80 000 CFA\n  Coffret 4U: inclus\n  Main d'oeuvre: 120 000 CFA",
  conditions: 'Paiement à la commande',
  createdAt: now,
  updatedAt: now
});

print('✓ Devis 2026-YAHYA-VS01 créé');
print('  Client: M. Yahya');
print('  7 articles');
print('  Sous-total: 575 000 CFA');
print('  BRS (5%): -28 750 CFA');
print('  TOTAL: 546 250 CFA');
