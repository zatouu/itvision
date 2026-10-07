/**
 * Coordonnées bancaires d'IT Vision pour les règlements B2B (virement = mode de paiement usuel).
 * Renseignées par variables d'environnement ; absentes = rien n'est affiché.
 */
export interface BankDetails {
  holder: string
  bank?: string
  iban?: string
  rib?: string
  swift?: string
}

export function companyBankDetails(): BankDetails | null {
  const iban = process.env.COMPANY_BANK_IBAN?.trim()
  const rib = process.env.COMPANY_BANK_RIB?.trim()
  if (!iban && !rib) return null
  return {
    holder: process.env.COMPANY_BANK_HOLDER?.trim() || 'IT VISION',
    bank: process.env.COMPANY_BANK_NAME?.trim() || undefined,
    iban: iban || undefined,
    rib: rib || undefined,
    swift: process.env.COMPANY_BANK_SWIFT?.trim() || undefined,
  }
}

/** Lignes à imprimer (PDF, email) ; le numéro de facture sert au rapprochement du virement. */
export function bankDetailsLines(bank: BankDetails, invoiceNumero?: string): string[] {
  return [
    `Titulaire : ${bank.holder}`,
    bank.bank ? `Banque : ${bank.bank}` : '',
    bank.rib ? `RIB : ${bank.rib}` : '',
    bank.iban ? `IBAN : ${bank.iban}` : '',
    bank.swift ? `BIC / SWIFT : ${bank.swift}` : '',
    invoiceNumero ? `Libellé du virement : ${invoiceNumero}` : '',
  ].filter(Boolean)
}
