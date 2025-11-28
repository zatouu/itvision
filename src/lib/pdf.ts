import jsPDF from 'jspdf'
import 'jspdf-autotable'

export function generateDiagnosticPdf(payload: any): ArrayBuffer {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })

  const primary = '#10b981'
  const secondary = '#3b82f6'

  // Header brand
  doc.setFillColor(16, 185, 129) // emerald-500
  doc.rect(0, 0, 595, 80, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.text('IT Vision Plus', 40, 40)
  doc.setFontSize(11)
  doc.text('Diagnostic de digitalisation PME', 40, 60)

  // Body
  doc.setTextColor(33, 33, 33)
  doc.setFontSize(14)
  doc.text('Résumé', 40, 110)
  doc.setFontSize(10)

  const lines = [
    [`Date`, new Date(payload.createdAt || Date.now()).toLocaleString('fr-FR')],
    [`Société`, payload?.contact?.company || '-'],
    [`Contact`, `${payload?.contact?.name || ''} ${payload?.contact?.email || ''}`.trim() || '-'],
    [`Secteur`, payload?.sector || '-'],
    [`Objectifs`, (payload?.objectives || []).join(', ') || '-'],
    [`Processus`, (payload?.processes || []).join(', ') || '-'],
    [`Systèmes`, (payload?.systems || []).join(', ') || '-'],
    [`Contraintes`, `Budget: ${payload?.constraints?.budget || '-'} | Délai: ${payload?.constraints?.timeline || '-'} | Conformité: ${(payload?.constraints?.compliance || []).join(', ') || '-'}`],
    [`Score`, `${payload?.scoring?.score || '-'} / 10`],
    [`Taille`, payload?.scoring?.tShirt || '-'],
    [`Fourchette`, payload?.scoring?.priceHint || '-'],
  ]

  // @ts-expect-error plugin jspdf-autotable injecte autoTable sur l'instance
  doc.autoTable({ startY: 130, head: [['Champ', 'Valeur']], body: lines, styles: { cellPadding: 6, fontSize: 10 } })

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setDrawColor(229, 231, 235)
  doc.line(40, pageHeight - 60, 555, pageHeight - 60)
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text('IT Vision Plus • Sécurité électronique & digitalisation des processus', 40, pageHeight - 40)
  doc.text('www.itvisionplus.sn • contact@itvisionplus.sn • +221 77 413 34 40', 40, pageHeight - 24)

  return doc.output('arraybuffer') as unknown as ArrayBuffer
}

export function generateQuotePdf(quote: {
  id: string
  client: { company: string; contact: string; email: string; phone: string }
  sections: Array<{ name: string; items: Array<{ name: string; quantity: number; unitPrice: number; totalPrice: number }> }>
  totals: { subtotalHT: number; taxAmount: number; totalTTC: number }
}): ArrayBuffer {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })

  // Header
  doc.setFillColor(16, 185, 129)
  doc.rect(0, 0, 595, 70, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.text(`Devis ${quote.id}`, 40, 40)

  // Client
  doc.setTextColor(33, 33, 33)
  doc.setFontSize(12)
  doc.text('Client', 40, 100)
  doc.setFontSize(10)
  doc.text(`${quote.client.company}`, 40, 118)
  doc.text(`${quote.client.contact} • ${quote.client.email} • ${quote.client.phone}`, 40, 134)

  // Items
  const rows: any[] = []
  quote.sections.forEach((s) => {
    s.items.forEach((it) => rows.push([s.name, it.name, it.quantity, it.unitPrice.toLocaleString('fr-FR'), it.totalPrice.toLocaleString('fr-FR')]))
  })
  // @ts-expect-error plugin jspdf-autotable injecte autoTable sur l'instance
  doc.autoTable({
    startY: 160,
    head: [['Service', 'Article', 'Qté', 'PU', 'Total']],
    body: rows,
    styles: { cellPadding: 6, fontSize: 10 }
  })

  const y = (doc as any).lastAutoTable?.finalY || 180
  doc.setFontSize(11)
  doc.text(`Sous-total HT: ${quote.totals.subtotalHT.toLocaleString('fr-FR')} FCFA`, 360, y + 30)
  doc.text(`TVA 18%: ${quote.totals.taxAmount.toLocaleString('fr-FR')} FCFA`, 360, y + 48)
  doc.setFont('helvetica', 'bold')
  doc.text(`Total TTC: ${quote.totals.totalTTC.toLocaleString('fr-FR')} FCFA`, 360, y + 66)

  return doc.output('arraybuffer') as unknown as ArrayBuffer
}

