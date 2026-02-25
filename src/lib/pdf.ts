import jsPDF, { GState } from 'jspdf'
import autoTable from 'jspdf-autotable'

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

  autoTable(doc, { startY: 130, head: [['Champ', 'Valeur']], body: lines, styles: { cellPadding: 6, fontSize: 10 } })

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
  autoTable(doc, {
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
  colonel?: string
  pointExpedition?: string
  conditions?: string
  images?: {
    logo?: string
    stamp?: string
  }
}): ArrayBuffer {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  // En-tête avec fond bleu marine
  doc.setFillColor(48, 50, 107)
  doc.rect(0, 0, pageWidth, 80, 'F')

  // Titre "DEVIS" en jaune/orange
  doc.setTextColor(255, 200, 0)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('DEVIS', pageWidth - 40, 35, { align: 'right' })

  // Sous-titre en blanc
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`Maintenance ${quote.client.name}`.toUpperCase(), pageWidth - 40, 55, { align: 'right' })

  // Logo
  if (quote.images?.logo) {
    try {
      doc.addImage(quote.images.logo, 'PNG', 40, 10, 80, 60)
    } catch (e) {
      doc.setFillColor(255, 255, 255)
      doc.circle(70, 40, 30, 'F')
      doc.setTextColor(48, 50, 107)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('It', 60, 38)
      doc.text('Vision', 55, 50)
    }
  } else {
    doc.setFillColor(255, 255, 255)
    doc.circle(70, 40, 30, 'F')
    doc.setTextColor(48, 50, 107)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('It', 60, 38)
    doc.text('Vision', 55, 50)
  }

  // Infos société
  let yPos = 100
  doc.setTextColor(255, 140, 0)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Adresse de la société', 40, yPos)

  doc.text('Date', pageWidth - 200, yPos)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  doc.text(new Date(quote.date).toLocaleDateString('fr-FR'), pageWidth - 100, yPos)

  yPos += 15
  doc.text('11 Cité Lessine, Nord Foire Tel :', 40, yPos)

  doc.setTextColor(255, 140, 0)
  doc.setFont('helvetica', 'bold')
  doc.text('N° devis', pageWidth - 200, yPos)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  doc.text(quote.numero, pageWidth - 100, yPos)

  yPos += 12
  doc.text('774133440/774223348', 40, yPos)
  yPos += 12
  doc.text('RC N° : SN DDER 2019 A 10739 - NINEA 007305734', 40, yPos)
  yPos += 12
  doc.text('Téléphone : +221 77 413 34 40 / 221 77 422 33 48', 40, yPos)

  // Devis pour
  yPos += 25
  doc.setTextColor(255, 140, 0)
  doc.setFont('helvetica', 'bold')
  doc.text('Devis pour', 40, yPos)

  yPos += 15
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(quote.client.name, 40, yPos)

  if (quote.client.address) {
    yPos += 15
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(quote.client.address, 40, yPos)
  }

  // Tableau Informations
  yPos += 30
  const infoTableData = [[
    quote.colonel || '',
    quote.bonCommande || '',
    quote.dateLivraison || '',
    quote.pointExpedition || '',
    quote.conditions || ''
  ]]

  autoTable(doc, {
    startY: yPos,
    head: [['Colonel', 'Bon de commande', 'Date de livraison', "Point d'expédition", 'Conditions']],
    body: infoTableData,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 8,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
      halign: 'left',
      textColor: [0, 0, 0]
    },
    headStyles: {
      fillColor: [54, 69, 79],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'left'
    }
  })

  // Tableau Produits
  yPos = ((doc as any).lastAutoTable?.finalY || 300) + 20

  const productRows = quote.products.map(p => [
    p.quantity.toString(),
    p.description,
    `${p.unitPrice.toLocaleString('fr-FR').replace(/\s/g, '\u00A0')} CFA`,
    p.taxable ? 'Oui' : 'Non',
    `${p.total.toLocaleString('fr-FR').replace(/\s/g, '\u00A0')} CFA`
  ])

  autoTable(doc, {
    startY: yPos,
    head: [['Quantité', 'Description', 'Prix unitaire', 'Imposable ?', 'Montant']],
    body: productRows,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 8,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
      textColor: [0, 0, 0],
      valign: 'middle'
    },
    headStyles: {
      fillColor: [54, 69, 79],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 50 },
      1: { halign: 'left', cellWidth: 220, fontStyle: 'bold' },
      2: { halign: 'right', cellWidth: 90 },
      3: { halign: 'center', cellWidth: 60 },
      4: { halign: 'right', cellWidth: 90 }
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255]
    }
  })

  // Totaux
  yPos = ((doc as any).lastAutoTable?.finalY || 400) + 10

  const totalsData = [
    ['Sous-total', `${quote.subtotal.toLocaleString('fr-FR').replace(/\s/g, '\u00A0')} CFA`],
    ['BRS', `${quote.brsAmount.toLocaleString('fr-FR').replace(/\s/g, '\u00A0')} CFA`],
    ['Taxe de vente', `${quote.taxAmount.toLocaleString('fr-FR').replace(/\s/g, '\u00A0')} CFA`],
    ['Autres', `${quote.other.toLocaleString('fr-FR').replace(/\s/g, '\u00A0')} CFA`],
    ['TOTAL', `${quote.total.toLocaleString('fr-FR').replace(/\s/g, '\u00A0')} CFA`]
  ]

  autoTable(doc, {
    startY: yPos,
    body: totalsData,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 5, textColor: [0, 0, 0] },
    columnStyles: {
      0: { halign: 'right', cellWidth: 350, fontStyle: 'normal', textColor: [255, 140, 0] },
      1: { halign: 'right', cellWidth: 160, fontStyle: 'bold' }
    },
    didParseCell: function (data: any) {
      if (data.row.index === 4) {
        data.cell.styles.fillColor = [54, 69, 79]
        data.cell.styles.textColor = [255, 255, 255]
        data.cell.styles.fontStyle = 'bold'
      } else {
        if (data.column.index === 0) {
          data.cell.styles.textColor = [255, 140, 0]
        }
      }
    }
  })

  yPos = ((doc as any).lastAutoTable?.finalY || 500) + 30

  if (yPos > pageHeight - 100) {
    doc.addPage()
    yPos = 40
  }

  doc.setFontSize(10)
  doc.setTextColor(255, 140, 0)
  doc.text('Nous vous remercions de votre confiance.', 40, yPos)

  // Stamp
  const stampX = pageWidth - 200
  const stampY = yPos - 10

  if (quote.images?.stamp) {
    try {
      doc.addImage(quote.images.stamp, 'PNG', stampX, stampY, 120, 80)
    } catch (e) {
      doc.saveGraphicsState()
      doc.setGState(new GState({ opacity: 0.8 }))
      doc.setDrawColor(40, 40, 180)
      doc.setLineWidth(2)
      doc.rect(stampX, stampY, 120, 60)
      doc.setTextColor(40, 40, 180)
      doc.setFontSize(8)
      doc.text('IT VISION +', stampX + 60, stampY + 20, { align: 'center', angle: 15 })
      doc.text('NINEA 007305734', stampX + 60, stampY + 35, { align: 'center', angle: 15 })
      doc.restoreGraphicsState()
    }
  } else {
    doc.saveGraphicsState()
    doc.setGState(new GState({ opacity: 0.8 }))
    doc.setDrawColor(40, 40, 180)
    doc.setLineWidth(2)
    doc.rect(stampX, stampY, 120, 60)
    doc.setTextColor(40, 40, 180)
    doc.setFontSize(8)
    doc.text('IT VISION +', stampX + 60, stampY + 20, { align: 'center', angle: 15 })
    doc.text('NINEA 007305734', stampX + 60, stampY + 35, { align: 'center', angle: 15 })
    doc.restoreGraphicsState()
  }

  yPos += 40
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)
  doc.text('Condition de paiement 100%', 40, yPos)

  return doc.output('arraybuffer') as unknown as ArrayBuffer
}

