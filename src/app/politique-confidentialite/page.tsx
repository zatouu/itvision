'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Shield, Eye, Database, Lock, UserCheck, Trash2, Mail, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function PolitiqueConfidentialitePage() {
  const lastUpdate = '1er février 2026'

  return (
    <main>
      <Header />
      <section className="page-content pt-28 pb-16 bg-white dark:bg-black">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center text-emerald-600 hover:underline mb-6 text-sm">
            <ArrowLeft className="w-4 h-4 mr-1" /> Retour à l&apos;accueil
          </Link>

          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Politique de Confidentialité</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Dernière mise à jour : {lastUpdate}</p>
            </div>
          </div>

          <div className="prose prose-blue max-w-none dark:prose-invert space-y-8">

            <section>
              <h2 className="flex items-center gap-2"><Eye className="w-5 h-5 text-blue-600" /> 1. Introduction</h2>
              <p>IT Vision Plus, exploitant le site <strong>itvisionplus.sn</strong>, s&apos;engage à protéger la vie privée de ses utilisateurs. Cette politique décrit les données que nous collectons, comment nous les utilisons et les droits dont vous disposez.</p>
              <p>En utilisant notre site, vous acceptez les pratiques décrites dans la présente politique.</p>
            </section>

            <section>
              <h2 className="flex items-center gap-2"><Database className="w-5 h-5 text-blue-600" /> 2. Données collectées</h2>
              <h3>Données fournies par vous</h3>
              <ul>
                <li><strong>Compte utilisateur</strong> : nom, prénom, email, téléphone</li>
                <li><strong>Commandes</strong> : adresse de livraison, historique d&apos;achats, préférences de paiement</li>
                <li><strong>Contact</strong> : messages envoyés via formulaire, WhatsApp ou email</li>
                <li><strong>Achats groupés</strong> : informations de participation</li>
              </ul>
              <h3>Données collectées automatiquement</h3>
              <ul>
                <li>Adresse IP et données de navigation (cookies techniques)</li>
                <li>Type d&apos;appareil, navigateur et système d&apos;exploitation</li>
                <li>Pages visitées et durée des sessions</li>
              </ul>
            </section>

            <section>
              <h2 className="flex items-center gap-2"><Lock className="w-5 h-5 text-blue-600" /> 3. Utilisation des données</h2>
              <p>Vos données sont utilisées exclusivement pour :</p>
              <ul>
                <li>Traiter et livrer vos commandes</li>
                <li>Gérer votre compte client</li>
                <li>Vous contacter concernant vos commandes ou demandes</li>
                <li>Améliorer nos services et l&apos;expérience utilisateur</li>
                <li>Vous informer des promotions et achats groupés (avec votre consentement)</li>
                <li>Respecter nos obligations légales</li>
              </ul>
              <p><strong>Nous ne vendons jamais vos données personnelles à des tiers.</strong></p>
            </section>

            <section>
              <h2 className="flex items-center gap-2"><Shield className="w-5 h-5 text-blue-600" /> 4. Protection des données</h2>
              <p>Nous mettons en œuvre des mesures de sécurité appropriées :</p>
              <ul>
                <li>Chiffrement SSL/TLS pour toutes les communications</li>
                <li>Mots de passe hashés (bcrypt)</li>
                <li>Accès restreint aux données personnelles (principe du moindre privilège)</li>
                <li>Sauvegardes régulières et sécurisées</li>
                <li>Hébergement sur infrastructure cloud sécurisée (AWS)</li>
              </ul>
            </section>

            <section>
              <h2 className="flex items-center gap-2"><UserCheck className="w-5 h-5 text-blue-600" /> 5. Vos droits</h2>
              <p>Conformément à la loi sénégalaise n°2008-12 sur la protection des données à caractère personnel et au règlement de la CDP, vous disposez des droits suivants :</p>
              <ul>
                <li><strong>Droit d&apos;accès</strong> : consulter les données que nous détenons sur vous</li>
                <li><strong>Droit de rectification</strong> : corriger vos informations personnelles</li>
                <li><strong>Droit de suppression</strong> : demander l&apos;effacement de vos données</li>
                <li><strong>Droit d&apos;opposition</strong> : refuser le traitement de vos données à des fins marketing</li>
                <li><strong>Droit de portabilité</strong> : recevoir vos données dans un format structuré</li>
              </ul>
              <p>Pour exercer ces droits, contactez-nous à <strong>contact@itvisionplus.sn</strong>.</p>
            </section>

            <section>
              <h2>6. Cookies</h2>
              <p>Notre site utilise des cookies strictement nécessaires au fonctionnement :</p>
              <div className="not-prose overflow-x-auto">
                <table className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="p-3 text-left font-semibold">Cookie</th>
                      <th className="p-3 text-left font-semibold">Finalité</th>
                      <th className="p-3 text-left font-semibold">Durée</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-gray-200 dark:border-gray-700">
                      <td className="p-3">Session</td>
                      <td className="p-3">Authentification et navigation</td>
                      <td className="p-3">Session</td>
                    </tr>
                    <tr className="border-t border-gray-200 dark:border-gray-700">
                      <td className="p-3">Panier</td>
                      <td className="p-3">Sauvegarde du panier d&apos;achat</td>
                      <td className="p-3">30 jours</td>
                    </tr>
                    <tr className="border-t border-gray-200 dark:border-gray-700">
                      <td className="p-3">Thème</td>
                      <td className="p-3">Préférence mode clair/sombre</td>
                      <td className="p-3">1 an</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-4">Aucun cookie publicitaire ou de tracking tiers n&apos;est utilisé.</p>
            </section>

            <section>
              <h2 className="flex items-center gap-2"><Trash2 className="w-5 h-5 text-blue-600" /> 7. Conservation des données</h2>
              <ul>
                <li><strong>Comptes actifs</strong> : données conservées tant que le compte est actif</li>
                <li><strong>Commandes</strong> : 5 ans (obligation comptable)</li>
                <li><strong>Données de navigation</strong> : 13 mois maximum</li>
                <li><strong>Comptes supprimés</strong> : effacement sous 30 jours</li>
              </ul>
            </section>

            <section>
              <h2>8. Transferts de données</h2>
              <p>Vos données peuvent être transmises à :</p>
              <ul>
                <li>Nos prestataires de paiement (Orange Money, Wave, banques partenaires)</li>
                <li>Nos partenaires logistiques pour la livraison</li>
                <li>Notre hébergeur cloud (AWS, serveurs situés aux États-Unis)</li>
              </ul>
              <p>Ces transferts sont encadrés par des garanties contractuelles assurant un niveau de protection adéquat.</p>
            </section>

            <section>
              <h2 className="flex items-center gap-2"><Mail className="w-5 h-5 text-blue-600" /> 9. Contact</h2>
              <p>Pour toute question relative à la protection de vos données :</p>
              <div className="not-prose bg-gray-50 dark:bg-gray-800 rounded-xl p-6 space-y-2">
                <p className="font-semibold text-gray-900 dark:text-white">IT Vision Plus – Responsable des données</p>
                <p className="text-gray-600 dark:text-gray-300">Email : contact@itvisionplus.sn</p>
                <p className="text-gray-600 dark:text-gray-300">WhatsApp : +221 77 413 34 40</p>
                <p className="text-gray-600 dark:text-gray-300">Adresse : Parcelles Assainies, Unité 25 – Dakar, Sénégal</p>
              </div>
            </section>

          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}
