// Les brouillons sont des documents internes du back-office : jamais visibles ni modifiables côté client.
export const CLIENT_VISIBLE_QUOTE = { status: { $ne: 'draft' } }
export const CLIENT_VISIBLE_INVOICE = { status: { $ne: 'draft' } }