export function generateITVisionInvoicePdf(invoice: {
  numero: string
  date: string
  dueDate?: string
  client: {
    name: string
    company?: string
    address: string
    phone: string
    email: string
    taxId?: string
  }
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  notes?: string
  terms?: string
  paymentMethod?: string
  paymentDate?: string
  images?: {
    logo?: string
    stamp?: string
  }
}): ArrayBuffer {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  doc.setFillColor(48, 50, 107)
  doc.rect(0, 0, pageWidth, 80, 'F')

  doc.setTextColor(255, 200, 0)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('FACTURE', pageWidth - 40, 35, { align: 'right' })

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  const clientName = invoice.client.company || invoice.client.name
  doc.text(clientName.toUpperCase(), pageWidth - 40, 55, { align: 'right' })

  if (invoice.images?.logo) {
    try {
      doc.addImage(invoice.images.logo, 'PNG', 40, 10, 80, 60)
    } catch (e) {
      doc.setFillColor(255, 255, 255)
      doc.circle(70, 40, 30, 'F')
      doc.setTextColor(48, 50, 107)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('It', 60, 38)
      doc.text('Vision', 55, 50)
    }
  } else {
    doc.setFillColor(255, 255, 255)
    doc.circle(70, 40, 30, 'F')
    doc.setTextColor(48, 50, 107)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('It', 60, 38)
    doc.text('Vision', 55, 50)
  }

  let yPos = 100
  doc.setTextColor(255, 140, 0)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Adresse de la société', 40, yPos)

  doc.text('Date', pageWidth - 200, yPos)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  doc.text(new Date(invoice.date).toLocaleDateString('fr-FR'), pageWidth - 100, yPos)

  yPos += 15
  doc.text('11 Cité Lessine, Nord Foire Tel : 774133440/774223348', 40, yPos)

  doc.setTextColor(255, 140, 0)
  doc.setFont('helvetica', 'bold')
  doc.text('N° facture', pageWidth - 200, yPos)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  doc.text(invoice.numero, pageWidth - 100, yPos)

  yPos += 12
  doc.text('RC N° : SN DDER 2019 A 10739 - NINEA 007305734', 40, yPos)

  if (invoice.dueDate) {
    doc.setTextColor(255, 140, 0)
    doc.setFont('helvetica', 'bold')
    doc.text('Échéance', pageWidth - 200, yPos)
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    doc.text(new Date(invoice.dueDate).toLocaleDateString('fr-FR'), pageWidth - 100, yPos)
  }

  yPos += 12
  doc.text('Téléphone : +221 77 413 34 40 / 221 77 422 33 48', 40, yPos)

  yPos += 25
  doc.setTextColor(255, 140, 0)
  doc.setFont('helvetica', 'bold')
  doc.text('Facturer à', 40, yPos)

  yPos += 15
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(clientName, 40, yPos)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  yPos += 15
  if (invoice.client.company && invoice.client.name !== invoice.client.company) {
    doc.text(invoice.client.name, 40, yPos)
    yPos += 12
  }
  if (invoice.client.address) {
    doc.text(invoice.client.address, 40, yPos)
    yPos += 12
  }
  if (invoice.client.phone) {
    doc.text(`Tel: ${invoice.client.phone}`, 40, yPos)
    yPos += 10
  }
  if (invoice.client.email) {
    doc.text(`Email: ${invoice.client.email}`, 40, yPos)
    yPos += 10
  }
  if (invoice.client.taxId) {
    doc.text(`NINEA/Tax ID: ${invoice.client.taxId}`, 40, yPos)
    yPos += 10
  }

  yPos += 20
  const rows = invoice.items.map((it) => ([
    String(it.quantity),
    it.description,
    `${it.unitPrice.toLocaleString('fr-FR').replace(/\s/g, '\u00A0')} CFA`,
    `${it.totalPrice.toLocaleString('fr-FR').replace(/\s/g, '\u00A0')} CFA`
  ]))

  autoTable(doc, {
    startY: yPos,
    head: [['Qté', 'Description', 'Prix unitaire', 'Montant']],
    body: rows,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 8,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
      textColor: [0, 0, 0],
      valign: 'middle'
    },
    headStyles: {
      fillColor: [54, 69, 79],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 50 },
      1: { halign: 'left', cellWidth: 260, fontStyle: 'bold' },
      2: { halign: 'right', cellWidth: 100 },
      3: { halign: 'right', cellWidth: 100 }
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255]
    }
  })

  yPos = ((doc as any).lastAutoTable?.finalY || 400) + 10

  const totalsData = [
    ['Sous-total HT', `${invoice.subtotal.toLocaleString('fr-FR').replace(/\s/g, '\u00A0')} CFA`],
    [`TVA (${invoice.taxRate.toFixed(0)}%)`, `${invoice.taxAmount.toLocaleString('fr-FR').replace(/\s/g, '\u00A0')} CFA`],
    ['TOTAL TTC', `${invoice.total.toLocaleString('fr-FR').replace(/\s/g, '\u00A0')} CFA`]
  ]

  autoTable(doc, {
    startY: yPos,
    body: totalsData,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 5, textColor: [0,0,0] },
    columnStyles: {
      0: { halign: 'right', cellWidth: 350, fontStyle: 'normal', textColor: [255, 140, 0] },
      1: { halign: 'right', cellWidth: 160, fontStyle: 'bold' }
    },
    didParseCell: function (data: any) {
      if (data.row.index === 2) {
        data.cell.styles.fillColor = [54, 69, 79]
        data.cell.styles.textColor = [255, 255, 255]
        data.cell.styles.fontStyle = 'bold'
      } else {
        if (data.column.index === 0) {
            data.cell.styles.textColor = [255, 140, 0]
        }
      }
    }
  })

  yPos = ((doc as any).lastAutoTable?.finalY || 500) + 30

  doc.setFontSize(10)
  doc.setTextColor(255, 140, 0)
  doc.text('Nous vous remercions de votre confiance.', 40, yPos)

  yPos += 20
  doc.setTextColor(0, 0, 0)

  if (invoice.notes) {
    const notes = (invoice.notes || '').trim()
    if (notes) doc.text(`Notes: ${notes.slice(0, 600)}`, 40, yPos)
    yPos += 15
  }

  if (invoice.paymentMethod || invoice.paymentDate) {
    const line = `Paiement: ${invoice.paymentMethod || ''} ${invoice.paymentDate ? ' — Date: ' + invoice.paymentDate : ''}`
    doc.text(line, 40, yPos)
  }

  const stampX = pageWidth - 200
  const stampY = yPos - 30

  if (invoice.images?.stamp) {
    try {
      doc.addImage(invoice.images.stamp, 'PNG', stampX, stampY, 120, 80)
    } catch (e) {
      doc.saveGraphicsState()
      doc.setGState(new GState({ opacity: 0.8 }))
      doc.setDrawColor(40, 40, 180)
      doc.setLineWidth(2)
      doc.rect(stampX, stampY, 120, 60)
      doc.setTextColor(40, 40, 180)
      doc.setFontSize(8)
      doc.text('IT VISION +', stampX + 60, stampY + 20, { align: 'center', angle: 15 })
      doc.text('COMPTABILITÉ', stampX + 60, stampY + 35, { align: 'center', angle: 15 })
      doc.restoreGraphicsState()
    }
  } else {
    doc.saveGraphicsState()
    doc.setGState(new GState({ opacity: 0.8 }))
    doc.setDrawColor(40, 40, 180)
    doc.setLineWidth(2)
    doc.rect(stampX, stampY, 120, 60)
    doc.setTextColor(40, 40, 180)
    doc.setFontSize(8)
    doc.text('IT VISION +', stampX + 60, stampY + 20, { align: 'center', angle: 15 })
    doc.text('COMPTABILITÉ', stampX + 60, stampY + 35, { align: 'center', angle: 15 })
    doc.restoreGraphicsState()
  }

  doc.setDrawColor(229, 231, 235)
  doc.line(40, pageHeight - 60, pageWidth - 40, pageHeight - 60)
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text('IT Vision Plus • Sécurité électronique & digitalisation des processus', 40, pageHeight - 40)
  doc.text('www.itvisionplus.sn • contact@itvisionplus.sn • +221 77 413 34 40', 40, pageHeight - 24)

  return doc.output('arraybuffer') as unknown as ArrayBuffer
}
