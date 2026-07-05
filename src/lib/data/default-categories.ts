export interface DefaultSubCategory {
  id: string
  name: string
  icon: string
}

export interface DefaultProductCategory {
  id: string
  name: string
  description: string
  icon: string
  margin: number
  isActive: boolean
  subCategories?: DefaultSubCategory[]
}

export const defaultProductCategories: DefaultProductCategory[] = [
  {
    id: 'securite',
    name: 'Sécurité',
    description: 'Vidéosurveillance, contrôle d\'accès et alarmes',
    icon: '�️',
    margin: 0,
    isActive: true,
    subCategories: [
      { id: 'videosurveillance', name: 'Vidéosurveillance', icon: '📷' },
      { id: 'controle-acces', name: 'Contrôle d\'Accès', icon: '🔐' },
      { id: 'alarme-intrusion', name: 'Alarme & Intrusion', icon: '🔔' }
    ]
  },
  {
    id: 'informatique',
    name: 'Informatique & Bureautique',
    description: 'Réseau, périphériques, accessoires et connectique',
    icon: '�',
    margin: 0,
    isActive: true,
    subCategories: [
      { id: 'reseau-informatique', name: 'Réseau Informatique', icon: '🌐' },
      { id: 'cables', name: 'Câbles & Connectique', icon: '🔌' },
      { id: 'claviers', name: 'Claviers', icon: '⌨️' },
      { id: 'souris', name: 'Souris', icon: '🖱️' },
      { id: 'ecrans', name: 'Écrans', icon: '🖥️' },
      { id: 'ordinateurs', name: 'Ordinateurs', icon: '🖥️' },
      { id: 'accessoires-informatique', name: 'Accessoires informatiques', icon: '🎧' }
    ]
  },
  {
    id: 'domotique',
    name: 'Domotique & Smart Home',
    description: 'Équipements domotiques intelligents',
    icon: '🏠',
    margin: 0,
    isActive: true,
    subCategories: [
      { id: 'domotique-maison', name: 'Domotique', icon: '🏠' },
      { id: 'smart-home', name: 'Smart Home', icon: '💡' }
    ]
  },
  {
    id: 'electronique',
    name: 'Électronique grand public',
    description: 'Smartphones, audio, vidéo et accessoires électroniques',
    icon: '�',
    margin: 0,
    isActive: true,
    subCategories: [
      { id: 'smartphones', name: 'Smartphones', icon: '📱' },
      { id: 'audio-video', name: 'Audio & Vidéo', icon: '🎧' },
      { id: 'electronique-divers', name: 'Électronique divers', icon: '🔌' }
    ]
  },
  {
    id: 'mobilier',
    name: 'Mobilier & Installation',
    description: 'Racks, baies et mobilier technique',
    icon: '🪑',
    margin: 0,
    isActive: true,
    subCategories: [
      { id: 'mobilier-technique', name: 'Mobilier technique', icon: '🪑' },
      { id: 'racks-baies', name: 'Racks & Baies', icon: '�️' }
    ]
  },
  {
    id: 'packs-cadeaux',
    name: 'Packs & Cadeaux',
    description: 'Packs prêts à vendre et box cadeaux',
    icon: '🎁',
    margin: 0,
    isActive: true,
    subCategories: [
      { id: 'lot-10-box-cadeau', name: 'Lot de 10 Box cadeau', icon: '🎁' }
    ]
  }
]
