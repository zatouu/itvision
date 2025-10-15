'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { Camera, CheckCircle, Phone, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function VideosurveillanceServicePage() {
  return (
    <main>
      <Header />
      <section className="bg-gradient-to-br from-blue-50 via-white to-gray-50 page-content pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Vidéosurveillance</h1>
            <p className="text-gray-600 max-w-3xl mx-auto">
              Systèmes de surveillance haute définition pour protéger vos locaux 24h/24, avec accès mobile et enregistrement fiable.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Camera className="h-5 w-5 text-blue-600 mr-2" />
                Ce que nous proposons
              </h2>
              <ul className="space-y-2 text-gray-700 text-sm">
                {[
                  'Caméras HD/4K avec vision nocturne',
                  'Enregistrement cloud sécurisé',
                  'Accès mobile temps réel',
                  'Analyse vidéo et détection intelligente',
                  'Installation professionnelle et discrète',
                ].map((f) => (
                  <li key={f} className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h2 className="text-xl font-semibold mb-4">Demander un devis</h2>
              <div className="space-y-3">
                <a
                  href={`https://wa.me/221774133440?text=${encodeURIComponent('Bonjour, je souhaite un devis pour une installation de vidéosurveillance.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg font-semibold transition-all inline-flex items-center"
                >
                  <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" /></svg>
                  WhatsApp
                </a>
                <Link href="/contact" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold transition-all inline-flex items-center">
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
              <h3 className="text-xl font-semibold mb-3">Pourquoi maintenant ?</h3>
              <p className="text-gray-700 mb-3">
                La vidéosurveillance moderne dépasse la simple captation d’images. Elle combine <strong>caméras IP</strong>,
                <strong> stockage hybride</strong> et <strong>analyses intelligentes</strong> pour dissuader, détecter et documenter.
                L’accès mobile et les <strong>tableaux de bord</strong> offrent une vision temps réel multi‑sites.
              </p>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li className="flex items-start"><CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />Dissuasion visible et preuves exploitables</li>
                <li className="flex items-start"><CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />Supervision multi‑sites et alertes en direct</li>
                <li className="flex items-start"><CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />Conformité RGPD et gestion des rétentions</li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-xl font-semibold mb-3">Cas d’usage concrets</h3>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li className="flex items-start"><CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />Retail: comptage de personnes, zones chaudes, files d’attente</li>
                <li className="flex items-start"><CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />Résidentiel: périmétrie, détection intrusion, levée de doute</li>
                <li className="flex items-start"><CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />Industriel: franchissement de ligne, EPI, zones sensibles</li>
                <li className="flex items-start"><CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />Parkings: LAPI/ANPR, suivi d’occupation, incidents</li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
              <h3 className="text-xl font-semibold mb-3">Notre apport IT Vision</h3>
              <p className="text-gray-700 mb-3">
                Nous dimensionnons une architecture <strong>PoE/VLAN</strong> robuste, un stockage adapté (NVR/NAS/cloud),
                et des <strong>politiques de cybersécurité</strong> (mots de passe forts, réseaux isolés, mises à jour).
              </p>
              <ul className="space-y-2 text-gray-700 text-sm">
                <li className="flex items-start"><CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />Audit site et couverture optique (intérieur/extérieur)</li>
                <li className="flex items-start"><CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />Choix caméras (dôme, bullet, PTZ, varifocale) selon contexte</li>
                <li className="flex items-start"><CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />Documentation, formation, et maintenance proactive</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}
