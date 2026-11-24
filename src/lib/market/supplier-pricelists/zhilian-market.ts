/**
 * Relevés pour la grille Zhilian : prix de détail à Dakar (24/11/2026, sites marchands, hors livraison)
 * et points à confirmer avec l'usine. `variant` = libellé de la variante comparable, `kg` = son poids
 * s'il diffère de celui de la famille.
 */
import type { SupplierPricelist } from './types'

export const ZHILIAN_MARKET: SupplierPricelist['market'] = {
  'hdmi-14-standard': [
    { variant: '1,5 m', fcfa: 1_500, shop: 'masterofficedeco.sn', url: 'https://masterofficedeco.sn/product/cable-hdmi-hdmi-15-metres/' },
    { variant: '10 m', fcfa: 4_900, shop: 'lomultimedia.com', url: 'https://lomultimedia.com/produits/cable-hdmi-vers-hdmi---10-metres', kg: 0.4 },
  ],
  'hdmi-20-4k': [
    { variant: '3 m', fcfa: 4_000, shop: 'digitalstores.sn', url: 'https://digitalstores.sn/produit/cable-hdmi-3-metres/', kg: 0.2 },
    { variant: '10 m', fcfa: 10_000, shop: 'chelectro.com', url: 'https://www.chelectro.com/boutique/informatique/chargeurs-connectiques-supports/cable-hdmi-premium-4k-10m-2', kg: 0.5 },
  ],
  'hdmi-fibre-optique': [
    { variant: '30 m', fcfa: 25_000, shop: 'manojia.com', url: 'https://www.manojia.com/product/cable-hdmi-fibre-2-0-2-1-aoc-active-optical-cable-30m-rs-hdfib30m/', kg: 0.8 },
    { variant: '30 m', fcfa: 35_000, shop: 'chelectro.com', url: 'https://www.chelectro.com/boutique/informatique/chargeurs-connectiques-supports/cable-hdmi-optique-30m', kg: 0.8 },
  ],
  'cable-hdmi-vga': [
    { variant: '1,5 m', fcfa: 4_900, shop: 'lomultimedia.com', url: 'https://lomultimedia.com/produits/cable-hdmi-vers-vga' },
  ],
  'usb-imprimante': [
    { variant: 'Noir 3 m', fcfa: 1_700, shop: 'dooglefi.com', url: 'https://dooglefi.com/produit/cable-usb-imprimante-3m-2/', kg: 0.12 },
    { variant: 'Noir 3 m', fcfa: 2_000, shop: 'ibt.sn', url: 'https://www.ibt.sn/product/cable-imprimante/', kg: 0.12 },
  ],
  'bobine-cat6-305m': [
    { variant: 'Intérieur UTP', fcfa: 24_900, shop: 'businessit.sn (AD-Link)', url: 'https://www.businessit.sn/produit/p1604' },
    { variant: 'Intérieur UTP', fcfa: 28_000, shop: 'tourecomputer.com (CCA)', url: 'https://tourecomputer.com/shop/cable-lan-reseau-cat6/' },
    { variant: 'Intérieur FTP', fcfa: 40_000, shop: 'dsi.sn', url: 'https://dsi.sn/produit/cable-reseau-ftp-cat6-bobine-305-metres/' },
  ],
  'connecteurs-rj45': [
    { variant: 'Cat5e (100 pcs)', fcfa: 2_500, shop: 'wazeb.com', url: 'https://wazeb.com/accessoires-r%C3%A9seaux/1202-connecteur-rj45-fer-100pcs-boutiques-en-ligne-disponible-au-senegal-%C3%A0-dakar-livraison-%C3%A0-domicile-rapide-sur-dakar.html' },
    { variant: 'Cat6 (100 pcs)', fcfa: 3_500, shop: 'kanmaty.com', url: 'https://www.kanmaty.com/product-detail/connecteur-rj45-rscar-connecteur-rs-rj307-caoutchou-pot-de-100pcs' },
  ],
  'pince-sertir-rj45': [
    { variant: 'Modèle 315', fcfa: 5_000, shop: 'yuupee.com (TL-315)', url: 'https://yuupee.com/product/pince-azerty-outils-speciaux-3en1-outil-de-sertissage-modulaire-tl-315/' },
  ],
  'adaptateur-secteur-mural': [
    { variant: '12 V 2 A', fcfa: 2_000, shop: 'imtechnology.sn', url: 'https://www.imtechnology.sn/boutique/adaptateur-de-prise-ue-12-v-2-a-a-amperes-complets-de-haute-qualite' },
    { variant: '12 V 2 A', fcfa: 3_500, shop: 'wazeb.com', url: 'https://wazeb.com/electronique-livraison-24h-sur-dakar-/4037-chargeur-alimentation-12v-2a.html' },
  ],
  'multiprise-eu': [
    { variant: '5 prises', fcfa: 4_900, shop: 'orcatrend.com', url: 'https://orcatrend.com/prises-electriques-rallonges-adaptateurs/17238-multiprise-electrique-5-prises-polypropylene-blanc-avec-interrupteur.html', kg: 0.55 },
    { variant: '5 prises', fcfa: 7_200, shop: 'diaytar.com', url: 'https://diaytar.com/products/bloc-multiprise-5-prises-16a-avec-interrupteur-blanc/', kg: 0.55 },
  ],
  'protecteur-tension-eu': [
    { variant: 'Prise EU', fcfa: 8_900, shop: 'jumia.sn', url: 'https://www.jumia.sn/protecteur-de-tension-prise-securite-20a-pour-climatiseur-frigo-et-televiseur-blanc-yaki-mpg59159.html' },
    { variant: 'Prise EU', fcfa: 9_900, shop: 'tech-access-dakar.com', url: 'https://tech-access-dakar.com/produit/protecteur-de-tension/' },
  ],
  'convertisseur-hdmi-vga': [
    { variant: 'Adaptateur compact', fcfa: 3_500, shop: 'businessit.sn', url: 'https://www.businessit.sn/produit/p2355' },
    { variant: 'Adaptateur compact', fcfa: 5_900, shop: 'jumia.sn', url: 'https://www.jumia.sn/adaptateur-hdmi-vers-vga-generic-mpg49688.html' },
  ],
  'hub-usb-c': [
    { variant: '5 en 1', fcfa: 9_900, shop: 'electrokeur.com (Vention)', url: 'https://electrokeur.com/boutique/vention-hub-usb-c-hdmi-5-en-1/' },
    { variant: '5 en 1', fcfa: 20_000, shop: 'visionglobaleinformatique.com', url: 'https://www.visionglobaleinformatique.com/product/adaptateur-usb-c-5-en-1/' },
  ],
  'splitter-hdmi-1080p': [
    { variant: 'Boîtier 1 vers 4 (modèle A)', fcfa: 11_000, shop: 'jokkale.com (MT-Viki)', url: 'https://jokkale.com/product/jokk-mt-viki-splitter-hdmi-4-port-4k-x-2k-mt-sp104m', kg: 0.3 },
    { variant: 'Boîtier 1 vers 4 (modèle A)', fcfa: 15_000, shop: '2sh.sn', url: 'https://2sh.sn/produit/1x4-splitter-hdmi-repartiteur-hdmi-3d-1-entree-4-sorties-distributeur-hdmi/', kg: 0.3 },
  ],
  'splitter-hdmi-4k': [
    { variant: '1 vers 4', fcfa: 10_000, shop: 'businessit.sn (Syong)', url: 'https://www.businessit.sn/produit/p3200', kg: 0.35 },
    { variant: '1 vers 4', fcfa: 27_500, shop: 'rekfi.com (Ugreen)', url: 'https://www.rekfi.com/produit/ugreen-cm603-repartiteur-ugreen-splitter-hdmi-uhd-4k-1-entree-4-sorties/', kg: 0.35 },
  ],
  'extendeur-hdmi-rj45': [
    { variant: '60 m', fcfa: 17_000, shop: 'pixework.pro (Syong)', url: 'https://pixework.pro/produits/extender-hdmi-60-metres' },
    { variant: '60 m', fcfa: 21_000, shop: 'midi.sn', url: 'https://midi.sn/product/extendeur-hdmi-60m-avec-adaptateurs-dalimentation-acc-097-139544' },
  ],
  'extendeur-kvm-hdmi': [
    { variant: '60 m avec audio', fcfa: 29_000, shop: 'chelectro.com', url: 'https://www.chelectro.com/boutique/informatique/adaptateurs-convertisseurs/extension-kvm-rj45-60-metres' },
    { variant: '60 m avec audio', fcfa: 32_000, shop: 'kanje.sn', url: 'https://kanje.sn/produit/hdmi-60m-kvm-extender-hdmi-rs-kvm60m' },
  ],
  'transmetteur-hdmi-sans-fil': [
    { variant: '50 m', fcfa: 40_000, shop: 'businessit.sn (Syong)', url: 'https://www.businessit.sn/produit/p2331' },
    { variant: '50 m', fcfa: 50_000, shop: 'prudmarket.com', url: 'https://prudmarket.com/produit/wireless-hdmi-transmitter-receiver-5-8g-50m' },
  ],
  'clavier-ensemble': [
    { variant: 'Ensemble sans fil 901', fcfa: 10_000, shop: 'manojia.com (GKM901)', url: 'https://www.manojia.com/product/combo-clavier-souris-sans-fil-gkm901-ultra-fin-disposition-azerty-francais/' },
  ],
  'cordon-rj45-cat6': [
    { variant: '5 m', fcfa: 1_500, shop: 'businessit.sn (AD-Link, HT)', url: 'https://www.businessit.sn/produit/p1603', kg: 0.12 },
    { variant: '5 m', fcfa: 1_850, shop: 'lomultimedia.com', url: 'https://lomultimedia.com/produits/patch-cable-reseau-rj45-ftp-cat6-5m', kg: 0.12 },
    { variant: '5 m', fcfa: 3_000, shop: 'yuupee.com', url: 'https://yuupee.com/product/jh-cat6-rj45-cable-5m/', kg: 0.12 },
  ],
  'vga-3-5': [
    { variant: '1,5 m', fcfa: 1_500, shop: 'lomultimedia.com', url: 'https://lomultimedia.com/produits/cable-vga-male-vers-male-1.5m' },
    { variant: '1,5 m', fcfa: 2_000, shop: 'bintech.sn', url: 'https://bintech.sn/produit/cable-vga-2m/' },
    { variant: '1,5 m', fcfa: 2_500, shop: 'digitalstores.sn', url: 'https://digitalstores.sn/produit/cable-vga-vga-1-5m/' },
  ],
  'cable-alimentation-eu': [
    { variant: 'C13 PC / écran — 1,5 m', fcfa: 1_500, shop: 'imtechnology.sn', url: 'https://www.imtechnology.sn/boutique/cable-alimentation-pc-roline-iec-320-c14-vers-c13-1-8m-250v-10a', kg: 0.18 },
    { variant: 'C13 PC / écran — 1,5 m', fcfa: 2_500, shop: 'semadistribution.com', url: 'https://semadistribution.com/product/cable-dalimentation-secteur-220v-pour-pc-fixe-15-m-prise-europeenne-connecteur-iec-c13/', kg: 0.18 },
  ],
  'souris-usb': [
    { variant: 'Filaire M20', fcfa: 1_900, shop: 'masterofficedeco.sn (Omega)', url: 'https://masterofficedeco.sn/product/souris-optique-usb-omega-om-06v-1200-d/' },
  ],
  'switch-hdmi': [
    { variant: '3 vers 1 (boîtier)', fcfa: 10_000, shop: 'electromenager-dakar.com', url: 'https://www.electromenager-dakar.com/produit/switch-hdmi-3-ports-rs-hdmi302/' },
    { variant: '3 vers 1 (boîtier)', fcfa: 15_300, shop: 'jumia.sn', url: 'https://www.jumia.sn/dsc-cable-de-commutation-hdmi-4k-adaptateur-de-commutation-video-hd-3-entrees-1-port-de-sortie-hub-pour-pc-tv-xbox-ps3-ps4-separateur-de-moniteur-de-projecteur-12613634.html' },
  ],
  'carte-acquisition-video': [
    { variant: 'HDMI vers USB 3.0', fcfa: 10_000, shop: 'amnakoo.com', url: 'https://amnakoo.com/fr/accueil/8777-carte-de-capture-vid%C3%A9o-hdmi-usb-30-rs-hdcap.html', kg: 0.1 },
    { variant: 'HDMI vers USB 3.0', fcfa: 13_000, shop: 'kanje.sn', url: 'https://kanje.sn/produit/hdmi-video-capture-boite-noir-rs-hdcap', kg: 0.1 },
  ],
  'adaptateur-usb-rj45': [
    { variant: 'USB 2.0 — 100 Mbps', fcfa: 5_000, shop: 'nova.sn', url: 'https://nova.sn/reseaux/14954-adaptateur-ethernet-usb-20-rj45-cbl25.html' },
    { variant: 'USB 3.0 — 1000 Mbps', fcfa: 6_000, shop: 'tourecomputer.com', url: 'https://tourecomputer.com/shop/cles-usb-usb-3-0-ethernet-adapter/' },
    { variant: 'USB 3.0 — 1000 Mbps', fcfa: 7_500, shop: 'optimusprime.sn', url: 'https://optimusprime.sn/produit/adaptateur-usb-3-0-vers-gigabit-ethernet-rj45/' },
  ],
  'hub-usb3': [
    { variant: '4 ports', fcfa: 5_000, shop: 'ekassoua.com', url: 'https://www.ekassoua.com/products/hub-usb-30-a-4-ports' },
    { variant: '4 ports', fcfa: 6_500, shop: 'lomultimedia.com', url: 'https://lomultimedia.com/produits/hub-usb-4-ports-3.0' },
    { variant: '4 ports', fcfa: 7_000, shop: 'dsi.sn', url: 'https://dsi.sn/produit/hub-usb-3-0-4-ports-ultra-rapide-compact/' },
  ],
  'kit-outils-reseau': [
    { variant: 'Kit complet', fcfa: 10_500, shop: 'jumia.sn', url: 'https://www.jumia.sn/generic-kit-cablage-reseau-avec-pince-3en1-testeur-outils-et-sac-de-rangement-12733056.html' },
    { variant: 'Kit complet', fcfa: 16_100, shop: 'itemsenegal.shop', url: 'https://itemsenegal.shop/boutique/agriculture-jardinage/materiel-outillage/coffret-de-13-outils-de-telecommunication-tkttsk0132/' },
  ],
  'alimentation-table-12v-15v': [
    { variant: '12 V 5 A', fcfa: 2_000, shop: 'businessit.sn (HT)', url: 'https://www.businessit.sn/produit/p1212', kg: 0.35 },
    { variant: '12 V 5 A', fcfa: 8_500, shop: 'jourjtechnologies.com', url: 'https://jourjtechnologies.com/produit/adaptateur-12v-5-amperes/', kg: 0.35 },
  ],
}

export const ZHILIAN_QUESTIONS: SupplierPricelist['questions'] = {
  'bobine-cat5e-305m': 'Conducteur cuivre pur ou CCA ? (PoE des caméras)',
  'bobine-cat6-305m': 'Conducteur cuivre pur ou CCA ? (PoE des caméras)',
  'adaptateur-secteur-mural': 'Connecteur DC 5,5 × 2,1 mm ? Certification CE ?',
  'alimentation-table-12v-15v': 'Connecteur DC 5,5 × 2,1 mm ? Certification CE ?',
  'adaptateur-usb-sata': 'Libellé exact de la 2e ligne « USB2.0 to SATA » (7,4 ¥), dupliquée dans la grille.',
  'splitter-hdmi-1080p': 'Différence entre les deux boîtiers 1→2 / 1→4 (15–19 ¥ et 18–21 ¥).',
  'clavier-ensemble': 'Disposition AZERTY française disponible ? (QWERTY invendable au Sénégal)',
}
