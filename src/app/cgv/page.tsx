'use client'

import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { FileText, ShieldCheck, Truck, CreditCard, AlertTriangle, Scale, Clock, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function CGVPage() {
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
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
              <FileText className="w-8 h-8 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Conditions Générales de Vente</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Dernière mise à jour : {lastUpdate}</p>
            </div>
          </div>

          <div className="prose prose-emerald max-w-none dark:prose-invert space-y-8">

            <section>
              <h2 className="flex items-center gap-2"><Scale className="w-5 h-5 text-emerald-600" /> Article 1 – Objet et champ d&apos;application</h2>
              <p>Les présentes Conditions Générales de Vente (CGV) s&apos;appliquent à toutes les commandes passées sur la plateforme <strong>itvisionplus.sn</strong>, exploitée par IT Vision Plus, entreprise de droit sénégalais spécialisée en sécurité électronique, domotique et import de matériel technologique.</p>
              <p>Toute commande implique l&apos;acceptation sans réserve des présentes CGV. IT Vision Plus se réserve le droit de modifier ces conditions à tout moment. Les CGV applicables sont celles en vigueur au moment de la commande.</p>
            </section>

            <section>
              <h2 className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-600" /> Article 2 – Produits et services</h2>
              <p>IT Vision Plus propose :</p>
              <ul>
                <li><strong>Produits importés</strong> : matériel de vidéosurveillance, contrôle d&apos;accès, alarme, domotique et réseau, sourcés depuis la Chine (1688.com, AliExpress, fournisseurs directs).</li>
                <li><strong>Services d&apos;installation</strong> : mise en service, configuration et formation sur site à Dakar et environs.</li>
                <li><strong>Contrats de maintenance</strong> : préventive, curative ou full service avec SLA définis.</li>
              </ul>
              <p>Les photos et descriptions sont fournies à titre indicatif. Les caractéristiques essentielles sont décrites dans la fiche produit. En cas de doute, contactez-nous avant commande.</p>
            </section>

            <section>
              <h2 className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-emerald-600" /> Article 3 – Prix et paiement</h2>
              <p>Les prix sont indiqués en <strong>Francs CFA (FCFA)</strong>, toutes taxes comprises. Les frais de transport sont calculés séparément selon la méthode choisie (express aérien, fret aérien, maritime).</p>
              <h3>Décomposition transparente</h3>
              <p>Pour les produits importés, le prix inclut :</p>
              <ul>
                <li>Coût d&apos;achat fournisseur (converti au taux du jour)</li>
                <li>Frais de service IT Vision (10%)</li>
                <li>Assurance transport (2,5%)</li>
                <li>Frais de transport selon méthode choisie</li>
              </ul>
              <h3>Moyens de paiement acceptés</h3>
              <ul>
                <li>Virement bancaire</li>
                <li>Orange Money / Wave</li>
                <li>Paiement à la livraison (Dakar uniquement, selon montant)</li>
              </ul>
              <p>Un acompte de <strong>50% minimum</strong> est requis pour les commandes sur demande (produits importés). Le solde est payable à la livraison ou avant expédition.</p>
            </section>

            <section>
              <h2 className="flex items-center gap-2"><Truck className="w-5 h-5 text-emerald-600" /> Article 4 – Livraison et délais</h2>
              <p>Les délais de livraison varient selon la méthode de transport choisie :</p>
              <div className="not-prose overflow-x-auto">
                <table className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="p-3 text-left font-semibold">Méthode</th>
                      <th className="p-3 text-left font-semibold">Délai estimé</th>
                      <th className="p-3 text-left font-semibold">Remarque</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-gray-200 dark:border-gray-700">
                      <td className="p-3">Express aérien</td>
                      <td className="p-3">3-5 jours</td>
                      <td className="p-3">Porte-à-porte Dakar</td>
                    </tr>
                    <tr className="border-t border-gray-200 dark:border-gray-700">
                      <td className="p-3">Fret aérien groupé</td>
                      <td className="p-3">10-15 jours</td>
                      <td className="p-3">Groupage économique</td>
                    </tr>
                    <tr className="border-t border-gray-200 dark:border-gray-700">
                      <td className="p-3">Fret maritime</td>
                      <td className="p-3">45-60 jours</td>
                      <td className="p-3">Idéal gros volumes</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-4">Les délais sont indicatifs et peuvent varier en fonction des conditions douanières et logistiques. IT Vision Plus s&apos;engage à informer le client de tout retard significatif.</p>
            </section>

            <section>
              <h2 className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-emerald-600" /> Article 5 – Garantie et réclamations</h2>
              <h3>Garantie constructeur</h3>
              <p>Les produits neufs bénéficient de la garantie constructeur (généralement 12 à 24 mois selon le fabricant). IT Vision Plus assure le suivi SAV et le remplacement si nécessaire.</p>
              <h3>Réclamations</h3>
              <ul>
                <li>Tout produit défectueux doit être signalé dans les <strong>48 heures</strong> suivant la réception.</li>
                <li>Les réclamations sont à adresser par email à <strong>contact@itvisionplus.sn</strong> ou via WhatsApp au <strong>+221 77 413 34 40</strong>.</li>
                <li>Les photos du produit et de l&apos;emballage sont requises.</li>
              </ul>
              <h3>Exclusions</h3>
              <p>La garantie ne couvre pas : l&apos;usure normale, les dommages causés par une mauvaise utilisation, les modifications non autorisées, les dégâts liés à une surtension électrique.</p>
            </section>

            <section>
              <h2 className="flex items-center gap-2"><Clock className="w-5 h-5 text-emerald-600" /> Article 6 – Droit de rétractation</h2>
              <p>Conformément à la législation sénégalaise :</p>
              <ul>
                <li>Les produits <strong>sur commande</strong> (importés spécifiquement pour le client) ne sont ni repris ni échangés, sauf défaut avéré.</li>
                <li>Les produits <strong>en stock à Dakar</strong> peuvent être retournés dans les <strong>7 jours</strong> suivant la livraison, dans leur emballage d&apos;origine, non utilisés.</li>
                <li>Les frais de retour sont à la charge du client.</li>
              </ul>
            </section>

            <section>
              <h2>Article 7 – Achats groupés</h2>
              <p>IT Vision Plus propose des achats groupés permettant d&apos;obtenir des prix dégressifs :</p>
              <ul>
                <li>L&apos;inscription à un achat groupé vaut engagement ferme.</li>
                <li>Le prix final est déterminé par la quantité totale atteinte à la date de clôture.</li>
                <li>Si le minimum n&apos;est pas atteint, les participants sont remboursés intégralement.</li>
                <li>Le paiement est débité uniquement lorsque le groupe atteint le seuil minimum.</li>
              </ul>
            </section>

            <section>
              <h2>Article 8 – Protection des données</h2>
              <p>IT Vision Plus collecte les données personnelles nécessaires au traitement des commandes. Ces données sont protégées conformément à notre <Link href="/politique-confidentialite" className="text-emerald-600 hover:underline">Politique de Confidentialité</Link>.</p>
            </section>

            <section>
              <h2>Article 9 – Litiges</h2>
              <p>En cas de litige, les parties s&apos;engagent à rechercher une solution amiable. À défaut d&apos;accord, le litige sera soumis aux tribunaux compétents de Dakar, Sénégal.</p>
            </section>

            <section>
              <h2>Article 10 – Contact</h2>
              <div className="not-prose bg-gray-50 dark:bg-gray-800 rounded-xl p-6 space-y-2">
                <p className="font-semibold text-gray-900 dark:text-white">IT Vision Plus</p>
                <p className="text-gray-600 dark:text-gray-300">Parcelles Assainies, Unité 25 – Dakar, Sénégal</p>
                <p className="text-gray-600 dark:text-gray-300">Email : contact@itvisionplus.sn</p>
                <p className="text-gray-600 dark:text-gray-300">WhatsApp : +221 77 413 34 40</p>
                <p className="text-gray-600 dark:text-gray-300">Site : itvisionplus.sn</p>
              </div>
            </section>

          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}
