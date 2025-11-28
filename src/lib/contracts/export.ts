import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx'

export type ContractExportData = {
  contractNumber?: string
  name: string
  type: string
  status: string
  client: {
    name: string
    company?: string
    address?: string
    email?: string
    phone?: string
    contactPerson?: string
  }
  project?: {
    name?: string
    address?: string
  }
  startDate?: string
  endDate?: string
  paymentTerms?: string
  coverage?: {
    responseTime?: string
    supportHours?: string
    interventionsIncluded?: number
  }
  services?: Array<{ name: string; description?: string; frequency?: string }>
  equipment?: Array<{ type: string; quantity: number; location?: string }>
  preferredTechnicians?: Array<{
    _id: string
    name: string
    email?: string
    phone?: string
  }>
  notes?: string
}

const formatDate = (value?: string) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR')
}

export function generateMaintenanceContractPdf(contract: ContractExportData): ArrayBuffer {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const title = contract.contractNumber || contract.name

  doc.setFillColor(16, 185, 129)
  doc.rect(0, 0, 595, 70, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.text(`Contrat ${title}`, 40, 40)
  doc.setFontSize(11)
  doc.text(`Service ${contract.type.toUpperCase()}`, 40, 58)

  doc.setTextColor(33, 33, 33)
  doc.setFontSize(13)
  doc.text('Informations client', 40, 110)
  doc.setFontSize(10)
  const clientInfo = [
    ['Client', contract.client.company || contract.client.name],
    ['Contact', contract.client.contactPerson || contract.client.name],
    ['Adresse', contract.client.address || '—'],
    ['Téléphone', contract.client.phone || '—'],
    ['Email', contract.client.email || '—'],
    ['Projet', contract.project?.name || '—'],
    ['Site', contract.project?.address || '—']
  ]
  // @ts-expect-error autotable
  doc.autoTable({
    startY: 125,
    head: [['Champ', 'Valeur']],
    body: clientInfo,
    styles: { cellPadding: 6, fontSize: 10 }
  })

  const datesY = (doc as any).lastAutoTable?.finalY || 210
  doc.setFontSize(13)
  doc.text('Durée & SLA', 40, datesY + 30)
  doc.setFontSize(10)
  const durationRows = [
    ['Date de début', formatDate(contract.startDate)],
    ['Date de fin', formatDate(contract.endDate)],
    ['Délai intervention', contract.coverage?.responseTime || '—'],
    ['Support', contract.coverage?.supportHours || '—'],
    [
      'Interventions incluses',
      contract.coverage?.interventionsIncluded?.toString() || '—'
    ],
    ['Modalités de paiement', contract.paymentTerms || '—']
  ]
  // @ts-expect-error autotable
  doc.autoTable({
    startY: datesY + 45,
    head: [['Champ', 'Valeur']],
    body: durationRows,
    styles: { cellPadding: 6, fontSize: 10 }
  })

  const servicesY = (doc as any).lastAutoTable?.finalY || 340
  if (contract.services?.length) {
    doc.setFontSize(13)
    doc.text('Services inclus', 40, servicesY + 30)
    const serviceRows = contract.services.map((service) => [
      service.name,
      service.frequency || '',
      service.description || ''
    ])
    // @ts-expect-error autotable
    doc.autoTable({
      startY: servicesY + 45,
      head: [['Service', 'Fréquence', 'Description']],
      body: serviceRows,
      styles: { cellPadding: 6, fontSize: 9 }
    })
  }

  let equipmentY = (doc as any).lastAutoTable?.finalY || 360
  if (contract.equipment?.length) {
    doc.setFontSize(13)
    doc.text('Équipements couverts', 40, equipmentY + 30)
    const equipmentRows = contract.equipment.map((equipment) => [
      equipment.type,
      equipment.quantity.toString(),
      equipment.location || '—'
    ])
    // @ts-expect-error autotable
    doc.autoTable({
      startY: equipmentY + 45,
      head: [['Équipement', 'Qté', 'Site']],
      body: equipmentRows,
      styles: { cellPadding: 6, fontSize: 9 }
    })
    equipmentY = (doc as any).lastAutoTable?.finalY || equipmentY + 60
  }

  if (contract.preferredTechnicians?.length) {
    const techY = (doc as any).lastAutoTable?.finalY || equipmentY + 30
    doc.setFontSize(13)
    doc.text('Techniciens attitrés', 40, techY + 30)
    const techRows = contract.preferredTechnicians.map((tech) => [
      tech.name,
      tech.email || '—',
      tech.phone || '—'
    ])
    // @ts-expect-error autotable
    doc.autoTable({
      startY: techY + 45,
      head: [['Nom', 'Email', 'Téléphone']],
      body: techRows,
      styles: { cellPadding: 6, fontSize: 9 }
    })
    equipmentY = (doc as any).lastAutoTable?.finalY || techY + 60
  }

  if (contract.notes) {
    const notesY = equipmentY + 30
    doc.setFontSize(12)
    doc.text('Clauses', 40, notesY)
    doc.setFontSize(9)
    const text = doc.splitTextToSize(contract.notes, 515)
    doc.text(text, 40, notesY + 15)
  }

  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setDrawColor(229, 231, 235)
  doc.line(40, pageHeight - 60, 555, pageHeight - 60)
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text('IT Vision Plus • Maintenance & intégration', 40, pageHeight - 40)
  doc.text('www.itvisionplus.sn • contact@itvisionplus.sn • +221 77 413 34 40', 40, pageHeight - 24)

  return doc.output('arraybuffer') as unknown as ArrayBuffer
}

const paragraph = (text: string, bold = false) =>
  new Paragraph({
    children: [new TextRun({ text, bold })],
    spacing: { after: 120 }
  })

export async function generateMaintenanceContractDocx(contract: ContractExportData): Promise<ArrayBuffer> {
  const sections: Paragraph[] = []
  sections.push(
    new Paragraph({
      text: `Contrat ${contract.contractNumber || contract.name}`,
      heading: HeadingLevel.TITLE
    }),
    paragraph(`Client : ${contract.client.company || contract.client.name}`),
    paragraph(`Contact : ${contract.client.contactPerson || contract.client.name}`),
    paragraph(`Adresse : ${contract.client.address || '—'}`),
    paragraph(`Téléphone : ${contract.client.phone || '—'}`),
    paragraph(`Email : ${contract.client.email || '—'}`),
    paragraph(`Projet couvert : ${contract.project?.name || '—'}`)
  )

  sections.push(
    paragraph(
      `Période : du ${formatDate(contract.startDate)} au ${formatDate(contract.endDate)}`
    ),
    paragraph(`SLA : ${contract.coverage?.responseTime || '—'} / Support ${contract.coverage?.supportHours || '—'}`),
    paragraph(`Interventions incluses : ${contract.coverage?.interventionsIncluded || '—'}`),
    paragraph(`Modalités de paiement : ${contract.paymentTerms || '—'}`)
  )

  if (contract.services?.length) {
    sections.push(paragraph('Services inclus', true))
    contract.services.forEach((service) => {
      sections.push(
        paragraph(`• ${service.name} (${service.frequency || 'fréquence non précisée'}) – ${service.description || ''}`)
      )
    })
  }

  if (contract.equipment?.length) {
    sections.push(paragraph('Équipements couverts', true))
    contract.equipment.forEach((equipment) => {
      sections.push(
        paragraph(
          `• ${equipment.type} – Qté ${equipment.quantity} (${equipment.location || 'Site principal'})`
        )
      )
    })
  }

  if (contract.preferredTechnicians?.length) {
    sections.push(paragraph('Techniciens attitrés', true))
    contract.preferredTechnicians.forEach((tech) => {
      sections.push(
        paragraph(
          `• ${tech.name}${tech.email ? ` – ${tech.email}` : ''}${tech.phone ? ` – ${tech.phone}` : ''}`
        )
      )
    })
  }

  if (contract.notes) {
    sections.push(paragraph('Clauses & obligations', true))
    sections.push(paragraph(contract.notes))
  }

  sections.push(
    paragraph('Fait à Dakar, le _____________________'),
    paragraph('Le Prestataire _____________________'),
    paragraph('Le Client _____________________')
  )

  const doc = new Document({
    sections: [
      {
        children: sections
      }
    ]
  })

  const nodeBuffer = await Packer.toBuffer(doc)
  const arrayBuffer = new ArrayBuffer(nodeBuffer.byteLength)
  new Uint8Array(arrayBuffer).set(nodeBuffer)
  return arrayBuffer
}

