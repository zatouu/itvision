import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx'

export type ContractSiteEquipment = { type: string; quantity: number }
export type ContractSite = {
  name: string
  address?: string
  equipment: ContractSiteEquipment[]
  annualAmount?: number
}

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
  pricing?: {
    annualAmount?: number
    frequency?: string
    currency?: string
  }
  coverage?: {
    responseTime?: string
    supportHours?: string
    interventionsIncluded?: number
  }
  services?: Array<{ name: string; description?: string; frequency?: string }>
  equipment?: Array<{ type: string; quantity: number; location?: string }>
  sites?: ContractSite[]
  preferredTechnicians?: Array<{
    _id: string
    name: string
    email?: string
    phone?: string
  }>
  notes?: string
}

const PROVIDER = {
  name: 'ITVISION+',
  address: 'Cité Lonase villa n°11, Nord Foire — Dakar, Sénégal',
  rc: 'SN.DKR.2019.A.10579',
  ninea: '007305734',
  representative: 'CHEIKHOU OUMAR NDIAYE',
  repTitle: 'Gérant',
}

const formatDate = (value?: string) => {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR')
}

const formatAmount = (value?: number) => {
  if (!value) return '—'
  return `${value.toLocaleString('fr-FR')} FCFA`
}

const FREQ_LABELS: Record<string, string> = {
  monthly: 'mensuel', quarterly: 'trimestriel', annual: 'annuel',
}

/** Sites enrichis : les sites explicites, sinon regroupés par location, sinon « Site principal ». */
function resolvedSites(contract: ContractExportData): ContractSite[] {
  if (contract.sites?.length) return contract.sites
  const equipment = contract.equipment || []
  const byLocation = new Map<string, ContractSiteEquipment[]>()
  for (const e of equipment) {
    const key = e.location || ''
    if (!byLocation.has(key)) byLocation.set(key, [])
    byLocation.get(key)!.push({ type: e.type, quantity: e.quantity })
  }
  if (byLocation.size <= 1 && equipment.length) {
    return [{ name: contract.project?.name || 'Site principal', address: contract.project?.address || contract.client.address, equipment: equipment.map(e => ({ type: e.type, quantity: e.quantity })) }]
  }
  return [...byLocation.entries()].map(([name, eq]) => ({
    name: name || 'Site principal',
    equipment: eq,
  }))
}

const ARTICLES = [
  {
    title: 'Article 5 — Obligations du Prestataire',
    body: `Le Prestataire reconnaît que le Client lui a donné une information complète sur ses besoins et sur les impératifs à respecter.
Il s'engage à se conformer au règlement intérieur et aux consignes de sécurité applicables chez le Client.
Enfin, il s'engage à observer la confidentialité la plus totale en ce qui concerne le contenu de la mission et toutes les informations ainsi que tous les documents que le Client lui aura communiqués.`,
  },
  {
    title: 'Article 6 — Obligations du Client',
    body: `Afin de permettre au Prestataire de réaliser la mission dans de bonnes conditions, le Client s'engage à lui remettre tous les détails nécessaires dans les meilleurs délais. En outre, il est tenu de laisser les collaborateurs du Prestataire accéder aux locaux où se trouve le système.
Enfin, il est tenu de veiller à ce que les installations électriques et le matériel soient conformes aux normes de sécurité afin que le Prestataire ne risque pas d'être victime d'un accident.
NB : il est possible que les interventions se fassent aux heures de travail.`,
  },
  {
    title: 'Article 7 — Responsabilité',
    body: `La responsabilité du Prestataire ne pourra pas être mise en cause dans les cas suivants :
• En cas de non-respect par le Client des obligations qui lui incombent ;
• En cas de perte ou de destruction des fichiers du Client qui ne résulterait pas d'une défaillance du Prestataire dans l'exécution de sa mission ;
• En cas de pertes de données ou d'interruptions de service causées par des facteurs externes ;
• En cas de force majeure ou d'autres causes indépendantes de sa volonté.`,
  },
  {
    title: 'Article 8 — Droit applicable et juridiction compétente',
    body: `Le présent contrat est assujetti au droit sénégalais. Tout litige qui résulterait de son exécution sera soumis aux tribunaux dont dépend le siège social du Prestataire.`,
  },
]

