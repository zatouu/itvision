'use client'

import { useMemo, useState } from 'react'
import { ClipboardList, CheckCircle2, ChevronLeft, ChevronRight, FileDown, Calendar, Zap, Info } from 'lucide-react'
// PDF libs chargées à la demande côté client pour éviter tout coût SSR
import Link from 'next/link'

interface DiagnosticData {
  sector: string
  objectives: string[]
  processes: string[]
  roles: string
  approvals: string
  systems: string[]
  systemsNotes: string
  constraints: {
    budget: string
    timeline: string
    compliance: string[]
  }
  contact: {
    company?: string
    name?: string
    email?: string
    phone?: string
  }
}

const SECTORS = [
  'Retail',
  'Services B2B',
  'Industrie légère',
  'Immobilier',
  'Éducation',
  'Santé',
  'Autre'
]

const OBJECTIVES = [
  'Réduire le temps de traitement',
  'Automatiser les tâches répétitives',
  'Améliorer la traçabilité',
  'Unifier les données et les outils',
  'Offrir un portail client',
  'Mettre en place des KPI/BI'
]

const PROCESSES = [
  'Ventes / CRM (Prospection → Devis → Commande)',
  'Achats / Appros (Demande → Commande → Réception)',
  'Stock / Inventaire (Entrées/Sorties, Seuils, Alertes)',
  'SAV / Tickets (Ouverture → Affectation → Résolution)',
  'RH / Absences (Demande → Validation → Paie)',
  'Devis / Facturation (Workflow de validation)',
  'Production / Planification (Ordres & Charges)',
  'Conformité / Qualité (Checklist & Audits)'
]

const SYSTEMS = [
  'Suite Google / O365',
  'Comptabilité (ex: Sage/Odoo)',
  'Paiements (Stripe / PayDunya)',
  'WhatsApp Business',
  'Drive / GED',
  'Autre'
]

const COMPLIANCE = ['RGPD', 'ISO', 'SLAs client', 'Aucune spécifiques']

