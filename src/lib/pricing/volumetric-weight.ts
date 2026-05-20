/**
 * Calcul du poids volumétrique pour le fret aérien
 * Formule IATA standard utilisée par les transporteurs
 */

export const VOLUMETRIC_DIVISOR = 5000 // Standard IATA

/**
 * Calcule le poids volumétrique en kg à partir des dimensions
 * @param lengthCm - Longueur en cm
 * @param widthCm - Largeur en cm  
 * @param heightCm - Hauteur en cm
 * @returns Poids volumétrique en kg
 */
export function calculateVolumetricWeight(
  lengthCm: number,
  widthCm: number,
  heightCm: number
): number {
  if (!lengthCm || !widthCm || !heightCm) return 0
  return (lengthCm * widthCm * heightCm) / VOLUMETRIC_DIVISOR
}

/**
 * Détermine le poids facturable pour le transport
 * Le transporteur prend le maximum entre poids réel et poids volumétrique
 */
export function calculateBilledWeight(params: {
  actualWeightKg: number
  lengthCm?: number
  widthCm?: number
  heightCm?: number
}): {
  actualWeight: number
  volumetricWeight: number
  billedWeight: number
  billingMethod: 'actual' | 'volumetric'
} {
  const { actualWeightKg, lengthCm, widthCm, heightCm } = params

  const volumetricWeight =
    lengthCm && widthCm && heightCm
      ? calculateVolumetricWeight(lengthCm, widthCm, heightCm)
      : 0

  const billedWeight = Math.max(actualWeightKg || 0.1, volumetricWeight)

  return {
    actualWeight: actualWeightKg || 0.1,
    volumetricWeight,
    billedWeight,
    billingMethod: volumetricWeight > (actualWeightKg || 0) ? 'volumetric' : 'actual'
  }
}

/**
 * Vérifie si un produit est volumineux (poids volumétrique > poids réel)
 * Utile pour afficher des warnings ou explications aux clients
 */
export function isVolumetricProduct(
  actualWeightKg: number,
  lengthCm?: number,
  widthCm?: number,
  heightCm?: number
): boolean {
  if (!lengthCm || !widthCm || !heightCm) return false
  const volumetricWeight = calculateVolumetricWeight(lengthCm, widthCm, heightCm)
  return volumetricWeight > actualWeightKg
}

/**
 * Calcule le ratio volumétrique pour affichage
 * Exemple: "Ce produit prend 3.5x plus de place que son poids réel"
 */
export function getVolumetricRatio(
  actualWeightKg: number,
  lengthCm?: number,
  widthCm?: number,
  heightCm?: number
): number | null {
  if (!lengthCm || !widthCm || !heightCm || actualWeightKg <= 0) return null
  const volumetricWeight = calculateVolumetricWeight(lengthCm, widthCm, heightCm)
  return volumetricWeight / actualWeightKg
}