function preambleText(contract: ContractExportData): string[] {
  const client = contract.client
  return [
    `Entre les soussignés :`,
    `${PROVIDER.name}, sise à la ${PROVIDER.address.replace('—', ',')}, RC Nº : ${PROVIDER.rc} – NINEA ${PROVIDER.ninea} DAKAR,`,
    `représentée par ${PROVIDER.representative}, en sa qualité de ${PROVIDER.repTitle},`,
    `ci-après désignée « le Prestataire »,`,
    `d'une part,`,
    `Et :`,
    `${client.company || client.name}${client.address ? ` — ${client.address}` : ''}${client.contactPerson ? `, représentée par ${client.contactPerson}` : ''},`,
    `ci-après désignée « le Client »,`,
    `d'autre part,`,
    `il a été arrêté et convenu ce qui suit :`,
  ]
}

function articleOneText(contract: ContractExportData, sites: ContractSite[]): string[] {
  const lines = [
    'En vertu du présent contrat, le Prestataire s\'engage à fournir au Client la maintenance du système de vidéosurveillance (caméras, enregistreur, switch PoE, connectiques, câblage) situé dans les locaux du Client aux adresses suivantes :',
  ]
  for (const site of sites) {
    lines.push(`• ${site.name}${site.address ? ` : ${site.address}` : ''}`)
  }
  lines.push('Le Prestataire fournira les services suivants :')
  if (contract.services?.length) {
    for (const s of contract.services) {
      lines.push(`• ${s.name}${s.frequency ? ` (${s.frequency})` : ''}${s.description ? ` — ${s.description}` : ''}`)
    }
  } else {
    lines.push(
      '• Maintenance préventive et entretien général du système tous les deux mois.',
      '• Délivrance d\'une fiche d\'intervention et d\'un rapport après chaque intervention.',
      '• Un contrôle de l\'absence de risque de panne ou de destruction.',
      '• Intervention en cas d\'urgence.'
    )
  }
  return lines
}

function articleTwoText(contract: ContractExportData): string[] {
  const responseTime = contract.coverage?.responseTime || '24 heures ouvrées'
  return [
    `Intervention préventive : tous les deux mois, le Prestataire effectue une maintenance préventive sur chaque site.`,
    `Intervention corrective : en cas de panne signalée par le Client, le Prestataire s'engage à intervenir dans un délai maximum de ${responseTime}.`,
    `Intervention d'urgence :`,
    `• Niveau 1 (panne mineure) : intervention sous 24 heures ouvrées.`,
    `• Niveau 2 (panne majeure) : intervention sous 6 heures ouvrées.`,
    `• Niveau 3 (situation critique) : intervention sous 3 heures ouvrées.`,
    `Joignable 7j/7 de 7h à 22h.`,
  ]
}

function articleThreeText(contract: ContractExportData): string[] {
  const amount = contract.pricing?.annualAmount
  const freq = FREQ_LABELS[contract.pricing?.frequency || ''] || 'annuel'
  const lines = [
    `Le Client s'engage à payer au Prestataire un montant ${freq} de ${formatAmount(amount)}${amount ? ` (${amount.toLocaleString('fr-FR')} FCFA)` : ''} pour l'ensemble des sites couverts.`,
    `Ce prix reste inchangé en cas de modification de l'installation.`,
  ]
  lines.push(`Modalités de paiement : ${contract.paymentTerms || '50 % à la signature du contrat ; le solde après 6 mois de service.'}`)
  return lines
}

