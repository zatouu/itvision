import { apiErrorMessage, readJsonResponse } from './read-json'

export interface UploadedFile {
  url: string
  filename: string
  name: string
  size: number
  type: string
}

/**
 * Envoie un fichier en multipart. `/api/upload` (médias) et `/api/admin/documents/upload`
 * (PDF, Office, images) renvoient la même forme ; lève une Error lisible en cas d'échec.
 */
export async function uploadFile(
  file: File,
  opts: { endpoint?: string; fields?: Record<string, string> } = {}
): Promise<UploadedFile> {
  const form = new FormData()
  form.append('file', file)
  for (const [k, v] of Object.entries(opts.fields || {})) form.append(k, v)
  const res = await fetch(opts.endpoint || '/api/upload', { method: 'POST', body: form, credentials: 'include' })
  const data = await readJsonResponse(res)
  if (!res.ok || data?.success === false || !data?.url) {
    throw new Error(apiErrorMessage(res, data, `Échec de l'envoi de ${file.name}`))
  }
  return {
    url: String(data.url),
    filename: String(data.filename || ''),
    name: String(data.name || file.name),
    size: Number(data.size || file.size),
    type: String(data.type || file.type || ''),
  }
}

export const DOCUMENT_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.gif,application/pdf,image/*'
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif'
