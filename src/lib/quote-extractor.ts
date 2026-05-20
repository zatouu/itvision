import pdfParse from 'pdf-parse'
import * as XLSX from 'xlsx'

// ── Types ──────────────────────────────────────────────
export interface ExtractedQuote {
  numero?: string
  date?: string
  title?: string
  client: {
    name?: string
    address?: string
    phone?: string
    email?: string
    rcn?: string
    ninea?: string
  }
  products: Array<{
    description: string
    quantity: number
    unitPrice: number
    total: number
    isLabor?: boolean
  }>
  subtotal?: number
  brsAmount?: number
  taxAmount?: number
  other?: number
  total?: number
  notes?: string
  cci?: string
  companyAddress?: string
}

// ── PDF text extraction ────────────────────────────────
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer)
  return data.text || ''
}

// ── Excel extraction ─────────────────────────────────
export function extractFromExcel(buffer: Buffer): ExtractedQuote {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' })

  const quote: ExtractedQuote = {
    client: {},
    products: []
  }

  let inProductTable = false
  let productCols: Record<string, number> = {}

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i].map((c: any) => String(c || '').trim())
    const line = row.join(' ')
    const lower = line.toLowerCase()

    // Numéro de devis
    const numMatch = line.match(/Devis\s*[#N°]?\s*([A-Z0-9\-]+)/i) ||
                     line.match(/Quote\s*#?\s*([A-Z0-9\-]+)/i) ||
                     line.match(/N°\s*([0-9\-A-Z]+)/i)
    if (numMatch && !quote.numero) quote.numero = numMatch[1]

    // Date
    const dateMatch = line.match(/Date\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i) ||
                      line.match(/(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4})/)
    if (dateMatch && !quote.date) {
      const d = normalizeDate(dateMatch[1])
      if (d) quote.date = d
    }

    // Titre / objet
    const titleMatch = line.match(/Objet\s*[:\-]?\s*(.+)/i) ||
                       line.match(/Titre\s*[:\-]?\s*(.+)/i) ||
                       line.match(/Projet\s*[:\-]?\s*(.+)/i)
    if (titleMatch && !quote.title) quote.title = titleMatch[1].trim()

    // Client
    if (lower.includes('client') || lower.includes('à l\'attention') || lower.includes('destinataire')) {
      const nextRows = rows.slice(i + 1, i + 8)
      for (const nr of nextRows) {
        const nrl = nr.join(' ').toLowerCase()
        const nrs = nr.join(' ').trim()
        if (nrl.includes('adresse') || looksLikeAddress(nrs)) quote.client.address = nrs
        else if (nrl.match(/\+?221[\s\-]?[7-8]\d/)) quote.client.phone = extractPhone(nrs)
        else if (nrl.match(/@/)) quote.client.email = extractEmail(nrs)
        else if (nrl.includes('ninea')) quote.client.ninea = extractAfterColon(nrs)
        else if (nrl.includes('rc') || nrl.includes('sn dder')) quote.client.rcn = extractAfterColon(nrs)
        else if (!quote.client.name && nrs.length > 2 && !isNumeric(nrs)) quote.client.name = nrs
      }
    }

    // Détection table produits
    const headerIdx = row.findIndex((c: string) => /quantit[eé]|qty|qte/i.test(c))
    const descIdx = row.findIndex((c: string) => /description|d[eé]signation|article|libell[eé]/i.test(c))
    const puIdx = row.findIndex((c: string) => /unit|p\.u|prix unit|pu |unitaire/i.test(c))
    const totalIdx = row.findIndex((c: string) => /montant|total|prix total|amount/i.test(c))

    if (headerIdx >= 0 && descIdx >= 0) {
      inProductTable = true
      productCols = { qty: headerIdx, desc: descIdx, pu: puIdx >= 0 ? puIdx : -1, total: totalIdx >= 0 ? totalIdx : -1 }
      continue
    }

    if (inProductTable) {
      const qtyStr = row[productCols.qty] || ''
      const descStr = row[productCols.desc] || ''
      const qty = parseFloat(qtyStr.replace(/,/g, '.'))
      const pu = productCols.pu >= 0 ? parseAmount(row[productCols.pu]) : 0
      const total = productCols.total >= 0 ? parseAmount(row[productCols.total]) : 0

      if (descStr && (qty > 0 || pu > 0 || total > 0)) {
        quote.products.push({
          description: descStr,
          quantity: qty || 1,
          unitPrice: pu || (total / (qty || 1)),
          total: total || (pu * (qty || 1)),
          isLabor: detectLabor(descStr)
        })
      }

      // Fin de table
      if (lower.includes('sous-total') || lower.includes('subtotal') || lower.includes('total général') || lower.includes('brs')) {
        inProductTable = false
      }
    }

    // Totaux
    if (lower.includes('sous-total') || lower.includes('sous total')) {
      quote.subtotal = extractAmount(line)
    }
    if (lower.includes('brs') && !lower.includes('après')) {
      quote.brsAmount = extractAmount(line)
    }
    if ((lower.includes('taxe') || lower.includes('tva')) && !lower.includes('sans')) {
      quote.taxAmount = extractAmount(line)
    }
    if (lower.includes('total') && (lower.includes('ttc') || lower.includes('général') || lower.includes('final'))) {
      quote.total = extractAmount(line)
    }
    if (lower.includes('autres frais') || lower.includes('frais divers')) {
      quote.other = extractAmount(line)
    }

    // Notes
    if (lower.includes('condition') || lower.includes('note') || lower.includes('observation')) {
      const noteText = row.slice(1).join(' ').trim()
      if (noteText) quote.notes = (quote.notes ? quote.notes + '\n' : '') + noteText
    }
  }

  // Recalc si manquant
  if (!quote.subtotal && quote.products.length > 0) {
    quote.subtotal = quote.products.reduce((s, p) => s + p.total, 0)
  }
  if (!quote.total && quote.subtotal !== undefined) {
    quote.total = quote.subtotal - (quote.brsAmount || 0) + (quote.taxAmount || 0) + (quote.other || 0)
  }

  return quote
}