function articleFourText(contract: ContractExportData): string[] {
  return [
    `La durée pour laquelle le présent contrat est conclu est fixée à 12 mois à compter du jour de sa signature par les deux parties${contract.startDate ? ` (du ${formatDate(contract.startDate)} au ${formatDate(contract.endDate)})` : ''}.`,
    `Le contrat est renouvelable automatiquement, sauf avis contraire notifié 30 jours avant la date butoir.`,
  ]
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

export function generateMaintenanceContractPdf(contract: ContractExportData): ArrayBuffer {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const sites = resolvedSites(contract)
  const title = contract.name || 'Maintenance vidéosurveillance'

  const footer = () => {
    const pageHeight = doc.internal.pageSize.getHeight()
    doc.setDrawColor(229, 231, 235)
    doc.line(40, pageHeight - 55, 555, pageHeight - 55)
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text('IT Vision Plus • Maintenance & intégration', 40, pageHeight - 38)
    doc.text('www.itvisionplus.sn • contact@itvisionplus.sn • +221 77 413 34 40', 40, pageHeight - 24)
    doc.setTextColor(33, 33, 33)
  }

  // En-tête
  doc.setFillColor(16, 185, 129)
  doc.rect(0, 0, 595, 70, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.text(`Contrat de maintenance — ${title}`, 40, 40)
  doc.setFontSize(10)
  doc.text(`${contract.contractNumber || ''}  ${contract.client.company || contract.client.name}`, 40, 58)
  doc.setTextColor(33, 33, 33)

  let y = 95
  const para = (text: string | string[], size = 9.5, bold = false, gapAfter = 6) => {
    const lines = Array.isArray(text) ? text : [text]
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(size)
    for (const l of lines) {
      const wrapped = doc.splitTextToSize(l, 515)
      for (const w of wrapped) {
        if (y > doc.internal.pageSize.getHeight() - 80) { footer(); doc.addPage(); y = 60 }
        doc.text(w, 40, y)
        y += 12
      }
    }
    y += gapAfter
  }
  const heading = (text: string) => para(text, 11.5, true, 4)
  const bulletPara = (lines: string[]) => para(lines, 9.5, false, 8)

  para('CONTRAT DE MAINTENANCE DE SYSTÈME DE VIDÉOSURVEILLANCE', 12, true, 10)
  para(preambleText(contract), 9.5, false, 10)

  // Article 1 — objet + équipements par site
  heading('Article 1 — Objet de la prestation')
  bulletPara(articleOneText(contract, sites))

  for (const site of sites) {
    if (y > doc.internal.pageSize.getHeight() - 160) { footer(); doc.addPage(); y = 60 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(site.name.toUpperCase(), 40, y)
    y += 8
    para(`Il est rappelé que le système de vidéosurveillance installé dans les locaux de ${site.name} comprend les appareils suivants :`, 9)
    // @ts-expect-error autotable
    doc.autoTable({
      startY: y,
      head: [["Nature de l'appareil", 'Marque / Modèle', 'Quantité']],
      body: site.equipment.map(e => {
        const parts = String(e.type).split(' — ')
        return [parts[0], parts[1] || '—', String(e.quantity)]
      }),
      styles: { cellPadding: 5, fontSize: 9 },
      headStyles: { fillColor: [16, 185, 129] },
      margin: { left: 40, right: 40 },
    })
    y = ((doc as any).lastAutoTable?.finalY || y + 40) + 14
    if (site.annualAmount) para(`Montant ${site.name} : ${formatAmount(site.annualAmount)} / an`, 9.5, true, 8)
  }

  heading('Article 2 — Délais d’intervention')
  bulletPara(articleTwoText(contract))

  heading('Article 3 — Prix et modalités de paiement')
  bulletPara(articleThreeText(contract))

  heading('Article 4 — Durée du contrat')
  bulletPara(articleFourText(contract))

  for (const art of ARTICLES) {
    heading(art.title)
    para(art.body, 9.5, false, 8)
  }

  if (contract.notes) {
    heading('Conditions particulières')
    para(contract.notes, 9.5, false, 8)
  }

  // Signatures
  if (y > doc.internal.pageSize.getHeight() - 160) { footer(); doc.addPage(); y = 60 }
  para(`Fait à Dakar, le _____________________`, 10, false, 14)
  doc.setFontSize(10)
  doc.text('Le Prestataire', 60, y)
  doc.text('Le Client', 380, y)
  y += 12
  doc.setFontSize(9)
  doc.text(`${PROVIDER.representative}`, 60, y)
  doc.text(`${contract.client.contactPerson || contract.client.company || contract.client.name}`, 380, y)

  footer()
  return doc.output('arraybuffer') as unknown as ArrayBuffer
}

// ---------------------------------------------------------------------------
// DOCX
// ---------------------------------------------------------------------------

const paragraph = (text: string, bold = false) =>
  new Paragraph({
    children: [new TextRun({ text, bold })],
    spacing: { after: 120 }
  })

const heading2 = (text: string) =>
  new Paragraph({
    children: [new TextRun({ text, bold: true })],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 120 }
  })

const equipmentTable = (site: ContractSite) =>
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: ["Nature de l'appareil", 'Marque / Modèle', 'Quantité'].map(
          h => new TableCell({ children: [paragraph(h, true)] })
        ),
      }),
      ...site.equipment.map(e => {
        const parts = String(e.type).split(' — ')
        return new TableRow({
          children: [parts[0], parts[1] || '—', String(e.quantity)].map(
            cell => new TableCell({ children: [paragraph(cell)] })
          ),
        })
      }),
    ],
  })

