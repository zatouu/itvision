'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, MapPin, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Données Sénégal: Régions → Départements → Quartiers
const SENEGAL_REGIONS: Record<string, {
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

interface AddressData {
  region: string
  department: string
  neighborhood: string
  street: string
  additionalInfo?: string
}

interface AddressPickerSenegalProps {
  value?: Partial<AddressData>
  onChange: (address: AddressData) => void
  onValidation?: (isValid: boolean) => void
}

export default function AddressPickerSenegal({
  value = {},
  onChange,
  onValidation
}: AddressPickerSenegalProps) {
  const [region, setRegion] = useState<string>(value.region || '')
  const [department, setDepartment] = useState<string>(value.department || '')
  const [neighborhood, setNeighborhood] = useState<string>(value.neighborhood || '')
  const [street, setStreet] = useState<string>(value.street || '')
  const [additionalInfo, setAdditionalInfo] = useState<string>(value.additionalInfo || '')
  const [openDropdown, setOpenDropdown] = useState<'region' | 'department' | 'neighborhood' | null>(null)

  // Listes déroulantes filtrées
  const regionList = Object.keys(SENEGAL_REGIONS)
  const departmentList = useMemo(() => {
    if (!region || !SENEGAL_REGIONS[region as keyof typeof SENEGAL_REGIONS]) return []
    return Object.keys(SENEGAL_REGIONS[region as keyof typeof SENEGAL_REGIONS].departments)
  }, [region])

  const neighborhoodList = useMemo(() => {
    if (!region || !department) return []
    const regionData = SENEGAL_REGIONS[region as keyof typeof SENEGAL_REGIONS]
    if (!regionData) return []
    const deptData = regionData.departments[department as string]
    return deptData?.neighborhoods || []
  }, [region, department])

  const isValid = region && department && neighborhood && street.trim().length > 0

  const handleAddressChange = () => {
    const newAddress: AddressData = {
      region,
      department,
      neighborhood,
      street: street.trim(),
      additionalInfo: additionalInfo.trim() || undefined
    }
    onChange(newAddress)
    onValidation?.(!!isValid)
  }

  const handleRegionChange = (newRegion: string) => {
    setRegion(newRegion)
    setDepartment('')
    setNeighborhood('')
    setOpenDropdown(null)
  }

  const handleDepartmentChange = (newDept: string) => {
    setDepartment(newDept)
    setNeighborhood('')
    setOpenDropdown(null)
  }

  const handleNeighborhoodChange = (newNeighborhood: string) => {
    setNeighborhood(newNeighborhood)
    setOpenDropdown(null)
  }

  const handleStreetChange = (newStreet: string) => {
    setStreet(newStreet)
  }

  return (
    <div className="space-y-5">
      {/* Info box */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3"
      >
        <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">Sélectionnez votre région, département et quartier pour une livraison précise.</p>
      </motion.div>

      {/* Région */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <label className="block text-sm font-semibold text-gray-700 mb-2">Région</label>
        <div className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === 'region' ? null : 'region')}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition text-left flex items-center justify-between bg-white hover:bg-gray-50"
          >
            <span className={region ? 'text-gray-900' : 'text-gray-500'}>{region || 'Choisir une région'}</span>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${openDropdown === 'region' ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {openDropdown === 'region' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-20 top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto"
              >
                {regionList.map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRegionChange(r)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-100 transition ${
                      region === r ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-700'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Département */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <label className="block text-sm font-semibold text-gray-700 mb-2">Département</label>
        <div className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === 'department' ? null : 'department')}
            disabled={!region}
            className={`w-full px-4 py-3 border border-gray-300 rounded-lg transition text-left flex items-center justify-between ${
              region
                ? 'bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500'
                : 'bg-gray-100 cursor-not-allowed'
            }`}
          >
            <span className={department ? 'text-gray-900' : 'text-gray-500'}>{department || 'Choisir un département'}</span>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${openDropdown === 'department' ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {openDropdown === 'department' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-20 top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto"
              >
                {departmentList.map((d) => (
                  <button
                    key={d}
                    onClick={() => handleDepartmentChange(d)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-100 transition ${
                      department === d ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-700'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Quartier */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <label className="block text-sm font-semibold text-gray-700 mb-2">Quartier</label>
        <div className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === 'neighborhood' ? null : 'neighborhood')}
            disabled={!department}
            className={`w-full px-4 py-3 border border-gray-300 rounded-lg transition text-left flex items-center justify-between ${
              department
                ? 'bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500'
                : 'bg-gray-100 cursor-not-allowed'
            }`}
          >
            <span className={neighborhood ? 'text-gray-900' : 'text-gray-500'}>{neighborhood || 'Choisir un quartier'}</span>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${openDropdown === 'neighborhood' ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {openDropdown === 'neighborhood' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-20 top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto"
              >
                {neighborhoodList.map((n) => (
                  <button
                    key={n}
                    onClick={() => handleNeighborhoodChange(n)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-100 transition ${
                      neighborhood === n ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-700'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Rue */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <label className="block text-sm font-semibold text-gray-700 mb-2">Rue / Numéro / Adresse précise</label>
        <input
          type="text"
          value={street}
          onChange={(e) => handleStreetChange(e.target.value)}
          onBlur={handleAddressChange}
          placeholder="Ex: Rue 1, Numéro 42 ou Rue des Écoles"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
        />
      </motion.div>

      {/* Info supplémentaires */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <label className="block text-sm font-semibold text-gray-700 mb-2">Informations supplémentaires (optionnel)</label>
        <input
          type="text"
          value={additionalInfo}
          onChange={(e) => setAdditionalInfo(e.target.value)}
          onBlur={handleAddressChange}
          placeholder="Ex: Près du marché, immeuble jaune, porte bleue..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
        />
      </motion.div>

      {/* Adresse formatée */}
      {isValid && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 border border-emerald-200 rounded-lg p-4"
        >
          <p className="text-sm font-medium text-emerald-900 mb-1">Votre adresse de livraison:</p>
          <p className="text-sm text-emerald-800">
            {street} • {neighborhood} • {department} • {region}, Sénégal
            {additionalInfo && ` • ${additionalInfo}`}
          </p>
        </motion.div>
      )}

      {/* Validation error */}
      {!isValid && street.trim().length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">Veuillez remplir tous les champs de localisation</p>
        </motion.div>
      )}
    </div>
  )
}
