'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit3, Trash2, Star, Image as ImageIcon, Save, X } from 'lucide-react'
import ImageUpload from './ImageUpload'

interface Realization {
  id: string
  title: string
  location: string
  description: string
  services: string[]
  mainImage: string
  images: string[]
  featured: boolean
  order: number
}

export default function RealizationManager() {
  const [realizations, setRealizations] = useState<Realization[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    description: '',
    services: [''],
    mainImage: '',
    images: [] as string[],
    featured: false,
    order: 0
  })

  useEffect(() => {
    loadRealizations()
  }, [])

  const loadRealizations = async () => {
    try {
      const response = await fetch('/api/realizations')
      const data = await response.json()
      
      if (data.success) {
        setRealizations(data.realizations)
      }
    } catch (error) {
      console.error('Erreur chargement réalisations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      const method = editingId ? 'PUT' : 'POST'
      const url = editingId ? `/api/realizations/${editingId}` : '/api/realizations'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          services: formData.services.filter(s => s.trim() !== '')
        }),
      })

      const data = await response.json()

      if (data.success) {
        await loadRealizations()
        resetForm()
        alert('Réalisation sauvegardée avec succès!')
      } else {
        alert(`Erreur: ${data.error}`)
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error)
      alert('Erreur lors de la sauvegarde')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette réalisation ?')) {
      return
    }

    try {
      const response = await fetch(`/api/realizations/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        await loadRealizations()
        alert('Réalisation supprimée avec succès!')
      } else {
        alert(`Erreur: ${data.error}`)
      }
    } catch (error) {
      console.error('Erreur suppression:', error)
      alert('Erreur lors de la suppression')
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      location: '',
      description: '',
      services: [''],
      mainImage: '',
      images: [],
      featured: false,
      order: 0
    })
    setEditingId(null)
    setShowAddForm(false)
  }

  const startEdit = (realization: Realization) => {
    setFormData({
      title: realization.title,
      location: realization.location,
      description: realization.description,
      services: realization.services,
      mainImage: realization.mainImage,
      images: realization.images,
      featured: realization.featured,
      order: realization.order
    })
    setEditingId(realization.id)
    setShowAddForm(true)
  }

  const addService = () => {
    setFormData(prev => ({
      ...prev,
      services: [...prev.services, '']
    }))
  }

  const updateService = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.map((service, i) => i === index ? value : service)
    }))
  }

  const removeService = (index: number) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index)
    }))
  }

  if (loading) {
    return <div className="flex justify-center p-8">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Gestion des Réalisations</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Nouvelle réalisation</span>
        </button>
      </div>

      {/* Formulaire d'ajout/édition */}
      {showAddForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">
              {editingId ? 'Modifier la réalisation' : 'Nouvelle réalisation'}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Localisation *
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Services
                </label>
                <div className="space-y-2">
                  {formData.services.map((service, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={service}
                        onChange={(e) => updateService(index, e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Nom du service"
                      />
                      {formData.services.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeService(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addService}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    + Ajouter un service
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData(prev => ({ ...prev, featured: e.target.checked }))}
                    className="mr-2"
                  />
                  <Star className="h-4 w-4 text-yellow-500 mr-1" />
                  Réalisation mise en avant
                </label>

                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Ordre:</label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                    className="w-20 px-2 py-1 border border-gray-300 rounded"
                    min="0"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image principale *
                </label>
                <ImageUpload
                  onUpload={(url) => setFormData(prev => ({ ...prev, mainImage: url }))}
                  onRemove={() => setFormData(prev => ({ ...prev, mainImage: '' }))}
                  maxFiles={1}
                  type="realizations"
                  existingImages={formData.mainImage ? [formData.mainImage] : []}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Images supplémentaires
                </label>
                <ImageUpload
                  onUpload={(url) => setFormData(prev => ({ ...prev, images: [...prev.images, url] }))}
                  onRemove={(url) => setFormData(prev => ({ ...prev, images: prev.images.filter(img => img !== url) }))}
                  maxFiles={5}
                  type="realizations"
                  existingImages={formData.images}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4 mt-6">
            <button
              onClick={resetForm}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={!formData.title || !formData.location || !formData.description || !formData.mainImage}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="h-5 w-5" />
              <span>Sauvegarder</span>
            </button>
          </div>
        </div>
      )}

      {/* Liste des réalisations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {realizations.map((realization) => (
          <div key={realization.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="aspect-video relative">
              <img
                src={realization.mainImage}
                alt={realization.title}
                className="w-full h-full object-cover"
              />
              {realization.featured && (
                <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded-full">
                  <Star className="h-4 w-4" />
                </div>
              )}
            </div>
            
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-1">{realization.title}</h3>
              <p className="text-sm text-gray-600 mb-2">{realization.location}</p>
              <p className="text-sm text-gray-700 mb-3 line-clamp-2">{realization.description}</p>
              
              <div className="flex flex-wrap gap-1 mb-4">
                {realization.services.map((service, index) => (
                  <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {service}
                  </span>
                ))}
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => startEdit(realization)}
                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(realization.id)}
                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {realizations.length === 0 && (
        <div className="text-center py-12">
          <ImageIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune réalisation</h3>
          <p className="text-gray-600">Commencez par ajouter votre première réalisation.</p>
        </div>
      )}
    </div>
  )
}