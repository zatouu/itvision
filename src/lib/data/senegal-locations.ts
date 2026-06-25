export const SENEGAL_REGIONS = [
  { code: 'DK', name: 'Dakar', departments: ['Dakar', 'Guédiawaye', 'Pikine', 'Rufisque'] },
  { code: 'TH', name: 'Thiès', departments: ['Thiès', 'Mbour', 'Tivaouane'] },
  { code: 'SL', name: 'Saint-Louis', departments: ['Saint-Louis', 'Dagana', 'Podor', 'Matam'] },
  { code: 'KL', name: 'Kaolack', departments: ['Kaolack', 'Nioro du Rip', 'Guinguinéo'] },
  { code: 'ZG', name: 'Ziguinchor', departments: ['Ziguinchor', 'Bignona', 'Oussouye'] },
  { code: 'TC', name: 'Tambacounda', departments: ['Tambacounda', 'Kédougou', 'Bakel'] },
  { code: 'KD', name: 'Kolda', departments: ['Kolda', 'Vélingara', 'Médina Yoro Foulah'] },
  { code: 'LG', name: 'Louga', departments: ['Louga', 'Kébémer', 'Linguère'] },
  { code: 'FT', name: 'Fatick', departments: ['Fatick', 'Foundiougne', 'Gossas'] },
  { code: 'KF', name: 'Kaffrine', departments: ['Kaffrine', 'Birkelane', 'Koungheul', 'Malem Hoddar'] },
  { code: 'DL', name: 'Diourbel', departments: ['Diourbel', 'Bambey', 'Mbacké'] },
  { code: 'SD', name: 'Sédhiou', departments: ['Sédhiou', 'Bounkiling', 'Goudomp'] },
  { code: 'KH', name: 'Kédougou', departments: ['Kédougou', 'Salémata', 'Saraya'] },
  { code: 'MT', name: 'Matam', departments: ['Matam', 'Kanel', 'Ranérou'] },
]

export const QUARTIERS: Record<string, string[]> = {
  'Pikine': ['Parcelles Assainies', 'Pikine Est', 'Pikine Ouest', 'Guinaw Rail', 'Thiaroye', 'Dalifort', 'Djiddah Thiaroye Kao'],
  'Dakar': ['Plateau', 'Médina', 'Grand Dakar', 'Fass', 'Colobane', 'Camberène', 'Hann Bel-Air', 'Sicap'],
  'Guédiawaye': ['Ndiarème', 'Wakhinane', 'Golf Sud', 'Samo'],
  'Rufisque': ['Rufisque Est', 'Rufisque Ouest', 'Bargny', 'Sébikotane', 'Diamniadio'],
  'Thiès': ['Thiès Est', 'Thiès Ouest', 'Thiès Nord', 'Fass', 'Mbour?'],
  'Mbour': ['Mbour', 'Saly', 'Ngaparou', 'Somone', 'Fissel'],
  'Tivaouane': ['Tivaouane', 'Mékhé', 'Ndiébène Gandio'],
  'Saint-Louis': ['Saint-Louis', 'Guet Ndar', 'Ndar', 'Rao', 'Pikine'],
  'Kaolack': ['Kaolack', 'Nabadji', 'Keur Baka', 'Linguère-Kaolack'],
  'Ziguinchor': ['Ziguinchor', 'Boucotte', 'Nema', 'Adéane'],
}

export function getDepartments(regionName: string) {
  const region = SENEGAL_REGIONS.find(r => r.name === regionName)
  return region?.departments || []
}

export function getQuartiers(departmentName: string) {
  return QUARTIERS[departmentName] || []
}
