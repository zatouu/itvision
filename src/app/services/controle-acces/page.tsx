'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Shield, CheckCircle, Phone, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function ControleAccesServicePage() {
  return (
    <main>
      <Header />
      <section className="bg-gradient-to-br from-green-50 via-white to-gray-50 page-content pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Contrôle d'accès</h1>
            <p className="text-gray-700 max-w-3xl mx-auto">
              Sécurisez vos locaux et fluidifiez l’expérience collaborateurs/visiteurs avec des identifiants
              <strong> NFC/biométrie</strong> et une <strong>gestion centralisée</strong> par zones et horaires. Traçabilité
              complète, intégration portails, parkings et ascenseurs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-xl font-semibold mb-4">Solutions</h2>
              <ul className="space-y-2 text-gray-700 text-sm">
                {[
                  'Badges RFID programmables',
                  'Lecteurs biométriques',
                  'Claviers à codes sécurisés',
                  'Gestion des accès par zones',
                  'Journalisation et traçabilité complète',
                ].map((f) => (
                  <li key={f} className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-xl font-semibold mb-4">Contact</h2>
              <div className="space-y-3">
                <a
                  href={`https://wa.me/221774133440?text=${encodeURIComponent("Bonjour, je souhaite un devis pour un système de contrôle d'accès.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg font-semibold transition-all inline-flex items-center"
                >
                  <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" /></svg>
                  WhatsApp
                </a>
                <Link href="/contact" className="bg-gradient-to-r from-emerald-500 to-purple-600 hover:from-emerald-600 hover:to-purple-700 text-white px-4 py-3 rounded-lg font-semibold transition-all inline-flex items-center shadow-md hover:shadow-lg">
                  Nous contacter
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
                <a href="tel:+221774133440" className="border-2 border-gray-300 text-gray-700 px-4 py-3 rounded-lg font-semibold hover:bg-gray-50 inline-flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  +221 77 413 34 40
                </a>
              </div>
            </div>
          </div>

          {/* Bloc descriptif enrichi */}
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-xl font-semibold mb-3">Bénéfices mesurables</h3>
              <p className="text-gray-700 mb-3">
                Maîtrisez précisément <strong>qui entre, quand et où</strong>. Réduisez les risques, éliminez les clés
                physiques et gagnez en productivité avec des droits dynamiques.
              </p>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li className="flex items-start"><CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />Réduction des intrusions et pertes associées</li>
                <li className="flex items-start"><CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />Historique des passages exploitable</li>
                <li className="flex items-start"><CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />Droits à la minute près pour employés et visiteurs</li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-xl font-semibold mb-3">Contexte moderne</h3>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li className="flex items-start"><CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />Badges NFC, biométrie, QR code invités</li>
                <li className="flex items-start"><CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />Portails, portes, ascenseurs, parkings intégrés</li>
                <li className="flex items-start"><CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />Scénarios: multi‑sites, anti‑passback, anti‑tailgating</li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-xl font-semibold mb-3">Apport IT Vision</h3>
              <p className="text-gray-700 mb-3">
                Conception évolutive: <strong>contrôleurs</strong>, lecteurs, câblage, <strong>politiques granulaires</strong>.
                Intégration vidéosurveillance et supervision pour une sécurité <strong>end‑to‑end</strong>.
              </p>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li className="flex items-start"><CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />Cartographie des zones et profils</li>
                <li className="flex items-start"><CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />Procédures d’onboarding/offboarding</li>
                <li className="flex items-start"><CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />Formation et documentation complète</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}
