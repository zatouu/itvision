import { NextResponse } from 'next/server'
import { CORPORATE_BRAND } from '@/lib/branding'

interface SectorTemplate {
  sector: string
  label: string
  subject: string
  html: string
  text: string
}

const brand = CORPORATE_BRAND
const primary = brand.primaryColor || '#0f766e'
const secondary = brand.secondaryColor || '#047857'

const baseStyles = `
  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background: linear-gradient(135deg, ${primary} 0%, ${secondary} 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
  .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
  .services { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .service-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
  .service-item:last-child { border-bottom: none; }
  .button { display: inline-block; background: linear-gradient(135deg, ${primary} 0%, ${secondary} 100%); color: white; padding: 15px 35px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; font-size: 16px; }
  .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
  .contact-box { background: #e5f3ff; border: 1px solid #b3d9ff; padding: 15px; border-radius: 8px; margin: 20px 0; }
`

function wrapHtml(title: string, intro: string, services: string[], ctaText: string): string {
  const servicesHtml = services.map(s => `<div class="service-item">✅ ${s}</div>`).join('')
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title>
<style>${baseStyles}</style></head>
<body>
<div class="container">
  <div class="header">
    <h1>${brand.name}</h1>
    <p>${brand.tagline}</p>
  </div>
  <div class="content">
    <h2>Bonjour {{contactName}},</h2>
    <p>${intro}</p>
    <div class="services">
      <h3>Nos services pour votre secteur :</h3>
      ${servicesHtml}
    </div>
    <p>Nous proposons également :</p>
    <ul>
      <li>🔧 Audit sécurité gratuit sur site</li>
      <li>📋 Devis détaillé sous 48h</li>
      <li>🛠️ Installation par des techniciens certifiés</li>
      <li>🔄 Maintenance préventive et corrective</li>
      <li>📞 Support technique 7j/7</li>
    </ul>
    <div style="text-align: center;">
      <a href="${brand.url}" class="button">${ctaText}</a>
    </div>
    <div class="contact-box">
      <p><strong>Contactez-nous directement :</strong></p>
      <p>📧 ${brand.contactEmail}<br>
      📱 WhatsApp : ${brand.whatsapp}<br>
      🌐 ${brand.url.replace(/^https?:\/\//, '')}</p>
    </div>
    <p>Nous serions ravis d'échanger sur vos besoins et de vous proposer une solution adaptée à votre budget.</p>
    <p>Cordialement,<br>L'équipe ${brand.name}</p>
  </div>
  <div class="footer">
    <p>© ${new Date().getFullYear()} ${brand.name} — ${brand.address}</p>
  </div>
</div>
</body>
</html>`
}

const TEMPLATES: SectorTemplate[] = [
  {
    sector: 'immobilier',
    label: 'Immobilier & Promotion',
    subject: 'Sécurisez vos résidences et immeubles — {{companyName}}',
    html: wrapHtml(
      'Sécurité Immobilier',
      'Nous savons à quel point la sécurité de vos résidents et la protection de vos biens immobiliers sont prioritaires. Chez ' + brand.name + ', nous accompagnons les promoteurs et gestionnaires immobiliers du Sénégal avec des solutions de vidéosurveillance, contrôle d\'accès et alarme sur mesure.',
      [
        'Vidéosurveillance HD pour parkings et parties communes',
        'Contrôle d\'accès par badge/biométrie pour immeubles',
        'Alarme intrusion et anti-incendie',
        'Domotique pour résidences haut standing',
        'Interphone et vidéo-portier IP',
      ],
      'Demander un audit gratuit'
    ),
    text: `Bonjour {{contactName}},

Nous savons que la sécurité de vos résidents et biens immobiliers est une priorité.

Chez ${brand.name}, nous accompagnons les promoteurs et gestionnaires immobiliers avec :
- Vidéosurveillance HD pour parkings et parties communes
- Contrôle d'accès par badge/biométrie
- Alarme intrusion et anti-incendie
- Domotique pour résidences haut standing

Découvrez nos solutions : ${brand.url}
Contact : ${brand.contactEmail} | WhatsApp : ${brand.whatsapp}

Cordialement,
L'équipe ${brand.name}`,
  },
  {
    sector: 'banque_finance',
    label: 'Banque & Finance',
    subject: 'Solutions de sécurité électronique pour {{companyName}}',
    html: wrapHtml(
      'Sécurité Banque & Finance',
      'La sécurité de vos agences, coffres-forts et données est critique. ' + brand.name + ' propose des solutions de vidéosurveillance haute sécurité, contrôle d\'accès biométrique et alarme connectée adaptées aux exigences du secteur bancaire sénégalais.',
      [
        'Vidéosurveillance 24/7 avec enregistrement cloud',
        'Contrôle d\'accès biométrique pour zones sensibles',
        'Alarme anti-intrusion avec transmission centrale',
        'Détection d\'incendie et extinction automatique',
        'Réseau sécurisé et caméras IP chiffrées',
      ],
      'Demander une consultation'
    ),
    text: `Bonjour {{contactName}},

La sécurité de vos agences et coffres-forts est critique.

${brand.name} propose :
- Vidéosurveillance 24/7 avec enregistrement cloud
- Contrôle d'accès biométrique
- Alarme anti-intrusion avec transmission centrale
- Détection d'incendie

Découvrez nos solutions : ${brand.url}
Contact : ${brand.contactEmail} | WhatsApp : ${brand.whatsapp}

Cordialement,
L'équipe ${brand.name}`,
  },
  {
    sector: 'commerce_detail',
    label: 'Commerce de détail',
    subject: 'Protégez votre magasin — Solutions sur mesure pour {{companyName}}',
    html: wrapHtml(
      'Sécurité Commerce',
      'Vols, effractions, litiges clients — la sécurité d\'un commerce au Sénégal nécessite des solutions efficaces et abordables. ' + brand.name + ' installe des systèmes de vidéosurveillance, alarme et contrôle d\'accessibilité adaptés aux magasins et supermarchés.',
      [
        'Caméras de surveillance avec vision nocturne',
        'Alarme anti-intrusion avec notification SMS',
        'Système anti-vol pour rayons',
        'Vidéosurveillance accessible depuis smartphone',
        'Contrôle d\'accès pour stock et réserves',
      ],
      'Demander un devis gratuit'
    ),
    text: `Bonjour {{contactName}},

Vols et effractions — la sécurité de votre commerce nécessite des solutions efficaces.

${brand.name} installe :
- Caméras avec vision nocturne
- Alarme anti-intrusion avec notification SMS
- Système anti-vol pour rayons
- Vidéosurveillance accessible depuis smartphone

Demandez votre devis : ${brand.url}
Contact : ${brand.contactEmail} | WhatsApp : ${brand.whatsapp}

Cordialement,
L'équipe ${brand.name}`,
  },
  {
    sector: 'hotellerie',
    label: 'Hôtellerie & Tourisme',
    subject: 'Sécurité et confort pour vos clients — {{companyName}}',
    html: wrapHtml(
      'Sécurité Hôtellerie',
      'Vos clients méritent un séjour sûr et confortable. ' + brand.name + ' équipe hôtels et résidences de tourisme avec vidéosurveillance discrète, contrôle d\'accès par carte, domotique pour chambres et alarme incendie conforme.',
      [
        'Vidéosurveillance discrète pour halls et couloirs',
        'Contrôle d\'accès par carte magnétique',
        'Domotique pour chambres (éclairage, climatisation, volets)',
        'Alarme incendie conforme aux normes',
        'Système de sonnerie et interphone',
      ],
      'Demander une étude gratuite'
    ),
    text: `Bonjour {{contactName}},

Vos clients méritent un séjour sûr et confortable.

${brand.name} équipe hôtels et résidences avec :
- Vidéosurveillance discrète
- Contrôle d'accès par carte
- Domotique pour chambres
- Alarme incendie conforme

Demandez votre étude : ${brand.url}
Contact : ${brand.contactEmail} | WhatsApp : ${brand.whatsapp}

Cordialement,
L'équipe ${brand.name}`,
  },
  {
    sector: 'sante',
    label: 'Santé & Médical',
    subject: 'Sécurité électronique pour établissements de santé — {{companyName}}',
    html: wrapHtml(
      'Sécurité Santé',
      'Cliniques, pharmacies et laboratoires nécessitent une sécurité renforcée pour protéger patients, médicaments et données. ' + brand.name + ' propose vidéosurveillance, contrôle d\'accès des zones stériles, alarme incendie et réseau sécurisé.',
      [
        'Vidéosurveillance pour parking et urgences',
        'Contrôle d\'accès pour zones stériles et pharmacies',
        'Alarme incendie et évacuation',
        'Réseau sécurisé pour données patients',
        'Interphone et appel malade',
      ],
      'Demander une consultation'
    ),
    text: `Bonjour {{contactName}},

Cliniques et laboratoires nécessitent une sécurité renforcée.

${brand.name} propose :
- Vidéosurveillance pour parking et urgences
- Contrôle d'accès pour zones stériles
- Alarme incendie et évacuation
- Réseau sécurisé pour données patients

Consultation : ${brand.url}
Contact : ${brand.contactEmail} | WhatsApp : ${brand.whatsapp}

Cordialement,
L'équipe ${brand.name}`,
  },
  {
    sector: 'education',
    label: 'Éducation & Formation',
    subject: 'Sécurisez votre campus — {{companyName}}',
    html: wrapHtml(
      'Sécurité Éducation',
      'La sécurité des étudiants et du personnel est une priorité absolue. ' + brand.name + ' équipe écoles, universités et centres de formation avec vidéosurveillance, contrôle d\'accès, alarme incendie et réseau WiFi sécurisé.',
      [
        'Vidéosurveillance pour campus et parkings',
        'Contrôle d\'accès pour salles informatiques',
        'Alarme incendie et plan d\'évacuation',
        'Réseau WiFi sécurisé pour étudiants',
        'Sonorisation et appel d\'urgence',
      ],
      'Demander un audit gratuit'
    ),
    text: `Bonjour {{contactName}},

La sécurité des étudiants est une priorité absolue.

${brand.name} équipe écoles et universités avec :
- Vidéosurveillance pour campus
- Contrôle d'accès pour salles informatiques
- Alarme incendie et plan d'évacuation
- Réseau WiFi sécurisé

Audit gratuit : ${brand.url}
Contact : ${brand.contactEmail} | WhatsApp : ${brand.whatsapp}

Cordialement,
L'équipe ${brand.name}`,
  },
  {
    sector: 'industrie',
    label: 'Industrie & Production',
    subject: 'Sécurité industrielle et réseau — {{companyName}}',
    html: wrapHtml(
      'Sécurité Industrie',
      'Usines et sites industriels nécessitent une sécurité robuste 24/7. ' + brand.name + ' propose vidéosurveillance industrielle, contrôle d\'accès des zones dangereuses, détection incendie et réseau sécurisé pour automatisation.',
      [
        'Vidéosurveillance industrielle avec analyse vidéo',
        'Contrôle d\'accès pour zones dangereuses',
        'Détection incendie et gaz',
        'Réseau industriel sécurisé',
        'Supervision et intégration SCADA',
      ],
      'Demander une étude technique'
    ),
    text: `Bonjour {{contactName}},

Usines et sites industriels nécessitent une sécurité robuste 24/7.

${brand.name} propose :
- Vidéosurveillance industrielle avec analyse vidéo
- Contrôle d'accès pour zones dangereuses
- Détection incendie et gaz
- Réseau industriel sécurisé

Étude technique : ${brand.url}
Contact : ${brand.contactEmail} | WhatsApp : ${brand.whatsapp}

Cordialement,
L'équipe ${brand.name}`,
  },
  {
    sector: 'logistique',
    label: 'Logistique & Transport',
    subject: 'Sécurisez vos entrepôts et flottes — {{companyName}}',
    html: wrapHtml(
      'Sécurité Logistique',
      'Entrepôts, quays de chargement et flottes de véhicules sont des cibles fréquentes. ' + brand.name + ' installe vidéosurveillance pour entrepôts, contrôle d\'accès pour quays, alarme périmétrique et GPS pour flottes.',
      [
        'Vidéosurveillance pour entrepôts et quays',
        'Contrôle d\'accès pour zones de chargement',
        'Alarme périmétrique et détection d\'intrusion',
        'Suivi GPS pour flottes de véhicules',
        'Réseau sécurisé pour gestion logistique',
      ],
      'Demander un devis'
    ),
    text: `Bonjour {{contactName}},

Entrepôts et flottes sont des cibles fréquentes.

${brand.name} installe :
- Vidéosurveillance pour entrepôts
- Contrôle d'accès pour zones de chargement
- Alarme périmétrique
- Suivi GPS pour flottes

Devis : ${brand.url}
Contact : ${brand.contactEmail} | WhatsApp : ${brand.whatsapp}

Cordialement,
L'équipe ${brand.name}`,
  },
  {
    sector: 'administration',
    label: 'Administration & Public',
    subject: 'Sécurité électronique pour le secteur public — {{companyName}}',
    html: wrapHtml(
      'Sécurité Administration',
      'Bâtiments administratifs, mairies et ministères nécessitent des solutions de sécurité certifiées. ' + brand.name + ' propose vidéosurveillance, contrôle d\'accès biométrique, alarme incendie et sonorisation d\'urgence.',
      [
        'Vidéosurveillance pour bâtiments publics',
        'Contrôle d\'accès biométrique',
        'Alarme incendie et sonorisation d\'urgence',
        'Réseau sécurisé pour données sensibles',
        'Interphone et visiophonie',
      ],
      'Demander une consultation'
    ),
    text: `Bonjour {{contactName}},

Bâtiments administratifs nécessitent des solutions certifiées.

${brand.name} propose :
- Vidéosurveillance pour bâtiments publics
- Contrôle d'accès biométrique
- Alarme incendie et sonorisation d'urgence
- Réseau sécurisé pour données sensibles

Consultation : ${brand.url}
Contact : ${brand.contactEmail} | WhatsApp : ${brand.whatsapp}

Cordialement,
L'équipe ${brand.name}`,
  },
  {
    sector: 'btp',
    label: 'BTP & Construction',
    subject: 'Sécurisez vos chantiers — {{companyName}}',
    html: wrapHtml(
      'Sécurité BTP',
      'Chantiers, engins de construction et matériaux sont vulnérables au vol. ' + brand.name + ' propose vidéosurveillance mobile pour chantiers, alarme périmétrique, GPS pour engins et contrôle d\'accès.',
      [
        'Vidéosurveillance mobile avec 4G pour chantiers',
        'Alarme périmétrique et détection d\'intrusion',
        'Suivi GPS pour engins de construction',
        'Contrôle d\'accès pour zones de stockage',
        'Vidéosurveillance avec détection de mouvement',
      ],
      'Demander un devis'
    ),
    text: `Bonjour {{contactName}},

Chantiers et engins sont vulnérables au vol.

${brand.name} propose :
- Vidéosurveillance mobile 4G pour chantiers
- Alarme périmétrique
- Suivi GPS pour engins
- Contrôle d'accès pour zones de stockage

Devis : ${brand.url}
Contact : ${brand.contactEmail} | WhatsApp : ${brand.whatsapp}

Cordialement,
L'équipe ${brand.name}`,
  },
  {
    sector: 'restauration',
    label: 'Restauration',
    subject: 'Sécurisez votre restaurant — {{companyName}}',
    html: wrapHtml(
      'Sécurité Restauration',
      'Restaurants, fast-foods et cafés sont exposés au vol et aux litiges. ' + brand.name + ' installe vidéosurveillance discrète, alarme anti-intrusion et contrôle d\'accès pour réserves.',
      [
        'Vidéosurveillance discrète pour salle et comptoir',
        'Alarme anti-intrusion avec notification SMS',
        'Contrôle d\'accès pour réserves et cuisine',
        'Caméras avec vision nocturne',
        'Accès distant depuis smartphone',
      ],
      'Demander un devis gratuit'
    ),
    text: `Bonjour {{contactName}},

Restaurants et cafés sont exposés au vol et aux litiges.

${brand.name} installe :
- Vidéosurveillance discrète
- Alarme anti-intrusion avec notification SMS
- Contrôle d'accès pour réserves
- Accès distant depuis smartphone

Devis gratuit : ${brand.url}
Contact : ${brand.contactEmail} | WhatsApp : ${brand.whatsapp}

Cordialement,
L'équipe ${brand.name}`,
  },
  {
    sector: 'autre',
    label: 'Général (tous secteurs)',
    subject: 'Solutions de sécurité électronique pour {{companyName}}',
    html: wrapHtml(
      'Sécurité Générale',
      'Que vous soyez une PME, une startup ou une grande entreprise au Sénégal, ' + brand.name + ' vous accompagne dans la sécurisation de vos locaux avec des solutions adaptées à votre budget et vos besoins.',
      [
        'Vidéosurveillance HD accessible depuis smartphone',
        'Contrôle d\'accès par badge ou biométrie',
        'Alarme anti-intrusion avec notification',
        'Domotique et automatisation',
        'Réseau et WiFi sécurisé',
      ],
      'Demander un audit gratuit'
    ),
    text: `Bonjour {{contactName}},

${brand.name} vous accompagne dans la sécurisation de vos locaux.

Nos solutions :
- Vidéosurveillance HD accessible depuis smartphone
- Contrôle d'accès par badge ou biométrie
- Alarme anti-intrusion
- Domotique et automatisation
- Réseau et WiFi sécurisé

Audit gratuit : ${brand.url}
Contact : ${brand.contactEmail} | WhatsApp : ${brand.whatsapp}

Cordialement,
L'équipe ${brand.name}`,
  },
]

export async function GET() {
  return NextResponse.json({ templates: TEMPLATES })
}
