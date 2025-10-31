import jsPDF from 'jspdf'
import 'jspdf-autotable'

export function generateDiagnosticPdf(payload: any): Uint8Array {
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

  // @ts-ignore
  doc.autoTable({ startY: 130, head: [['Champ', 'Valeur']], body: lines, styles: { cellPadding: 6, fontSize: 10 } })

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setDrawColor(229, 231, 235)
  doc.line(40, pageHeight - 60, 555, pageHeight - 60)
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text('IT Vision Plus • Sécurité électronique & digitalisation des processus', 40, pageHeight - 40)
  doc.text('www.itvisionplus.sn • contact@itvisionplus.sn • +221 77 413 34 40', 40, pageHeight - 24)

  return doc.output('arraybuffer') as unknown as Uint8Array
}

export function generateQuotePdf(quote: {
  id: string
  client: { company: string; contact: string; email: string; phone: string }
  sections: Array<{ name: string; items: Array<{ name: string; quantity: number; unitPrice: number; totalPrice: number }> }>
  totals: { subtotalHT: number; taxAmount: number; totalTTC: number }
}): Uint8Array {
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
  // @ts-ignore
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
  doc.setFont(undefined, 'bold')
  doc.text(`Total TTC: ${quote.totals.totalTTC.toLocaleString('fr-FR')} FCFA`, 360, y + 66)

  return doc.output('arraybuffer') as unknown as Uint8Array
}
