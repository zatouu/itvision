/**
 * Kits métier Xeuy : outils de base et consommables courants par famille de métier (rapprochés du slug
 * de catégorie). Sert au démarrage d'un nouveau prestataire et aux suggestions de « Mon stock ».
 */
export interface TradeKit {
  tools: string[]
  consumables: string[]
}

const TRADE_KITS: Array<[RegExp, TradeKit]> = [
  [/plomb/i, { tools: ['clé à molette', 'pince multiprise', 'coupe-tube', 'déboucheur'], consumables: ['ruban téflon', 'joint', 'colle PVC', 'flexible', 'robinet'] }],
  [/electr/i, { tools: ['multimètre', 'pince à dénuder', 'tournevis isolé', 'testeur de tension'], consumables: ['ruban isolant', 'domino', 'gaine', 'disjoncteur', 'câble électrique'] }],
  [/clim|froid|frigo/i, { tools: ['manifold', 'pompe à vide', 'détecteur de fuite', 'coupe-tube'], consumables: ['gaz réfrigérant', 'tuyau cuivre', 'isolant', 'condensateur'] }],
  [/menuis|bois/i, { tools: ['visseuse', 'scie sauteuse', 'mètre ruban', 'serre-joint'], consumables: ['vis à bois', 'colle bois', 'charnière', 'papier abrasif'] }],
  [/peint/i, { tools: ['pistolet à peinture', 'escabeau', 'bac à peinture', 'couteau à enduire'], consumables: ['rouleau peinture', 'pinceau', 'ruban de masquage', 'enduit'] }],
  [/macon|carrel/i, { tools: ['niveau laser', 'truelle', 'coupe-carreaux', 'malaxeur'], consumables: ['joint carrelage', 'colle carrelage', 'croisillon', 'ciment'] }],
  [/cam[eé]ra|s[eé]curit|surveill/i, { tools: ['pince à sertir RJ45', 'testeur de câble', 'perceuse', 'écran de test'], consumables: ['connecteur RJ45', 'câble coaxial', 'alimentation 12V', 'caméra'] }],
  [/informat|r[eé]seau/i, { tools: ['pince à sertir RJ45', 'testeur de câble', 'kit tournevis précision', 'clé USB bootable'], consumables: ['connecteur RJ45', 'câble réseau', 'pâte thermique', 'clé USB'] }],
  [/m[eé]canique|auto|moto/i, { tools: ['caisse à outils', 'cric', 'clé dynamométrique', 'valise diagnostic'], consumables: ['huile moteur', 'filtre à huile', 'bougie', 'graisse'] }],
  [/coiff|beaut|esth/i, { tools: ['tondeuse', 'sèche-cheveux', 'ciseaux', 'fer à lisser'], consumables: ['lame de rasoir', 'gel', 'cape de coupe', 'désinfectant'] }],
]

export function tradeKitFor(categories: string[]): TradeKit {
  const tools = new Set<string>()
  const consumables = new Set<string>()
  for (const cat of categories) {
    for (const [re, kit] of TRADE_KITS) {
      if (!re.test(cat)) continue
      kit.tools.forEach(t => tools.add(t))
      kit.consumables.forEach(c => consumables.add(c))
    }
  }
  return { tools: [...tools].slice(0, 12), consumables: [...consumables].slice(0, 12) }
}
