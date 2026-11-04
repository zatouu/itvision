/**
 * Accent-insensitive regex helpers for catalog search.
 *
 * MongoDB `$regex` is case-insensitive with `i` but not diacritic-insensitive :
 * « caméra » ne matche pas « camera ». On replie chaque lettre accentuée sur sa
 * classe de base (`e` → `[eéèêë]…`) pour matcher les deux formes côté doc comme
 * côté requête.
 */

const ACCENT_CLASSES: Record<string, string> = {
  a: 'aàâäáãåāăą',
  c: 'cçćčĉċ',
  d: 'dďđð',
  e: 'eéèêëēĕėęě',
  g: 'gĝğġģ',
  h: 'hĥħ',
  i: 'iíìîïĩīĭįı',
  j: 'jĵ',
  k: 'kķ',
  l: 'lĺļľŀł',
  n: 'nñńņňŉŋ',
  o: 'oóòôöõōŏőø',
  r: 'rŕŗř',
  s: 'sśŝşšſș',
  t: 'tţťŧț',
  u: 'uúùûüũūŭůűų',
  w: 'wŵ',
  y: 'yýÿŷ',
  z: 'zźżž',
}

const CLASS_BY_CHAR: Record<string, string> = (() => {
  const map: Record<string, string> = {}
  for (const [base, chars] of Object.entries(ACCENT_CLASSES)) {
    const cls = `[${base}${chars}${base.toUpperCase()}${chars.toUpperCase()}]`
    map[base] = cls
    for (const ch of chars) map[ch] = cls
    for (const ch of chars.toUpperCase()) map[ch] = cls
    map[base.toUpperCase()] = cls
  }
  return map
})()

function escapeRegexChar(ch: string) {
  return /[.*+?^${}()|[\]\\]/.test(ch) ? `\\${ch}` : ch
}

/** Retire les diacritiques : « Caméra » → « camera ». */
export function stripAccents(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Construit un motif regex insensible aux accents ET à la casse.
 * « camera » matche « Caméra », « caméra » matche « camera ».
 */
export function accentInsensitiveRegex(term: string) {
  return term
    .split('')
    .map((ch) => CLASS_BY_CHAR[ch] ?? escapeRegexChar(ch))
    .join('')
}
