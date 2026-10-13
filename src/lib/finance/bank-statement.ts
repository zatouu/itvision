/**
 * Lecture d'un relevé bancaire exporté en CSV (sans dépendance serveur : utilisable côté navigateur).
 * Formats acceptés : séparateur ; , ou tabulation, montants "1 234 567,00" ou "1,234,567.00",
 * dates JJ/MM/AAAA, JJ-MM-AA ou AAAA-MM-JJ, colonnes Crédit/Débit séparées ou un Montant signé.
 */

export interface StatementLine {
  id: string
  date: string // AAAA-MM-JJ
  label: string
  amount: number // encaissement en FCFA (> 0)
  reference?: string
}

export type ColumnKey = 'date' | 'label' | 'credit' | 'debit' | 'amount' | 'reference'
export type ColumnMapping = Partial<Record<ColumnKey, number>>

export function decodeStatementFile(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    // Exports bancaires Excel/Windows
    return new TextDecoder('windows-1252').decode(buffer)
  }
}

function detectSeparator(text: string): string {
  const sample = text.split(/\r?\n/).slice(0, 20).join('\n')
  const count = (c: string) => sample.split(c).length - 1
  const semi = count(';')
  const tab = count('\t')
  if (tab > semi) return '\t'
  if (semi > 0) return ';'
  return ','
}

export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, '')
  const sep = detectSeparator(src)
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === sep) { row.push(cell.trim()); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(cell.trim())
      if (row.some(v => v !== '')) rows.push(row)
      row = []
      cell = ''
    } else cell += c
  }
  row.push(cell.trim())
  if (row.some(v => v !== '')) rows.push(row)
  return rows
}

/** Montant en FCFA arrondi à l'unité ; NaN si la cellule ne contient pas de nombre. */
export function parseAmount(raw: string | undefined): number {
  let s = String(raw ?? '').trim()
  if (!s) return NaN
  let negative = false
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1) }
  s = s.replace(/[\s\u00a0\u202f']/g, '').replace(/(FCFA|XOF|CFA|F)$/i, '')
  if (s.endsWith('-')) { negative = true; s = s.slice(0, -1) }
  if (s.startsWith('-')) { negative = !negative; s = s.slice(1) }
  else if (s.startsWith('+')) s = s.slice(1)
  if (!/^[\d.,]+$/.test(s)) return NaN

  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma >= 0 && lastDot >= 0) {
    const dec = lastComma > lastDot ? ',' : '.'
    s = s.split(dec === ',' ? '.' : ',').join('').replace(dec, '.')
  } else if (lastComma >= 0) {
    s = /,\d{1,2}$/.test(s) && s.split(',').length === 2 ? s.replace(',', '.') : s.split(',').join('')
  } else if (lastDot >= 0) {
    // "1.500" ou "1.500.000" = séparateur de milliers (pas de centimes en FCFA)
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.split('.').join('')
  }
  const n = Number(s)
  if (!Number.isFinite(n)) return NaN
  return Math.round(negative ? -n : n)
}

/** Date du relevé au format AAAA-MM-JJ (ordre français jour/mois), ou null. */
export function parseStatementDate(raw: string | undefined): string | null {
  const s = String(raw ?? '').trim()
  let y: number, m: number, d: number
  let match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (match) {
    y = +match[1]; m = +match[2]; d = +match[3]
  } else {
    match = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2}|\d{4})\b/)
    if (!match) return null
    d = +match[1]; m = +match[2]; y = +match[3]
    if (y < 100) y += 2000
  }
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null
  return date.toISOString().slice(0, 10)
}

const normalizeHeader = (h: string) =>
  h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

const HEADER_HINTS: Record<Exclude<ColumnKey, 'date'>, string[]> = {
  label: ['libelle', 'description', 'motif', 'designation', 'intitule', 'detail', 'narration', 'label', 'operation'],
  credit: ['credit', 'encaissement', 'entree', 'recette'],
  debit: ['debit', 'decaissement', 'sortie'],
  amount: ['montant', 'amount', 'somme'],
  reference: ['reference', 'ref', 'piece', 'transaction'],
}

export function detectColumns(header: string[]): ColumnMapping {
  const names = header.map(normalizeHeader)
  const mapping: ColumnMapping = {}
  const used = new Set<number>()
  const take = (key: ColumnKey, test: (n: string) => boolean) => {
    const idx = names.findIndex((n, i) => !used.has(i) && n !== '' && test(n))
    if (idx >= 0) { mapping[key] = idx; used.add(idx) }
  }
  // Date d'opération plutôt que date de valeur
  take('date', n => n.includes('date') && !n.includes('valeur'))
  if (mapping.date === undefined) take('date', n => n.includes('date'))
  take('credit', n => HEADER_HINTS.credit.some(h => n.includes(h)))
  take('debit', n => HEADER_HINTS.debit.some(h => n.includes(h)))
  take('reference', n => HEADER_HINTS.reference.some(h => n.split(' ').some(w => w.startsWith(h))))
  take('label', n => HEADER_HINTS.label.some(h => n.includes(h)))
  if (mapping.credit === undefined) take('amount', n => HEADER_HINTS.amount.some(h => n.includes(h)))
  return mapping
}

/** Ligne d'en-tête : la première (parmi les 15 premières) où l'on reconnaît une date et un montant. */
export function findHeaderRow(rows: string[][]): { index: number; mapping: ColumnMapping } {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const mapping = detectColumns(rows[i])
    if (mapping.date !== undefined && (mapping.credit !== undefined || mapping.amount !== undefined)) return { index: i, mapping }
  }
  return { index: 0, mapping: rows.length ? detectColumns(rows[0]) : {} }
}

/** Encaissements du relevé (crédits > 0) ; les débits sont ignorés. */
export function extractCreditLines(rows: string[][], headerIndex: number, mapping: ColumnMapping): StatementLine[] {
  const lines: StatementLine[] = []
  if (mapping.date === undefined || (mapping.credit === undefined && mapping.amount === undefined)) return lines
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i]
    const date = parseStatementDate(row[mapping.date])
    if (!date) continue
    const amount = mapping.credit !== undefined ? parseAmount(row[mapping.credit]) : parseAmount(row[mapping.amount!])
    if (!(amount > 0)) continue
    const label = mapping.label !== undefined
      ? row[mapping.label] || ''
      : row.filter((_, j) => j !== mapping.date && j !== mapping.credit && j !== mapping.debit && j !== mapping.amount).join(' ')
    const reference = mapping.reference !== undefined ? row[mapping.reference] || undefined : undefined
    lines.push({ id: `L${i}`, date, label: label.slice(0, 300), amount, reference: reference?.slice(0, 100) })
  }
  return lines
}

/**
 * Numéros de facture cités dans un libellé, normalisés en "AAAA-N" :
 * "FAC-2026-012", "FAC 2026/12", "FAC2026012", "FACTURE N° 2026-012" → "2026-12".
 */
export function invoiceRefKeys(text: string | undefined): string[] {
  const keys = new Set<string>()
  const re = /FAC(?:TURE)?\s*(?:N\s*[°O]?\s*)?[-_\/.:#\s]*(20\d{2})[-_\/.\s]*(\d{1,6})(?!\d)/gi
  for (const m of String(text ?? '').matchAll(re)) keys.add(`${m[1]}-${Number(m[2])}`)
  return [...keys]
}
