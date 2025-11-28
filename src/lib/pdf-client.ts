/**
 * Génération PDF côté client avec jsPDF
 * Pour les devis du portail client
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface QuoteProduct {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

interface Quote {
  numero: string
  date: string
  client?: {
    name?: string
    company?: string
    address?: string
    email?: string
  }
  products: QuoteProduct[]
  subtotal: number
  total: number
  brsAmount?: number
  taxAmount?: number
  type?: string
}

export function generateQuotePDF(quote: Quote) {
  const doc = new jsPDF()
  
  // Logo et En-tête IT Vision
  doc.setFillColor(16, 185, 129) // emerald-500
  doc.rect(0, 0, 210, 40, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('IT VISION', 20, 20)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Solutions Numériques & Infrastructure IT', 20, 28)
  doc.text('Dakar, Sénégal | contact@itvision.sn | +221 33 XXX XX XX', 20, 34)
  
  // Titre DEVIS
  doc.setFillColor(249, 115, 22) // orange-500
  doc.rect(150, 10, 45, 15, 'F')
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('DEVIS', 157, 20)
  
  // Numéro et date
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`N° ${quote.numero}`, 157, 27)
  doc.text(`Date: ${new Date(quote.date).toLocaleDateString('fr-FR')}`, 157, 32)
  
  // Informations client
  let yPos = 50
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('CLIENT', 20, yPos)
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  yPos += 6
  
  if (quote.client) {
    if (quote.client.company) {
      doc.setFont('helvetica', 'bold')
      doc.text(quote.client.company, 20, yPos)
      yPos += 5
      doc.setFont('helvetica', 'normal')
    }
    if (quote.client.name) {
      doc.text(quote.client.name, 20, yPos)
      yPos += 5
    }
    if (quote.client.address) {
      doc.text(quote.client.address, 20, yPos)
      yPos += 5
    }
    if (quote.client.email) {
      doc.text(quote.client.email, 20, yPos)
      yPos += 5
    }
  }
  
  // Tableau des produits
  yPos += 10
  
  const tableData = quote.products.map(p => [
    p.quantity.toString(),
    p.description,
    `${p.unitPrice.toLocaleString('fr-FR')} FCFA`,
    `${p.total.toLocaleString('fr-FR')} FCFA`
  ])
  
  autoTable(doc, {
    startY: yPos,
    head: [['Qté', 'Description', 'Prix Unitaire', 'Montant']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [16, 185, 129],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10
    },
    styles: {
      fontSize: 9,
      cellPadding: 4
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' },
      1: { cellWidth: 90 },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' }
    }
  })
  
  // Totaux
  const finalY = (doc as any).lastAutoTable.finalY || yPos + 50
  const totalsX = 130
  let totalsY = finalY + 10
  
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  
  // Sous-total
  doc.text('Sous-total HT:', totalsX, totalsY)
  doc.text(`${quote.subtotal.toLocaleString('fr-FR')} FCFA`, 185, totalsY, { align: 'right' })
  totalsY += 7
  
  // BRS ou TVA
  if (quote.brsAmount !== undefined && quote.brsAmount > 0) {
    doc.setTextColor(249, 115, 22) // orange
    doc.text('BRS (5%):', totalsX, totalsY)
    doc.text(`-${quote.brsAmount.toLocaleString('fr-FR')} FCFA`, 185, totalsY, { align: 'right' })
    doc.setTextColor(0, 0, 0)
    totalsY += 7
  } else if (quote.taxAmount !== undefined && quote.taxAmount > 0) {
    doc.text('TVA (18%):', totalsX, totalsY)
    doc.text(`${quote.taxAmount.toLocaleString('fr-FR')} FCFA`, 185, totalsY, { align: 'right' })
    totalsY += 7
  }
  
  // Total
  doc.setFillColor(16, 185, 129)
  doc.rect(totalsX - 5, totalsY - 5, 70, 10, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('TOTAL:', totalsX, totalsY)
  doc.text(`${quote.total.toLocaleString('fr-FR')} FCFA`, 185, totalsY, { align: 'right' })
  
  // Conditions
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  totalsY += 15
  
  if (totalsY > 250) {
    doc.addPage()
    totalsY = 20
  }
  
  doc.setFont('helvetica', 'bold')
  doc.text('Conditions:', 20, totalsY)
  doc.setFont('helvetica', 'normal')
  totalsY += 5
  doc.text('• Devis valable 30 jours', 20, totalsY)
  totalsY += 4
  doc.text('• Paiement: 50% à la commande, 50% à la livraison', 20, totalsY)
  totalsY += 4
  doc.text('• Délai de livraison: selon produits commandés', 20, totalsY)
  
  // Footer
  const pageHeight = doc.internal.pageSize.height
  doc.setFontSize(8)
  doc.setTextColor(128, 128, 128)
  doc.text('IT Vision - Solutions Numériques & Infrastructure IT', 105, pageHeight - 15, { align: 'center' })
  doc.text('Merci de votre confiance', 105, pageHeight - 10, { align: 'center' })
  
  // Télécharger
  doc.save(`Devis-${quote.numero}-IT-Vision.pdf`)
}

export function generateInvoicePDF(invoice: any) {
  // Similar logic for invoices
  // À implémenter si nécessaire
  console.log('Invoice PDF generation:', invoice)
}





