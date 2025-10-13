'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

interface User {
  _id: string
  username: string
  email: string
  name: string
  phone?: string
  role: 'CLIENT' | 'TECHNICIAN' | 'ADMIN'
  isActive: boolean
  lockedUntil?: string
  twoFactorEnabled?: boolean
  createdAt: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const [isActive, setIsActive] = useState('all')
  const [loading, setLoading] = useState(false)

  const fetchUsers = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (role) params.set('role', role)
    if (isActive !== 'all') params.set('isActive', isActive)

    const res = await fetch(`/api/admin/users?${params.toString()}`, { credentials: 'include' })
    const data = await res.json()
    if (data.success) setUsers(data.users)
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const createUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget as any
    const body = {
      username: form.username.value,
      email: form.email.value,
      password: form.password.value,
      name: form.name.value,
      phone: form.phone.value,
      role: form.role.value,
    }
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    })
    if (res.ok) {
      form.reset()
      fetchUsers()
    } else {
      alert('Erreur création utilisateur')
    }
  }

  const action = async (id: string, action: string) => {
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id, action }),
    })
    if (res.ok) fetchUsers()
  }

  return (
    <main>
      <Header />
      <section className="pt-28 pb-12 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold mb-6">Gestion des utilisateurs</h1>

          {/* Filtres */}
          <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-wrap gap-3 items-center">
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher (nom, email, username)" className="border rounded px-3 py-2 w-full md:w-1/3" />
            <select value={role} onChange={e=>setRole(e.target.value)} className="border rounded px-3 py-2">
              <option value="">Tous rôles</option>
              <option value="CLIENT">CLIENT</option>
              <option value="TECHNICIAN">TECHNICIAN</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <select value={isActive} onChange={e=>setIsActive(e.target.value)} className="border rounded px-3 py-2">
              <option value="all">Actifs + inactifs</option>
              <option value="true">Actifs</option>
              <option value="false">Inactifs</option>
            </select>
            <button onClick={fetchUsers} className="bg-emerald-600 text-white px-4 py-2 rounded">Filtrer</button>
          </div>

          {/* Création */}
          <form onSubmit={createUser} className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-6 gap-3">
            <input name="username" placeholder="Username" className="border rounded px-3 py-2" required />
            <input name="email" placeholder="Email" type="email" className="border rounded px-3 py-2" required />
            <input name="password" placeholder="Mot de passe" type="password" className="border rounded px-3 py-2" required />
            <input name="name" placeholder="Nom complet" className="border rounded px-3 py-2" required />
            <input name="phone" placeholder="Téléphone" className="border rounded px-3 py-2" />
            <select name="role" className="border rounded px-3 py-2" required>
              <option value="CLIENT">CLIENT</option>
              <option value="TECHNICIAN">TECHNICIAN</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <div className="md:col-span-6 text-right">
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Créer</button>
            </div>
          </form>

          {/* Liste */}
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-3">Nom</th>
                  <th className="text-left p-3">Email</th>
                  <th className="text-left p-3">Rôle</th>
                  <th className="text-left p-3">Statut</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="p-3" colSpan={5}>Chargement...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td className="p-3" colSpan={5}>Aucun utilisateur</td></tr>
                ) : (
                  users.map(u => (
                    <tr key={u._id} className="border-t">
                      <td className="p-3">{u.name} <div className="text-gray-500 text-xs">{u.username}</div></td>
                      <td className="p-3">{u.email} <div className="text-gray-500 text-xs">créé le {new Date(u.createdAt).toLocaleDateString()}</div></td>
                      <td className="p-3">{u.role}</td>
                      <td className="p-3">{u.isActive ? 'Actif' : 'Inactif'} {u.lockedUntil ? '• Verrouillé' : ''} {u.twoFactorEnabled ? '• 2FA' : ''}</td>
                      <td className="p-3 space-x-2">
                        <button onClick={()=>action(u._id, u.twoFactorEnabled ? 'disable_2fa' : 'enable_2fa')} className="px-2 py-1 border rounded">
                          {u.twoFactorEnabled ? 'Désactiver 2FA' : 'Activer 2FA'}
                        </button>
                        {u.isActive ? (
                          <button onClick={()=>action(u._id,'deactivate')} className="px-2 py-1 border rounded">Désactiver</button>
                        ) : (
                          <button onClick={()=>action(u._id,'activate')} className="px-2 py-1 border rounded">Activer</button>
                        )}
                        {u.lockedUntil ? (
                          <button onClick={()=>action(u._id,'unlock')} className="px-2 py-1 border rounded">Déverrouiller</button>
                        ) : (
                          <button onClick={()=>action(u._id,'lock')} className="px-2 py-1 border rounded">Verrouiller</button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  )
}
