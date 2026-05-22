"use client"
import { useEffect, useState, useCallback } from 'react'
import { CheckCircle, Clock, AlertTriangle, Play, Check, Zap, Bot, ChevronRight, Loader2 } from 'lucide-react'

interface WorkflowDoc {
  _id: string
  projectId: string
  currentStep: string
  progress: number
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  steps: Array<{ id: string; name: string; status: string; dependencies: string[]; type?: string; deliverables?: string[] }>
}

export default function WorkflowMiniPanel({ projectId }: { projectId: string }) {
  const [wf, setWf] = useState<WorkflowDoc | null>(null)
  const [loading, setLoading] = useState(false)
  const [takeoverMode, setTakeoverMode] = useState(false)
  const [autoAdvancing, setAutoAdvancing] = useState(false)
  const [eventLog, setEventLog] = useState<string[]>([])

  const logEvent = (msg: string) => setEventLog(prev => [msg, ...prev].slice(0, 5))

  const load = async () => {
    setLoading(true)
    const r = await fetch(`/api/workflows?projectId=${projectId}`, { cache: 'no-store' })
    const j = await r.json()
    setWf(j.workflows?.[0] || null)
    setLoading(false)
  }

  useEffect(() => { load() }, [projectId])

  // Orchestration event-driven: quand une étape se termine, auto-démarrer la suivante si takeoverMode
  useEffect(() => {
    if (!takeoverMode || !wf || wf.status !== 'active') return
    const next = wf.steps.find(s => s.status === 'pending' && s.dependencies.every(dep => wf.steps.find(x => x.id === dep)?.status === 'completed'))
    if (next && next.id !== wf.currentStep) {
      setAutoAdvancing(true)
      act(next.id, 'start', true).then(() => {
        logEvent(`Auto-start: ${next.name}`)
        setAutoAdvancing(false)
      })
    }
  }, [takeoverMode, wf?.progress, wf?.currentStep])

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

  const act = useCallback(async (stepId: string, action: 'start' | 'complete', silent = false) => {
    if (!wf) return
    if (!silent) setLoading(true)
    try {
      const r = await fetch('/api/workflows', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: wf._id, stepId, action }) })
      if (r.ok) {
        await load()
        // Event-driven: émettre un événement pour que d'autres composants réagissent
        fetch(`/api/projects/${projectId}/events`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
          body: JSON.stringify({ type: action === 'complete' ? 'milestone_completed' : 'workflow_step_started', payload: { stepId, projectId } })
        }).catch(() => {})
      }
    } finally { if (!silent) setLoading(false) }
  }, [wf, projectId])

  if (loading && !wf) return <div className="text-gray-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Chargement workflow…</div>

  if (!wf) {
    return (
      <div>
        <p className="text-gray-600 mb-3">Aucun workflow initialisé pour ce projet.</p>
        <button onClick={bootstrap} className="px-3 py-2 bg-blue-600 text-white rounded text-sm">Initier workflow</button>
      </div>
    )
  }

  const currentStepObj = wf.steps.find(s => s.id === wf.currentStep)
  const nextActionable = wf.steps.find(s => s.status === 'pending' && s.dependencies.every(dep => wf.steps.find(x => x.id === dep)?.status === 'completed'))

  return (
    <div>
      {/* Header avec takeover mode */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm text-gray-600">Étape actuelle: <span className="font-medium text-gray-900">{currentStepObj?.name || wf.currentStep}</span></div>
          <div className="text-sm text-gray-600">Progression: <span className="font-medium">{wf.progress}%</span></div>
        </div>
        <button
          onClick={() => setTakeoverMode(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            takeoverMode ? 'bg-violet-100 text-violet-700 border border-violet-200' : 'bg-gray-100 text-gray-600 border border-gray-200'
          }`}
          title={takeoverMode ? 'Mode Prise en Charge actif: orchestration automatique' : 'Activer le mode Prise en Charge'}
        >
          {takeoverMode ? <Bot className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
          {takeoverMode ? 'Prise en charge ON' : 'Prise en charge'}
        </button>
      </div>

      {/* Suggestion guidée si takeoverMode */}
      {takeoverMode && nextActionable && (
        <div className="mb-4 p-3 bg-violet-50 border border-violet-200 rounded-xl">
          <div className="flex items-center gap-2 text-sm text-violet-800 font-medium mb-1">
            <Bot className="w-4 h-4" />
            Action suggérée
          </div>
          <p className="text-xs text-violet-700">Démarrer automatiquement <strong>{nextActionable.name}</strong> dès que possible.</p>
          {autoAdvancing && <p className="text-xs text-violet-600 mt-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Orchestration en cours...</p>}
        </div>
      )}

      {/* Event log si takeoverMode */}
      {takeoverMode && eventLog.length > 0 && (
        <div className="mb-3 space-y-1">
          {eventLog.map((log, i) => (
            <div key={i} className="text-[10px] text-gray-500 flex items-center gap-1">
              <ChevronRight className="w-3 h-3 text-violet-400" />{log}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {wf.steps.map(step => {
          const isCurrent = step.id === wf.currentStep
          const canStart = step.status === 'pending' && step.dependencies.every(dep => wf.steps.find(s => s.id === dep)?.status === 'completed')
          const isBlocked = step.status === 'pending' && !canStart
          return (
            <div key={step.id} className={`flex items-center justify-between p-3 border rounded-lg transition-shadow ${isCurrent ? 'border-blue-300 bg-blue-50/30 shadow-sm' : 'border-gray-200'}`}>
              <div className="flex items-center space-x-2 min-w-0">
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${
                  step.status === 'completed' ? 'bg-green-100 text-green-700' : step.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : isBlocked ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {step.status === 'completed' ? <CheckCircle className="h-3 w-3" /> : step.status === 'in_progress' ? <Clock className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                  <span className="ml-1 capitalize">{step.status.replace('_', ' ')}</span>
                </span>
                <span className={`font-medium text-sm truncate ${isCurrent ? 'text-blue-900' : 'text-gray-900'}`}>{step.name}</span>
                {isCurrent && <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded flex-shrink-0">EN COURS</span>}
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0">
                {canStart && !takeoverMode && (
                  <button onClick={()=>act(step.id,'start')} disabled={loading} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs inline-flex items-center font-medium hover:bg-blue-200 disabled:opacity-50"><Play className="h-3 w-3 mr-1"/>Démarrer</button>
                )}
                {step.status === 'in_progress' && !takeoverMode && (
                  <button onClick={()=>act(step.id,'complete')} disabled={loading} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs inline-flex items-center font-medium hover:bg-green-200 disabled:opacity-50"><Check className="h-3 w-3 mr-1"/>Terminer</button>
                )}
                {takeoverMode && canStart && (
                  <span className="text-[10px] text-violet-600 font-medium">Auto</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
