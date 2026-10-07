import crypto from 'crypto'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import mongoose from 'mongoose'
import { brandingImages } from '@/lib/pdf-documents'
import { CORPORATE_BRAND } from '@/lib/branding'
import ArchivedDocument from '@/lib/models/ArchivedDocument'

const NAVY: [number, number, number] = [48, 50, 107]
const ORANGE: [number, number, number] = [255, 140, 0]
const day = (d: unknown) => (d ? new Date(d as string).toLocaleDateString('fr-FR') : '-')
const dateTime = (d: unknown) => (d ? new Date(d as string).toLocaleString('fr-FR', { timeZone: 'Africa/Dakar' }) : '-')

/** PDF du procès-verbal de réception signé (gabarit IT Vision). */
export function renderReceptionPdf(project: any): Buffer {
  const r = project.reception || {}
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const images = brandingImages()
  const company = project.clientSnapshot?.company || project.clientCompanyId?.company || project.clientCompanyId?.name || project.clientSnapshot?.contact || ''

  doc.setFillColor(...NAVY)
  doc.rect(0, 0, W, 80, 'F')
  if (images.logo) { try { doc.addImage(images.logo, 'PNG', 40, 10, 80, 60) } catch {} }
  doc.setTextColor(255, 200, 0).setFont('helvetica', 'bold').setFontSize(18)
  doc.text('PROCÈS-VERBAL DE RÉCEPTION', W - 40, 38, { align: 'right' })
  doc.setTextColor(255, 255, 255).setFont('helvetica', 'normal').setFontSize(10)
  doc.text(`Signé le ${dateTime(r.signedAt)}`, W - 40, 58, { align: 'right' })

  let y = 110
  const label = (t: string, x: number, yy: number) => { doc.setTextColor(...ORANGE).setFont('helvetica', 'bold').setFontSize(10).text(t, x, yy) }
  const text = (t: string, x: number, yy: number, opts: { bold?: boolean; size?: number } = {}) => {
    doc.setTextColor(0, 0, 0).setFont('helvetica', opts.bold ? 'bold' : 'normal').setFontSize(opts.size || 10).text(t, x, yy)
  }

  label('Entreprise', 40, y); label('Client', W / 2, y)
  y += 15
  text(CORPORATE_BRAND.name, 40, y, { bold: true }); text(company || '-', W / 2, y, { bold: true })
  y += 13
  text('RC N° : SN DDER 2019 A 10739 - NINEA 007305734', 40, y, { size: 8 })
  const clientAddr = project.site?.address || project.address || ''
  if (clientAddr) doc.text(doc.splitTextToSize(clientAddr, W / 2 - 40), W / 2, y)
  y += 12
  text(CORPORATE_BRAND.contactEmail, 40, y, { size: 8 })

  y += 30
  label('Projet', 40, y)
  y += 15
  text(String(project.name || ''), 40, y, { bold: true, size: 11 })
  y += 14
  text(`Travaux du ${day(project.startDate)}${project.endDate ? ` au ${day(project.endDate)}` : ''} - Réception demandée le ${day(r.requestedAt)}`, 40, y)

  y += 30
  label('Décision du client', 40, y)
  y += 16
  text(r.decision === 'accepted' ? 'Réception prononcée sans réserve.' : 'Réception prononcée avec les réserves suivantes :', 40, y, { bold: true })
  if (r.decision === 'reserves') {
    const lines = doc.splitTextToSize(String(r.reserves || ''), W - 100)
    y += 10
    doc.setDrawColor(220, 220, 220).rect(40, y, W - 80, lines.length * 12 + 14)
    doc.setFont('helvetica', 'normal').setFontSize(10).text(lines, 50, y + 16)
    y += lines.length * 12 + 14
    if (r.reservesLiftedAt) { y += 16; text(`Réserves levées le ${day(r.reservesLiftedAt)}.`, 40, y, { bold: true }) }
  }
  if (r.warrantyEnd) {
    y += 18
    text(`Garantie de ${r.warrantyMonths || 12} mois, jusqu'au ${day(r.warrantyEnd)}.`, 40, y)
  }

  const products = (project.products || []).filter((p: any) => p?.name)
  if (products.length) {
    autoTable(doc, {
      margin: { left: 40, right: 40 },
      startY: y + 20,
      head: [['Équipement installé', 'Marque / modèle', 'Qté']],
      body: products.map((p: any) => [p.name, [p.brand, p.model].filter(Boolean).join(' '), String(p.quantity ?? '')]),
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 6, lineColor: [200, 200, 200], lineWidth: 0.1, textColor: [0, 0, 0] },
      headStyles: { fillColor: [54, 69, 79], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: { 2: { halign: 'right', cellWidth: 40 } },
    })
    y = (doc as any).lastAutoTable?.finalY || y + 40
  }

  // Bloc signatures : nouvelle page s'il ne tient pas
  if (y + 170 > H - 60) { doc.addPage(); y = 60 } else { y += 30 }
  label('Pour le client', 40, y); label(`Pour ${CORPORATE_BRAND.name}`, W / 2, y)
  y += 15
  text(`${r.signatureName || ''}${r.signatureTitle ? `, ${r.signatureTitle}` : ''}`, 40, y, { bold: true })
  if (r.signature && String(r.signature).startsWith('data:image/png;base64,')) {
    try { doc.addImage(r.signature, 'PNG', 40, y + 8, 180, 70) } catch {}
  }
  if (images.stamp) { try { doc.addImage(images.stamp, 'PNG', W / 2, y + 4, 110, 80) } catch {} }

  doc.setDrawColor(220, 220, 220).line(40, H - 58, W - 40, H - 58)
  doc.setTextColor(120, 120, 120).setFont('helvetica', 'normal').setFontSize(7.5)
  doc.text(doc.splitTextToSize(
    `Document signé électroniquement depuis l'espace client ${CORPORATE_BRAND.name} le ${dateTime(r.signedAt)}` +
    `${r.ip ? ` (adresse IP ${r.ip})` : ''}. Référence projet ${String(project._id)}.`, W - 80), 40, H - 46)

  return Buffer.from(doc.output('arraybuffer') as ArrayBuffer)
}

/** Génère le PDF et le fige en base (une version par événement : signature, levée des réserves). */
export async function archiveReceptionPdf(project: any, reason: 'signature' | 'reserves_levees') {
  const data = renderReceptionPdf(project)
  const sha256 = crypto.createHash('sha256').update(data).digest('hex')
  await ArchivedDocument.create({
    kind: 'reception_pv', refId: new mongoose.Types.ObjectId(String(project._id)),
    filename: receptionPdfFilename(project), data, sha256, size: data.length, reason,
  })
  return { data, sha256 }
}

/** Dernière version archivée du PV ; à défaut (PV antérieur à l'archivage), générée à la volée. */
export async function latestReceptionPdf(project: any): Promise<{ data: Buffer; sha256?: string; archivedAt?: Date }> {
  const archived = await ArchivedDocument.findOne({ kind: 'reception_pv', refId: project._id }).sort({ createdAt: -1 }).lean() as any
  if (archived?.data) {
    const buf = Buffer.isBuffer(archived.data) ? archived.data : Buffer.from(archived.data.buffer || archived.data)
    return { data: buf, sha256: archived.sha256, archivedAt: archived.createdAt }
  }
  return { data: renderReceptionPdf(project) }
}

export function receptionPdfFilename(project: any) {
  const safe = String(project.name || 'projet').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.-]+/g, '_').slice(0, 60)
  return `PV-reception-${safe}.pdf`
}
