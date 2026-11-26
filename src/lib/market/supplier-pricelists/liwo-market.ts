/**
 * Relevés pour la grille Liwo : prix de détail à Dakar (26/11/2026, sites marchands
 * sénégalais, hors livraison) et points à confirmer avec l'usine.
 *
 * Le marché dakarois des interrupteurs connectés est porté par Sonoff, GIRIER et des
 * génériques Tuya — exactement le positionnement Liwo. Les prises et variantes utilisent
 * marketLike : le prix de l'ancre est ajusté au ratio des coûts usine.
 *
 * Repère interne : IT Vision a vendu en B2B l'interrupteur zigbee simple à 7 800 F et
 * la prise zigbee à 13 800 F — très en dessous du marché (15 000-20 000 F l'interrupteur),
 * ce qui conforte les relevés ci-dessous.
 */
import type { SupplierPricelist } from './types'

export const LIWO_MARKET: SupplierPricelist['market'] = {
  // ── Ancre interrupteur zigbee 1 bouton (toute la gamme zigbee par ratio) ──
  'liwo-us-interrupteur-connect-zigbee-eu-1-bout': [
    { variant: 'Standard', fcfa: 15_000, shop: 'aot-sn.com (module GIRIER Tuya Zigbee)', url: 'https://aot-sn.com/product-category/capteur/interrupteur-connecte/' },
    { variant: 'Standard', fcfa: 17_000, shop: 'aot-sn.com (prix avant remise)', url: 'https://aot-sn.com/product-category/capteur/interrupteur-connecte/' },
    { variant: 'Standard', fcfa: 18_100, shop: 'diaytar.com (easyliv 2 boutons zigbee)', url: 'https://diaytar.com/products/l-interrupteur-mural-intelligent-easyliv-a-2-boutons-zigbee-fonctionne-avec-le-wi-fi/' },
  ],
  // ── Ancre interrupteur wifi 1 bouton (toute la gamme wifi/matter par ratio) ──
  'liwo-us-interrupteur-connect-wifi-eu-1-bouton': [
    { variant: 'Standard', fcfa: 20_000, shop: 'jumia.sn (Sonoff MINIR4M)', url: 'https://www.jumia.sn/sonoff-interrupteur-intelligent-wifi-son-off-minir4m-controle-a-distance-via-app-compatible-matter-12339332.html' },
    { variant: 'Standard', fcfa: 30_000, shop: 'jumia.sn (Sonoff MINIR4M prix barré)', url: 'https://www.jumia.sn/sonoff-interrupteur-intelligent-wifi-son-off-minir4m-controle-a-distance-via-app-compatible-matter-12339332.html' },
  ],
}

export const LIWO_QUESTIONS: SupplierPricelist['questions'] = {
  'liwo-us-interrupteur-connect-zigbee-eu-1-bout': 'Le hub Zigbee est-il dans la grille ? Indispensable pour vendre la gamme — demander la référence et le prix.',
  'liwo-us-interrupteur-connect-wifi-eu-1-bouton': 'Confirmer la compatibilité des interrupteurs « sans neutre » avec les installations sénégalaises (souvent sans fil neutre au boîtier).',
}
