'use client'

import { useState } from 'react'

/**
 * Composant de test pour vérifier la visibilité des champs de saisie
 * À supprimer après validation
 */
export default function InputTestComponent() {
  const [formData, setFormData] = useState({
    text: '',
    email: '',
    password: '',
    number: '',
    tel: '',
    textarea: '',
    select: ''
  })

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Test de Visibilité des Champs</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Champ Texte
          </label>
          <input
            type="text"
            value={formData.text}
            onChange={(e) => setFormData({...formData, text: e.target.value})}
            placeholder="Tapez du texte ici..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            placeholder="votre@email.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mot de passe
          </label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            placeholder="••••••••"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Numéro
          </label>
          <input
            type="number"
            value={formData.number}
            onChange={(e) => setFormData({...formData, number: e.target.value})}
            placeholder="123456"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Téléphone
          </label>
          <input
            type="tel"
            value={formData.tel}
            onChange={(e) => setFormData({...formData, tel: e.target.value})}
            placeholder="+221 77 123 45 67"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Zone de texte
          </label>
          <textarea
            value={formData.textarea}
            onChange={(e) => setFormData({...formData, textarea: e.target.value})}
            placeholder="Tapez votre message ici..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sélection
          </label>
          <select
            value={formData.select}
            onChange={(e) => setFormData({...formData, select: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Choisissez une option</option>
            <option value="option1">Option 1</option>
            <option value="option2">Option 2</option>
            <option value="option3">Option 3</option>
          </select>
        </div>

        <div className="bg-gray-100 p-4 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Valeurs saisies :</h3>
          <pre className="text-sm text-gray-600 whitespace-pre-wrap">
            {JSON.stringify(formData, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}