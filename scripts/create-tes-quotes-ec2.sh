#!/bin/bash
# Script à exécuter sur l'EC2 pour créer les devis TES
# Usage: ./create-tes-quotes-ec2.sh

echo "Création des devis TES dans MongoDB..."

# Commande pour insérer les devis via le container MongoDB
docker exec -i itvision-mongodb mongosh "mongodb://itvision_app:ITVDB2025@localhost:27017/itvision_db?authSource=admin" << 'EOF'
// Devis 1: Serrure Antalya
const devisSerrure = {
  numero: "2026-0011-SERRURE",
  date: new Date("2026-02-09"),
  client: {
    name: "TES",
    address: "11 Cité Lomasé, Nord Foire",
    phone: "774133440 / 774223348",
    email: "",
    rcn: "SN.DKR.2019.A.10579",
    ninea: "007305734"
  },
  products: [
    {
      description: "Serrure électronique de porte d'entrée en Aluminium ultra fin étanche avec empreinte, code, carte, reconnaissance faciale, clé, batterie rechargeable",
      quantity: 1,
      unitPrice: 200000,
      taxable: false,
      total: 200000
    },
    {
      description: "Groom ferme porte",
      quantity: 1,
      unitPrice: 38000,
      taxable: false,
      total: 38000
    },
    {
      description: "MO installation et mise en service",
      quantity: 1,
      unitPrice: 52630,
      taxable: true,
      total: 52630
    }
  ],
  subtotal: 290630,
  brsAmount: 14531.50,
  taxAmount: 2631.50,
  other: 0,
  total: 287999,
  status: "sent",
  notes: "Condition de paiement 100%",
  conditions: "Paiement 100% à la commande",
  createdAt: new Date(),
  updatedAt: new Date()
};

// Devis 2: Interphone SHIRAMBA
const devisInterphone = {
  numero: "2026-0011-INTERPHONE",
  date: new Date("2026-02-09"),
  client: {
    name: "TES",
    address: "11 Cité Lomasé, Nord Foire",
    phone: "+221 77 413 34 40 / 221 77 422 33 48",
    email: "",
    rcn: "SN.DKR.2019.A.10579",
    ninea: "007305734"
  },
  products: [
    {
      description: "Interphone marque RL pour un immeuble",
      quantity: 28,
      unitPrice: 45000,
      taxable: false,
      total: 1260000
    },
    {
      description: "Vérification câblage + Installation par immeuble",
      quantity: 28,
      unitPrice: 20000,
      taxable: false,
      total: 560000
    }
  ],
  subtotal: 1820000,
  brsAmount: 91000,
  taxAmount: 28000,
  other: 0,
  total: 1792000,
  status: "sent",
  notes: "Total des 7 Immeubles: 12,544,000 CFA | Condition de paiement 70%",
  conditions: "Paiement 70% à la commande, 30% à la livraison",
  createdAt: new Date(),
  updatedAt: new Date()
};

// Supprimer les anciens devis si existants
db.adminquotes.deleteMany({ numero: { $in: ["2026-0011-SERRURE", "2026-0011-INTERPHONE"] } });

// Insérer les nouveaux devis
const result = db.adminquotes.insertMany([devisSerrure, devisInterphone]);
print("✓ Devis créés avec succès:");
print("  - Devis Serrure Antalya (2026-0011-SERRURE): 287,999 CFA");
print("  - Devis Interphone SHIRAMBA (2026-0011-INTERPHONE): 1,792,000 CFA");
print("    (Total des 7 immeubles: 12,544,000 CFA)");
print("IDs insérés: " + Object.values(result.insertedIds).join(", "));
EOF

echo ""
echo "Terminé! Les devis sont maintenant disponibles dans l'application."
