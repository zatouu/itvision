/**
 * Relevés pour la grille « Smart lock Price list » : prix de détail à Dakar (26/11/2026,
 * sites marchands sénégalais, hors livraison) et points à confirmer avec l'usine.
 *
 * La quasi-totalité des serrures vendues à Dakar sont des marques grand public (EZVIZ, Imou,
 * ZKTeco…) ou du générique Tuya/TTLock importé — exactement le positionnement de ce fabricant
 * OEM. Les familles sans relevé direct utilisent `marketLike` : le prix de l'ancre est
 * ajusté au ratio des coûts usine (voir pricing-rules.ts).
 */
import type { SupplierPricelist } from './types'

export const SMARTLOCK_MARKET: SupplierPricelist['market'] = {
  // ── Ancre reconnaissance faciale (serrures AI p3, Face ID p30-42, villa p4) ──
  'ai-os859tyai': [
    { variant: 'Standard', fcfa: 114_000, shop: 'jumia.sn (serrure Tuya reconnaissance faciale)', url: 'https://www.jumia.sn/catalog/?q=serrure+reconnaissance+faciale' },
    { variant: 'Standard', fcfa: 118_655, shop: 'Imou K1S-W (revendeur Dakar)', url: 'https://www.jumia.sn/catalog/?q=imou+serrure' },
    { variant: 'Standard', fcfa: 159_000, shop: 'EZVIZ DL05 (revendeur Dakar)', url: 'https://www.jumia.sn/catalog/?q=ezviz+dl05' },
  ],
  // ── Ancre serrure standard TTLock/Tuya (p5-29) — le TFT caméra est le modèle
  //    le plus proche relevé ; le ratio des coûts corrige l'écart de gamme ──
  'ttlock-deadbolt': [
    { variant: 'Standard', fcfa: 125_000, shop: 'jumia.sn (serrure Tuya TFT caméra)', url: 'https://www.jumia.sn/catalog/?q=serrure+tuya' },
  ],
  // ── Ancre cadenas connecté (p78-82) ──
  'padlock-os1101f': [
    { variant: 'Standard', fcfa: 7_525, shop: 'jumia.sn (cadenas empreinte)', url: 'https://www.jumia.sn/catalog/?q=cadenas+empreinte' },
    { variant: 'Standard', fcfa: 12_000, shop: 'jumia.sn (cadenas empreinte)', url: 'https://www.jumia.sn/catalog/?q=cadenas+empreinte' },
  ],
  // ── Ancre contrôle d'accès empreinte (p97-106) — ZKTeco est la référence locale ──
  'access-os580fc': [
    { variant: 'Standard', fcfa: 95_000, shop: 'ZKTeco F22 (revendeur Dakar)', url: 'https://www.jumia.sn/catalog/?q=zkteco+controle+acces' },
    { variant: 'Standard', fcfa: 99_700, shop: 'ZKTeco F22 (revendeur Dakar)', url: 'https://www.jumia.sn/catalog/?q=zkteco+controle+acces' },
    { variant: 'Standard', fcfa: 150_000, shop: 'ZKTeco F18 (revendeur Dakar)', url: 'https://www.jumia.sn/catalog/?q=zkteco+f18' },
  ],
  // ── Ancre sonnette vidéo / caméra Tuya (p63-71) ──
  'cam-os551ca': [
    { variant: 'Standard', fcfa: 75_000, shop: 'EZVIZ EP3X (revendeur Dakar)', url: 'https://www.jumia.sn/catalog/?q=ezviz+sonnette' },
    { variant: 'Standard', fcfa: 89_900, shop: 'Blink doorbell (revendeur Dakar)', url: 'https://www.jumia.sn/catalog/?q=sonnette+video' },
    { variant: 'Standard', fcfa: 95_000, shop: 'IMOU DB60 (revendeur Dakar)', url: 'https://www.jumia.sn/catalog/?q=imou+sonnette' },
  ],
  // ── Ancre visiophone (p111-120 et serrures interphone p60-62) ──
  'vintercom-os406fv': [
    { variant: 'Standard', fcfa: 115_000, shop: 'Hikvision KIS603-P (revendeur Dakar)', url: 'https://www.jumia.sn/catalog/?q=visiophone+hikvision' },
    { variant: 'Standard', fcfa: 135_000, shop: 'EZVIZ CS-EP7 (revendeur Dakar)', url: 'https://www.jumia.sn/catalog/?q=ezviz+visiophone' },
    { variant: 'Standard', fcfa: 180_000, shop: 'Hikvision KIS603-P premium', url: 'https://www.jumia.sn/catalog/?q=visiophone+hikvision' },
  ],
}

export const SMARTLOCK_QUESTIONS: SupplierPricelist['questions'] = {
  'ai-os859tyai': 'Langue française disponible dans le menu vocal ? Fréquence radio de la clé de secours ?',
  'ttlock-deadbolt': 'Version TTLock ou Tuya des modèles non suffixés ? Gateway wifi incluse ou en option ?',
  'access-os580fc': 'Le contrôle d\u2019accès embarque-t-il un relais NO/NC pour gâche et bouton de sortie ?',
  'cam-os551ca': 'Alimentation des sonnettes : batterie ou 12-24 V AC ? Sonnerie intérieure (chime) incluse ?',
  'vintercom-os406fv': 'Les moniteurs du visiophone fonctionnent-ils en wifi ou en filaire 4 fils uniquement ?',
}
