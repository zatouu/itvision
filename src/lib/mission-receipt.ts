import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export type MissionReceiptData = {
  reference: string
  category: string
  location?: string
  clientName?: string
  providerName?: string
  completedAt?: string | Date | null
  validatedAt?: string | Date | null
  earnings: {
    grossAmountFcfa: number
    platformFeeFcfa?: number
    bonusFcfa?: number
    netAmountFcfa: number
  }
  paymentLabel: string
}

const fmt = (n: number) => `${Number(n).toLocaleString('fr-FR')} FCFA`
const fmtDate = (d?: string | Date | null) => (d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—')

/**
 * Génère le reçu PDF d'une mission terminée.
 * Les montants proviennent exclusivement du ledger/mission backend —
 * aucune recomputation n'est faite ici.
 */
export function generateMissionReceiptPdf(data: MissionReceiptData): ArrayBuffer {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()

  // Header
  doc.setFillColor(15, 123, 79)
  doc.rect(0, 0, pageWidth, 80, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('XEUY', 40, 38)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text('Reçu de mission', 40, 58)

  let y = 110
  doc.setTextColor(10, 22, 40)

  // Référence
  doc.setFontSize(10)
  doc.setTextColor(107, 114, 128)
  doc.text('RÉFÉRENCE', 40, y)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(10, 22, 40)
  doc.text(data.reference, 40, y + 18)
  doc.setFont('helvetica', 'normal')

  // Informations mission
  autoTable(doc, {
    startY: y + 40,
    head: [['Champ', 'Valeur']],
    body: [
      ['Service', data.category || '—'],
      ['Lieu', data.location || '—'],
      ['Client', data.clientName || '—'],
      ['Prestataire', data.providerName || '—'],
      ['Terminée le', fmtDate(data.completedAt)],
      ['Validée par le client le', fmtDate(data.validatedAt)],
    ],
    styles: { cellPadding: 6, fontSize: 10 },
    headStyles: { fillColor: [15, 123, 79] },
    margin: { left: 40, right: 40 },
  })

  // Détail des gains — reflète exactement le ledger
  const earnRows: string[][] = [["Main d'œuvre", fmt(data.earnings.grossAmountFcfa)]]
  if (typeof data.earnings.platformFeeFcfa === 'number' && data.earnings.platformFeeFcfa > 0) {
    earnRows.push(['Commission plateforme', `-${fmt(data.earnings.platformFeeFcfa)}`])
  }
  if (typeof data.earnings.bonusFcfa === 'number' && data.earnings.bonusFcfa > 0) {
    earnRows.push(['Bonus rapidité', `+${fmt(data.earnings.bonusFcfa)}`])
  }
  earnRows.push(['Total crédité', fmt(data.earnings.netAmountFcfa)])

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 24,
    head: [['Détail des gains', 'Montant']],
    body: earnRows,
    styles: { cellPadding: 6, fontSize: 10 },
    headStyles: { fillColor: [15, 123, 79] },
    margin: { left: 40, right: 40 },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.row.index === earnRows.length - 1) {
        hookData.cell.styles.fontStyle = 'bold'
        hookData.cell.styles.textColor = [15, 123, 79]
      }
    },
  })

  // Statut paiement
  const payY = (doc as any).lastAutoTable.finalY + 30
  doc.setFontSize(11)
  doc.setTextColor(107, 114, 128)
  doc.text('Paiement :', 40, payY)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(10, 22, 40)
  doc.text(data.paymentLabel, 100, payY)
  doc.setFont('helvetica', 'normal')

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setDrawColor(229, 231, 235)
  doc.line(40, pageHeight - 50, pageWidth - 40, pageHeight - 50)
  doc.setFontSize(9)
  doc.setTextColor(148, 163, 184)
  doc.text(`Document généré le ${fmtDate(new Date())} — Xeuy`, 40, pageHeight - 34)

  return doc.output('arraybuffer')
}
