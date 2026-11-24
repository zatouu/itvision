/**
 * Grille « Full price list (new) » — Dongguan Zhilian Technology Co., Ltd. (reçue le 22/11/2026).
 * Prix EXW Dongguan en yuans (1 USD = 7,3 RMB selon le fournisseur), MOQ usine par référence.
 *
 * Hors périmètre volontairement : articles de marque (TP-Link, Tenda, HP, Dell, Logitech —
 * risque de contrefaçon) et prises UK / US / ZA (inutiles au Sénégal).
 *
 * Variante : [libellé, prix ¥, MOQ usine, image (n° pdfimages « page-num »)?]
 * Images : public/images/suppliers/zhilian/<n°>.jpg (extraites du PDF, basse résolution).
 * Import : /admin/fournisseurs (aperçu puis application), règles dans ./import.ts et ./min-order.ts.
 */

import type { SupplierFamily, SupplierPricelist } from './types'
import { ZHILIAN_MARKET, ZHILIAN_QUESTIONS } from './zhilian-market'

const SUPPLIER = {
  name: 'Dongguan Zhilian Technology Co., Ltd.',
  contact: 'Mr. Wang +86 138 0844 5290 / +86 176 6563 8561 — No. 2 Jinyuan Road, Humen Town, Dongguan',
  priceListDate: '2026-04-16',
  receivedAt: '2026-11-22',
}

const CABLES = 'Câbles & Connectique'
const NETWORK = 'Réseau Informatique'
const IT = 'Informatique & Bureautique' as const
const CE = 'Électronique grand public' as const

