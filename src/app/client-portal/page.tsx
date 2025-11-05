'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Breadcrumb from '@/components/Breadcrumb'
import ClientProjectLiveView, { ClientProjectSummary } from '@/components/ClientProjectLiveView'

interface ProjectListItem {
  id: string
  name: string
  status: string
  progress?: number
  startDate?: string
  serviceType?: string
}

export default function ClientPortalPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectListItem[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [summary, setSummary] = useState<(ClientProjectSummary & { success: boolean }) | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  const loadProjects = async () => {
    setProjectsLoading(true)
    try {
      const response = await fetch('/api/projects?status=all&limit=50', { credentials: 'include' })
      if (!response.ok) {
        throw new Error('Une erreur est survenue lors du chargement des projets')
      }
      const data = await response.json()
      const rawProjects: any[] = Array.isArray(data.projects) ? data.projects : []
      const formatted = rawProjects
        .filter((project) => project.clientAccess !== false)
        .map((project) => ({
          id: String(project._id || project.id),
          name: project.name || 'Projet',
          status: project.status || 'in_progress',
          progress: project.progress,
          startDate: project.startDate,
          serviceType: project.serviceType
        }))

      setProjects(formatted)
      if (!selectedProjectId && formatted.length > 0) {
        setSelectedProjectId(formatted[0].id)
      }
      setError(null)
    } catch (err) {
      console.error(err)
      setError((err as Error).message || 'Impossible de charger vos projets')
    } finally {
      setProjectsLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/login', { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        const role = String(data.user?.role || '').toUpperCase()
        if (role !== 'CLIENT') {
          if (role === 'ADMIN') router.replace('/admin')
          else if (role === 'TECHNICIAN') router.replace('/tech-interface')
          else router.replace('/login')
          return
        }
        if (cancelled) {
          return
        }
        await loadProjects()
      } catch (e) {
        console.error('Client portal auth error:', e)
        setError('Impossible de vérifier votre session. Merci de vous reconnecter.')
        router.replace('/login')
      }
      finally {
        if (!cancelled) setIsCheckingAuth(false)
      }
    }
    checkAuth()
    return () => { cancelled = true }
  }, [router])

  useEffect(() => {
    if (!selectedProjectId) {
      setSummary(null)
      return
    }

    let cancelled = false
    const loadSummary = async () => {
      setSummaryLoading(true)
      try {
        const response = await fetch(`/api/projects/${selectedProjectId}/summary`, { credentials: 'include' })
        if (!response.ok) {
          throw new Error('Impossible de charger le projet sélectionné')
        }
        const data = await response.json()
        if (!cancelled) {
          setSummary(data)
        }
      } catch (err) {
        console.error(err)
        if (!cancelled) {
          setSummary(null)
          setError((err as Error).message)
        }
      } finally {
        if (!cancelled) {
          setSummaryLoading(false)
        }
      }
    }

    loadSummary()
    return () => {
      cancelled = true
    }
  }, [selectedProjectId])

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout', { credentials: 'include' }) } catch {}
    router.replace('/login')
  }

  const selectedProject = useMemo(() => projects.find((project) => project.id === selectedProjectId), [projects, selectedProjectId])

  const projectSummary = useMemo<ClientProjectSummary | null>(() => {
    if (summary && summary.success) {
      const { success, ...rest } = summary
      return rest as ClientProjectSummary
    }
    return null
  }, [summary])

  if (isCheckingAuth) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pt-16">
        <Breadcrumb backHref="/" backLabel="Retour à l'accueil" />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="lg:w-72 flex-shrink-0 space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Mes projets</h2>
                <button onClick={loadProjects} className="text-xs text-emerald-600 hover:text-emerald-700">Rafraîchir</button>
              </div>
              {projectsLoading ? (
                <div className="mt-3 space-y-2">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : projects.length === 0 ? (
                <p className="text-sm text-gray-500 mt-3">Aucun projet disponible pour l'instant.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {projects.map((projectItem) => {
                    const active = projectItem.id === selectedProjectId
                    return (
                      <li key={projectItem.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedProjectId(projectItem.id)}
                          className={`w-full text-left px-3 py-2 rounded-xl border transition ${
                            active ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 hover:border-emerald-200 hover:bg-emerald-50/60'
                          }`}
                        >
                          <p className="text-sm font-medium">{projectItem.name}</p>
                          <p className="text-xs text-gray-500 capitalize">{projectItem.status.replace('_', ' ')}</p>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4">
              <h2 className="text-sm font-semibold text-gray-900">Compte</h2>
              <button onClick={handleLogout} className="mt-3 inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700">
                <span>Se déconnecter</span>
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">
                {error}
              </div>
            )}
          </aside>

          <main className="flex-1">
            {summaryLoading && (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 text-sm text-gray-500">Chargement des informations du projet…</div>
            )}

            {!summaryLoading && selectedProject && projectSummary && (
              <ClientProjectLiveView summary={projectSummary} />
            )}

            {!summaryLoading && (!selectedProject || !projectSummary) && (
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 text-sm text-gray-500">
                Sélectionnez un projet pour afficher les détails.
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}