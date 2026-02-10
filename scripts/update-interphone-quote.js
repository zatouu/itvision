db.adminquotes.updateOne(
  { numero: "2026-0011-INTERPHONE" },
  { 
    $set: { 
      total: 12544000,
      notes: "Devis pour 7 immeubles | Condition de paiement 70%",
      products: [
        {
          description: "Interphone marque RL pour un immeuble (x7 immeubles)",
          quantity: 196,
          unitPrice: 45000,
          taxable: false,
          total: 8820000
        },
        {
          description: "Vérification câblage + Installation par immeuble (x7 immeubles)",
          quantity: 196,
          unitPrice: 20000,
          taxable: false,
          total: 3920000
        }
      ],
      subtotal: 12740000,
      brsAmount: 637000,
      taxAmount: 196000
    }
  }
);
print("✓ Devis Interphone mis à jour avec le total des 7 immeubles: 12,544,000 CFA");