export async function generateMaintenanceContractDocx(contract: ContractExportData): Promise<ArrayBuffer> {
  const sites = resolvedSites(contract)
  const children: Array<Paragraph | Table> = []

  children.push(
    new Paragraph({
      children: [new TextRun({ text: `CONTRAT DE MAINTENANCE — ${contract.name || 'VIDÉOSURVEILLANCE'}`, bold: true })],
      heading: HeadingLevel.TITLE,
      spacing: { after: 300 },
    }),
    paragraph(`Référence : ${contract.contractNumber || '—'}`),
  )

  children.push(...preambleText(contract).map(l => paragraph(l)))

  children.push(heading2('Article 1 — Objet de la prestation'))
  for (const l of articleOneText(contract, sites)) children.push(paragraph(l))

  for (const site of sites) {
    children.push(paragraph(site.name.toUpperCase(), true))
    children.push(paragraph(`Il est rappelé que le système de vidéosurveillance installé dans les locaux de ${site.name} comprend les appareils suivants :`))
    children.push(equipmentTable(site))
    children.push(new Paragraph({ spacing: { after: 200 }, children: [] }))
    if (site.annualAmount) children.push(paragraph(`Montant ${site.name} : ${formatAmount(site.annualAmount)} / an`, true))
  }

  children.push(heading2('Article 2 — Délais d’intervention'))
  for (const l of articleTwoText(contract)) children.push(paragraph(l))

  children.push(heading2('Article 3 — Prix et modalités de paiement'))
  for (const l of articleThreeText(contract)) children.push(paragraph(l))

  children.push(heading2('Article 4 — Durée du contrat'))
  for (const l of articleFourText(contract)) children.push(paragraph(l))

  for (const art of ARTICLES) {
    children.push(heading2(art.title))
    for (const line of art.body.split('\n')) children.push(paragraph(line))
  }

  if (contract.notes) {
    children.push(heading2('Conditions particulières'))
    for (const line of contract.notes.split('\n')) children.push(paragraph(line))
  }

  children.push(
    new Paragraph({ spacing: { before: 300 }, children: [] }),
    paragraph('Fait à Dakar, le _____________________'),
    paragraph('Le Prestataire : _____________________'),
    paragraph(`(${PROVIDER.representative}, ${PROVIDER.repTitle} — ${PROVIDER.name})`),
    paragraph('Le Client : _____________________'),
    paragraph(`(${contract.client.contactPerson || contract.client.company || contract.client.name})`),
  )

  const doc = new Document({
    sections: [{ children }],
  })

  const buffer = await Packer.toBuffer(doc)
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
}
