/**
 * Lit la réponse JSON d'un appel d'API. Les réponses non JSON (413 du proxy, 502, page HTML)
 * sont converties en message explicite au lieu d'un « Unexpected token < ».
 */
export async function readJsonResponse<T = any>(res: Response): Promise<T & { error?: string }> {
  const text = await res.text()
  try {
    return (text ? JSON.parse(text) : {}) as T & { error?: string }
  } catch {
    return { error: httpErrorMessage(res.status) } as T & { error: string }
  }
}

export function httpErrorMessage(status: number): string {
  if (status === 413) return 'Fichier trop volumineux pour le serveur (limite du proxy). Réduisez sa taille ou contactez l’administrateur.'
  if (status === 401) return 'Session expirée : reconnectez-vous.'
  if (status === 403) return 'Accès refusé.'
  if (status === 429) return 'Trop de requêtes : patientez quelques minutes.'
  if (status === 502 || status === 503 || status === 504) return 'Serveur momentanément indisponible, réessayez.'
  return `Erreur serveur (${status || 'réseau'})`
}

/** Message d'erreur d'une réponse déjà lue. */
export function apiErrorMessage(res: Response, data: { error?: string; message?: string } | null | undefined, fallback?: string) {
  return data?.error || data?.message || fallback || httpErrorMessage(res.status)
}
