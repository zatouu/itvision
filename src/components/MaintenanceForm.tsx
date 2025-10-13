'use client'

import { useState } from 'react'
import { X, Plus, Minus, Send } from 'lucide-react'

interface MaintenanceFormProps {
  isOpen: boolean
  onClose: () => void
}

interface Equipment {
  id: string
  category: string
  brand: string
  model: string
  quantity: number
  details: string
}

export default function MaintenanceForm({ isOpen, onClose }: MaintenanceFormProps) {
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    installationDate: '',
    currentIssues: '',
    maintenanceHistory: '',
    urgency: 'normal'
  })

  const [equipment, setEquipment] = useState<Equipment[]>([
    {
      id: '1',
      category: '',
      brand: '',
      model: '',
      quantity: 1,
      details: ''
    }
  ])

  const equipmentCategories = [
    'NVR/DVR',
    'Caméras IP',
    'Caméras analogiques',
    'Switch PoE',
    'Routeurs/Switches',
    'Écrans/Moniteurs',
    'Disques durs',
    'Onduleurs',
    'Serveurs',
    'Câblage réseau',
    'Contrôle d\'accès',
    'Alarmes',
    'Interphonie',
    'Autre'
  ]

  const addEquipment = () => {
    setEquipment([...equipment, {
      id: Date.now().toString(),
      category: '',
      brand: '',
      model: '',
      quantity: 1,
      details: ''
    }])
  }

  const removeEquipment = (id: string) => {
    if (equipment.length > 1) {
      setEquipment(equipment.filter(eq => eq.id !== id))
    }
  }

  const updateEquipment = (id: string, field: keyof Equipment, value: string | number) => {
    setEquipment(equipment.map(eq => 
      eq.id === id ? { ...eq, [field]: value } : eq
    ))
  }

  const generateWhatsAppMessage = () => {
    const equipmentList = equipment.map((eq, index) => 
      `${index + 1}. ${eq.category}: ${eq.brand} ${eq.model} (Qté: ${eq.quantity})${eq.details ? ` - ${eq.details}` : ''}`
    ).join('%0A')

    const message = `🔧 DEMANDE DE MAINTENANCE%0A%0A👤 INFORMATIONS CLIENT:%0A- Entreprise: ${formData.companyName}%0A- Contact: ${formData.contactName}%0A- Téléphone: ${formData.phone}%0A- Email: ${formData.email}%0A- Adresse: ${formData.address}%0A%0A📅 HISTORIQUE:%0A- Date installation: ${formData.installationDate || 'Non renseignée'}%0A- Historique maintenance: ${formData.maintenanceHistory || 'Aucun'}%0A%0A⚠️ SITUATION ACTUELLE:%0A- Problèmes constatés: ${formData.currentIssues || 'Maintenance préventive'}%0A- Urgence: ${formData.urgency}%0A%0A🔧 ÉQUIPEMENTS À MAINTENIR:%0A${equipmentList}%0A%0AMerci de me faire parvenir un devis de maintenance personnalisé.`

    return `https://wa.me/221774133440?text=${message}`
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const whatsappUrl = generateWhatsAppMessage()
    window.open(whatsappUrl, '_blank')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-purple-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Demande de Maintenance</h2>
              <p className="text-white/90">Décrivez votre installation pour un devis personnalisé</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Informations générales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom de l'entreprise *
              </label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="IT Vision Plus"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nom du contact *
              </label>
              <input
                type="text"
                required
                value={formData.contactName}
                onChange={(e) => setFormData({...formData, contactName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Amadou Ba"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Téléphone *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="+221 77 xxx xx xx"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="contact@entreprise.com"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adresse complète *
              </label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Rue, Quartier, Ville, Région"
              />
            </div>
          </div>

          {/* Historique et contexte */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date d'installation (approximative)
              </label>
              <input
                type="text"
                value={formData.installationDate}
                onChange={(e) => setFormData({...formData, installationDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Ex: Janvier 2022"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Niveau d'urgence
              </label>
              <select
                value={formData.urgency}
                onChange={(e) => setFormData({...formData, urgency: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="normal">Normal (sous 7 jours)</option>
                <option value="urgent">Urgent (sous 48h)</option>
                <option value="critique">Critique (intervention immédiate)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Problèmes constatés ou besoins
            </label>
            <textarea
              value={formData.currentIssues}
              onChange={(e) => setFormData({...formData, currentIssues: e.target.value})}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Ex: Caméras qui se déconnectent, enregistrement qui s'arrête, écran qui scintille..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Historique de maintenance
            </label>
            <textarea
              value={formData.maintenanceHistory}
              onChange={(e) => setFormData({...formData, maintenanceHistory: e.target.value})}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Ex: Dernière maintenance en juin 2023, remplacement disque dur..."
            />
          </div>

          {/* Liste des équipements */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Liste des équipements</h3>
              <button
                type="button"
                onClick={addEquipment}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg inline-flex items-center text-sm font-medium transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter équipement
              </button>
            </div>

            <div className="space-y-4">
              {equipment.map((eq, index) => (
                <div key={eq.id} className="bg-gray-50 p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-800">Équipement #{index + 1}</h4>
                    {equipment.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEquipment(eq.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Catégorie *
                      </label>
                      <select
                        required
                        value={eq.category}
                        onChange={(e) => updateEquipment(eq.id, 'category', e.target.value)}
                        className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="">Sélectionner...</option>
                        {equipmentCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Marque
                      </label>
                      <input
                        type="text"
                        value={eq.brand}
                        onChange={(e) => updateEquipment(eq.id, 'brand', e.target.value)}
                        className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="Hikvision, Dahua..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Modèle
                      </label>
                      <input
                        type="text"
                        value={eq.model}
                        onChange={(e) => updateEquipment(eq.id, 'model', e.target.value)}
                        className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="DS-7732NI-I4..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Quantité
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={eq.quantity}
                        onChange={(e) => updateEquipment(eq.id, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Détails supplémentaires
                    </label>
                    <input
                      type="text"
                      value={eq.details}
                      onChange={(e) => updateEquipment(eq.id, 'details', e.target.value)}
                      className="w-full px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="Ex: 32 canaux, PoE+, installé en extérieur..."
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center justify-center"
            >
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
              </svg>
              Envoyer via WhatsApp
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}