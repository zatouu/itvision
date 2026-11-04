'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { UserX, Smartphone, Mail, Trash2, ShieldAlert, Clock, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function SuppressionComptePage() {
  const lastUpdate = '25 septembre 2026'

  return (
    <main>
      <Header />
      <section className="page-content pt-28 pb-16 bg-white dark:bg-black">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center text-emerald-600 hover:underline mb-6 text-sm">
            <ArrowLeft className="w-4 h-4 mr-1" /> Retour à l&apos;accueil
          </Link>

          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
              <UserX className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Suppression de compte</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Dernière mise à jour : {lastUpdate}</p>
            </div>
          </div>

          <div className="prose prose-red max-w-none dark:prose-invert space-y-8">

            <section>
              <p>
                Cette page décrit la procédure de suppression de votre compte <strong>Xeuy Bi</strong> et des
                données associées, conformément au RGPD et aux exigences des stores d&apos;applications.
              </p>
            </section>

            <section>
              <h2 className="flex items-center gap-2"><Smartphone className="w-5 h-5 text-red-600" /> 1. Depuis l&apos;application Xeuy Bi</h2>
              <ol>
                <li>Ouvrez l&apos;application et connectez-vous avec votre numéro de téléphone</li>
                <li>Allez dans <strong>Profil → Confidentialité</strong></li>
                <li>Appuyez sur <strong>« Supprimer mon compte »</strong> et confirmez</li>
              </ol>
              <p>
                La suppression est <strong>immédiate</strong> : votre compte est désactivé, votre profil anonymisé
                et vos données personnelles effacées sous 30 jours.
              </p>
            </section>

            <section>
              <h2 className="flex items-center gap-2"><Mail className="w-5 h-5 text-red-600" /> 2. Par email (sans l&apos;application)</h2>
              <p>
                Si vous ne pouvez pas accéder à l&apos;application, envoyez une demande à{' '}
                <a href="mailto:contact@itvisionplus.sn?subject=Suppression%20de%20compte%20Xeuy%20Bi">contact@itvisionplus.sn</a>{' '}
                avec :
              </p>
              <ul>
                <li>L&apos;objet : « Suppression de compte Xeuy Bi »</li>
                <li>Le numéro de téléphone associé à votre compte</li>
              </ul>
              <p>
                Pour votre sécurité, une vérification d&apos;identité (code OTP par SMS) peut vous être demandée.
                Votre demande sera traitée sous <strong>30 jours maximum</strong>.
              </p>
            </section>

            <section>
              <h2 className="flex items-center gap-2"><Trash2 className="w-5 h-5 text-red-600" /> 3. Données supprimées</h2>
              <ul>
                <li>Profil : nom, photo, adresse, préférences</li>
                <li>Demandes de service et devis en cours (non actifs)</li>
                <li>Messages de chat et notifications</li>
                <li>Jetons de notification push et sessions actives</li>
              </ul>
            </section>

            <section>
              <h2 className="flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-red-600" /> 4. Données conservées (obligations légales)</h2>
              <p>
                Les documents financiers (factures, transactions) sont conservés <strong>anonymisés</strong> pendant
                la durée légale de conservation comptable. Ils ne contiennent plus aucune donnée identifiante.
              </p>
            </section>

            <section>
              <h2 className="flex items-center gap-2"><Clock className="w-5 h-5 text-red-600" /> 5. Cas bloquants</h2>
              <p>La suppression est impossible tant que :</p>
              <ul>
                <li>Une mission est en cours (client ou prestataire)</li>
                <li>Un paiement séquestré (escrow) est en attente de résolution</li>
                <li>Le solde du portefeuille n&apos;est pas à zéro</li>
              </ul>
              <p>Résolvez d&apos;abord ces éléments, puis relancez la suppression depuis l&apos;application.</p>
            </section>

            <section>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Pour toute question : <a href="mailto:contact@itvisionplus.sn">contact@itvisionplus.sn</a> —
                voir aussi notre <Link href="/politique-confidentialite" className="text-emerald-600 hover:underline">politique de confidentialité</Link>.
              </p>
            </section>

          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}
