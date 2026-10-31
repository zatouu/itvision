import { qwenChat } from '@/lib/ai/qwen'

/**
 * Repli IA pour l'import de devis/factures : quand l'analyse par motifs ne trouve aucune ligne
 * (mise en page inhabituelle), le texte extrait du PDF est structuré par le gateway LLM.
 * Retourne null si aucun fournisseur n'est configuré ou si la réponse est inexploitable.
 */

export interface AiExtractedLine {
  description: string
  quantity: number
  unitPrice: number
  isLabor?: boolean
}

export interface AiExtractedDocument {
  numero?: string
  date?: string
  dueDate?: string
  title?: string
  client: { name?: string; address?: string; phone?: string; email?: string }
  lines: AiExtractedLine[]
  subtotal?: number
  taxAmount?: number
  total?: number
  notes?: string
}

const MAX_TEXT = 12000

const num = (v: unknown) => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[^\d.,-]/g, '').replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined) || undefined

const isoDate = (v: unknown) => {
  const s = str(v, 40)
  if (!s) return undefined
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().split('T')[0]
}

export async function aiStructureDocument(text: string, kind: 'quote' | 'invoice'): Promise<AiExtractedDocument | null> {
  const clean = text.replace(/\s+\n/g, '\n').trim().slice(0, MAX_TEXT)
  if (clean.length < 40) return null
  const label = kind === 'quote' ? 'devis' : 'facture'
  try {
    const res = await qwenChat([
      {
        role: 'system',
        content:
          `Tu extrais les données d'un(e) ${label} (montants en FCFA). Réponds UNIQUEMENT par un objet JSON valide, sans texte autour, au format : ` +
          '{"numero":string,"date":"AAAA-MM-JJ","dueDate":"AAAA-MM-JJ","title":string,' +
          '"client":{"name":string,"address":string,"phone":string,"email":string},' +
          '"lines":[{"description":string,"quantity":number,"unitPrice":number,"isLabor":boolean}],' +
          '"subtotal":number,"taxAmount":number,"total":number,"notes":string}. ' +
          "isLabor=true pour la main-d'œuvre, l'installation ou les prestations. N'invente aucune ligne : omets les champs absents.",
      },
      { role: 'user', content: clean },
    ], 2000)
    const match = res.text.match(/\{[\s\S]*\}/)
    if (!match) return null
    const raw = JSON.parse(match[0])
    const lines: AiExtractedLine[] = (Array.isArray(raw?.lines) ? raw.lines : [])
      .map((l: any) => ({
        description: str(l?.description, 500) || '',
        quantity: Math.max(0, num(l?.quantity)) || 1,
        unitPrice: Math.max(0, num(l?.unitPrice)),
        isLabor: l?.isLabor === true,
      }))
      .filter((l: AiExtractedLine) => l.description)
      .slice(0, 200)
    if (lines.length === 0) return null
    return {
      numero: str(raw?.numero, 60),
      date: isoDate(raw?.date),
      dueDate: isoDate(raw?.dueDate),
      title: str(raw?.title, 200),
      client: {
        name: str(raw?.client?.name, 200),
        address: str(raw?.client?.address, 300),
        phone: str(raw?.client?.phone, 40),
        email: str(raw?.client?.email, 120),
      },
      lines,
      subtotal: num(raw?.subtotal) || undefined,
      taxAmount: num(raw?.taxAmount) || undefined,
      total: num(raw?.total) || undefined,
      notes: str(raw?.notes, 1000),
    }
  } catch (err) {
    console.warn('[import-document] repli IA indisponible:', err instanceof Error ? err.message : err)
    return null
  }
}

/** Message d'erreur explicite pour un PDF sans couche texte (scan, photo). */
export const SCANNED_PDF_ERROR =
  "Ce PDF ne contient pas de texte lisible (document scanné ou photo). Exportez le PDF depuis le logiciel d'origine, ou importez un fichier Excel/CSV."

export const IMPORT_MAX_BYTES = 15 * 1024 * 1024