// ── Text parser (from PDF) ─────────────────────────────
export function parseQuoteFromText(text: string): ExtractedQuote {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  const quote: ExtractedQuote = { client: {}, products: [] }

  // --- Métadonnées ---
  const fullText = text

  // Numéro
  const numMatch = fullText.match(/Devis\s*[#N°]?\s*([A-Z0-9\-]+)/i) ||
                   fullText.match(/Quote\s*#?\s*([A-Z0-9\-]+)/i) ||
                   fullText.match(/N°\s*devis\s*[:\-]?\s*([0-9\-A-Z]+)/i)
  if (numMatch) quote.numero = numMatch[1]

  // Date
  const dateMatch = fullText.match(/Date\s*[:\-]?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i) ||
                    fullText.match(/(\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4})/i)
  if (dateMatch) {
    const d = normalizeDate(dateMatch[1])
    if (d) quote.date = d
  }

  // Titre
  const titleMatch = fullText.match(/Objet\s*[:\-]?\s*([^.\n]+)/i) ||
                     fullText.match(/Titre\s*[:\-]?\s*([^.\n]+)/i) ||
                     fullText.match(/Projet\s*[:\-]?\s*([^.\n]+)/i)
  if (titleMatch) quote.title = titleMatch[1].trim()

  // --- Client ---
  const clientBlock = extractClientBlock(lines)
  quote.client = clientBlock

  // --- Produits (table detection) ---
  quote.products = extractProductsFromLines(lines)

  // --- Totaux ---
  for (const line of lines) {
    const lower = line.toLowerCase()
    if ((lower.includes('sous-total') || lower.includes('sous total')) && !quote.subtotal) {
      quote.subtotal = extractAmount(line)
    }
    if (lower.includes('brs') && !quote.brsAmount && !lower.includes('après')) {
      quote.brsAmount = extractAmount(line)
    }
    if ((lower.includes('taxe') || lower.includes('tva')) && !quote.taxAmount && !lower.includes('sans')) {
      quote.taxAmount = extractAmount(line)
    }
    if ((lower.includes('total') && (lower.includes('ttc') || lower.includes('général') || lower.includes('final') || lower.includes('net')))
        && !quote.total) {
      quote.total = extractAmount(line)
    }
    if ((lower.includes('autres frais') || lower.includes('frais divers') || lower.includes('autres')) && !quote.other) {
      quote.other = extractAmount(line)
    }
    if ((lower.includes('condition') || lower.includes('note') || lower.includes('observation') || lower.includes('paiement')) && !quote.notes) {
      const noteText = line.replace(/[^:]+[:\-]\s*/, '').trim()
      if (noteText.length > 5) quote.notes = noteText
    }
  }

  // Recalc
  if (!quote.subtotal && quote.products.length > 0) {
    quote.subtotal = quote.products.reduce((s, p) => s + p.total, 0)
  }
  if (!quote.total && quote.subtotal !== undefined) {
    quote.total = quote.subtotal - (quote.brsAmount || 0) + (quote.taxAmount || 0) + (quote.other || 0)
  }

  return quote
}

// ── Helpers ────────────────────────────────────────────

function extractClientBlock(lines: string[]) {
  const client: ExtractedQuote['client'] = {}
  let inClientSection = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lower = line.toLowerCase()

    if (lower.match(/client|destinataire|à l'attention|facturer à/)) {
      inClientSection = true
      // Essayer de capturer le nom sur la même ligne
      const nameMatch = line.match(/[:\-]\s*(.+)/)
      if (nameMatch && nameMatch[1].length > 2) client.name = nameMatch[1].trim()
      continue
    }

    if (inClientSection) {
      // Stop si on tombe sur une section produit ou total
      if (lower.match(/description|quantité|désignation|sous-total|montant|total/)) {
        inClientSection = false
        continue
      }

      if (lower.includes('adresse') || looksLikeAddress(line)) {
        client.address = extractAfterColon(line) || line
      } else if (line.match(/\+?221[\s\-]?[7-8]\d/) || lower.includes('tél') || lower.includes('phone')) {
        client.phone = extractPhone(line)
      } else if (line.includes('@') || lower.includes('email') || lower.includes('e-mail')) {
        client.email = extractEmail(line)
      } else if (lower.includes('ninea') || lower.includes('ninea')) {
        client.ninea = extractAfterColon(line)
      } else if (lower.includes('rc') || lower.includes('sn dder') || lower.includes('registre')) {
        client.rcn = extractAfterColon(line)
      } else if (!client.name && line.length > 2 && !isNumeric(line) && !line.includes(':') && !line.includes('-')) {
        // Nom probable
        client.name = line
      }
    }
  }

  return client
}

function extractProductsFromLines(lines: string[]): ExtractedQuote['products'] {
  const products: ExtractedQuote['products'] = []
  let inTable = false
  let headerFound = false

  for (const line of lines) {
    const lower = line.toLowerCase()

    // Détection en-tête table
    if (!headerFound &&
        (lower.match(/quantité.*description.*prix|qty.*desc.*price|n°.*désignation.*montant/) ||
         (lower.includes('quantité') && lower.includes('description')))) {
      headerFound = true
      inTable = true
      continue
    }

    // Détection ligne produit
    if (inTable) {
      // --- Pattern 1 : numéro + description + 3 colonnes (qty, pu, total) ---
      const productMatch3 = line.match(
        /^(?:\d+\.?\s*)?(.+?)\s+(\d[\d\s.,]*)\s+(\d[\d\s.,]*)\s+(\d[\d\s.,]*)\s*(?:CFA|fcfa|XOF|F\s*CFA)?\s*$/i
      )

      if (productMatch3) {
        const desc = productMatch3[1].trim()
        const qty = parseQty(productMatch3[2])
        const pu = parseAmount(productMatch3[3])
        const total = parseAmount(productMatch3[4])
        if (desc.length > 2 && qty > 0) {
          products.push({
            description: desc,
            quantity: qty,
            unitPrice: pu,
            total: total || (pu * qty),
            isLabor: detectLabor(desc)
          })
        }
        continue
      }

      // --- Pattern 2 : numéro + description + 2 colonnes (qty, total) ---
      const productMatch2 = line.match(
        /^(?:\d+\.?\s*)?(.+?)\s+(\d[\d\s.,]*)\s+(\d[\d\s.,]*)\s*(?:CFA|fcfa|XOF|F\s*CFA)?\s*$/i
      )

      if (productMatch2) {
        const desc = productMatch2[1].trim()
        const qty = parseQty(productMatch2[2])
        const total = parseAmount(productMatch2[3])
        if (desc.length > 2 && qty > 0 && total > 0) {
          products.push({
            description: desc,
            quantity: qty,
            unitPrice: total / qty,
            total: total,
            isLabor: detectLabor(desc)
          })
        }
        continue
      }

      // --- Pattern 3 : "2 x Caméra IP @ 45 000 = 90 000 CFA" ---
      const simpleMatch = line.match(
        /(\d[\d\s.,]*)\s*[x×]\s*(.+?)\s*[@à]\s*(\d[\d\s.,]+)\s*(?:CFA|fcfa|XOF|F\s*CFA|=)\s*(\d[\d\s.,]+)?/i
      )
      if (simpleMatch) {
        const qty = parseQty(simpleMatch[1])
        products.push({
          description: simpleMatch[2].trim(),
          quantity: qty || 1,
          unitPrice: parseAmount(simpleMatch[3]),
          total: parseAmount(simpleMatch[4] || '0') || parseAmount(simpleMatch[3]) * (qty || 1),
          isLabor: detectLabor(simpleMatch[2])
        })
        continue
      }

      // --- Pattern 4 : split par espaces multiples / tabulations ---
      const parts = line.split(/\s{2,}/).map(s => s.trim()).filter(Boolean)
      if (parts.length >= 3) {
        const last = parts[parts.length - 1]
        const prev = parts[parts.length - 2]
        const first = parts[0]
        const qty = parseQty(first)
        if (!isNaN(qty) && qty > 0 && qty < 50000) {
          // Cas 3 colonnes
          const desc = parts.slice(1, parts.length - 2).join(' ') || parts[1]
          const puVal = parseAmount(prev)
          const totalVal = parseAmount(last)
          if (desc && desc.length > 2 && (puVal > 0 || totalVal > 0)) {
            products.push({
              description: desc,
              quantity: qty,
              unitPrice: puVal || (totalVal / qty),
              total: totalVal || (puVal * qty),
              isLabor: detectLabor(desc)
            })
            continue
          }
          // Cas 2 colonnes
          const desc2 = parts.slice(1, parts.length - 1).join(' ') || parts[1]
          const totalVal2 = parseAmount(last)
          if (desc2 && desc2.length > 2 && totalVal2 > 0) {
            products.push({
              description: desc2,
              quantity: qty,
              unitPrice: totalVal2 / qty,
              total: totalVal2,
              isLabor: detectLabor(desc2)
            })
            continue
          }
        }
      }

      // --- Pattern 5 : ligne avec description et montant total seul ---
      const descAmountMatch = line.match(/^(.{3,}?)\s+(\d[\d\s.,]+)\s*(?:CFA|fcfa|XOF|F\s*CFA)?\s*$/i)
      if (descAmountMatch) {
        const desc = descAmountMatch[1].trim()
        const total = parseAmount(descAmountMatch[2])
        if (desc.length > 3 && total > 1000 && !/^(sous.?total|total|tva|taxe|montant)/i.test(desc)) {
          products.push({
            description: desc,
            quantity: 1,
            unitPrice: total,
            total: total,
            isLabor: detectLabor(desc)
          })
          continue
        }
      }

      // Fin de table
      if (lower.includes('sous-total') || lower.includes('subtotal') || lower.includes('total')) {
        inTable = false
      }
    }
  }

  return products
}

function parseQty(str: string): number {
  if (!str) return 0
  const cleaned = String(str).trim().replace(/\s/g, '').replace(',', '.')
  const val = parseFloat(cleaned)
  return isNaN(val) || val < 0 ? 0 : val
}

function parseAmount(str: string): number {
  if (!str) return 0
  const cleaned = String(str).replace(/[^\d.,]/g, '')
  if (!cleaned) return 0

  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')
  const lastSep = Math.max(lastComma, lastDot)

  if (lastSep > 0) {
    const afterSep = cleaned.length - lastSep - 1
    if (afterSep > 0 && afterSep <= 2) {
      const intPart = cleaned.slice(0, lastSep).replace(/[.,]/g, '')
      const decPart = cleaned.slice(lastSep + 1)
      const val = parseFloat(intPart + '.' + decPart)
      return isNaN(val) ? 0 : val
    }
  }

  const val = parseInt(cleaned.replace(/[.,]/g, ''), 10)
  return isNaN(val) ? 0 : val
}

function extractAmount(line: string): number | undefined {
  const match = line.match(/(\d[\d\s.,]*\d)(?:\s*(?:CFA|fcfa|XOF|F\s*CFA|€|\$|USD|EURO|euro)?)/i)
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

  // Format texte: "15 mai 2026"
  const textMatch = str.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/)
  if (textMatch) {
    const m = months[textMatch[2].toLowerCase()]
    if (m) {
      return `${textMatch[3]}-${String(m).padStart(2, '0')}-${String(textMatch[1]).padStart(2, '0')}`
    }
  }

  // Format numérique
  const numMatch = str.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/)
  if (numMatch) {
    let y = parseInt(numMatch[3])
    if (y < 100) y += 2000
    return `${y}-${String(numMatch[2]).padStart(2, '0')}-${String(numMatch[1]).padStart(2, '0')}`
  }

  return null
}

const LABOR_KEYWORDS = [
  'installation', 'main-d\u0153uvre', 'main d\u0153uvre', 'main-doeuvre', 'main doeuvre',
  'pose', 'c\u00e2blage', 'cablage', 'montage', 'configuration', 'mise en place',
  'raccordement', 'maintenance', 'd\u00e9pannage', 'depannage', 'intervention',
  'forfait', 'service', 'prestation', 'heure', 'heures', 'journ\u00e9e', 'jour',
  'technicien', 'ing\u00e9nieur', '\u00e9tude', 'etude', 'visite', 'd\u00e9placement',
  'deplacement', 'd\u00e9montage', 'demontage', 'r\u00e9glage', 'reglage',
  'programmation', 'formation', 'support', 'assistance', 'audit', 'conseil'
]

function detectLabor(text: string): boolean {
  const t = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return LABOR_KEYWORDS.some(k => t.includes(k))
}
