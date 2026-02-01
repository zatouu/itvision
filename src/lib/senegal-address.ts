
// Données Sénégal: Régions → Départements → Quartiers
export const SENEGAL_REGIONS: Record<string, {
  departments: Record<string, {
    name: string
    neighborhoods: string[]
  }>
}> = {
  'Dakar': {
    departments: {
      'Dakar': {
        name: 'Dakar',
        neighborhoods: [
          'Plateau',
          'Médina',
          'Rebeuss',
          'Talibouya',
          'Saint-Louis',
          'Ngor',
          'Almadies',
          'Fann',
          'Mermoz',
          'Sacré-Cœur',
          'Point E',
          'Parcelles Assainies',
          'Patte d\'Oie',
          'Liberté',
          'Camberène',
          'Yarakh'
        ]
      },
      'Pikine': {
        name: 'Pikine',
        neighborhoods: [
          'Pikine',
          'Yeumbeul',
          'Malika',
          'Diawara',
          'Thiaroye',
          'Keur Massar'
        ]
      },
      'Rufisque': {
        name: 'Rufisque',
        neighborhoods: [
          'Rufisque',
          'Bargny',
          'Diamniadio',
          'Bambilor',
          'Tivaoune Peulh'
        ]
      }
    }
  },
  'Thiès': {
    departments: {
      'Thiès': {
        name: 'Thiès',
        neighborhoods: [
          'Thiès Centre',
          'Thiès Gare',
          'Thiès Nones',
          'Gueule Tapée',
          'Ndondol',
          'Keur Issa'
        ]
      },
      'Tivaouane': {
        name: 'Tivaouane',
        neighborhoods: ['Tivaouane', 'Méouane', 'Ourakh', 'Khombole']
      },
      'Mbour': {
        name: 'Mbour',
        neighborhoods: ['Mbour', 'Joal', 'Sindia', 'Pout', 'Malicounda']
      }
    }
  },
  'Kaolack': {
    departments: {
      'Kaolack': {
        name: 'Kaolack',
        neighborhoods: ['Kaolack Centre', 'Ndiaffate', 'Aïoun', 'Ndiassane', 'Kanène']
      },
      'Nioro du Rip': {
        name: 'Nioro du Rip',
        neighborhoods: ['Nioro du Rip', 'Paoskoto', 'Bourém', 'Gankette']
      },
      'Guinguinéo': {
        name: 'Guinguinéo',
        neighborhoods: ['Guinguinéo', 'Tambacounda du Sénégal', 'Sonfara', 'Bibasidi']
      }
    }
  },
  'Saint-Louis': {
    departments: {
      'Saint-Louis': {
        name: 'Saint-Louis',
        neighborhoods: [
          'Centre-Ville',
          'Sor',
          'Ndar Toute',
          'Khat',
          'Goxu Mbacc',
          'Pointe aux Almadies'
        ]
      },
      'Dagana': {
        name: 'Dagana',
        neighborhoods: ['Dagana', 'Guédé', 'Melea', 'Podor']
      }
    }
  },
  'Kolda': {
    departments: {
      'Kolda': {
        name: 'Kolda',
        neighborhoods: ['Kolda Centre', 'Mampatim', 'Médina El Hadj']
      },
      'Vélingara': {
        name: 'Vélingara',
        neighborhoods: ['Vélingara', 'Dialacoto', 'Gaoual']
      }
    }
  },
  'Ziguinchor': {
    departments: {
      'Ziguinchor': {
        name: 'Ziguinchor',
        neighborhoods: ['Ziguinchor Centre', 'Birkélane', 'Diabir']
      },
      'Bignona': {
        name: 'Bignona',
        neighborhoods: ['Bignona', 'Diattacounda', 'Samec']
      },
      'Oussouye': {
        name: 'Oussouye',
        neighborhoods: ['Oussouye', 'Enampore']
      }
    }
  }
}

export function findRegionByDepartment(departmentName: string): string | null {
  for (const [region, data] of Object.entries(SENEGAL_REGIONS)) {
    if (data.departments[departmentName]) {
      return region
    }
  }
  return null
}
