// Seed Teyliom — mongosh (exécuté DANS le conteneur mongo prod via ssh+docker exec)
// Usage : ssh admin@52.47.120.35 "docker exec -i itvision-mongodb mongosh 'URI' --quiet" < scripts/_teyliom-seed-mongosh.js
const db = db.getSiblingDB('itvision_db');
const log = [];

const TEYLIOM = {
  name: 'Teyliom Sénégal', company: 'Teyliom',
  email: 'khalifa.mbodji@teyliom.com', phone: '+221338296262',
  address: '167 Avenue Lamine Gueye, angle Place Soweto — BP 16144',
  city: 'Dakar', country: 'Sénégal', contactPerson: 'Khalifa Ababacar Mbodji',
  category: 'Immobilier & BTP', tags: ['multi-sites', 'immobilier', 'compte-strategique'],
  notes: 'Groupe immobilier multi-sites : Antalya, Trilenium, Rivonia, Atrium. Contacts : Khalifa A. Mbodji (demandeur Trilenium, contact principal), Adji K. Diallo (demandeur Antalya), Anta Wade (asset manager).',
};
const OWNER_EMAIL = 'khalifa.mbodji@teyliom.com';
const OWNER_HASH = '$2b$12$uf/LlKM0P6oICw3X/P/hw.zipQUkYA/Jbij8cZNGXaJ9kZPMs/YmK'; // aléatoire — reset par email

const CONTACTS = [
  { nom: 'Khalifa Ababacar Mbodji', fonction: 'Demandeur — site Trilenium (contact principal)', email: OWNER_EMAIL, isPrimary: true },
  { nom: 'Adji Khardiata Diallo', fonction: 'Demandeuse — site Antalya' },
  { nom: 'Anta Wade', fonction: 'Asset Manager' },
  { nom: 'Antoinette Anne Marie Pereira', fonction: 'Contrôleuse de Gestion' },
  { nom: 'Adji Khar Diouf', fonction: 'Directrice Administrative et Financière' },
  { nom: 'Souleymane Thiam', fonction: 'Achats — émission des BC' },
];

const att = (file, label, category) => ({
  name: label, url: `/api/uploads/documents/${file}`, type: 'application/pdf',
  size: 0, uploadedAt: new Date(), uploadedBy: 'admin-seed', category,
});

const snap = (site) => ({ name: `Teyliom — ${site}`, address: TEYLIOM.address, phone: TEYLIOM.phone, email: TEYLIOM.email });

function nextSeq(coll, field, prefix) {
  const re = new RegExp('^' + prefix + '\\d+$');
  let max = 0;
  db.getCollection(coll).find({ [field]: re }, { [field]: 1 }).forEach(d => {
    const n = parseInt(String(d[field]).slice(prefix.length), 10);
    if (n > max) max = n;
  });
  return prefix + String(max + 1).padStart(4, '0');
}

// ── 1. Client ──
let client = db.clients.findOne({ $or: [{ name: /teyliom/i }, { company: /teyliom/i }, { email: TEYLIOM.email }] });
if (!client) {
  const clientId = nextSeq('clients', 'clientId', 'CL');
  const doc = Object.assign({}, TEYLIOM, {
    clientId,
    permissions: { canViewReports: true, canRequestMaintenance: true, canAccessPortal: true },
    preferences: { emailNotifications: true, smsNotifications: false, reportFormat: 'web', language: 'fr' },
    favoriteProductIds: [], isActive: true, createdAt: new Date(), updatedAt: new Date(),
  });
  const r = db.clients.insertOne(doc);
  client = { _id: r.insertedId };
  log.push(`+ Client ${clientId} ${TEYLIOM.name}`);
} else {
  db.clients.updateOne({ _id: client._id }, { $set: { 'permissions.canAccessPortal': true, contactPerson: TEYLIOM.contactPerson, updatedAt: new Date() } });
  log.push(`= Client existant ${client.clientId} ${client.name}`);
}
const companyId = client._id;

// ── 2. User owner ──
let user = db.users.findOne({ email: OWNER_EMAIL });
if (!user) {
  const r = db.users.insertOne({
    username: 'khalifa.mbodji', email: OWNER_EMAIL, passwordHash: OWNER_HASH, name: 'Khalifa Ababacar Mbodji',
    role: 'CLIENT', company: 'Teyliom', address: TEYLIOM.address, city: 'Dakar', country: 'Sénégal',
    companyClientId: companyId, companyRole: 'owner',
    isActive: true, loginAttempts: 0, twoFactorEnabled: false, forcePasswordReset: true,
    favoriteProductIds: [], addresses: [], referrals: [], referralBalance: 0, referralCount: 0,
    marketplaceTier: 'standard', totalMarketplacePurchases: 0, marketplaceOrderCount: 0, tier: 'Bronze',
    createdAt: new Date(), updatedAt: new Date(),
  });
  user = { _id: r.insertedId };
  const mp = db.marketplaceprofiles.insertOne({ userId: user._id, marketplaceTier: 'standard', referralBalance: 0, referralCount: 0, createdAt: new Date(), updatedAt: new Date() });
  const cp = db.corporateprofiles.insertOne({ userId: user._id, company: 'Teyliom', address: TEYLIOM.address, city: 'Dakar', country: 'Sénégal', companyClientId: companyId, createdAt: new Date(), updatedAt: new Date() });
  db.users.updateOne({ _id: user._id }, { $set: { marketplaceProfileId: mp.insertedId, corporateProfileId: cp.insertedId } });
  log.push('+ User khalifa.mbodji@teyliom.com (owner) + profils');
} else {
  db.users.updateOne({ _id: user._id }, { $set: { companyClientId: companyId, companyRole: 'owner', updatedAt: new Date() } });
  log.push('= User existant → rattaché Teyliom (owner)');
}
const userId = user._id;

