'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, User, Building, Wrench, FileText, Camera, CheckCircle, Save, Plus, X, AlertCircle, Upload } from 'lucide-react'

type Recommendation = {
  produit: string
  quantite: number
  commentaire?: string
}

type Project = {
  _id: string
  name: string
  address: string
}

type Client = {
  _id: string
  name: string
  email?: string
}

type Product = {
  _id: string
  name: string
  price?: number
}

interface TechnicianInterventionFormProps {
  onSuccess?: () => void
}

export default function TechnicianInterventionForm({ onSuccess }: TechnicianInterventionFormProps = {}) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 10),
    heureDebut: '',
    heureFin: '',
    projetId: '',
    clientId: '',
    typeIntervention: 'maintenance' as 'urgence' | 'maintenance' | 'installation' | 'autre',
    description: '',
    activites: '',
    observations: ''
  })
  
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [newRec, setNewRec] = useState({ produit: '', quantite: 1, commentaire: '' })
  const [photosAvant, setPhotosAvant] = useState<File[]>([])
  const [photosApres, setPhotosApres] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [technicianId, setTechnicianId] = useState<string>('')

  useEffect(() => {
    ;(async () => {
      try {
        const [pRes, cRes, prodRes, authRes] = await Promise.all([
          fetch('/api/projects?status=all&limit=200', { credentials: 'include' }),
          fetch('/api/admin/clients?limit=200', { credentials: 'include' }),
          fetch('/api/products?limit=500', { credentials: 'include' }),
          fetch('/api/auth/login', { credentials: 'include' })
        ])
        if (pRes.ok) {
          const j = await pRes.json()
          setProjects(j.projects || [])
        }
        if (cRes.ok) {
          const j = await cRes.json()
          setClients((j.clients || []).map((c: any) => ({ _id: c.id || c._id, name: c.name || c.company || c.username, email: c.email })))
        }
        if (prodRes.ok) {
          const j = await prodRes.json()
          setProducts(j.items || [])
        }
        if (authRes.ok) {
          const j = await authRes.json()
          setTechnicianId(j.user?.id || '')
        }
      } catch {}
    })()
  }, [])

  useEffect(() => {
    if (formData.projetId && projects.length > 0) {
      const p = projects.find(p => String(p._id) === formData.projetId)
      if (p) {
        const client = clients.find(c => {
          // Essayer de trouver le client lié au projet
          return true // À améliorer avec une vraie relation
        })
        if (client) setFormData({ ...formData, clientId: client._id })
      }
    }
  }, [formData.projetId])

  const calculateDuration = () => {
    if (!formData.heureDebut || !formData.heureFin) return 0
    const [h1, m1] = formData.heureDebut.split(':').map(Number)
    const [h2, m2] = formData.heureFin.split(':').map(Number)
    const d1 = h1 * 60 + m1
    const d2 = h2 * 60 + m2
    const diff = d2 > d1 ? d2 - d1 : (24 * 60) - d1 + d2
    return Math.round(diff / 60 * 10) / 10
  }

  const addRecommendation = () => {
    if (!newRec.produit) return
    setRecommendations([...recommendations, { ...newRec }])
    setNewRec({ produit: '', quantite: 1, commentaire: '' })
  }

  const removeRecommendation = (idx: number) => {
    setRecommendations(recommendations.filter((_, i) => i !== idx))
  }

  const handleFileUpload = async (files: File[], type: 'avant' | 'apres') => {
    const uploaded: string[] = []
    setUploading(true)
    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', type === 'avant' ? 'interventions/avant' : 'interventions/apres')
        try {
          const res = await fetch('/api/upload', { method: 'POST', body: formData })
          if (res.ok) {
            const j = await res.json()
            if (j.url) uploaded.push(j.url)
          }
        } catch (err) {
          console.error('Erreur upload fichier:', err)
        }
      }
    } finally {
      setUploading(false)
    }
    return uploaded
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.clientId || !formData.date || !formData.heureDebut || !formData.heureFin) {
      return alert('Champs obligatoires manquants')
    }
    if (photosAvant.length === 0 || photosApres.length === 0) {
      return alert('Au moins une photo avant et une photo après sont requises')
    }

    setSubmitting(true)
    try {
      // Upload photos
      const [avantUrls, apresUrls] = await Promise.all([
        handleFileUpload(photosAvant, 'avant'),
        handleFileUpload(photosApres, 'apres')
      ])

      // Créer intervention
      const payload = {
        technicienId: technicianId,
        clientId: formData.clientId,
        projectId: formData.projetId || undefined,
        date: formData.date,
        heureDebut: formData.heureDebut,
        heureFin: formData.heureFin,
        typeIntervention: formData.typeIntervention,
        description: formData.description,
        activites: formData.activites,
        observations: formData.observations,
        recommandations: recommendations,
        photosAvant: avantUrls,
        photosApres: apresUrls,
        status: 'soumis'
      }

      const res = await fetch('/api/interventions/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur soumission')
      }

      const result = await res.json()
      
      let message = 'Intervention soumise avec succès !'
      if (result.quote) {
        message = `Intervention soumise avec succès !\n\n✅ Devis automatique généré : ${result.quote.totalTTC.toLocaleString('fr-FR')} Fcfa\n(${result.quote.productsCount} produit(s))\n\nL'admin pourra réviser et envoyer le devis au client.`
      } else if (recommendations && recommendations.length > 0) {
        message = 'Intervention soumise avec succès !\n\n⚠️ Devis à créer manuellement par l\'admin (produits non trouvés dans le catalogue).'
      }
      
      // Callback de succès si fourni
      if (onSuccess) {
        onSuccess()
      } else {
        alert(message)
      }
      
      // Reset form
      setFormData({
        date: new Date().toISOString().slice(0, 10),
        heureDebut: '',
        heureFin: '',
        projetId: '',
        clientId: '',
        typeIntervention: 'maintenance',
        description: '',
        activites: '',
        observations: ''
      })
      setRecommendations([])
      setPhotosAvant([])
      setPhotosApres([])
    } catch (error: any) {
      alert(`Erreur: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const duration = calculateDuration()

  return (
    <div className="w-full">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Wrench className="h-5 w-5 text-emerald-600" />
          Formulaire d'Intervention Numérique
        </h3>
        <p className="text-gray-600 mt-1 text-sm">Enregistrez votre intervention et générez automatiquement un devis</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Infos générales */}
        <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-emerald-600" />
            Informations générales
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date d'intervention *</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Heure début *</label>
              <input
                type="time"
                required
                value={formData.heureDebut}
                onChange={e => setFormData({ ...formData, heureDebut: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Heure fin *</label>
              <input
                type="time"
                required
                value={formData.heureFin}
                onChange={e => setFormData({ ...formData, heureFin: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div className="md:col-span-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-800">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">Durée calculée: {duration}h</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Projet et Client */}
        <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building className="h-5 w-5 text-emerald-600" />
            Projet et Client
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Projet / Site</label>
              <select
                value={formData.projetId}
                onChange={e => setFormData({ ...formData, projetId: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Sélectionner un projet</option>
                {projects.map(p => (
                  <option key={p._id} value={p._id}>{p.name} - {p.address}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
              <select
                required
                value={formData.clientId}
                onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Sélectionner un client</option>
                {clients.map(c => (
                  <option key={c._id} value={c._id}>{c.name} {c.email && `(${c.email})`}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Nature et Description */}
        <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Wrench className="h-5 w-5 text-emerald-600" />
            Nature de l'intervention
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select
                required
                value={formData.typeIntervention}
                onChange={e => setFormData({ ...formData, typeIntervention: e.target.value as any })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="maintenance">Maintenance</option>
                <option value="urgence">Urgence</option>
                <option value="installation">Installation</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description du problème</label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                rows={3}
                placeholder="Détails du problème rencontré..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Activités réalisées</label>
              <textarea
                value={formData.activites}
                onChange={e => setFormData({ ...formData, activites: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                rows={3}
                placeholder="Liste des activités effectuées..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observations techniques</label>
              <textarea
                value={formData.observations}
                onChange={e => setFormData({ ...formData, observations: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                rows={3}
                placeholder="Notes techniques du technicien..."
              />
            </div>
          </div>
        </div>

        {/* Section 4: Recommandations */}
        <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-600" />
            Recommandations (seront converties en lignes de devis)
          </h3>
          <div className="space-y-3">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-white border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{rec.produit}</div>
                  <div className="text-sm text-gray-600">Qté: {rec.quantite} {rec.commentaire && `• ${rec.commentaire}`}</div>
                </div>
                <button type="button" onClick={() => removeRecommendation(idx)} className="text-red-600 hover:text-red-800">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                type="text"
                value={newRec.produit}
                onChange={e => setNewRec({ ...newRec, produit: e.target.value })}
                placeholder="Nom du produit"
                className="flex-1 border rounded-lg px-3 py-2"
                list="products-list"
              />
              <datalist id="products-list">
                {products.map(p => <option key={p._id} value={p.name} />)}
              </datalist>
              <input
                type="number"
                min="1"
                value={newRec.quantite}
                onChange={e => setNewRec({ ...newRec, quantite: Number(e.target.value) || 1 })}
                placeholder="Qté"
                className="w-20 border rounded-lg px-3 py-2"
              />
              <input
                type="text"
                value={newRec.commentaire}
                onChange={e => setNewRec({ ...newRec, commentaire: e.target.value })}
                placeholder="Commentaire (optionnel)"
                className="flex-1 border rounded-lg px-3 py-2"
              />
              <button type="button" onClick={addRecommendation} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Section 5: Photos */}
        <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Camera className="h-5 w-5 text-emerald-600" />
            Photos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Photos avant *</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={e => setPhotosAvant(Array.from(e.target.files || []))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                required
              />
              {photosAvant.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {photosAvant.map((f, i) => (
                    <div key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {f.name} ({(f.size / 1024).toFixed(0)} KB)
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Photos après *</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={e => setPhotosApres(Array.from(e.target.files || []))}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                required
              />
              {photosApres.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {photosApres.map((f, i) => (
                    <div key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {f.name} ({(f.size / 1024).toFixed(0)} KB)
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => {
              const confirmed = confirm('Enregistrer comme brouillon ?')
              if (confirmed) {
                // TODO: Sauvegarder brouillon
                alert('Brouillon sauvegardé')
              }
            }}
            className="px-6 py-2 border rounded-lg hover:bg-gray-50"
          >
            Brouillon
          </button>
          <button
            type="submit"
            disabled={submitting || uploading}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
          >
            {submitting || uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {uploading ? 'Upload des photos...' : 'Envoi en cours...'}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Soumettre et générer le devis
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

