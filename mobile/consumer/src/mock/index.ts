import type { ProviderProfile, ServiceRequest, Offer, ServiceReview, Address, NotificationItem, WalletEntry, Mission } from '../types'

export const mockProviders: ProviderProfile[] = [
  {
    _id: 'p1',
    name: 'Moussa D.',
    role: 'provider',
    trade: 'Électricien',
    category: 'electricite',
    rating: { avg: 4.9, count: 127 },
    missionsCount: 127,
    verified: true,
    about: 'Électricien expérimenté avec plus de 5 ans d\'expérience. J\'interviens rapidement pour tous vos travaux électriques, avec du matériel de qualité et un service fiable.',
    specialties: ['Dépannage', 'Fusibles', 'Tableau électrique', 'Installation'],
    portfolio: [
      { id: '1', url: 'https://images.unsplash.com/photo-1621905251189-08b45d82a6a8?w=400', label: 'Tableau', beforeAfter: true },
      { id: '2', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', label: 'Câblage', beforeAfter: true },
      { id: '3', url: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400', label: 'Prises', beforeAfter: false },
      { id: '4', url: 'https://images.unsplash.com/photo-1621905251189-08b45d82a6a8?w=400', label: 'Éclairage', beforeAfter: true },
    ],
    recentReviews: [
      { _id: 'r1', requestId: 'mr1', reviewerId: 'c1', providerId: 'p1', rating: 5, comment: 'Intervention rapide et efficace. Très professionnel, je recommande !', tags: ['Ponctuel', 'Rapide'], createdAt: '2026-07-01T10:00:00Z' },
      { _id: 'r2', requestId: 'mr2', reviewerId: 'c2', providerId: 'p1', rating: 5, comment: 'Travail propre et soigné. Très satisfait du service.', tags: ['Propre', 'Professionnel'], createdAt: '2026-06-25T14:00:00Z' },
    ],
  },
  {
    _id: 'p2',
    name: 'Amadou K.',
    role: 'provider',
    trade: 'Plombier',
    category: 'plomberie',
    rating: { avg: 4.7, count: 84 },
    missionsCount: 84,
    verified: true,
    about: 'Plombier sérieux et disponible pour tous vos dépannages et installations sanitaires.',
    specialties: ['Fuite', 'Robinetterie', 'WC', 'Chauffe-eau'],
  },
  {
    _id: 'p3',
    name: 'Fatou N.',
    role: 'provider',
    trade: 'Menuisière',
    category: 'menuiserie',
    rating: { avg: 4.8, count: 63 },
    missionsCount: 63,
    verified: true,
    about: 'Artisan menuisier pour portes, fenêtres, placards et petits travaux de bois.',
    specialties: ['Portes', 'Placards', 'Réparations'],
  },
]

export const mockAddresses: Address[] = [
  {
    id: 'a1',
    label: 'Médina, Dakar',
    street: 'Rue 12, près de la mosquée',
    city: 'Dakar',
    area: 'Médina',
    coordinates: { lat: 14.675, lng: -17.442 },
    instructions: 'Sonnez à la porte verte',
    floor: '2e étage',
    door: 'porte 5',
  },
  {
    id: 'a2',
    label: 'Plateau',
    street: 'Avenue Léopold Sédar Senghor',
    city: 'Dakar',
    area: 'Plateau',
  },
  {
    id: 'a3',
    label: 'Ouakam',
    street: 'Rue des Mamelles',
    city: 'Dakar',
    area: 'Ouakam',
  },
]

export const mockRequests: ServiceRequest[] = [
  {
    _id: 'req1',
    clientId: 'c1',
    category: 'electricite',
    subCategory: 'Changement fusible',
    description: 'Le fusible du tableau électrique a sauté. Besoin d\'un électricien pour diagnostiquer et remplacer.',
    budget: 10000,
    status: 'pending_offers',
    address: 'Rue 12, Médina, Dakar',
    location: { type: 'Point', coordinates: [-17.442, 14.675] },
    offerCount: 3,
    pendingOfferCount: 3,
    createdAt: '2026-07-03T18:30:00Z',
    updatedAt: '2026-07-03T18:30:00Z',
  },
]

export const mockOffers: Offer[] = [
  {
    _id: 'o1',
    requestId: 'req1',
    providerId: 'p1',
    providerName: 'Moussa D.',
    providerPhone: '+221 77 123 45 67',
    price: 8500,
    message: 'Disponible sous 20 min, matériel inclus.',
    status: 'submitted',
    etaMinutes: 20,
    providerRating: { avg: 4.9, count: 127 },
    providerVerified: true,
    createdAt: '2026-07-03T18:32:00Z',
  },
  {
    _id: 'o2',
    requestId: 'req1',
    providerId: 'p2',
    providerName: 'Amadou K.',
    price: 7500,
    message: 'Je peux passer dans l\'heure.',
    status: 'submitted',
    etaMinutes: 45,
    providerRating: { avg: 4.7, count: 84 },
    providerVerified: true,
    createdAt: '2026-07-03T18:35:00Z',
  },
  {
    _id: 'o3',
    requestId: 'req1',
    providerId: 'p3',
    providerName: 'Fatou N.',
    price: 9000,
    message: 'Devis précis, intervention rapide.',
    status: 'submitted',
    etaMinutes: 30,
    providerRating: { avg: 4.8, count: 63 },
    providerVerified: true,
    createdAt: '2026-07-03T18:36:00Z',
  },
]

export const mockCounterOffer: Offer = {
  _id: 'o1',
  requestId: 'req1',
  providerId: 'p1',
  providerName: 'Moussa D.',
  providerPhone: '+221 77 123 45 67',
  price: 12000,
  message: 'J\'ai proposé 12 000 FCFA pour le déplacement et le matériel.',
  status: 'countered',
  etaMinutes: 20,
  providerRating: { avg: 4.9, count: 127 },
  providerVerified: true,
  createdAt: '2026-07-03T18:32:00Z',
}

export const mockWalletHistory: WalletEntry[] = [
  { id: 'w1', kind: 'income', amount: 10000, currency: 'FCFA', status: 'available', label: 'Mission électricité', date: '2026-07-03T19:20:00Z', requestId: 'req1' },
  { id: 'w2', kind: 'income', amount: 8500, currency: 'FCFA', status: 'available', label: 'Mission menuiserie', date: '2026-07-02T15:45:00Z' },
  { id: 'w3', kind: 'commission', amount: -2000, currency: 'FCFA', status: 'debit', label: 'Commission plateforme', date: '2026-07-02T15:40:00Z' },
]

export const mockNotifications: NotificationItem[] = [
  { id: 'n1', type: 'offer', title: 'Nouvelle offre', body: 'Moussa D. a proposé 8 500 FCFA', read: false, createdAt: '2026-07-03T18:32:00Z' },
  { id: 'n2', type: 'mission', title: 'Mission terminée', body: 'Votre intervention est terminée', read: true, createdAt: '2026-07-03T19:00:00Z' },
]

export const mockMission: Mission = {
  ...mockRequests[0],
  status: 'completed',
  acceptedOffer: mockOffers[0],
  provider: mockProviders[0],
  completedAt: '2026-07-03T19:00:00Z',
}