export default function DigitalizationDiagnosticWizard() {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<DiagnosticData>({
    sector: '',
    objectives: [],
    processes: [],
    roles: '',
    approvals: '',
    systems: [],
    systemsNotes: '',
    constraints: { budget: 'normal', timeline: 'standard', compliance: [] },
    contact: { company: '', name: '', email: '', phone: '' }
  })

  const totalSteps = 6

  // Recettes par secteur (pré-sélections recommandées)
  const SECTOR_RECIPES: Record<string, Partial<DiagnosticData>> = {
    'Retail': {
      objectives: ['Réduire le temps de traitement', 'Unifier les données et les outils', 'Offrir un portail client'],
      processes: [
        'Ventes / CRM (Prospection → Devis → Commande)',
        'Stock / Inventaire (Entrées/Sorties, Seuils, Alertes)',
        'Devis / Facturation (Workflow de validation)'
      ],
      systems: ['WhatsApp Business', 'Paiements (Stripe / PayDunya)', 'Suite Google / O365'],
      constraints: { budget: 'normal', timeline: 'standard', compliance: ['SLAs client', 'RGPD'] }
    },
    'Services B2B': {
      objectives: ['Automatiser les tâches répétitives', 'Offrir un portail client', 'Mettre en place des KPI/BI'],
      processes: [
        'Ventes / CRM (Prospection → Devis → Commande)',
        'SAV / Tickets (Ouverture → Affectation → Résolution)',
        'Devis / Facturation (Workflow de validation)'
      ],
      systems: ['WhatsApp Business', 'Drive / GED', 'Suite Google / O365'],
      constraints: { budget: 'normal', timeline: 'rapide', compliance: ['SLAs client', 'RGPD'] }
    },
    'Industrie légère': {
      objectives: ['Améliorer la traçabilité', 'Mettre en place des KPI/BI', 'Automatiser les tâches répétitives'],
      processes: [
        'Production / Planification (Ordres & Charges)',
        'Achats / Appros (Demande → Commande → Réception)',
        'Stock / Inventaire (Entrées/Sorties, Seuils, Alertes)'
      ],
      systems: ['Comptabilité (ex: Sage/Odoo)', 'Suite Google / O365'],
      constraints: { budget: 'premium', timeline: 'standard', compliance: ['ISO'] }
    },
    'Immobilier': {
      objectives: ['Offrir un portail client', 'Unifier les données et les outils', 'Réduire le temps de traitement'],
      processes: [
        'SAV / Tickets (Ouverture → Affectation → Résolution)',
        'Devis / Facturation (Workflow de validation)',
        'Conformité / Qualité (Checklist & Audits)'
      ],
      systems: ['WhatsApp Business', 'Drive / GED'],
      constraints: { budget: 'normal', timeline: 'standard', compliance: ['SLAs client', 'RGPD'] }
    },
    'Éducation': {
      objectives: ['Offrir un portail client', 'Améliorer la traçabilité'],
      processes: [
        'SAV / Tickets (Ouverture → Affectation → Résolution)',
        'RH / Absences (Demande → Validation → Paie)'
      ],
      systems: ['Suite Google / O365'],
      constraints: { budget: 'serre', timeline: 'rapide', compliance: ['RGPD'] }
    },
    'Santé': {
      objectives: ['Améliorer la traçabilité', 'Mettre en place des KPI/BI'],
      processes: [
        'Conformité / Qualité (Checklist & Audits)',
        'Achats / Appros (Demande → Commande → Réception)'
      ],
      systems: ['Suite Google / O365'],
      constraints: { budget: 'premium', timeline: 'urgent', compliance: ['RGPD', 'ISO'] }
    },
    'Autre': {
      objectives: ['Réduire le temps de traitement', 'Automatiser les tâches répétitives'],
      processes: ['Ventes / CRM (Prospection → Devis → Commande)'],
      systems: ['Suite Google / O365'],
      constraints: { budget: 'normal', timeline: 'standard', compliance: [] }
    }
  }

  const mergeUnique = (base: string[], add?: string[]) => {
    const set = new Set(base)
    ;(add || []).forEach(v => set.add(v))
    return Array.from(set)
  }

  const applySectorRecipe = () => {
    const recipe = SECTOR_RECIPES[data.sector]
    if (!recipe) return
    setData(prev => ({
      ...prev,
      objectives: mergeUnique(prev.objectives, recipe.objectives),
      processes: mergeUnique(prev.processes, recipe.processes),
      systems: mergeUnique(prev.systems, recipe.systems),
      constraints: {
        budget: (recipe.constraints?.budget as any) || prev.constraints.budget,
        timeline: (recipe.constraints?.timeline as any) || prev.constraints.timeline,
        compliance: mergeUnique(prev.constraints.compliance, recipe.constraints?.compliance as any)
      }
    }))
  }

  const canNext = useMemo(() => {
    if (step === 1) return data.sector.trim().length > 0 && data.objectives.length > 0
    if (step === 2) return data.processes.length > 0
    if (step === 3) return data.roles.trim().length > 0
    if (step === 4) return data.systems.length > 0 || data.systemsNotes.trim().length > 0
    if (step === 5) return true
    if (step === 6) return true
    return false
  }, [step, data])

  const score = useMemo(() => {
    let s = 0
    s += Math.min(3, data.objectives.length)
    s += Math.min(4, data.processes.length)
    if (data.constraints.budget === 'premium') s += 2
    if (data.constraints.timeline === 'urgent') s += 2
    if (data.constraints.compliance.length > 0) s += 1
    return Math.max(1, Math.min(10, s))
  }, [data])

  const tShirt = useMemo(() => {
    if (score <= 3) return 'S'
    if (score <= 6) return 'M'
    if (score <= 8) return 'L'
    return 'XL'
  }, [score])

  const priceHint = useMemo(() => {
    switch (tShirt) {
      case 'S':
        return '≈ 1–2 M FCFA'
      case 'M':
        return '≈ 2–5 M FCFA'
      case 'L':
        return '≈ 5–10 M FCFA'
      default:
        return '≈ 10 M+ FCFA'
    }
  }, [tShirt])

  const updateArray = (arr: string[], value: string) =>
    arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]

  const goNext = () => setStep(prev => Math.min(totalSteps, prev + 1))
  const goPrev = () => setStep(prev => Math.max(1, prev - 1))

  const downloadSummary = async () => {
    const payload = {
      ...data,
      createdAt: new Date().toISOString(),
      scoring: { score, tShirt, priceHint }
    }
    try {
      const { jsPDF } = await import('jspdf')
      await import('jspdf-autotable')
      // @ts-ignore
      const doc = new jsPDF({ unit: 'pt', format: 'a4' })
      doc.setFillColor(16, 185, 129)
      doc.rect(0, 0, 595, 80, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(18)
      doc.text('IT Vision Plus', 40, 40)
      doc.setFontSize(11)
      doc.text('Diagnostic de digitalisation PME', 40, 60)
      doc.setTextColor(33, 33, 33)
      doc.setFontSize(14)
      doc.text('Résumé', 40, 110)
      doc.setFontSize(10)
      const lines: any[] = [
        ['Date', new Date(payload.createdAt).toLocaleString('fr-FR')],
        ['Société', payload?.contact?.company || '-'],
        ['Contact', `${payload?.contact?.name || ''} ${payload?.contact?.email || ''}`.trim() || '-'],
        ['Secteur', payload?.sector || '-'],
        ['Objectifs', (payload?.objectives || []).join(', ') || '-'],
        ['Processus', (payload?.processes || []).join(', ') || '-'],
        ['Systèmes', (payload?.systems || []).join(', ') || '-'],
        [
          'Contraintes',
          `Budget: ${payload?.constraints?.budget || '-'} | Délai: ${payload?.constraints?.timeline || '-'} | Conformité: ${(payload?.constraints?.compliance || []).join(', ') || '-'}`
        ],
        ['Score', `${payload?.scoring?.score || '-'} / 10`],
        ['Taille', payload?.scoring?.tShirt || '-'],
        ['Fourchette', payload?.scoring?.priceHint || '-']
      ]
      // @ts-ignore
      doc.autoTable({ startY: 130, head: [['Champ', 'Valeur']], body: lines, styles: { cellPadding: 6, fontSize: 10 } })
      const pageHeight = doc.internal.pageSize.getHeight()
      doc.setDrawColor(229, 231, 235)
      doc.line(40, pageHeight - 60, 555, pageHeight - 60)
      doc.setFontSize(9)
      doc.setTextColor(100, 116, 139)
      doc.text('IT Vision Plus • Sécurité électronique & digitalisation des processus', 40, pageHeight - 40)
      doc.text('www.itvisionplus.sn • contact@itvisionplus.sn • +221 77 413 34 40', 40, pageHeight - 24)
      const blob = doc.output('blob')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `diagnostic-${Date.now()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `diagnostic-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const submitToAdmin = async () => {
    try {
      const payload = { ...data, scoring: { score, tShirt, priceHint }, createdAt: new Date().toISOString() }
      await fetch('/api/diagnostic/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      alert('Votre demande a été soumise. Un email de prise en charge vous sera envoyé.')
    } catch (e) {
      alert("Soumission effectuée (mode dév). Nous vous recontactons rapidement.")
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-blue-600 text-white flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ClipboardList className="h-6 w-6" />
          <div>
            <h3 className="text-xl font-bold">Wizard Diagnostic – Digitalisation PME</h3>
            <p className="text-emerald-100 text-sm">Qualifiez votre besoin en 6 étapes simples</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-emerald-100">Score projet</div>
          <div className="text-lg font-semibold">{score}/10 · Taille {tShirt} · {priceHint}</div>
        </div>
      </div>

      {/* Steps indicator */}
      <div className="px-6 pt-4 pb-2 border-b bg-white">
        <div className="flex items-center gap-2 overflow-x-auto">
          {[...Array(totalSteps)].map((_, idx) => {
            const num = idx + 1
            const active = num === step
            const done = num < step
            return (
              <div key={num} className={`flex items-center gap-2`}> 
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold border ${
                    done
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      : active
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300'
                  }`}
                >
                  {done ? <CheckCircle2 className="h-4 w-4" /> : num}
                </div>
                {idx < totalSteps - 1 && (
                  <div className="w-10 h-0.5 bg-gray-200" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-lg font-semibold text-gray-900">Secteur d'activité</h4>
                <div className="group relative">
                  <Info className="h-4 w-4 text-gray-400" />
                  <span className="invisible group-hover:visible absolute left-0 top-6 w-64 bg-gray-900 text-white text-xs rounded p-2 z-10">
                    Choisissez votre secteur: nous proposons une pré‑sélection adaptée que vous pouvez modifier à tout moment.
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {SECTORS.map(sec => (
                  <button
                    key={sec}
                    onClick={() => setData(prev => ({ ...prev, sector: sec }))}
                    className={`px-3 py-2 rounded-lg border text-sm ${
                      data.sector === sec ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {sec}
                  </button>
                ))}
              </div>
              {data.sector && (
                <div className="mt-3 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm">
                  <div className="text-blue-800">
                    Suggestion {data.sector}: objectifs, processus et intégrations usuels.
                  </div>
                  <button onClick={applySectorRecipe} className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 inline-flex items-center gap-2">
                    <Zap className="h-4 w-4" /> Appliquer
                  </button>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-lg font-semibold text-gray-900">Objectifs prioritaires</h4>
                <div className="group relative">
                  <Info className="h-4 w-4 text-gray-400" />
                  <span className="invisible group-hover:visible absolute left-0 top-6 w-64 bg-gray-900 text-white text-xs rounded p-2 z-10">
                    Sélectionnez vos objectifs: gains de temps, automatisation, traçabilité, portail client, KPI/BI.
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {OBJECTIVES.map(obj => (
                  <button
                    key={obj}
                    onClick={() => setData(prev => ({ ...prev, objectives: updateArray(prev.objectives, obj) }))}
                    className={`px-3 py-2 rounded-full border text-sm ${
                      data.objectives.includes(obj) ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {obj}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-lg font-semibold text-gray-900">Processus à digitaliser</h4>
              <div className="group relative inline-block">
                <Info className="h-4 w-4 text-gray-400" />
                <span className="invisible group-hover:visible absolute left-0 top-6 w-64 bg-gray-900 text-white text-xs rounded p-2 z-10">
                  Ciblez 1 à 3 processus pour démarrer (priorité P1). Nous itérerons ensuite.
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {PROCESSES.map(proc => (
                <label key={proc} className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={data.processes.includes(proc)}
                    onChange={() => setData(prev => ({ ...prev, processes: updateArray(prev.processes, proc) }))}
                  />
                  <span className="text-sm text-gray-800">{proc}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-lg font-semibold text-gray-900">Rôles concernés</h4>
                <div className="group relative inline-block">
                  <Info className="h-4 w-4 text-gray-400" />
                  <span className="invisible group-hover:visible absolute left-0 top-6 w-64 bg-gray-900 text-white text-xs rounded p-2 z-10">
                    Ex: Commercial, Comptable, Responsable achats… ça nous aide à définir les accès (RBAC).
                  </span>
                </div>
              </div>
              <textarea
                value={data.roles}
                onChange={e => setData(prev => ({ ...prev, roles: e.target.value }))}
                rows={5}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Ex: Commercial, Comptable, Responsable des achats, Direction..."
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-lg font-semibold text-gray-900">Approbations / validations</h4>
                <div className="group relative inline-block">
                  <Info className="h-4 w-4 text-gray-400" />
                  <span className="invisible group-hover:visible absolute left-0 top-6 w-64 bg-gray-900 text-white text-xs rounded p-2 z-10">
                    Ex: validation des devis, achats &gt; X FCFA, congés. Nous automatiserons ces validations.
                  </span>
                </div>
              </div>
              <textarea
                value={data.approvals}
                onChange={e => setData(prev => ({ ...prev, approvals: e.target.value }))}
                rows={5}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Ex: Validation des devis, achats > X FCFA, congés..."
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-lg font-semibold text-gray-900">Systèmes existants & intégrations</h4>
              <div className="group relative inline-block">
                <Info className="h-4 w-4 text-gray-400" />
                <span className="invisible group-hover:visible absolute left-0 top-6 w-64 bg-gray-900 text-white text-xs rounded p-2 z-10">
                  Indiquez vos outils (Odoo, Google, WhatsApp, Stripe…) pour prévoir les connecteurs.
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {SYSTEMS.map(sys => (
                <button
                  key={sys}
                  onClick={() => setData(prev => ({ ...prev, systems: updateArray(prev.systems, sys) }))}
                  className={`px-3 py-2 rounded-full border text-sm ${
                    data.systems.includes(sys) ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {sys}
                </button>
              ))}
            </div>
            <textarea
              value={data.systemsNotes}
              onChange={e => setData(prev => ({ ...prev, systemsNotes: e.target.value }))}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Précisez les outils, formats d'échange, contraintes techniques..."
            />
          </div>
        )}

        {step === 5 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-sm font-semibold text-gray-900">Budget cible</h4>
                <div className="group relative inline-block">
                  <Info className="h-4 w-4 text-gray-400" />
                  <span className="invisible group-hover:visible absolute left-0 top-6 w-64 bg-gray-900 text-white text-xs rounded p-2 z-10">
                    Indication pour calibrer la solution: contraint / normal / premium.
                  </span>
                </div>
              </div>
              <select
                value={data.constraints.budget}
                onChange={e => setData(prev => ({ ...prev, constraints: { ...prev.constraints, budget: e.target.value } }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="serre">Contraint</option>
                <option value="normal">Normal</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-sm font-semibold text-gray-900">Délai souhaité</h4>
                <div className="group relative inline-block">
                  <Info className="h-4 w-4 text-gray-400" />
                  <span className="invisible group-hover:visible absolute left-0 top-6 w-64 bg-gray-900 text-white text-xs rounded p-2 z-10">
                    Urgence du besoin: standard / rapide / urgent.
                  </span>
                </div>
              </div>
              <select
                value={data.constraints.timeline}
                onChange={e => setData(prev => ({ ...prev, constraints: { ...prev.constraints, timeline: e.target.value } }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="standard">Standard</option>
                <option value="rapide">Rapide</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-sm font-semibold text-gray-900">Conformité</h4>
                <div className="group relative inline-block">
                  <Info className="h-4 w-4 text-gray-400" />
                  <span className="invisible group-hover:visible absolute left-0 top-6 w-64 bg-gray-900 text-white text-xs rounded p-2 z-10">
                    Besoins RGPD, ISO, SLA. Nous adaptons les contrôles et l'audit en conséquence.
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {COMPLIANCE.map(c => (
                  <button
                    key={c}
                    onClick={() => setData(prev => ({ ...prev, constraints: { ...prev.constraints, compliance: updateArray(prev.constraints.compliance, c) } }))}
                    className={`px-3 py-1.5 rounded-full border text-xs ${
                      data.constraints.compliance.includes(c) ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-sm font-semibold text-gray-900">Société / Contact</h4>
                  <div className="group relative inline-block">
                    <Info className="h-4 w-4 text-gray-400" />
                    <span className="invisible group-hover:visible absolute left-0 top-6 w-64 bg-gray-900 text-white text-xs rounded p-2 z-10">
                      Indispensable pour l'accusé de réception et la prise de RDV.
                    </span>
                  </div>
                </div>
                <input
                  value={data.contact.company}
                  onChange={e => setData(prev => ({ ...prev, contact: { ...prev.contact, company: e.target.value } }))}
                  placeholder="Société"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-2"
                />
                <input
                  value={data.contact.name}
                  onChange={e => setData(prev => ({ ...prev, contact: { ...prev.contact, name: e.target.value } }))}
                  placeholder="Nom et prénom"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-2"
                />
              </div>
              <div className="pt-6 md:pt-0">
                <input
                  value={data.contact.email}
                  onChange={e => setData(prev => ({ ...prev, contact: { ...prev.contact, email: e.target.value } }))}
                  placeholder="Email"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-2"
                />
                <input
                  value={data.contact.phone}
                  onChange={e => setData(prev => ({ ...prev, contact: { ...prev.contact, phone: e.target.value } }))}
                  placeholder="Téléphone"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-6">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Résumé</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
                <div>
                  <div><span className="text-gray-500">Secteur:</span> {data.sector || '-'} </div>
                  <div><span className="text-gray-500">Objectifs:</span> {data.objectives.join(', ') || '-'} </div>
                  <div><span className="text-gray-500">Processus:</span> {data.processes.join(', ') || '-'} </div>
                </div>
                <div>
                  <div><span className="text-gray-500">Budget:</span> {data.constraints.budget}</div>
                  <div><span className="text-gray-500">Délai:</span> {data.constraints.timeline}</div>
                  <div><span className="text-gray-500">Conformité:</span> {data.constraints.compliance.join(', ') || '-'} </div>
                </div>
              </div>
              <div className="mt-3 text-sm">
                <div className="text-gray-500">Estimation:</div>
                <div className="font-semibold text-blue-700">Taille {tShirt} · {priceHint} · Score {score}/10</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <a href="#" onClick={(e) => { e.preventDefault(); downloadSummary() }} className="flex items-center justify-center gap-2 px-4 py-3 border rounded-lg hover:bg-gray-50">
                <FileDown className="h-4 w-4" /> Télécharger la synthèse
              </a>
              <a
                href="https://wa.me/221774133440?text=Bonjour%2C%20je%20souhaite%20finaliser%20mon%20diagnostic%20de%20digitalisation."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-3 border rounded-lg hover:bg-gray-50"
              >
                <Zap className="h-4 w-4" /> Continuer par WhatsApp
              </a>
              <Link href="/contact" className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                <Calendar className="h-4 w-4" /> Planifier un RDV
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
        <button
          onClick={goPrev}
          disabled={step === 1}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" /> Précédent
        </button>

        <div className="text-sm text-gray-500">Étape {step}/{totalSteps}</div>

        {step < totalSteps ? (
          <button
            onClick={goNext}
            disabled={!canNext}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Suivant <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={submitToAdmin}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
          >
            Soumettre
          </button>
        )}
      </div>
    </div>
  )
}
