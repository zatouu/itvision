'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { FileCheck, CheckCircle, Phone, ArrowRight, Award, Shield, Leaf, Users } from 'lucide-react'
import Link from 'next/link'

export default function QHSEServicePage() {
  return (
    <main>
      <Header />
      <section className="bg-gradient-to-br from-teal-50 via-white to-gray-50 dark:from-black dark:via-black dark:to-black page-content pt-28 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">QHSE - Qualité, Hygiène, Sécurité, Environnement</h1>
            <p className="text-gray-700 dark:text-gray-300 max-w-3xl mx-auto">
              Accompagnement certifié pour la mise en conformité et l'amélioration continue de vos processus<br className="hidden md:inline" />
              <strong>Qualité</strong>, <strong>Hygiène</strong>, <strong>Sécurité</strong> et <strong>Environnement</strong>.
              Notre équipe certifiée vous guide vers l'excellence opérationnelle.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <FileCheck className="h-5 w-5 text-teal-600 mr-2" />
                Ce que nous proposons
              </h2>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300 text-sm">
                {[
                  'Audit et diagnostic QHSE complet',
                  'Mise en conformité réglementaire',
                  'Élaboration de procédures et documentation',
                  'Formation et sensibilisation du personnel',
                  'Mise à disposition agent QHSE',
                  'Formation ISO 9001, ISO 14001, OHSAS 18001'
                ].map((f) => (
                  <li key={f} className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 p-6">
              <h2 className="text-xl font-semibold mb-4">Demander un devis</h2>
              <div className="flex flex-wrap gap-3">
                <a
                  href={`https://wa.me/221774133440?text=${encodeURIComponent('Bonjour, je souhaite un devis pour un accompagnement QHSE.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gradient-to-r from-emerald-300 to-teal-300 hover:from-emerald-400 hover:to-teal-400 text-white px-4 py-3 rounded-lg font-semibold transition-all inline-flex items-center"
                >
                  <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" /></svg>
                  WhatsApp
                </a>
                <Link href="/contact" className="bg-gradient-to-r from-teal-300 to-emerald-300 hover:from-teal-400 hover:to-emerald-400 text-white px-4 py-3 rounded-lg font-semibold transition-all inline-flex items-center">
                  Nous contacter
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
                <a href="tel:+221774133440" className="border-2 border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 px-4 py-3 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-slate-900 inline-flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  +221 77 413 34 40
                </a>
              </div>
            </div>
          </div>

          {/* Bloc descriptif enrichi */}
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 p-6">
              <div className="flex items-center mb-3">
                <Award className="h-8 w-8 text-teal-600 mr-2" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Qualité</h3>
              </div>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300 text-sm">
                <li className="flex items-start"><CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />Management de la qualité ISO 9001</li>
                <li className="flex items-start"><CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />Amélioration continue des processus</li>
                <li className="flex items-start"><CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />Indicateurs de performance qualité</li>
                <li className="flex items-start"><CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />Satisfaction client et traçabilité</li>
              </ul>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 p-6">
              <div className="flex items-center mb-3">
                <Users className="h-8 w-8 text-teal-600 mr-2" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Hygiène</h3>
              </div>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300 text-sm">
                <li className="flex items-start"><CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />HACCP et sécurité alimentaire</li>
                <li className="flex items-start"><CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />Procédures d'hygiène et nettoyage</li>
                <li className="flex items-start"><CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />Gestion des risques sanitaires</li>
                <li className="flex items-start"><CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />Formation du personnel</li>
              </ul>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 p-6">
              <div className="flex items-center mb-3">
                <Shield className="h-8 w-8 text-teal-600 mr-2" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Sécurité</h3>
              </div>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300 text-sm">
                <li className="flex items-start"><CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />Sécurité au travail (OHSAS 18001)</li>
                <li className="flex items-start"><CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />Évaluation des risques professionnels</li>
                <li className="flex items-start"><CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />Prévention des accidents</li>
                <li className="flex items-start"><CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />Équipements de protection individuelle</li>
              </ul>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 p-6">
              <div className="flex items-center mb-3">
                <Leaf className="h-8 w-8 text-teal-600 mr-2" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Environnement</h3>
              </div>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300 text-sm">
                <li className="flex items-start"><CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />ISO 14001 - Management environnemental</li>
                <li className="flex items-start"><CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />Réduction de l'impact environnemental</li>
                <li className="flex items-start"><CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />Gestion des déchets et recyclage</li>
                <li className="flex items-start"><CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5" />Économies d'énergie et ressources</li>
              </ul>
            </div>
          </div>

          {/* Section Nos engagements */}
          <div className="mt-12 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl shadow-xl p-8 text-white">
            <h2 className="text-3xl font-bold mb-6 text-center">Notre équipe certifiée</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <Award className="h-12 w-12 mx-auto mb-3 opacity-90" />
                <h3 className="text-xl font-semibold mb-2">Certifications reconnues</h3>
                <p className="text-sm opacity-90">
                  Nos consultants sont certifiés et possèdent une expertise approfondie dans les normes internationales QHSE.
                </p>
              </div>
              <div className="text-center">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-90" />
                <h3 className="text-xl font-semibold mb-2">Accompagnement personnalisé</h3>
                <p className="text-sm opacity-90">
                  Nous adaptons nos solutions à vos besoins spécifiques et à votre secteur d'activité.
                </p>
              </div>
              <div className="text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-90" />
                <h3 className="text-xl font-semibold mb-2">Résultats garantis</h3>
                <p className="text-sm opacity-90">
                  Suivi continu et amélioration permanente pour garantir votre conformité et votre performance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}