// Fonction pour générer le devis au format IT Vision avec BRS (5%)
export function generateITVisionQuotePdf(quote: {
  numero: string
  date: string
  client: {
    name: string
    address: string
    phone: string
    email: string
    rcn?: string
    ninea?: string
  }
  products: Array<{
    description: string
    quantity: number
    unitPrice: number
    taxable: boolean
    total: number
  }>
  subtotal: number
  brsAmount: number
  taxAmount: number
  other: number
  total: number
  notes?: string
  bonCommande?: string
  dateLivraison?: string
}): ArrayBuffer {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // En-tête avec fond bleu marine et titre en haut à droite
  doc.setFillColor(48, 50, 107) // Bleu marine foncé
  doc.rect(0, 0, pageWidth, 60, 'F')
  
  // Titre "DEVIS" en orange en haut à droite
  doc.setTextColor(255, 140, 0) // Orange
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('DEVIS', pageWidth - 120, 30)
  
  // Sous-titre en blanc
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`Maintenance ${quote.client.name}`, pageWidth - 200, 48)

  // Logo et informations société (gauche)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('IT Vision', 40, 30)
  
  // Informations société sous le logo
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  
  let yPos = 75
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Adresse de la société', 40, yPos)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  yPos += 12
  doc.text('11 Cité Lessine, Nord Foire Tel : 774133440/774223348', 40, yPos)
  yPos += 10
  doc.text('RC N° : SN DDER 2019 A 10739 - NINEA 007305734', 40, yPos)
  yPos += 10
  doc.text('Téléphone : +221 77 413 34 40 / 221 77 422 33 48', 40, yPos)

  // Date et N° devis (droite)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Date', pageWidth - 150, 75)
  doc.setFont('helvetica', 'normal')
  doc.text(new Date(quote.date).toLocaleDateString('fr-FR'), pageWidth - 70, 75)
  
  doc.setFont('helvetica', 'bold')
  doc.text('N° devis', pageWidth - 150, 90)
  doc.setFont('helvetica', 'normal')
  doc.text(quote.numero, pageWidth - 70, 90)

  // Devis pour (client)
  yPos = 120
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Devis pour', 40, yPos)
  
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  yPos += 15
  doc.text(quote.client.name, 40, yPos)
  
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  if (quote.client.address) {
    yPos += 12
    doc.text(quote.client.address, 40, yPos)
  }
  if (quote.client.phone) {
    yPos += 10
    doc.text(`Tel: ${quote.client.phone}`, 40, yPos)
  }
  if (quote.client.email) {
    yPos += 10
    doc.text(`Email: ${quote.client.email}`, 40, yPos)
  }

  // Tableau des informations de commande (optionnel)
  yPos += 20
  const infoTableData = [[
    quote.bonCommande || '',
    quote.dateLivraison || '',
    '', // Point d'expédition
    quote.notes || ''
  ]]
  
  // @ts-expect-error jspdf-autotable
  doc.autoTable({
    startY: yPos,
    head: [['Bon de commande', 'Date de livraison', 'Point d\'expédition', 'Conditions']],
    body: infoTableData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 4,
      lineColor: [200, 200, 200],
      lineWidth: 0.5
    },
    headStyles: {
      fillColor: [70, 80, 120],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold'
    }
  })

  // Tableau des produits
  // @ts-expect-error jspdf-autotable
  yPos = doc.lastAutoTable.finalY + 10

  const productRows = quote.products.map(p => [
    p.quantity.toString(),
    p.description,
    `${p.unitPrice.toLocaleString('fr-FR')} CFA`,
    p.taxable ? 'Non' : 'Oui',
    `${p.total.toLocaleString('fr-FR')} CFA`
  ])

  // @ts-expect-error jspdf-autotable
  doc.autoTable({
    startY: yPos,
    head: [['Quantité', 'Description', 'Prix unitaire', 'Imposable ?', 'Montant']],
    body: productRows,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 5,
      lineColor: [200, 200, 200],
      lineWidth: 0.5
    },
    headStyles: {
      fillColor: [70, 80, 120],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 60 },
      1: { halign: 'left', cellWidth: 220 },
      2: { halign: 'right', cellWidth: 90 },
      3: { halign: 'center', cellWidth: 70 },
      4: { halign: 'right', cellWidth: 100 }
    }
  })

  // Totaux
  // @ts-expect-error jspdf-autotable
  yPos = doc.lastAutoTable.finalY + 10

  const totalsData = [
    ['Sous-total', `${quote.subtotal.toLocaleString('fr-FR')} CFA`],
    ['BRS', `5.00%`, `${quote.brsAmount.toLocaleString('fr-FR')} CFA`],
    ['Taxe de vente', '', `${quote.taxAmount.toLocaleString('fr-FR')} CFA`],
    ['Autres', '', `${quote.other.toLocaleString('fr-FR')} CFA`],
    ['TOTAL', '', `${quote.total.toLocaleString('fr-FR')} CFA`]
  ]

  // @ts-expect-error jspdf-autotable
  doc.autoTable({
    startY: yPos,
    body: totalsData,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 4
    },
    columnStyles: {
      0: { halign: 'right', cellWidth: 360, fontStyle: 'bold' },
      1: { halign: 'right', cellWidth: 80 },
      2: { halign: 'right', cellWidth: 100, fontStyle: 'bold' }
    },
    didParseCell: function (data: any) {
      // Mettre en surbrillance la ligne TOTAL
      if (data.row.index === 4) {
        data.cell.styles.fillColor = [245, 245, 245]
        data.cell.styles.fontSize = 12
        data.cell.styles.fontStyle = 'bold'
      }
      // Mettre en surbrillance la ligne BRS
      if (data.row.index === 1) {
        data.cell.styles.textColor = [255, 100, 0]
      }
    }
  })

  // Notes conditionnelles de paiement
  if (quote.notes) {
    // @ts-expect-error jspdf-autotable
    yPos = doc.lastAutoTable.finalY + 20
    
    if (yPos > pageHeight - 100) {
      doc.addPage()
      yPos = 40
    }
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.text('Nous vous remercions de votre confiance.', 40, yPos)
    
    yPos += 15
    doc.setFont('helvetica', 'bold')
    doc.text('Conditions de paiement:', 40, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(quote.notes, 140, yPos)
  }

  // Cachet et signature
  // @ts-expect-error jspdf-autotable
  yPos = doc.lastAutoTable.finalY + 40
  
  if (yPos > pageHeight - 120) {
    doc.addPage()
    yPos = 40
  }

  // Zone cachet (simulé avec texte)
  doc.setFillColor(240, 240, 255)
  doc.rect(pageWidth / 2 - 80, yPos, 120, 80, 'F')
  doc.setDrawColor(100, 100, 200)
  doc.rect(pageWidth / 2 - 80, yPos, 120, 80, 'S')
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 100, 200)
  doc.text('CACHET ET SIGNATURE', pageWidth / 2, yPos + 40, { align: 'center' })

  // Footer
  doc.setDrawColor(200, 200, 200)
  doc.line(40, pageHeight - 60, pageWidth - 40, pageHeight - 60)
  
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.setFont('helvetica', 'italic')
  doc.text('IT Vision Plus - Sécurité électronique & Digitalisation', pageWidth / 2, pageHeight - 45, { align: 'center' })
  doc.text('www.itvisionplus.sn • contact@itvisionplus.sn • +221 77 413 34 40', pageWidth / 2, pageHeight - 32, { align: 'center' })

  return doc.output('arraybuffer') as unknown as ArrayBuffer
}
