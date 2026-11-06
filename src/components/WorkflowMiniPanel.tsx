"use client"
import { useEffect, useState } from 'react'
import { CheckCircle, Clock, AlertTriangle, Play, Check } from 'lucide-react'

interface WorkflowDoc {
  _id: string
  projectId: string
  currentStep: string
  progress: number
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  steps: Array<{ id: string; name: string; status: string; dependencies: string[] }>
}

export default function WorkflowMiniPanel({ projectId }: { projectId: string }) {
  const [wf, setWf] = useState<WorkflowDoc | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    const r = await fetch(`/api/workflows?projectId=${projectId}`, { cache: 'no-store' })
    const j = await r.json()
    setWf(j.workflows?.[0] || null)
    setLoading(false)
  }

  useEffect(() => { load() }, [projectId])

  const bootstrap = async () => {
    const steps = [
      { id: 'quote', name: 'Devis', type: 'validation', status: 'completed', dependencies: [], deliverables: [] },
      { id: 'contract', name: 'Contrat', type: 'approval', status: 'completed', dependencies: ['quote'], deliverables: [] },
      { id: 'install', name: 'Installation', type: 'installation', status: 'pending', dependencies: ['contract'], deliverables: [] },
      { id: 'tests', name: 'Tests', type: 'test', status: 'pending', dependencies: ['install'], deliverables: [] },
      { id: 'training', name: 'Formation', type: 'training', status: 'pending', dependencies: ['tests'], deliverables: [] },
      { id: 'delivery', name: 'Livraison', type: 'payment', status: 'pending', dependencies: ['training'], deliverables: [] }
    ]
    const r = await fetch('/api/workflows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, serviceType: 'visiophonie', steps }) })
    if (r.ok) load()
  }

  const act = async (stepId: string, action: 'start' | 'complete') => {
    if (!wf) return
    const r = await fetch('/api/workflows', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: wf._id, stepId, action }) })
    if (r.ok) load()
  }

  if (loading) return <div className="text-gray-500">Chargement workflow…</div>

  if (!wf) {
    return (
      <div>
        <p className="text-gray-600 mb-3">Aucun workflow initialisé pour ce projet.</p>
        <button onClick={bootstrap} className="px-3 py-2 bg-blue-600 text-white rounded text-sm">Initier workflow</button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-600">Étape actuelle: <span className="font-medium">{wf.currentStep}</span></div>
        <div className="text-sm text-gray-600">Progression: <span className="font-medium">{wf.progress}%</span></div>
      </div>
      <div className="space-y-3">
        {wf.steps.map(step => (
          <div key={step.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                step.status === 'completed' ? 'bg-green-100 text-green-700' : step.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {step.status === 'completed' ? <CheckCircle className="h-3 w-3" /> : step.status === 'in_progress' ? <Clock className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                <span className="ml-1 capitalize">{step.status.replace('_', ' ')}</span>
              </span>
              <span className="font-medium text-gray-900">{step.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              {step.status === 'pending' && step.dependencies.every(dep => wf.steps.find(s => s.id === dep)?.status === 'completed') && (
                <button onClick={()=>act(step.id,'start')} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs inline-flex items-center"><Play className="h-3 w-3 mr-1"/>Démarrer</button>
              )}
              {step.status === 'in_progress' && (
                <button onClick={()=>act(step.id,'complete')} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs inline-flex items-center"><Check className="h-3 w-3 mr-1"/>Terminer</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
