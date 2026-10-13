import fs from 'fs'
import path from 'path'
import { generateITVisionInvoicePdf, generateITVisionQuotePdf } from '@/lib/pdf'
import { companyBankDetails, bankDetailsLines } from '@/lib/finance/bank-details'

const imageCache = new Map<string, string | undefined>()

// Images de marque lues une fois par processus (format data URI attendu par jsPDF)
function loadImageDataUri(relativePath: string): string | undefined {
  if (imageCache.has(relativePath)) return imageCache.get(relativePath)
  let uri: string | undefined
  try {
    const fullPath = path.join(process.cwd(), relativePath)
    if (fs.existsSync(fullPath)) uri = `data:image/png;base64,${fs.readFileSync(fullPath).toString('base64')}`
  } catch (e) {
    console.error(`[pdf-documents] image ${relativePath} illisible`, e)
  }
  imageCache.set(relativePath, uri)
  return uri
}

export function brandingImages() {
  return {
    logo: loadImageDataUri('public/images/logo-it-vision.png'),
    stamp: loadImageDataUri('public/images/cachetitv.png'),
  }
}

const iso = (d: unknown) => (d ? new Date(d as string).toISOString() : '')
const num = (v: unknown) => Number(v) || 0

/** PDF d'un devis à partir du document AdminQuote stocké. */
export function renderQuotePdf(quote: any): Buffer {
  const pdf = generateITVisionQuotePdf({
    numero: quote.numero,
    title: quote.title,
    date: iso(quote.date || quote.createdAt),
    client: {
      name: quote.client?.company || quote.client?.name || '',
      address: quote.client?.address || '',
      phone: quote.client?.phone || '',
      email: quote.client?.email || '',
      rcn: quote.client?.rcn,
      ninea: quote.client?.ninea,
    },
    products: (quote.products || []).map((p: any) => ({
      description: p.description || '',
      quantity: num(p.quantity),
      unitPrice: num(p.unitPrice),
      taxable: !!p.taxable,
      total: num(p.total),
    })),
    subtotal: num(quote.subtotal),
    brsAmount: num(quote.brsAmount),
    taxAmount: num(quote.taxAmount),
    other: num(quote.other),
    total: num(quote.total),
    notes: quote.notes,
    bonCommande: quote.bonCommande,
    dateLivraison: quote.dateLivraison || '',
    pointExpedition: quote.pointExpedition || '',
    conditions: quote.conditions || '',
    images: brandingImages(),
  })
  return Buffer.from(pdf)
}

/** PDF d'une facture à partir du document AdminInvoice stocké. */
export function renderInvoicePdf(invoice: any): Buffer {
  const pdf = generateITVisionInvoicePdf({
    numero: invoice.numero,
    date: iso(invoice.date || invoice.createdAt),
    dueDate: invoice.dueDate ? iso(invoice.dueDate) : undefined,
    client: {
      name: invoice.client?.name || '',
      company: invoice.client?.company || '',
      address: [invoice.client?.address, invoice.client?.city].filter(Boolean).join(', '),
      phone: invoice.client?.phone || '',
      email: invoice.client?.email || '',
      taxId: invoice.client?.taxId,
    },
    items: (invoice.items || []).map((it: any) => ({
      description: it.description || '',
      quantity: num(it.quantity),
      unitPrice: num(it.unitPrice),
      totalPrice: num(it.totalPrice),
    })),
    subtotal: num(invoice.subtotal),
    taxRate: Number(invoice.taxRate ?? 0),
    taxAmount: num(invoice.taxAmount),
    brsAmount: num(invoice.brsAmount),
    total: num(invoice.total),
    notes: invoice.notes,
    terms: invoice.terms,
    paymentMethod: invoice.paymentMethod,
    paymentDate: invoice.paymentDate,
    bankLines: invoiceBankLines(invoice),
    images: brandingImages(),
  })
  return Buffer.from(pdf)
}

// Facture restant à régler : coordonnées de virement avec le numéro de facture comme libellé
function invoiceBankLines(invoice: any): string[] | undefined {
  if (['paid', 'cancelled'].includes(invoice.status)) return undefined
  const bank = companyBankDetails()
  return bank ? bankDetailsLines(bank, invoice.numero) : undefined
}

/** PDF d'un avoir (gabarit facture, titre « AVOIR », montants à déduire). */
export function renderCreditNotePdf(creditNote: any): Buffer {
  const pdf = generateITVisionInvoicePdf({
    documentTitle: 'AVOIR',
    numero: creditNote.numero,
    date: iso(creditNote.date || creditNote.createdAt),
    client: {
      name: creditNote.client?.name || '',
      company: creditNote.client?.company || '',
      address: creditNote.client?.address || '',
      phone: creditNote.client?.phone || '',
      email: creditNote.client?.email || '',
      taxId: creditNote.client?.taxId,
    },
    items: (creditNote.items || []).map((it: any) => ({
      description: it.description || '',
      quantity: num(it.quantity),
      unitPrice: num(it.unitPrice),
      totalPrice: num(it.totalPrice),
    })),
    subtotal: num(creditNote.subtotal),
    taxRate: num(creditNote.subtotal) > 0 ? Math.round((num(creditNote.taxAmount) / num(creditNote.subtotal)) * 100) : 0,
    taxAmount: num(creditNote.taxAmount),
    brsAmount: num(creditNote.brsAmount),
    total: num(creditNote.total),
    notes: `Avoir sur la facture ${creditNote.invoiceNumero}. Motif : ${creditNote.reason}` +
      (num(creditNote.refundAmount) > 0 ? ` — Montant à rembourser : ${num(creditNote.refundAmount).toLocaleString('fr-FR')} FCFA` : ''),
    images: brandingImages(),
  })
  return Buffer.from(pdf)
}

/** En-têtes de réponse PDF ; nom de fichier limité à des caractères sûrs. */
export function pdfResponseHeaders(prefix: string, numero: string, inline: boolean) {
  const safe = String(numero || 'document').replace(/[^\w.-]/g, '_')
  return {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${prefix}-${safe}.pdf"`,
    'Cache-Control': 'private, no-store',
  }
}
