import pdfParse from 'pdf-parse'
import * as XLSX from 'xlsx'

export interface ExtractedInvoice {
  numero?: string
  date?: string
  dueDate?: string
  client: {
    name?: string
    company?: string
    address?: string
    phone?: string
    email?: string
    taxId?: string
  }
  items: Array<{
    description: string
    quantity: number
    unitPrice: number
    totalPrice: number
    category?: string
  }>
  subtotal?: number
  taxRate?: number
  taxAmount?: number
  total?: number
  notes?: string
  terms?: string
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer)
  return data.text || ''
}

function parseAmount(str: string): number {
  if (!str) return 0
  const cleaned = String(str)
    .replace(/\s/g, '')
    .replace(/,/g, '.')
    .replace(/[^\d.]/g, '')
  const val = parseFloat(cleaned)
  return isNaN(val) ? 0 : val
}

function extractAmount(line: string): number | undefined {
  const match = line.match(/(\d[\d\s.,]+)(?:\s*(?:CFA|fcfa|XOF|€|\$))?/)
  if (match) return parseAmount(match[1])
  return undefined
}

function extractAfterColon(line: string): string | undefined {
  const match = line.match(/[:\-]\s*(.+)/)
  return match ? match[1].trim() : undefined
}

function extractPhone(line: string): string | undefined {
  const match = line.match(/(\+?221[\s\-\d]+|7[78]\d[\s\-\d]{6,})/)
  return match ? match[1].replace(/\s/g, ' ').trim() : undefined
}

function extractEmail(line: string): string | undefined {
  const match = line.match(/([\w.-]+@[\w.-]+\.\w{2,})/)
  return match ? match[1] : undefined
}

function looksLikeAddress(line: string): boolean {
  return /\b(Dakar|Mermoz|Almadies|Ouakam|Nord Foire|Cité|Avenue|Route|Boulevard|BP\.?\s*\d+|Sénégal|Senegal)\b/i.test(line)
}

function isNumeric(str: string): boolean {
  return /^[\d\s.,]+$/.test(str)
}

function normalizeDate(str: string): string | null {
  const months: Record<string, number> = {
    janvier: 1, février: 2, fevrier: 2, mars: 3, avril: 4, mai: 5, juin: 6,
    juillet: 7, aout: 8, août: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12, décembre: 12
  }

  const textMatch = str.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/)
  if (textMatch) {
    const m = months[textMatch[2].toLowerCase()]
    if (m) {
      return `${textMatch[3]}-${String(m).padStart(2, '0')}-${String(textMatch[1]).padStart(2, '0')}`
    }
  }

  const numMatch = str.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/)
  if (numMatch) {
    let y = parseInt(numMatch[3])
    if (y < 100) y += 2000
    return `${y}-${String(numMatch[2]).padStart(2, '0')}-${String(numMatch[1]).padStart(2, '0')}`
  }

  return null
}

function detectCategory(text: string): string {
  const t = text.toLowerCase()
  if (/caméra|camera|dvr|nvr|enregistreur|vidéo|videosurveillance|hikvision|dahua/.test(t)) return 'products'
  if (/alarme|détecteur|incendie|extincteur|sprinkler/.test(t)) return 'products'
  if (/switch|routeur|câble|réseau|connecteur|borne|wifi|poe/.test(t)) return 'products'
  if (/installation|câblage|montage|pose|raccordement|maintenance|dépannage|intervention|forfait|service|prestation|heure|journée|technicien|étude|visite|déplacement/.test(t)) return 'services'
  return 'products'
}