// ── 3. Contacts ──
CONTACTS.forEach(c => {
  if (!db.contacts.findOne({ clientId: companyId, nom: c.nom })) {
    db.contacts.insertOne(Object.assign({ clientId: companyId, createdAt: new Date(), updatedAt: new Date() }, c));
    log.push(`+ Contact ${c.nom}`);
  }
});

// ── 4. Projets par site ──
const clientSnap = { company: 'Teyliom', contact: 'Khalifa Ababacar Mbodji', phone: TEYLIOM.phone, email: OWNER_EMAIL };
const projectIds = {};
[
  { key: 'antalya', name: 'Antalya — Remplacement contacts domotiques appartements (1er & 6e étage)',
    site: { name: 'Antalya', address: 'Résidence Antalya, Dakar', contacts: [{ name: 'Adji Khardiata Diallo', role: 'Demandeuse' }] },
    startDate: new Date('2026-03-18'), status: 'in_progress' },
  { key: 'trilenium', name: 'Trilenium — Fourniture et installation centrale de détection incendie',
    site: { name: 'Trilenium', address: 'Immeuble Trilenium, Dakar', contacts: [{ name: 'Khalifa Ababacar Mbodji', role: 'Demandeur', email: OWNER_EMAIL }] },
    startDate: new Date('2026-04-28'), status: 'in_progress' },
].forEach(p => {
  let proj = db.projects.findOne({ clientCompanyId: companyId, 'site.name': p.site.name });
  if (!proj) {
    const projectId = nextSeq('projects', 'projectId', 'PRJ-');
    const r = db.projects.insertOne({
      projectId, name: p.name, description: `Site ${p.site.name} — ${p.name}`,
      address: p.site.address, clientId: userId, clientCompanyId: companyId,
      status: p.status, startDate: p.startDate, currentPhase: '', progress: 0,
      serviceType: 'installation', clientSnapshot: clientSnap, site: p.site,
      clientAccess: true, milestones: [], phases: [], risks: [], documents: [],
      createdAt: new Date(), updatedAt: new Date(),
    });
    proj = { _id: r.insertedId };
    log.push(`+ Projet ${projectId} (${p.site.name})`);
  } else {
    log.push(`= Projet existant ${proj.projectId || proj._id} (${p.site.name})`);
  }
  projectIds[p.key] = proj._id;
});

// ── 5. BC (adminquotes) ──
[
  {
    numero: 'BC-TPS001675', bonCommande: 'TPS001675', date: new Date('2026-03-18'),
    title: 'Antalya — Remplacement contacts domotiques appartements 1er & 6e étage',
    client: snap('Antalya'), projectId: projectIds.antalya,
    products: [
      { description: '1er étage N2 : interrupteur simple, double et prise', quantity: 1, unitPrice: 285199, taxable: false, total: 285199 },
      { description: '6e étage : interrupteur simple', quantity: 1, unitPrice: 186100, taxable: false, total: 186100 },
      { description: '1er étage N1 : interrupteur simple connecté', quantity: 1, unitPrice: 277670, taxable: false, total: 277670 },
    ],
    subtotal: 748969, applyBRS: false, brsThreshold: 25000, brsAmount: 0, taxAmount: 0, other: 0, total: 748969,
    conditions: 'Paiement : comptant',
    notes: 'Demande d\'achat DA 114/2026 — Réf ANTALYA. Demandeur : Adji Khardiata Diallo. Rubrique : Entretien & réparation de bâtiments.',
    a: att('teyliom-bc-tps001675.pdf', 'BC TPS001675 — Antalya (domotique).pdf', 'bon_commande'),
  },
  {
    numero: 'BC-TPS001716', bonCommande: 'TPS001716', date: new Date('2026-04-28'),
    title: 'Trilenium — Fourniture et installation centrale de détection incendie',
    client: snap('Trilenium'), projectId: projectIds.trilenium,
    products: [
      { description: 'Fourniture et installation d\'une centrale de détection incendie — détail DA 153/2026 en annexe du BC', quantity: 1, unitPrice: 3640000, taxable: false, total: 3640000 },
    ],
    subtotal: 3640000, applyBRS: true, brsThreshold: 25000, brsAmount: 30000, taxAmount: 0, other: 0, total: 3610000,
    conditions: 'Paiement : comptant',
    notes: 'Demande d\'achat DA 153/2026 — Réf TRILENIUM. S/devis N°2026-019. Demandeur : Khalifa Ababacar Mbodji. Détail annexe : centrale 350 000 ; 10 détecteurs fumée 320 000 ; 10 déclencheurs manuels 370 000 ; 10 sirènes flash 450 000 ; 2 rouleaux CR2 600 000 ; accessoires 100 000 ; 1000 m câble CR1 850 000 ; MO tirage+config 570 000 ; remise BRS -30 000.',
    a: att('teyliom-bc-tps001716.pdf', 'BC TPS001716 — Trilenium (centrale incendie).pdf', 'bon_commande'),
  },
].forEach(q => {
  const exists = db.adminquotes.findOne({ $or: [{ numero: q.numero }, { bonCommande: q.bonCommande }] });
  if (exists) {
    db.adminquotes.updateOne({ _id: exists._id }, { $set: { clientUserId: userId, clientCompanyId: companyId, projectId: q.projectId, updatedAt: new Date() } });
    log.push(`= ${q.numero} existant → rattaché Teyliom`);
    return;
  }
  const a = q.a; delete q.a;
  db.adminquotes.insertOne(Object.assign(q, {
    clientUserId: userId, clientCompanyId: companyId,
    status: 'accepted', sentAt: q.date, acceptedAt: q.date, clientResponse: 'accepted',
    attachments: [a], createdBy: 'admin-seed', createdAt: new Date(), updatedAt: new Date(),
  }));
  log.push(`+ ${q.numero} (${q.total.toLocaleString('fr')} F)`);
});