const FAMILIES: SupplierFamily[] = [
  // ── HDMI ──────────────────────────────────────────────────────────────
  {
    key: 'hdmi-14-standard', name: 'Câble HDMI 1.4 Full HD — 1,5 m à 30 m', category: IT, subCategory: CABLES,
    image: '001-000', gallery: ['001-004'], weightKg: 0.12, variantGroup: 'Longueur',
    variants: [['1,5 m', 2.4, 800], ['3 m', 3.6, 600], ['5 m', 4.9, 500], ['10 m', 9.2, 400],
      ['15 m', 14.3, 350, '001-004'], ['20 m', 19.3, 300, '001-004'], ['25 m', 29, 250, '001-004'], ['30 m', 34, 200, '001-004']],
    description: 'Câble HDMI 1.4 mâle-mâle pour TV, décodeur, vidéoprojecteur et enregistreur de vidéosurveillance. Connecteurs dorés, Full HD 1080p.',
    features: ['Résolution jusqu’à 1080p (4K 30 Hz selon longueur)', 'Connecteurs plaqués or', 'Du 1,5 m au 30 m'],
    specifications: { Norme: 'HDMI 1.4', Connecteurs: 'HDMI A mâle / mâle' },
    tags: ['hdmi', 'câble hdmi', 'tv', 'vidéoprojecteur'],
  },
  {
    key: 'hdmi-14-premium-vert', marketLike: 'hdmi-14-standard', name: 'Câble HDMI 1.4 renforcé (embouts verts) — 1,5 m à 30 m', category: IT, subCategory: CABLES,
    image: '001-008', gallery: ['001-012'], weightKg: 0.14, variantGroup: 'Longueur',
    variants: [['1,5 m', 2.9, 800], ['3 m', 4.2, 600], ['5 m', 6, 500], ['10 m', 11, 400],
      ['15 m', 19, 350, '001-012'], ['20 m', 25, 300, '001-012'], ['25 m', 34, 250, '001-012'], ['30 m', 39, 200, '001-012']],
    description: 'Câble HDMI 1.4 à gaine renforcée et embouts surmoulés, pour installations fixes et longues distances.',
    features: ['Gaine renforcée', 'Connecteurs plaqués or', 'Du 1,5 m au 30 m'],
    specifications: { Norme: 'HDMI 1.4', Connecteurs: 'HDMI A mâle / mâle' },
    tags: ['hdmi', 'câble hdmi'],
  },
  {
    key: 'hdmi-14-tresse-rouge', marketLike: 'hdmi-14-standard', name: 'Câble HDMI 1.4 tressé rouge et noir — 1,5 m à 30 m', category: IT, subCategory: CABLES,
    image: '001-002', gallery: ['001-006'], weightKg: 0.13, variantGroup: 'Longueur',
    variants: [['1,5 m', 2.7, 800], ['3 m', 4, 600], ['5 m', 5.7, 500], ['10 m', 10.2, 400],
      ['15 m', 17, 350, '001-006'], ['20 m', 22.5, 300, '001-006'], ['25 m', 31, 250, '001-006'], ['30 m', 37, 200, '001-006']],
    description: 'Câble HDMI 1.4 à gaine tressée nylon rouge et noir, plus résistant aux pliures.',
    features: ['Gaine tressée nylon', 'Connecteurs plaqués or', 'Du 1,5 m au 30 m'],
    specifications: { Norme: 'HDMI 1.4', Gaine: 'Tressée nylon' },
    tags: ['hdmi', 'câble hdmi', 'tressé'],
  },
  {
    key: 'hdmi-20-4k', name: 'Câble HDMI 2.0 4K — 1,5 m à 30 m', category: IT, subCategory: CABLES, corporate: true,
    image: '001-010', gallery: ['001-014'], weightKg: 0.15, variantGroup: 'Longueur',
    variants: [['1,5 m', 4.8, 800], ['3 m', 6.8, 600], ['5 m', 9.5, 500], ['10 m', 17, 400],
      ['15 m', 26.5, 350, '001-014'], ['20 m', 36, 300, '001-014'], ['25 m', 50, 250, '001-014'], ['30 m', 58, 200, '001-014']],
    description: 'Câble HDMI 2.0 haut débit pour écrans et TV 4K, consoles et moniteurs de vidéosurveillance.',
    features: ['4K Ultra HD', 'Connecteurs plaqués or', 'Du 1,5 m au 30 m'],
    specifications: { Norme: 'HDMI 2.0', Résolution: '4K' },
    tags: ['hdmi', 'hdmi 4k', 'câble hdmi'],
  },
  {
    key: 'hdmi-21-8k', marketLike: 'hdmi-20-4k', name: 'Câble HDMI 2.1 8K — 1,5 m à 5 m', category: IT, subCategory: CABLES,
    image: '001-016', weightKg: 0.15, variantGroup: 'Longueur',
    variants: [['1,5 m', 6.6, 500], ['3 m', 9.5, 300], ['5 m', 13.8, 200]],
    description: 'Câble HDMI 2.1 ultra haut débit pour TV 8K / 4K 120 Hz et consoles de nouvelle génération.',
    features: ['8K / 4K 120 Hz', 'Connecteurs plaqués or'],
    specifications: { Norme: 'HDMI 2.1', Résolution: '8K' },
    tags: ['hdmi', 'hdmi 8k', 'hdmi 2.1', 'ps5'],
  },
  {
    key: 'hdmi-21-8k-premium', marketLike: 'hdmi-20-4k', name: 'Câble HDMI 2.1 8K premium — 1,5 m à 10 m', category: IT, subCategory: CABLES,
    image: '001-020', weightKg: 0.18, variantGroup: 'Longueur',
    variants: [['1,5 m', 7.6, 500], ['3 m', 11, 300], ['5 m', 16, 200], ['10 m', 26.5, 100]],
    description: 'Câble HDMI 2.1 8K en boîte, finition premium, jusqu’à 10 m.',
    features: ['8K / 4K 120 Hz', 'Finition premium'],
    specifications: { Norme: 'HDMI 2.1', Résolution: '8K' },
    tags: ['hdmi', 'hdmi 8k', 'hdmi 2.1'],
  },
  {
    key: 'hdmi-fibre-optique', name: 'Câble HDMI fibre optique (AOC) — 10 m à 100 m', category: IT, subCategory: CABLES, corporate: true,
    image: '001-018', gallery: ['001-022', '001-024'], weightKg: 0.6, variantGroup: 'Longueur',
    variants: [['10 m', 53, 50], ['15 m', 60, 50], ['20 m', 69, 50], ['25 m', 82, 40], ['30 m', 90, 40, '001-022'],
      ['40 m', 104, 40, '001-022'], ['50 m', 122, 30, '001-022'], ['60 m', 150, 30, '001-022'], ['70 m', 168, 20, '001-024'],
      ['80 m', 188, 20, '001-024'], ['90 m', 208, 10, '001-024'], ['100 m', 228, 10, '001-024']],
    description: 'Câble HDMI actif à fibre optique pour les longues distances sans perte de signal : salles de réunion, vidéoprojection, murs d’écrans, postes de supervision.',
    features: ['Signal sans perte sur longue distance', 'Câble fin et léger', 'De 10 m à 100 m'],
    specifications: { Technologie: 'Fibre optique active (AOC)', Connecteurs: 'HDMI A mâle / mâle' },
    tags: ['hdmi', 'fibre optique', 'aoc', 'longue distance'],
  },

  // ── VGA / DP / DVI ────────────────────────────────────────────────────
  {
    key: 'vga-3-5', name: 'Câble VGA 3+5 — 1,5 m à 10 m', category: IT, subCategory: CABLES,
    image: '002-026', weightKg: 0.2, variantGroup: 'Longueur',
    variants: [['1,5 m', 2.6, 800], ['3 m', 4, 600], ['5 m', 6, 500], ['10 m', 12, 400]],
    description: 'Câble VGA mâle-mâle 3+5 avec ferrites, pour écrans, vidéoprojecteurs et DVR.',
    specifications: { Type: 'VGA 3+5', Connecteurs: 'VGA mâle / mâle' },
    tags: ['vga', 'câble vga'],
  },
  {
    key: 'vga-3-2', marketLike: 'vga-3-5', name: 'Câble VGA 3+2 économique — 1,5 m à 10 m', category: IT, subCategory: CABLES,
    image: '002-030', weightKg: 0.18, variantGroup: 'Longueur',
    variants: [['1,5 m', 2.1, 800], ['3 m', 3.6, 600], ['5 m', 5, 500], ['10 m', 10, 400]],
    description: 'Câble VGA mâle-mâle 3+2, version économique.',
    specifications: { Type: 'VGA 3+2', Connecteurs: 'VGA mâle / mâle' },
    tags: ['vga', 'câble vga'],
  },
  {
    key: 'vga-3-4-blanc', marketLike: 'vga-3-5', name: 'Câble VGA 3+4 blanc — 1,5 m à 30 m', category: IT, subCategory: CABLES,
    image: '002-028', gallery: ['002-032'], weightKg: 0.2, variantGroup: 'Longueur',
    variants: [['1,5 m', 3.5, 800], ['3 m', 4.8, 600], ['5 m', 7, 500], ['10 m', 11.3, 400],
      ['15 m', 17.5, 350, '002-032'], ['20 m', 25.5, 300, '002-032'], ['25 m', 31, 250, '002-032'], ['30 m', 37, 200, '002-032']],
    description: 'Câble VGA 3+4 blanc avec ferrites, jusqu’à 30 m pour vidéoprojecteurs et salles de classe.',
    specifications: { Type: 'VGA 3+4', Connecteurs: 'VGA mâle / mâle' },
    tags: ['vga', 'câble vga', 'vidéoprojecteur'],
  },
  {
    key: 'displayport-12', marketLike: 'cable-hdmi-vga', name: 'Câble DisplayPort 1.2 — 1,5 m à 5 m', category: IT, subCategory: CABLES,
    image: '002-034', weightKg: 0.15, variantGroup: 'Longueur',
    variants: [['1,5 m', 5, 400], ['3 m', 11.6, 300], ['5 m', 20, 200]],
    description: 'Câble DisplayPort 1.2 mâle-mâle pour écrans PC et cartes graphiques.',
    specifications: { Norme: 'DisplayPort 1.2' },
    tags: ['displayport', 'dp'],
  },
  {
    key: 'dvi-24-1', marketLike: 'cable-hdmi-vga', name: 'Câble DVI 24+1 — 1,5 m à 5 m', category: IT, subCategory: CABLES,
    image: '002-036', weightKg: 0.2, variantGroup: 'Longueur',
    variants: [['1,5 m', 5.8, 400], ['3 m', 7, 300], ['5 m', 9.5, 200]],
    description: 'Câble DVI-D 24+1 dual link mâle-mâle.',
    specifications: { Type: 'DVI-D 24+1' },
    tags: ['dvi'],
  },
  {
    key: 'cable-hdmi-vga', name: 'Câble HDMI vers VGA — 1,5 m à 5 m', category: IT, subCategory: CABLES,
    image: '002-038', weightKg: 0.12, variantGroup: 'Longueur',
    variants: [['1,5 m', 4.7, 400], ['3 m', 7, 300], ['5 m', 9.4, 200]],
    description: 'Câble HDMI mâle vers VGA mâle pour relier un ordinateur ou un décodeur à un écran ou un vidéoprojecteur VGA.',
    tags: ['hdmi vga', 'convertisseur'],
  },
  {
    key: 'cable-hdmi-dvi', marketLike: 'cable-hdmi-vga', name: 'Câble HDMI vers DVI — 1,5 m à 5 m', category: IT, subCategory: CABLES,
    image: '002-042', weightKg: 0.15, variantGroup: 'Longueur',
    variants: [['1,5 m', 4.7, 400], ['3 m', 6, 300], ['5 m', 9.3, 200]],
    description: 'Câble bidirectionnel HDMI mâle vers DVI 24+1 mâle.',
    tags: ['hdmi dvi'],
  },
  {
    key: 'cable-video-divers', name: 'Câble DVI vers VGA / HDMI vers AV (RCA) — 1,5 m', category: IT, subCategory: CABLES,
    image: '002-040', gallery: ['002-044'], weightKg: 0.12, variantGroup: 'Modèle',
    variants: [['DVI vers VGA 1,5 m', 6, 300, '002-040'], ['HDMI vers AV 3 RCA 1,5 m', 4.3, 300, '002-044']],
    description: 'Câbles de conversion vidéo pour anciens écrans et téléviseurs.',
    tags: ['dvi vga', 'hdmi rca'],
  },

  // ── USB ───────────────────────────────────────────────────────────────
  {
    key: 'usb-imprimante', name: 'Câble imprimante USB 2.0 A-B — 1,5 m à 10 m', category: IT, subCategory: CABLES,
    image: '002-046', gallery: ['002-050'], weightKg: 0.08, variantGroup: 'Modèle',
    variants: [['Noir 1,5 m', 1.9, 800, '002-046'], ['Noir 3 m', 3.4, 600, '002-046'], ['Noir 5 m', 5, 400, '002-046'], ['Noir 10 m', 13, 200, '002-046'],
      ['Bleu blindé 1,5 m', 2.8, 800, '002-050'], ['Bleu blindé 3 m', 4.6, 600, '002-050'], ['Bleu blindé 5 m', 6.8, 400, '002-050'], ['Bleu blindé 10 m', 15.5, 200, '002-050']],
    description: 'Câble USB 2.0 type A vers type B pour imprimantes, scanners et périphériques.',
    tags: ['usb', 'câble imprimante'],
  },
  {
    key: 'usb-rallonge', marketLike: 'usb-imprimante', name: 'Rallonge USB 2.0 mâle-femelle — 1,5 m à 10 m', category: IT, subCategory: CABLES,
    image: '002-048', gallery: ['002-052'], weightKg: 0.08, variantGroup: 'Modèle',
    variants: [['Noire 1,5 m', 1.9, 800, '002-048'], ['Noire 3 m', 3.4, 600, '002-048'], ['Noire 5 m', 5, 400, '002-048'], ['Noire 10 m', 13, 200, '002-048'],
      ['Bleue blindée 1,5 m', 2.8, 800, '002-052'], ['Bleue blindée 3 m', 4.6, 600, '002-052'], ['Bleue blindée 5 m', 6.8, 400, '002-052'], ['Bleue blindée 10 m', 15.5, 200, '002-052']],
    description: 'Rallonge USB 2.0 type A mâle vers A femelle.',
    tags: ['usb', 'rallonge usb'],
  },
  {
    key: 'usb-mini', marketLike: 'usb-imprimante', name: 'Câble USB 2.0 vers Mini USB — 1,5 m à 10 m', category: IT, subCategory: CABLES,
    image: '002-054', gallery: ['002-058'], weightKg: 0.08, variantGroup: 'Modèle',
    variants: [['Noir 1,5 m', 1.9, 800, '002-054'], ['Noir 3 m', 3.4, 600, '002-054'], ['Noir 5 m', 5, 400, '002-054'], ['Noir 10 m', 13, 200, '002-054'],
      ['Bleu blindé 1,5 m', 2.8, 800, '002-058'], ['Bleu blindé 3 m', 4.6, 600, '002-058'], ['Bleu blindé 5 m', 6.8, 400, '002-058'], ['Bleu blindé 10 m', 15.5, 200, '002-058']],
    description: 'Câble USB 2.0 type A vers Mini USB pour GPS, appareils photo, disques et lecteurs.',
    tags: ['usb', 'mini usb'],
  },
  {
    key: 'usb-a-a', marketLike: 'usb-imprimante', name: 'Câble USB 2.0 A-A mâle-mâle — 1,5 m à 10 m', category: IT, subCategory: CABLES,
    image: '002-056', gallery: ['002-060'], weightKg: 0.08, variantGroup: 'Modèle',
    variants: [['Noir 1,5 m', 1.9, 800, '002-056'], ['Noir 3 m', 3.4, 600, '002-056'], ['Noir 5 m', 5, 400, '002-056'], ['Noir 10 m', 13, 200, '002-056'],
      ['Bleu blindé 1,5 m', 2.8, 800, '002-060'], ['Bleu blindé 3 m', 4.6, 600, '002-060'], ['Bleu blindé 5 m', 6.8, 400, '002-060'], ['Bleu blindé 10 m', 15.5, 200, '002-060']],
    description: 'Câble USB 2.0 type A mâle vers A mâle.',
    tags: ['usb'],
  },

  // ── Réseau ────────────────────────────────────────────────────────────
  {
    key: 'cordon-rj45-cat5e', marketLike: 'cordon-rj45-cat6', name: 'Cordon réseau RJ45 Cat5e — 1 m à 50 m', category: IT, subCategory: NETWORK, corporate: true,
    image: '003-062', weightKg: 0.05, variantGroup: 'Longueur',
    variants: [['1 m', 0.95, 1000], ['2 m', 1.2, 800], ['3 m', 1.6, 600], ['5 m', 2, 500], ['10 m', 3.6, 400], ['15 m', 5.1, 300],
      ['20 m', 7.3, 300], ['25 m', 9.5, 200], ['30 m', 10.5, 200], ['40 m', 18.5, 100], ['50 m', 22, 100]],
    description: 'Cordon de brassage Ethernet Cat5e serti RJ45 pour box, routeurs, caméras IP et PC.',
    specifications: { Catégorie: 'Cat5e', Connecteurs: 'RJ45 / RJ45' },
    tags: ['rj45', 'câble réseau', 'ethernet', 'cat5e'],
  },
  {
    key: 'cordon-rj45-cat6', name: 'Cordon réseau RJ45 Cat6 — 1 m à 50 m', category: IT, subCategory: NETWORK, corporate: true,
    image: '003-064', weightKg: 0.06, variantGroup: 'Longueur',
    variants: [['1 m', 1.5, 1000], ['2 m', 1.9, 800], ['3 m', 2.5, 600], ['5 m', 3.4, 500], ['10 m', 6.2, 400], ['15 m', 9.3, 300],
      ['20 m', 13, 300], ['25 m', 16, 200], ['30 m', 19, 200], ['40 m', 23, 100], ['50 m', 29, 100]],
    description: 'Cordon de brassage Ethernet Cat6 serti RJ45, Gigabit, pour réseaux d’entreprise et vidéosurveillance IP.',
    specifications: { Catégorie: 'Cat6', Connecteurs: 'RJ45 / RJ45' },
    tags: ['rj45', 'câble réseau', 'ethernet', 'cat6'],
  },
  {
    key: 'bobine-cat5e-305m', marketLike: 'bobine-cat6-305m', name: 'Bobine câble réseau Cat5e 305 m (UTP, FTP, SFTP, extérieur)', category: IT, subCategory: NETWORK, corporate: true,
    image: '003-066', gallery: ['003-068', '003-070', '003-072', '003-076', '003-080'], weightKg: 9, volumeM3: 0.026, variantGroup: 'Type',
    variants: [['Intérieur UTP', 110, 30, '003-066'], ['Intérieur FTP', 140, 30, '003-068'], ['Intérieur SFTP', 180, 30, '003-070'],
      ['Extérieur UTP', 160, 30, '003-072'], ['Extérieur FTP', 200, 30, '003-076'], ['Extérieur SFTP', 255, 30, '003-080']],
    description: 'Câble réseau Cat5e 26 AWG en bobine de 305 m pour le câblage de bâtiments, de caméras IP et de baies. Versions non blindée, blindée et extérieure.',
    specifications: { Catégorie: 'Cat5e', Section: '26 AWG', Longueur: '305 m' },
    tags: ['bobine', 'câble réseau', 'cat5e', '305m', 'vidéosurveillance'],
  },
  {
    key: 'bobine-cat6-305m', name: 'Bobine câble réseau Cat6 305 m (UTP, FTP, SFTP, extérieur)', category: IT, subCategory: NETWORK, corporate: true,
    image: '003-067', gallery: ['003-069', '003-071', '003-074', '003-078', '003-082'], weightKg: 11, volumeM3: 0.03, variantGroup: 'Type',
    variants: [['Intérieur UTP', 140, 30, '003-067'], ['Intérieur FTP', 177, 30, '003-069'], ['Intérieur SFTP', 211, 30, '003-071'],
      ['Extérieur UTP', 180, 30, '003-074'], ['Extérieur FTP', 225, 30, '003-078'], ['Extérieur SFTP', 280, 30, '003-082']],
    description: 'Câble réseau Cat6 24 AWG en bobine de 305 m, Gigabit, pour le câblage structuré et la vidéosurveillance IP. Versions non blindée, blindée et extérieure.',
    specifications: { Catégorie: 'Cat6', Section: '24 AWG', Longueur: '305 m' },
    tags: ['bobine', 'câble réseau', 'cat6', '305m', 'vidéosurveillance'],
  },
  {
    key: 'connecteurs-rj45', name: 'Connecteurs RJ45 à sertir Cat5e / Cat6 — sachet de 100', category: IT, subCategory: NETWORK, corporate: true,
    image: '007-298', weightKg: 0.25, packOf: 100, variantGroup: 'Catégorie',
    variants: [['Cat5e (100 pcs)', 0.11, 1000], ['Cat6 (100 pcs)', 0.2, 1000]],
    description: 'Fiches RJ45 8P8C à sertir, vendues par sachet de 100.',
    tags: ['rj45', 'connecteur', 'sertissage'],
  },
  {
    key: 'coupleur-rj45', name: 'Coupleur RJ45 femelle-femelle / doubleur 1 vers 2', category: IT, subCategory: NETWORK, corporate: true,
    image: '007-291', gallery: ['007-293'], weightKg: 0.02, variantGroup: 'Modèle',
    variants: [['Coupleur F/F', 1.65, 100, '007-291'], ['Doubleur 1 vers 2', 3.5, 100, '007-293']],
    description: 'Raccord RJ45 pour rallonger un câble réseau, ou doubleur 1 vers 2.',
    tags: ['rj45', 'coupleur'],
  },
  {
    key: 'repartiteur-rj45-gigabit', name: 'Répartiteur Ethernet RJ45 Gigabit 1 vers 2, 3, 4 ou 7', category: IT, subCategory: NETWORK, corporate: true,
    image: '007-295', weightKg: 0.12, variantGroup: 'Sorties',
    variants: [['1 vers 2', 22, 100], ['1 vers 3', 29, 100], ['1 vers 4', 32, 50], ['1 vers 7', 82, 50]],
    description: 'Boîtier répartiteur réseau 1000 Mbps pour partager une prise Ethernet entre plusieurs appareils.',
    specifications: { Débit: '1000 Mbps' },
    tags: ['rj45', 'ethernet', 'splitter'],
  },
  {
    key: 'pince-sertir-rj45', name: 'Pince à sertir RJ45 / RJ11', category: IT, subCategory: NETWORK, corporate: true,
    image: '007-294', gallery: ['007-296', '007-297'], weightKg: 0.35, variantGroup: 'Modèle',
    variants: [['Modèle 315', 9.5, 100, '007-294'], ['Modèle 376', 11.5, 100, '007-296'], ['Modèle 6088', 24, 100, '007-297']],
    description: 'Pince à sertir pour connecteurs réseau RJ45 et téléphoniques, avec dénudeur et coupe-câble.',
    tags: ['pince à sertir', 'outillage', 'rj45'],
  },
  {
    key: 'kit-outils-reseau', name: 'Kit d’outils réseau en trousse', category: IT, subCategory: NETWORK, corporate: true,
    image: '007-292', weightKg: 0.8, variantGroup: 'Modèle',
    variants: [['Kit complet', 46, 50]],
    description: 'Trousse d’outillage pour l’installation réseau : pince à sertir, testeur de câble, outil d’insertion et accessoires.',
    tags: ['outillage', 'testeur réseau', 'installation'],
  },
  {
    key: 'adaptateur-usb-rj45', name: 'Adaptateur réseau USB / USB-C vers RJ45 (100 Mbps ou Gigabit)', category: IT, subCategory: NETWORK, corporate: true,
    image: '005-218', gallery: ['005-222'], weightKg: 0.05, variantGroup: 'Modèle',
    variants: [['USB 2.0 — 100 Mbps', 10, 100, '005-218'], ['USB 3.0 — 1000 Mbps', 23, 100, '005-218'],
      ['USB-C — 100 Mbps', 11, 100, '005-222'], ['USB-C — 1000 Mbps', 24, 100, '005-222']],
    description: 'Carte réseau externe pour ordinateur portable sans prise Ethernet.',
    tags: ['usb ethernet', 'rj45', 'usb-c'],
  },

  // ── Alimentation ──────────────────────────────────────────────────────
  {
    key: 'cable-alimentation-eu', name: 'Câble d’alimentation secteur EU (C7, C5, C13)', category: IT, subCategory: CABLES,
    image: '003-084', gallery: ['003-088', '003-092'], weightKg: 0.12, variantGroup: 'Connecteur',
    variants: [['C7 « en 8 » — 1 m', 1.6, 1000, '003-084'], ['C5 « trèfle » — 1,5 m', 3.5, 800, '003-088'], ['C13 PC / écran — 1,5 m', 3.4, 800, '003-092']],
    description: 'Cordon secteur prise européenne pour TV, décodeurs, chargeurs de PC portables, ordinateurs, écrans et imprimantes.',
    tags: ['câble alimentation', 'cordon secteur', 'c13'],
  },
  {
    key: 'adaptateur-secteur-mural', name: 'Adaptateur secteur mural 5 V / 9 V / 12 V (1 à 3 A)', category: CE, subCategory: 'Électronique divers', corporate: true,
    image: '004-124', weightKg: 0.12, variantGroup: 'Tension / courant',
    variants: [['5 V 1 A', 5.3, 250], ['5 V 2 A', 5.8, 250], ['9 V 1 A', 5.6, 250], ['9 V 2 A', 6.1, 250],
      ['12 V 1 A', 5.8, 250], ['12 V 2 A', 7, 250], ['12 V 3 A', 10.8, 250]],
    description: 'Bloc d’alimentation à découpage prise EU pour caméras de surveillance, box, routeurs, rubans LED et petits appareils.',
    tags: ['alimentation 12v', 'adaptateur secteur', 'caméra', 'chargeur'],
  },
  {
    key: 'alimentation-table-12v-15v', name: 'Bloc d’alimentation de table 12 V (4–5 A) / 15 V (1–3 A)', category: CE, subCategory: 'Électronique divers', corporate: true,
    image: '004-128', weightKg: 0.3, variantGroup: 'Tension / courant',
    variants: [['12 V 4 A', 13.8, 250], ['12 V 5 A', 16, 250], ['15 V 1 A', 8.8, 250], ['15 V 2 A', 9.1, 250], ['15 V 3 A', 11.3, 250]],
    description: 'Alimentation de table avec cordon EU pour enregistreurs DVR/NVR, plusieurs caméras, écrans et rubans LED.',
    tags: ['alimentation 12v', 'dvr', 'nvr', 'led'],
  },
  {
    key: 'multiprise-eu', name: 'Multiprise EU avec interrupteur — 3, 4 ou 5 prises', category: CE, subCategory: 'Électronique divers',
    image: '006-266', weightKg: 0.45, variantGroup: 'Prises',
    variants: [['3 prises', 8.6, 100], ['4 prises', 10, 100], ['5 prises', 11.4, 100]],
    description: 'Bloc multiprise aux normes européennes avec interrupteur lumineux.',
    tags: ['multiprise', 'rallonge électrique'],
  },
  {
    key: 'protecteur-tension-eu', name: 'Protecteur de tension EU (réfrigérateur, TV, climatiseur)', category: CE, subCategory: 'Électronique divers', corporate: true,
    image: '006-270', weightKg: 0.2, variantGroup: 'Modèle',
    variants: [['Prise EU', 16.4, 400]],
    description: 'Protège les appareils des surtensions, sous-tensions et coupures avec temporisation au retour du courant.',
    tags: ['protecteur de tension', 'surtension', 'réfrigérateur'],
  },

  // ── Audio ─────────────────────────────────────────────────────────────
  {
    key: 'audio-jack-35', name: 'Câble audio jack 3,5 mm mâle-mâle — 1,5 m à 10 m', category: CE, subCategory: 'Audio & Vidéo',
    image: '004-108', weightKg: 0.05, variantGroup: 'Longueur',
    variants: [['1,5 m', 1.3, 800], ['3 m', 2, 600], ['5 m', 3.2, 400], ['10 m', 6.1, 200]],
    description: 'Câble auxiliaire stéréo jack 3,5 mm pour enceintes, autoradios et casques.',
    tags: ['jack', 'aux', 'audio'],
  },
  {
    key: 'audio-rallonge-jack-35', name: 'Rallonge audio jack 3,5 mm mâle-femelle — 1,5 m à 10 m', category: CE, subCategory: 'Audio & Vidéo',
    image: '004-110', weightKg: 0.05, variantGroup: 'Longueur',
    variants: [['1,5 m', 1.4, 800], ['3 m', 2.1, 600], ['5 m', 3.3, 400], ['10 m', 6.6, 200]],
    description: 'Rallonge stéréo jack 3,5 mm pour casques et micros.',
    tags: ['jack', 'rallonge audio'],
  },
  {
    key: 'audio-jack-rca', name: 'Câble jack 3,5 mm vers RCA (2 ou 3 RCA) — 1,5 m à 10 m', category: CE, subCategory: 'Audio & Vidéo',
    image: '004-112', gallery: ['004-114'], weightKg: 0.07, variantGroup: 'Modèle',
    variants: [['2 RCA 1,5 m', 1.6, 800, '004-112'], ['2 RCA 3 m', 2.2, 600, '004-112'], ['2 RCA 5 m', 3.4, 400, '004-112'], ['2 RCA 10 m', 7.7, 200, '004-112'],
      ['3 RCA 1,5 m', 2.1, 800, '004-114'], ['3 RCA 3 m', 4, 600, '004-114'], ['3 RCA 5 m', 6.3, 400, '004-114'], ['3 RCA 10 m', 9.7, 200, '004-114']],
    description: 'Câble jack 3,5 mm vers RCA pour relier un téléphone, un PC ou un décodeur à un ampli ou une chaîne hi-fi.',
    tags: ['rca', 'jack', 'audio'],
  },
  {
    key: 'audio-rca-rca', name: 'Câble RCA vers RCA (2 ou 3 fiches) — 1,5 m à 10 m', category: CE, subCategory: 'Audio & Vidéo',
    image: '004-116', gallery: ['004-118'], weightKg: 0.08, variantGroup: 'Modèle',
    variants: [['2 RCA 1,5 m', 1.6, 800, '004-116'], ['2 RCA 3 m', 2.6, 600, '004-116'], ['2 RCA 5 m', 4, 400, '004-116'], ['2 RCA 10 m', 8.2, 200, '004-116'],
      ['3 RCA 1,5 m', 2, 800, '004-118'], ['3 RCA 3 m', 3.4, 600, '004-118'], ['3 RCA 5 m', 5.3, 400, '004-118'], ['3 RCA 10 m', 10, 200, '004-118']],
    description: 'Câble audio/vidéo RCA (cinch) pour TV, décodeurs, DVD et amplis.',
    tags: ['rca', 'cinch', 'audio vidéo'],
  },

  // ── Stockage ──────────────────────────────────────────────────────────
  {
    key: 'adaptateur-usb-sata', name: 'Adaptateur USB vers SATA pour disque dur et SSD', category: IT, subCategory: 'Accessoires informatiques',
    image: '004-120', gallery: ['004-122'], weightKg: 0.1, variantGroup: 'Modèle',
    variants: [['USB 2.0', 7.2, 100, '004-120'], ['USB 2.0 + alimentation DC', 7.4, 100, '004-120'], ['Double USB 2.0', 8, 100, '004-120'], ['Double USB 2.0 + alimentation DC', 8.3, 100, '004-120'],
      ['USB 3.0', 9.7, 100, '004-122'], ['USB 3.0 + alimentation DC', 10, 100, '004-122'], ['Double USB 3.0', 10.8, 100, '004-122'], ['Double USB 3.0 + alimentation DC', 11.1, 100, '004-122']],
    description: 'Câble adaptateur pour brancher un disque dur ou un SSD SATA en USB : récupération de données, clonage, stockage externe.',
    tags: ['sata', 'disque dur', 'ssd', 'usb'],
  },

  // ── Convertisseurs ────────────────────────────────────────────────────
  {
    key: 'convertisseur-hdmi-vga', name: 'Convertisseur HDMI vers VGA', category: IT, subCategory: CABLES,
    image: '005-140', gallery: ['005-132', '005-202'], weightKg: 0.06, variantGroup: 'Modèle',
    variants: [['Adaptateur compact', 5.2, 100, '005-140'], ['Câble 1,8 m avec puce', 8.6, 100, '005-132'], ['Boîtier convertisseur', 8.5, 100, '005-202']],
    description: 'Convertit une sortie HDMI (PC, décodeur, console) vers un écran ou un vidéoprojecteur VGA.',
    tags: ['hdmi vga', 'convertisseur'],
  },
  {
    key: 'convertisseur-displayport', name: 'Adaptateur DisplayPort vers HDMI, VGA ou DVI', category: IT, subCategory: CABLES,
    image: '005-144', gallery: ['005-160', '005-138', '005-148', '005-136', '005-168', '005-142', '005-180'], weightKg: 0.06, variantGroup: 'Modèle',
    variants: [['DP vers HDMI (mini)', 4, 100, '005-160'], ['DP vers HDMI', 5.7, 100, '005-144'], ['DP vers HDMI câble 1,8 m', 6.7, 100, '005-138'],
      ['DP vers VGA', 6.6, 100, '005-148'], ['DP vers VGA câble 1,8 m', 9.2, 100, '005-136'], ['DP vers DVI', 7, 100, '005-168'],
      ['DP vers HDMI + VGA', 19, 100, '005-142'], ['DP vers HDMI + VGA + DVI', 21, 100, '005-180']],
    description: 'Adaptateurs pour sorties DisplayPort de PC de bureau et portables professionnels.',
    tags: ['displayport', 'dp hdmi', 'adaptateur'],
  },
  {
    key: 'convertisseur-mini-displayport', name: 'Adaptateur Mini DisplayPort vers HDMI, VGA ou DVI', category: IT, subCategory: CABLES,
    image: '005-156', gallery: ['005-134', '005-146', '005-184'], weightKg: 0.06, variantGroup: 'Modèle',
    variants: [['Mini DP vers HDMI', 6.2, 100, '005-156'], ['Mini DP vers HDMI câble 1,8 m', 7.1, 100, '005-134'],
      ['Mini DP vers HDMI + VGA + DVI', 22, 100, '005-184'], ['Mini DP vers HDMI + VGA', 29.7, 100, '005-146']],
    description: 'Adaptateurs pour sorties Mini DisplayPort (MacBook, Surface, PC portables).',
    tags: ['mini displayport', 'thunderbolt', 'adaptateur'],
  },
  {
    key: 'convertisseur-vga-hdmi', name: 'Convertisseur VGA vers HDMI avec audio', category: IT, subCategory: CABLES,
    image: '005-172', gallery: ['005-188', '005-206'], weightKg: 0.08, variantGroup: 'Modèle',
    variants: [['Adaptateur compact', 8.5, 100, '005-188'], ['Boîtier convertisseur', 10, 100, '005-206'], ['Câble avec audio et USB', 13, 100, '005-172']],
    description: 'Relie un ancien PC à sortie VGA à une TV ou un écran HDMI, son compris.',
    tags: ['vga hdmi', 'convertisseur'],
  },
  {
    key: 'convertisseur-hdmi-displayport', name: 'Convertisseur HDMI vers DisplayPort', category: IT, subCategory: CABLES,
    image: '005-176', weightKg: 0.08, variantGroup: 'Modèle',
    variants: [['HDMI vers DP', 35, 100]],
    description: 'Convertisseur actif d’une source HDMI vers un écran DisplayPort.',
    tags: ['hdmi displayport', 'convertisseur'],
  },
  {
    key: 'hub-usb-c', name: 'Hub USB-C multiport (HDMI, VGA, USB 3.0, 5 à 11 en 1)', category: IT, subCategory: 'Accessoires informatiques',
    image: '005-162', gallery: ['005-152', '005-158', '005-154', '005-166', '005-170', '005-174', '005-178'], weightKg: 0.1, variantGroup: 'Modèle',
    variants: [['USB-C vers HDMI', 11, 100, '005-152'], ['USB-C vers USB 3.0 + HDMI + USB-C', 15, 100, '005-154'], ['USB-C vers HDMI + VGA', 22, 100, '005-158'],
      ['5 en 1', 26, 100, '005-162'], ['6 en 1', 25, 100, '005-166'], ['7 en 1', 24, 100, '005-170'], ['8 en 1', 27, 100, '005-174'], ['11 en 1', 52, 100, '005-178']],
    description: 'Station d’accueil USB-C pour ordinateurs portables, tablettes et smartphones : sorties vidéo, ports USB et plus selon le modèle.',
    tags: ['usb-c', 'hub', 'dock', 'macbook'],
  },
  {
    key: 'adaptateur-video-usb3', name: 'Adaptateur vidéo USB 3.0 vers HDMI / VGA', category: IT, subCategory: 'Accessoires informatiques',
    image: '005-164', gallery: ['005-150'], weightKg: 0.08, variantGroup: 'Modèle',
    variants: [['USB 3.0 vers HDMI', 28, 100, '005-164'], ['USB 3.0 vers HDMI + VGA + audio', 38, 100, '005-150']],
    description: 'Ajoute un écran supplémentaire à un PC via un port USB 3.0.',
    tags: ['usb hdmi', 'double écran'],
  },
  {
    key: 'hub-usb3', name: 'Hub USB 3.0 — 4 ou 7 ports', category: IT, subCategory: 'Accessoires informatiques',
    image: '005-220', weightKg: 0.1, variantGroup: 'Ports',
    variants: [['4 ports', 7.2, 100], ['7 ports', 10.6, 100]],
    description: 'Multiplicateur de ports USB 3.0 pour PC et ordinateurs portables.',
    tags: ['hub usb', 'usb 3.0'],
  },
  {
    key: 'convertisseur-analogique', name: 'Convertisseur audio/vidéo HDMI, AV (RCA), VGA, Péritel', category: CE, subCategory: 'Audio & Vidéo',
    image: '005-194', gallery: ['005-198', '005-210', '005-214', '005-182'], weightKg: 0.12, variantGroup: 'Modèle',
    variants: [['HDMI vers AV (RCA)', 10.7, 100, '005-194'], ['AV (RCA) vers HDMI', 16.4, 100, '005-198'], ['AV vers VGA', 15.7, 100, '005-210'],
      ['VGA vers AV', 15.7, 100, '005-214'], ['Péritel vers HDMI', 32.1, 100, '005-182'], ['HDMI vers Péritel', 32.1, 100, '005-182']],
    description: 'Boîtiers de conversion pour relier anciens et nouveaux équipements : TV cathodiques, décodeurs, caméras analogiques, vidéoprojecteurs.',
    tags: ['convertisseur', 'rca', 'av', 'péritel', 'scart'],
  },
  {
    key: 'adaptateur-console-hdmi', name: 'Adaptateur console Wii / PS2 vers HDMI', category: CE, subCategory: 'Audio & Vidéo',
    image: '005-186', gallery: ['005-190'], weightKg: 0.05, variantGroup: 'Console',
    variants: [['Wii vers HDMI', 9.5, 100, '005-186'], ['PS2 vers HDMI', 10, 100, '005-190']],
    description: 'Branche une console Wii ou PS2 sur une TV HDMI récente.',
    tags: ['wii', 'ps2', 'console', 'hdmi'],
  },
  {
    key: 'raccords-hdmi-dvi', name: 'Raccords HDMI, Mini/Micro HDMI et DVI', category: IT, subCategory: CABLES,
    image: '005-192', gallery: ['005-196', '005-200', '005-204', '005-208', '005-212', '005-216'], weightKg: 0.02, variantGroup: 'Modèle',
    variants: [['Coupleur HDMI femelle-femelle', 1.5, 100, '005-192'], ['Mini HDMI mâle vers HDMI femelle', 2.2, 100, '005-196'],
      ['Micro HDMI mâle vers HDMI femelle', 2.2, 100, '005-200'], ['HDMI mâle-femelle coudé', 2.4, 100, '005-204'],
      ['DVI 24+1 mâle vers HDMI femelle', 3.1, 100, '005-208'], ['DVI 24+1 mâle vers HDMI mâle', 3.6, 100, '005-212'], ['DVI 24+1 mâle vers VGA femelle', 2.6, 100, '005-216']],
    description: 'Petits adaptateurs et rallonges pour câbles HDMI et DVI.',
    tags: ['adaptateur hdmi', 'coupleur', 'dvi'],
  },

  // ── HDMI : répartition, extension, commutation, acquisition ───────────
  {
    key: 'splitter-hdmi-1080p', name: 'Répartiteur (splitter) HDMI 1080p — 1 vers 2 ou 4', category: IT, subCategory: CABLES,
    image: '006-228', gallery: ['006-224', '006-232'], weightKg: 0.25, variantGroup: 'Modèle',
    variants: [['Câble 1 vers 2', 5.5, 100, '006-224'], ['Boîtier 1 vers 2 (modèle A)', 15, 100, '006-228'], ['Boîtier 1 vers 4 (modèle A)', 19, 100, '006-228'],
      ['Boîtier 1 vers 2 (modèle B)', 18, 100, '006-232'], ['Boîtier 1 vers 4 (modèle B)', 21, 100, '006-232']],
    description: 'Duplique une source HDMI sur plusieurs écrans : vitrines, salles d’attente, restaurants.',
    tags: ['splitter hdmi', 'répartiteur', 'affichage'],
  },
  {
    key: 'splitter-hdmi-4k', name: 'Répartiteur (splitter) HDMI 4K — 1 vers 2, 4, 8 ou 16', category: IT, subCategory: CABLES, corporate: true,
    image: '006-236', weightKg: 0.3, variantGroup: 'Sorties',
    variants: [['1 vers 2', 22, 100], ['1 vers 4', 29, 100], ['1 vers 8', 54, 50], ['1 vers 16', 160, 20]],
    description: 'Splitter HDMI 4K pour affichage dynamique et murs d’écrans.',
    tags: ['splitter hdmi', '4k', 'affichage dynamique'],
  },
  {
    key: 'extendeur-hdmi-rj45', name: 'Extendeur HDMI sur câble réseau RJ45 — 30 m / 60 m', category: IT, subCategory: CABLES, corporate: true,
    image: '006-242', gallery: ['006-246'], weightKg: 0.3, variantGroup: 'Modèle',
    variants: [['30 m', 5.5, 100, '006-242'], ['60 m', 34, 100, '006-242'], ['60 m (modèle boîtier)', 37, 50, '006-246']],
    description: 'Transporte un signal HDMI sur un câble réseau Cat5e/Cat6 jusqu’à l’écran distant.',
    tags: ['extendeur hdmi', 'hdmi rj45', 'cat6'],
  },
  {
    key: 'extendeur-kvm-hdmi', name: 'Extendeur KVM HDMI (écran, clavier, souris) — 60 m à 300 m', category: IT, subCategory: CABLES, corporate: true,
    image: '006-250', gallery: ['006-254', '006-258', '006-262'], weightKg: 0.6, variantGroup: 'Modèle',
    variants: [['60 m avec audio', 90, 50, '006-250'], ['4K 120 m', 175, 20, '006-254'], ['IP 200 m', 215, 20, '006-258'], ['IP 300 m', 235, 20, '006-262']],
    description: 'Déporte écran, clavier et souris d’un PC ou d’un serveur sur câble réseau : salles serveurs, postes de supervision, bornes.',
    tags: ['kvm', 'extendeur', 'supervision'],
  },
  {
    key: 'transmetteur-hdmi-sans-fil', name: 'Transmetteur HDMI sans fil — 50 m à 200 m', category: IT, subCategory: CABLES, corporate: true,
    image: '006-226', gallery: ['006-230'], weightKg: 0.5, variantGroup: 'Portée',
    variants: [['50 m', 235, 10, '006-226'], ['150 m', 328, 10, '006-226'], ['200 m', 371, 10, '006-230']],
    description: 'Émetteur + récepteur HDMI sans fil pour vidéoprojecteurs, écrans de salle et événements, sans tirer de câble.',
    tags: ['hdmi sans fil', 'wireless hdmi', 'événementiel'],
  },
  {
    key: 'switch-hdmi', name: 'Sélecteur (switch) HDMI — 2, 3 ou 5 entrées', category: IT, subCategory: CABLES,
    image: '006-240', gallery: ['006-234', '006-238'], weightKg: 0.15, variantGroup: 'Modèle',
    variants: [['2 vers 1', 11, 100, '006-234'], ['3 vers 1 (câble)', 12, 100, '006-238'], ['3 vers 1 (boîtier)', 15, 100, '006-240'], ['5 vers 1', 20, 100, '006-240']],
    description: 'Branche plusieurs sources HDMI (décodeur, console, PC) sur une seule entrée TV.',
    tags: ['switch hdmi', 'sélecteur'],
  },
  {
    key: 'carte-acquisition-video', name: 'Carte d’acquisition vidéo HDMI / AV vers USB', category: IT, subCategory: 'Accessoires informatiques',
    image: '006-244', gallery: ['006-248', '006-252', '006-256'], weightKg: 0.06, variantGroup: 'Modèle',
    variants: [['HDMI vers USB 2.0', 16, 100, '006-244'], ['HDMI vers USB 2.0 avec câble', 24, 100, '006-248'],
      ['HDMI vers USB 3.0', 45, 100, '006-252'], ['AV (RCA) vers USB 2.0', 16, 100, '006-256']],
    description: 'Enregistre ou diffuse en direct une source HDMI ou analogique sur PC : streaming, visioconférence, numérisation de cassettes.',
    tags: ['capture vidéo', 'streaming', 'obs'],
  },
  {
    key: 'repeteur-hdmi', name: 'Répéteur (amplificateur) HDMI', category: IT, subCategory: CABLES,
    image: '006-260', weightKg: 0.05, variantGroup: 'Modèle',
    variants: [['Répéteur HDMI', 12, 100]],
    description: 'Amplifie le signal HDMI entre deux câbles pour allonger la distance.',
    tags: ['répéteur hdmi', 'amplificateur'],
  },
  {
    key: 'extendeur-usb-rj45', name: 'Extendeur USB 2.0 sur câble RJ45 — 50 m', category: IT, subCategory: 'Accessoires informatiques', corporate: true,
    image: '006-264', weightKg: 0.15, variantGroup: 'Modèle',
    variants: [['50 m', 10.5, 100]],
    description: 'Prolonge une liaison USB (webcam, clavier, imprimante) jusqu’à 50 m sur câble réseau.',
    tags: ['extendeur usb', 'rj45'],
  },

  // ── Claviers et souris (sans marque) ──────────────────────────────────
  {
    key: 'clavier-ensemble', name: 'Clavier USB et ensemble clavier + souris (filaire ou sans fil)', category: IT, subCategory: 'Claviers',
    image: '007-299', gallery: ['007-305', '007-307'], weightKg: 0.6, variantGroup: 'Modèle',
    variants: [['Clavier filaire 880', 15, 60, '007-299'], ['Ensemble filaire 880', 23, 60, '007-305'], ['Ensemble sans fil 901', 38, 60, '007-307']],
    description: 'Claviers et ensembles bureautiques pour postes de travail, écoles et cybercafés.',
    tags: ['clavier', 'souris', 'bureautique'],
  },
  {
    key: 'souris-usb', name: 'Souris USB filaire ou sans fil', category: IT, subCategory: 'Souris',
    image: '007-300', gallery: ['007-306'], weightKg: 0.08, variantGroup: 'Modèle',
    variants: [['Filaire M20', 6, 100, '007-300'], ['Sans fil', 10, 100, '007-306']],
    description: 'Souris optique pour ordinateur, filaire USB ou sans fil avec récepteur.',
    tags: ['souris', 'bureautique'],
  },
]

export const ZHILIAN_PRICELIST: SupplierPricelist = {
  id: 'zhilian',
  supplier: SUPPLIER,
  imageBase: '/images/suppliers/zhilian',
  families: FAMILIES,
  market: ZHILIAN_MARKET,
  questions: ZHILIAN_QUESTIONS,
}