// ── Excel extraction ─────────────────────────────────
export function extractInvoiceFromExcel(buffer: Buffer): ExtractedInvoice {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  const invoice: ExtractedInvoice = { client: {}, items: [] }

  let inProductTable = false
  let productCols: Record<string, number> = {}

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i].map((c: any) => String(c || '').trim())
    const line = row.join(' ')
    const lower = line.toLowerCase()

    // Numéro facture
    const numMatch = line.match(/Facture\s*[#N°]?\s*([A-Z0-9\-]+)/i) ||
                     line.match(/Invoice\s*#?\s*([A-Z0-9\-]+)/i) ||
                     line.match(/N°\s*([0-9\-A-Z]+)/i)
    if (numMatch && !invoice.numero) invoice.numero = numMatch[1]

    // Date
    const dateMatch = line.match(/Date\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i) ||
                      line.match(/(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4})/)
    if (dateMatch && !invoice.date) {
      const d = normalizeDate(dateMatch[1])
      if (d) invoice.date = d
    }

    // Due date / échéance
    const dueMatch = line.match(/[ée]ch[eé]ance\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i) ||
                     line.match(/due\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i)
    if (dueMatch && !invoice.dueDate) {
      const d = normalizeDate(dueMatch[1])
      if (d) invoice.dueDate = d
    }

    // Client
    if (lower.match(/client|destinataire|à l'attention|facturer à|bill to/)) {
      const nextRows = rows.slice(i + 1, i + 8)
      for (const nr of nextRows) {
        const nrl = nr.join(' ').toLowerCase()
        const nrs = nr.join(' ').trim()
        if (nrl.includes('société') || nrl.includes('company') || nrl.includes('entreprise')) {
          invoice.client.company = extractAfterColon(nrs) || nrs
        } else if (nrl.includes('adresse') || looksLikeAddress(nrs)) {
          invoice.client.address = nrs
        } else if (nrl.match(/\+?221[\s\-]?[7-8]\d/) || nrl.includes('tél') || nrl.includes('phone')) {
          invoice.client.phone = extractPhone(nrs)
        } else if (nrl.match(/@/)) {
          invoice.client.email = extractEmail(nrs)
        } else if (nrl.includes('ninea') || nrl.includes('tax') || nrl.includes('rc')) {
          invoice.client.taxId = extractAfterColon(nrs)
        } else if (!invoice.client.name && nrs.length > 2 && !isNumeric(nrs)) {
          invoice.client.name = nrs
        }
      }
    }

    // Détection table produits
    const qtyIdx = row.findIndex((c: string) => /quantit[eé]|qty|qte/i.test(c))
    const descIdx = row.findIndex((c: string) => /description|d[eé]signation|article|libell[eé]|item/i.test(c))
    const puIdx = row.findIndex((c: string) => /unit|p\.u|prix unit|pu |unitaire|price/i.test(c))
    const totalIdx = row.findIndex((c: string) => /montant|total|prix total|amount/i.test(c))

    if (qtyIdx >= 0 && descIdx >= 0) {
      inProductTable = true
      productCols = { qty: qtyIdx, desc: descIdx, pu: puIdx >= 0 ? puIdx : -1, total: totalIdx >= 0 ? totalIdx : -1 }
      continue
    }

    if (inProductTable) {
      const qtyStr = row[productCols.qty] || ''
      const descStr = row[productCols.desc] || ''
      const qty = parseFloat(qtyStr.replace(/,/g, '.'))
      const pu = productCols.pu >= 0 ? parseAmount(row[productCols.pu]) : 0
      const total = productCols.total >= 0 ? parseAmount(row[productCols.total]) : 0

      if (descStr && (qty > 0 || pu > 0 || total > 0)) {
        invoice.items.push({
          description: descStr,
          quantity: qty || 1,
          unitPrice: pu || (total / (qty || 1)),
          totalPrice: total || (pu * (qty || 1)),
          category: detectCategory(descStr)
        })
      }

      if (lower.includes('sous-total') || lower.includes('subtotal') || lower.includes('total') || lower.includes('tva') || lower.includes('tax')) {
        inProductTable = false
      }
    }

    // Totaux
    if ((lower.includes('sous-total') || lower.includes('sous total') || lower.includes('subtotal')) && !invoice.subtotal) {
      invoice.subtotal = extractAmount(line)
    }
    if ((lower.includes('tva') || lower.includes('taxe') || lower.includes('vat')) && !invoice.taxAmount) {
      invoice.taxAmount = extractAmount(line)
    }
    if ((lower.includes('total') && (lower.includes('ttc') || lower.includes('général') || lower.includes('final') || lower.includes('net') || lower.includes('amount due'))) && !invoice.total) {
      invoice.total = extractAmount(line)
    }

    // Notes / terms
    if (lower.includes('condition') || lower.includes('note') || lower.includes('observation') || lower.includes('terme') || lower.includes('paiement')) {
      const noteText = row.slice(1).join(' ').trim()
      if (noteText) {
        if (lower.includes('condition') || lower.includes('terme')) {
          invoice.terms = (invoice.terms ? invoice.terms + '\n' : '') + noteText
        } else {
          invoice.notes = (invoice.notes ? invoice.notes + '\n' : '') + noteText
        }
      }
    }
  }

  // Recalc
  if (!invoice.subtotal && invoice.items.length > 0) {
    invoice.subtotal = invoice.items.reduce((s, p) => s + p.totalPrice, 0)
  }
  if (!invoice.taxRate && invoice.subtotal && invoice.taxAmount) {
    invoice.taxRate = Math.round((invoice.taxAmount / invoice.subtotal) * 100)
  }
  if (!invoice.taxRate) invoice.taxRate = 18
  if (!invoice.taxAmount && invoice.subtotal) {
    invoice.taxAmount = invoice.subtotal * (invoice.taxRate / 100)
  }
  if (!invoice.total && invoice.subtotal !== undefined) {
    invoice.total = invoice.subtotal + (invoice.taxAmount || 0)
  }
  if (!invoice.dueDate && invoice.date) {
    const d = new Date(invoice.date)
    d.setDate(d.getDate() + 30)
    invoice.dueDate = d.toISOString().split('T')[0]
  }

  return invoice
}

// ── Text parser (from PDF) ─────────────────────────────
export function parseInvoiceFromText(text: string): ExtractedInvoice {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const invoice: ExtractedInvoice = { client: {}, items: [] }
  const fullText = text

  // Numéro
  const numMatch = fullText.match(/Facture\s*[#N°]?\s*([A-Z0-9\-]+)/i) ||
                   fullText.match(/Invoice\s*#?\s*([A-Z0-9\-]+)/i) ||
                   fullText.match(/N°\s*facture\s*[:\-]?\s*([0-9\-A-Z]+)/i)
  if (numMatch) invoice.numero = numMatch[1]

  // Date
  const dateMatch = fullText.match(/Date\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i) ||
                    fullText.match(/(\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4})/i)
  if (dateMatch) {
    const d = normalizeDate(dateMatch[1])
    if (d) invoice.date = d
  }

  // Due date
  const dueMatch = fullText.match(/[ée]ch[eé]ance\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i) ||
                   fullText.match(/Due\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i)
  if (dueMatch) {
    const d = normalizeDate(dueMatch[1])
    if (d) invoice.dueDate = d
  }

  // --- Client ---
  const clientBlock = extractClientBlock(lines)
  invoice.client = clientBlock

  // --- Items ---
  invoice.items = extractItemsFromLines(lines)

  // --- Totaux ---
  for (const line of lines) {
    const lower = line.toLowerCase()
    if ((lower.includes('sous-total') || lower.includes('sous total') || lower.includes('subtotal')) && !invoice.subtotal) {
      invoice.subtotal = extractAmount(line)
    }
    if ((lower.includes('tva') || lower.includes('taxe') || lower.includes('vat') || lower.includes('tax ')) && !invoice.taxAmount && !lower.includes('sans')) {
      invoice.taxAmount = extractAmount(line)
    }
    if ((lower.includes('total') && (lower.includes('ttc') || lower.includes('général') || lower.includes('final') || lower.includes('net') || lower.includes('amount due'))) && !invoice.total) {
      invoice.total = extractAmount(line)
    }
    if ((lower.includes('condition') || lower.includes('terme') || lower.includes('note') || lower.includes('observation') || lower.includes('paiement')) && !invoice.notes) {
      const noteText = line.replace(/[^:]+[:\-]\s*/, '').trim()
      if (noteText.length > 5) invoice.notes = noteText
    }
  }

  // Recalc
  if (!invoice.subtotal && invoice.items.length > 0) {
    invoice.subtotal = invoice.items.reduce((s, p) => s + p.totalPrice, 0)
  }
  if (!invoice.taxRate && invoice.subtotal && invoice.taxAmount) {
    invoice.taxRate = Math.round((invoice.taxAmount / invoice.subtotal) * 100)
  }
  if (!invoice.taxRate) invoice.taxRate = 18
  if (!invoice.taxAmount && invoice.subtotal) {
    invoice.taxAmount = invoice.subtotal * (invoice.taxRate / 100)
  }
  if (!invoice.total && invoice.subtotal !== undefined) {
    invoice.total = invoice.subtotal + (invoice.taxAmount || 0)
  }
  if (!invoice.dueDate && invoice.date) {
    const d = new Date(invoice.date)
    d.setDate(d.getDate() + 30)
    invoice.dueDate = d.toISOString().split('T')[0]
  }

  return invoice
}

// ── Helpers ────────────────────────────────────────────

function extractClientBlock(lines: string[]) {
  const client: ExtractedInvoice['client'] = {}
  let inClientSection = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lower = line.toLowerCase()

    if (lower.match(/client|destinataire|à l'attention|facturer à|bill to/)) {
      inClientSection = true
      const nameMatch = line.match(/[:\-]\s*(.+)/)
      if (nameMatch && nameMatch[1].length > 2) client.name = nameMatch[1].trim()
      continue
    }

    if (inClientSection) {
      if (lower.match(/description|quantité|désignation|sous-total|montant|total|item/)) {
        inClientSection = false
        continue
      }

      if (lower.includes('société') || lower.includes('company') || lower.includes('entreprise')) {
        client.company = extractAfterColon(line) || line
      } else if (lower.includes('adresse') || looksLikeAddress(line)) {
        client.address = extractAfterColon(line) || line
      } else if (line.match(/\+?221[\s\-]?[7-8]\d/) || lower.includes('tél') || lower.includes('phone')) {
        client.phone = extractPhone(line)
      } else if (line.includes('@') || lower.includes('email') || lower.includes('e-mail')) {
        client.email = extractEmail(line)
      } else if (lower.includes('ninea') || lower.includes('tax') || lower.includes('rc')) {
        client.taxId = extractAfterColon(line)
      } else if (!client.name && line.length > 2 && !isNumeric(line) && !line.includes(':') && !line.includes('-')) {
        client.name = line
      }
    }
  }

  return client
}

function extractItemsFromLines(lines: string[]): ExtractedInvoice['items'] {
  const items: ExtractedInvoice['items'] = []
  let inTable = false
  let headerFound = false

  for (const line of lines) {
    const lower = line.toLowerCase()

    if (!headerFound &&
        (lower.match(/quantité.*description.*prix|qty.*desc.*price|n°.*désignation.*montant/) ||
         (lower.includes('quantité') && lower.includes('description')))) {
      headerFound = true
      inTable = true
      continue
    }

    if (inTable) {
      const productMatch = line.match(
        /^(?:\d+\.?\s*)?(.+?)\s+(\d+(?:[\s.,]\d{3})*)\s+(\d+(?:[\s.,]\d{3})*)\s+(\d+(?:[\s.,]\d{3})*)\s*$/
      )

      if (productMatch) {
        const desc = productMatch[1].trim()
        const qty = parseInt(productMatch[2].replace(/[\s.,]/g, '')) || 1
        const pu = parseInt(productMatch[3].replace(/[\s.,]/g, '')) || 0
        const total = parseInt(productMatch[4].replace(/[\s.,]/g, '')) || 0
        if (desc.length > 2) {
          items.push({
            description: desc,
            quantity: qty,
            unitPrice: pu,
            totalPrice: total || (pu * qty),
            category: detectCategory(desc)
          })
        }
        continue
      }

      const simpleMatch = line.match(
        /(\d+)\s*[x×]\s*(.+?)\s*[@à]\s*(\d[\d\s.,]+)\s*(?:CFA|fcfa|=)\s*(\d[\d\s.,]+)?/
      )
      if (simpleMatch) {
        items.push({
          description: simpleMatch[2].trim(),
          quantity: parseInt(simpleMatch[1]) || 1,
          unitPrice: parseAmount(simpleMatch[3]),
          totalPrice: parseAmount(simpleMatch[4] || '0') || parseAmount(simpleMatch[3]) * (parseInt(simpleMatch[1]) || 1),
          category: detectCategory(simpleMatch[2])
        })
        continue
      }

      const parts = line.split(/\s{3,}/).map(s => s.trim()).filter(Boolean)
      if (parts.length >= 3) {
        const last = parts[parts.length - 1]
        const prev = parts[parts.length - 2]
        const qty = parseInt(parts[0])
        if (!isNaN(qty) && qty > 0 && qty < 10000) {
          const desc = parts.slice(1, parts.length - 2).join(' ') || parts[1]
          const puVal = parseAmount(prev)
          const totalVal = parseAmount(last)
          if (desc && desc.length > 2 && (puVal > 0 || totalVal > 0)) {
            items.push({
              description: desc,
              quantity: qty,
              unitPrice: puVal || (totalVal / qty),
              totalPrice: totalVal || (puVal * qty),
              category: detectCategory(desc)
            })
            continue
          }
        }
      }

      if (lower.includes('sous-total') || lower.includes('subtotal') || lower.includes('total') || lower.includes('tva')) {
        inTable = false
      }
    }
  }

  return items
}
