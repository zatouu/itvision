/**
 * Composant Admin - Import en masse de produits
 * 
 * Permet d'importer des produits via CSV + ZIP d'images
 * 
 * Usage: /admin/products/bulk-import
 */

'use client'

import { useState } from 'react'
import { Upload, Download, FileText, Image, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface ImportResult {
  success: number
  failed: number
  errors: Array<{
    row: number
    product: string
    error: string
  }>
}

export default function BulkImportPage() {
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!csvFile) {
      alert('Veuillez sélectionner un fichier CSV')
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', csvFile)
      if (zipFile) {
        formData.append('imagesZip', zipFile)
      }

      const response = await fetch('/api/admin/products/bulk-import', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setResult(data.data)
      } else {
        alert(`Erreur: ${data.error}`)
      }
    } catch (error) {
      console.error('Erreur import:', error)
      alert('Erreur lors de l\'import')
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = async () => {
    const response = await fetch('/api/admin/products/bulk-import')
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template-import-produits.csv'
    a.click()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Import en masse de produits
          </h1>
          <p className="text-gray-600 mb-8">
            Importez plusieurs produits à la fois avec un fichier CSV et leurs images
          </p>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Instructions
            </h2>
            <ol className="space-y-2 text-sm text-blue-800">
              <li>1. Téléchargez le template CSV ci-dessous</li>
              <li>2. Remplissez-le avec vos produits (Excel, Google Sheets, etc.)</li>
              <li>3. Préparez un ZIP avec toutes les images (noms doivent correspondre)</li>
              <li>4. Importez le CSV et le ZIP ci-dessous</li>
            </ol>
          </div>

          {/* Télécharger template */}
          <button
            onClick={downloadTemplate}
            className="mb-8 flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-5 h-5" />
            Télécharger le template CSV
          </button>

          {/* Formulaire d'import */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Fichier CSV */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-2" />
                Fichier CSV (requis)
              </label>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none p-2"
              />
              {csvFile && (
                <p className="mt-2 text-sm text-green-600">
                  ✓ {csvFile.name} ({(csvFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>

            {/* Archive ZIP d'images */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Image className="w-4 h-4 inline mr-2" />
                Archive ZIP d'images (optionnel)
              </label>
              <input
                type="file"
                accept=".zip"
                onChange={(e) => setZipFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none p-2"
              />
              {zipFile && (
                <p className="mt-2 text-sm text-green-600">
                  ✓ {zipFile.name} ({(zipFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {/* Bouton d'import */}
            <button
              type="submit"
              disabled={loading || !csvFile}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-lg font-semibold"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Import en cours...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Lancer l'import
                </>
              )}
            </button>
          </form>

          {/* Résultats */}
          {result && (
            <div className="mt-8 space-y-4">
              {/* Résumé */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-700 mb-1">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold">Succès</span>
                  </div>
                  <p className="text-3xl font-bold text-green-900">{result.success}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-700 mb-1">
                    <XCircle className="w-5 h-5" />
                    <span className="font-semibold">Échecs</span>
                  </div>
                  <p className="text-3xl font-bold text-red-900">{result.failed}</p>
                </div>
              </div>

              {/* Erreurs */}
              {result.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-900 mb-3">Erreurs détaillées:</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {result.errors.map((err, idx) => (
                      <div key={idx} className="bg-white border border-red-200 rounded p-3 text-sm">
                        <p className="font-medium text-red-900">
                          Ligne {err.row}: {err.product}
                        </p>
                        <p className="text-red-700">{err.error}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Format CSV attendu */}
        <div className="mt-8 bg-gray-800 text-gray-100 rounded-lg p-6">
          <h2 className="font-semibold mb-4">📋 Format CSV attendu:</h2>
          <pre className="text-xs overflow-x-auto">
{`name,description,baseCost,sourceUrl,category,sku,images,tags
"Répéteur WiFi","Description...",45.50,"https://...","reseaux","REP-001","image1.jpg,image2.jpg","wifi,reseau"
"Caméra IP 4K","Description...",89.99,"https://...","surveillance","CAM-001","cam1.jpg,cam2.jpg","camera,4k"`}
          </pre>
          <div className="mt-4 text-sm space-y-1 text-gray-300">
            <p>• <strong>name</strong>: Nom du produit (requis)</p>
            <p>• <strong>baseCost</strong>: Coût d'achat en yuan (requis)</p>
            <p>• <strong>images</strong>: Noms des fichiers dans le ZIP, séparés par virgule</p>
            <p>• <strong>tags</strong>: Mots-clés, séparés par virgule</p>
          </div>
        </div>
      </div>
    </div>
  )
}