// ── 5b. Liaison docs → projets (onglet Documents admin + carte devis + portail) ──
const mkdoc = (id, name, type, url) => ({ id: String(id), name, type, url, uploadDate: new Date(), clientVisible: true });
const q675 = db.adminquotes.findOne({ numero: 'BC-TPS001675' });
const q716 = db.adminquotes.findOne({ numero: 'BC-TPS001716' });
if (q675 && projectIds.antalya) {
  db.projects.updateOne({ _id: projectIds.antalya }, { $set: {
    documents: [mkdoc(q675._id, 'BC TPS001675 — Remplacement domotique apparts 1er/6e étage.pdf', 'quote', '/api/uploads/documents/teyliom-bc-tps001675.pdf')],
    quote: { id: String(q675._id), totalHT: 748969, totalTTC: 748969, status: 'accepted' },
    updatedAt: new Date() } });
  log.push('  → docs+devis liés au projet Antalya');
}
if (q716 && projectIds.trilenium) {
  const inv = db.admininvoices.findOne({ numero: '2026-0010' });
  const invDoc = mkdoc(inv ? inv._id : 'facture-2026-0010', 'Facture 2026-0010 — Reliquat incendie.pdf', 'invoice', '/api/uploads/documents/teyliom-facture-2026-0010.pdf');
  db.projects.updateOne({ _id: projectIds.trilenium }, { $set: {
    documents: [
      mkdoc(q716._id, 'BC TPS001716 — Centrale détection incendie.pdf', 'quote', '/api/uploads/documents/teyliom-bc-tps001716.pdf'),
      invDoc,
    ],
    quote: { id: String(q716._id), totalHT: 3640000, totalTTC: 3610000, status: 'accepted' },
    updatedAt: new Date() } });
  log.push('  → docs+devis liés au projet Trilenium');
}

// ── 6. Facture reliquat ──
if (!db.admininvoices.findOne({ numero: '2026-0010' })) {
  db.admininvoices.insertOne({
    numero: '2026-0010', date: new Date('2026-07-27'), status: 'sent', sentAt: new Date('2026-07-27'),
    clientUserId: userId, clientCompanyId: companyId, projectId: projectIds.trilenium,
    client: { name: 'Teyliom — Trilenium', company: 'Teyliom', email: TEYLIOM.email, phone: TEYLIOM.phone, address: TEYLIOM.address, city: 'Dakar' },
    items: [{ description: 'Reliquat — centrale de détection incendie Trilenium (BC TPS001716 : total 3 610 000 F, 1er acompte 2 527 000 F perçu)', quantity: 1, unitPrice: 1083000, totalPrice: 1083000 }],
    subtotal: 1083000, taxRate: 0, taxAmount: 0, total: 1083000,
    notes: 'Facture de reliquat — solde restant après 1er acompte de 2 527 000 F sur un total de 3 610 000 F (BC TPS001716).',
    terms: 'Paiement : comptant', quoteId: 'BC-TPS001716',
    attachments: [att('teyliom-facture-2026-0010.pdf', 'Facture 2026-0010 — Reliquat incendie Trilenium.pdf', 'autre')],
    createdBy: 'admin-seed', createdAt: new Date(), updatedAt: new Date(),
  });
  log.push('+ Facture 2026-0010 (reliquat 1 083 000 F)');
} else {
  db.admininvoices.updateOne({ numero: '2026-0010' }, { $set: { clientUserId: userId, clientCompanyId: companyId, projectId: projectIds.trilenium, updatedAt: new Date() } });
  log.push('= Facture 2026-0010 existante → rattachée');
}

print(log.join('\n'));
