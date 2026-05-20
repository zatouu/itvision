'use client'

import { motion } from 'framer-motion'
import {
  Calculator,
  Package,
  Shield,
  Truck,
  TrendingDown,
  TrendingUp,
  Info,
  CheckCircle,
  Scale,
  Globe,
  DollarSign,
  HelpCircle
} from 'lucide-react'
import Link from 'next/link'

const formatCurrency = (v?: number) => (typeof v === 'number' ? `${v.toLocaleString('fr-FR')} FCFA` : '-')

export default function PrixTransparentPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 to-emerald-600 text-white py-16 px-4"
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-6"
          >
            <Calculator className="w-10 h-10" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Prix Transparent</h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Comprendre comment est calculé le prix de vos produits importés de Chine
          </p>
        </div>
      </motion.div>

      <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
        {/* Introduction */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-lg"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
            <Info className="w-6 h-6 text-blue-600" />
            Notre Promesse de Transparence
          </h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Chez <strong>IT Vision Plus</strong>, nous croyons en une totale transparence sur nos prix. 
            Contrairement à de nombreux vendeurs, nous vous montrons exactement comment est calculé 
            le prix final de vos produits importés de Chine.
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <p className="text-emerald-800 font-medium flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Aucun frais caché - Vous payez uniquement ce que vous voyez
            </p>
          </div>
        </motion.div>

        {/* Formule de calcul */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-lg"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <Calculator className="w-6 h-6 text-emerald-600" />
            La Formule de Calcul
          </h2>
          
          <div className="bg-gradient-to-r from-blue-50 to-emerald-50 rounded-xl p-6 mb-6">
            <div className="text-center space-y-2">
              <p className="text-lg font-bold text-gray-900">PRIX CLIENT =</p>
              <div className="flex flex-wrap items-center justify-center gap-2 text-sm md:text-base">
                <span className="bg-white px-3 py-1 rounded-lg shadow-sm">Coût Fournisseur</span>
                <span className="text-gray-400">+</span>
                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg shadow-sm">Frais de Service</span>
                <span className="text-gray-400">+</span>
                <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-lg shadow-sm">Assurance</span>
                <span className="text-gray-400">+</span>
                <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-lg shadow-sm">Transport</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-4 items-start">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">1. Coût Fournisseur</h3>
                <p className="text-gray-600 text-sm">Prix du produit sur 1688.com converti en FCFA</p>
                <p className="text-sm text-gray-500 mt-1">Taux de change : 1 ¥ ≈ 85 FCFA (taux réel)</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">2. Frais de Service</h3>
                <p className="text-gray-600 text-sm">Notre commission pour la coordination et la logistique</p>
                <div className="mt-2 bg-gray-50 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Tarifs dégressifs B2B :</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• &lt; 500,000 FCFA : 10%</li>
                    <li>• 500,000 - 2,000,000 FCFA : 8%</li>
                    <li>• 2,000,000 - 5,000,000 FCFA : 6%</li>
                    <li>• &gt; 5,000,000 FCFA : 5%</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">3. Assurance</h3>
                <p className="text-gray-600 text-sm">Protection de votre commande pendant le transport</p>
                <p className="text-sm text-gray-500 mt-1">Taux fixe : 2.5% du coût fournisseur</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Truck className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">4. Transport</h3>
                <p className="text-gray-600 text-sm">Frais de livraison du Chine jusqu'à votre adresse</p>
                <div className="mt-2 bg-gray-50 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">Modes disponibles :</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Express (3-5 jours) : 15,000 FCFA/kg</li>
                    <li>• Aérien (10-15 jours) : 8,500 FCFA/kg</li>
                    <li>• Maritime (45-50 jours) : 3,500 FCFA/m³</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Exemple concret */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-lg"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Exemple Concret</h2>
          
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6">
            <div className="mb-4">
              <p className="text-sm text-gray-600">Produit : Caméra de surveillance Hikvision</p>
              <p className="text-sm text-gray-600">Prix 1688 : ¥350 (~29,750 FCFA)</p>
              <p className="text-sm text-gray-600">Quantité : 10 unités</p>
              <p className="text-sm text-gray-600">Poids total : 12kg (volumétrique : 15kg)</p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Coût fournisseur (10 × 29,750)</span>
                <span className="font-medium">297,500 FCFA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Frais de service (10%)</span>
                <span className="font-medium">29,750 FCFA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Assurance (2.5%)</span>
                <span className="font-medium">7,438 FCFA</span>
              </div>
              <div className="border-t border-gray-300 pt-2 flex justify-between">
                <span className="font-semibold">Sous-total</span>
                <span className="font-semibold">334,688 FCFA</span>
              </div>
              <div className="flex justify-between text-amber-700">
                <span className="flex items-center gap-1">
                  <Scale className="w-4 h-4" />
                  Transport aérien (15kg × 8,500 FCFA)
                </span>
                <span className="font-medium">127,500 FCFA</span>
              </div>
              <div className="bg-emerald-50 border-t-2 border-emerald-200 pt-3 mt-2 flex justify-between text-lg font-bold text-emerald-700">
                <span>TOTAL</span>
                <span>462,188 FCFA</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Note :</strong> Le poids volumétrique (15kg) est supérieur au poids réel (12kg), 
                donc le transport est calculé sur 15kg selon la norme IATA.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Poids Volumétrique */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-lg"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
            <Scale className="w-6 h-6 text-amber-600" />
            Qu'est-ce que le Poids Volumétrique ?
          </h2>
          
          <p className="text-gray-700 mb-4">
            Le poids volumétrique est une méthode de calcul utilisée par les transporteurs aériens 
            pour les colis volumineux mais légers. Il prend en compte l'espace que prend votre colis 
            dans l'avion, pas seulement son poids réel.
          </p>

          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 mb-4">
            <p className="text-center font-mono text-lg mb-2">Formule IATA</p>
            <p className="text-center text-2xl font-bold text-amber-700">
              Poids Volumétrique = (Longueur × Largeur × Hauteur) ÷ 5000
            </p>
            <p className="text-center text-sm text-gray-600 mt-2">(dimensions en cm, résultat en kg)</p>
          </div>

          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <TrendingUp className="w-5 h-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Exemple : Antenne parabolique</p>
                <p className="text-sm text-gray-600">
                  Dimensions : 80 × 60 × 20 cm = 1.92 kg réels, mais 19.2 kg volumétriques. 
                  Le transport sera facturé sur <strong>19.2 kg</strong>.
                </p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <TrendingDown className="w-5 h-5 text-emerald-500 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900">Exemple : Disque dur</p>
                <p className="text-sm text-gray-600">
                  Dimensions : 15 × 10 × 3 cm = 0.5 kg réels, 0.09 kg volumétriques. 
                  Le transport sera facturé sur <strong>0.5 kg</strong> (poids réel).
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>En résumé :</strong> Nous facturons toujours le maximum entre le poids réel 
              et le poids volumétrique pour être justes avec les transporteurs tout en vous 
              garantissant le meilleur prix.
            </p>
          </div>
        </motion.div>

        {/* Tarifs dégressifs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-lg"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
            <TrendingDown className="w-6 h-6 text-emerald-600" />
            Nos Tarifs Dégressifs
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Réduction B2B */}
            <div>
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Réduction B2B (Frais de service)
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Plus votre commande est importante, moins vous payez de frais de service.
              </p>
              <div className="space-y-2">
                {[
                  { min: 0, max: 500000, rate: 10, label: 'Standard' },
                  { min: 500000, max: 2000000, rate: 8, label: 'Volume' },
                  { min: 2000000, max: 5000000, rate: 6, label: 'Pro' },
                  { min: 5000000, max: Infinity, rate: 5, label: 'Enterprise' }
                ].map((tier, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">
                      {tier.max === Infinity ? `> ${formatCurrency(tier.min)}` : `${formatCurrency(tier.min)} - ${formatCurrency(tier.max)}`}
                    </span>
                    <span className="font-bold text-emerald-600">{tier.rate}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Réduction Quantité */}
            <div>
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Réduction par Quantité
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Plus vous achetez d'articles, plus vous bénéficiez de réductions.
              </p>
              <div className="space-y-2">
                {[
                  { min: 5, max: 19, discount: 0 },
                  { min: 20, max: 49, discount: 5 },
                  { min: 50, max: 99, discount: 10 },
                  { min: 100, max: Infinity, discount: 15 }
                ].map((tier, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">
                      {tier.max === Infinity ? `${tier.min}+ articles` : `${tier.min}-${tier.max} articles`}
                    </span>
                    <span className="font-bold text-blue-600">
                      {tier.discount > 0 ? `-${tier.discount}%` : 'Plein tarif'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-emerald-50 rounded-lg">
            <p className="text-sm text-emerald-800">
              <strong>Bonne nouvelle :</strong> Ces deux réductions sont cumulables ! 
              Une commande de 50+ articles à plus de 500k FCFA bénéficiera des deux avantages.
            </p>
          </div>
        </motion.div>

        {/* Taux de change */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-lg"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
            <Globe className="w-6 h-6 text-blue-600" />
            Taux de Change Dynamique
          </h2>
          
          <p className="text-gray-700 mb-4">
            Nous utilisons un taux de change actualisé quotidiennement pour refléter 
            la réalité du marché. Actuellement :
          </p>

          <div className="bg-gradient-to-r from-blue-50 to-emerald-50 rounded-xl p-6 text-center">
            <p className="text-4xl font-bold text-gray-900 mb-2">1 ¥ ≈ 85 FCFA</p>
            <p className="text-sm text-gray-600">Taux indicatif - Mis à jour quotidiennement</p>
          </div>

          <p className="text-sm text-gray-500 mt-4">
            Ce taux nous permet de vous proposer des prix justes, sans surprise. 
            Si le yuan faiblit, vous bénéficiez automatiquement d'un meilleur prix.
          </p>
        </motion.div>

        {/* FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-lg"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <HelpCircle className="w-6 h-6 text-purple-600" />
            Questions Fréquentes
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-gray-900 mb-2">Pourquoi y a-t-il des frais de service ?</h3>
              <p className="text-gray-600 text-sm">
                Les frais de service couvrent la coordination avec le fournisseur en Chine, 
                la vérification qualité, la consolidation des colis, la gestion douanière 
                et le support client dédié.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-2">L'assurance est-elle obligatoire ?</h3>
              <p className="text-gray-600 text-sm">
                Oui, l'assurance de 2.5% est incluse dans tous nos prix. Elle protège votre 
                commande contre les pertes, dommages ou retards de livraison importants.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-2">Puis-je négocier les frais de transport ?</h3>
              <p className="text-gray-600 text-sm">
                Les tarifs de transport sont fixés par nos partenaires logistiques. 
                Cependant, en optimisant le poids volumétrique de votre colis (emballage compact), 
                vous pouvez réduire significativement le coût.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-2">Comment puis-je bénéficier des réductions ?</h3>
              <p className="text-gray-600 text-sm">
                Les réductions sont appliquées automatiquement dans votre panier. 
                Augmentez votre quantité ou le montant total pour voir les économies 
                s'afficher en temps réel.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-2">Le prix affiché est-il le prix final ?</h3>
              <p className="text-gray-600 text-sm">
                Oui ! Le prix que vous voyez dans le panier est le prix final. 
                Il inclut tous les frais (service, assurance, transport). 
                Aucun coût caché ne sera ajouté.
              </p>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-center pb-8"
        >
          <p className="text-gray-600 mb-4">Prêt à commander avec transparence ?</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/produits"
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white px-8 py-4 rounded-xl font-bold transition shadow-lg"
            >
              <Package className="w-5 h-5" />
              Découvrir nos produits
            </Link>
            <Link
              href="/produits?groupbuy=1"
              className="inline-flex items-center justify-center gap-2 bg-white border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 px-8 py-4 rounded-xl font-bold transition"
            >
              <TrendingDown className="w-5 h-5" />
              Rejoindre un achat groupé
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
