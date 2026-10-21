/**
 * Tests sans base de données du workflow projet et de la cohérence des montants
 * (src/lib/projects/workflow.ts, src/lib/finance/project-finance.ts).
 *   npm run test:project-workflow
 */
import assert from 'node:assert/strict'
import {
  allowedTransitions,
  canTransitionProject,
  checkProjectTransition,
  legacyProjectStatus,
  nextActions,
  normalizeProjectStatus,
  PIPELINE,
  PROJECT_STATUSES,
  tasksProgress,
  type WorkflowContext,
} from '../src/lib/projects/workflow'
import { buildProjectFinance } from '../src/lib/finance/project-finance'
import { computeInvoiceTotals } from '../src/lib/finance/billing'

let passed = 0
function test(name: string, fn: () => void) {
  fn()
  passed++
  console.log(`  ✓ ${name}`)
}

const ctx = (over: Partial<WorkflowContext> = {}): WorkflowContext => ({
  acceptedQuotes: 0, sentQuotes: 0, tasksOpen: 0, milestonesOpen: 0, outstanding: 0, remainingToInvoice: 0, receptionSigned: false, ...over,
})

console.log('Workflow projet')

test('statuts historiques normalisés', () => {
  assert.equal(normalizeProjectStatus('pending'), 'lead')
  assert.equal(normalizeProjectStatus('canceled'), 'cancelled')
  assert.equal(normalizeProjectStatus('APPROVED'), 'approved')
  assert.equal(normalizeProjectStatus('inconnu'), 'lead')
})

test('format historique pour l’ancien validateur', () => {
  for (const s of PROJECT_STATUSES) assert.ok(['pending', 'in_progress', 'completed', 'cancelled'].includes(legacyProjectStatus(s)))
  assert.equal(legacyProjectStatus('testing'), 'in_progress')
  assert.equal(legacyProjectStatus('maintenance'), 'completed')
})

test('chaque phase du pipeline mène à la suivante, sauf la dernière', () => {
  PIPELINE.slice(0, -1).forEach((s, i) => {
    const next = PIPELINE[i + 1]
    // negotiation peut être sautée (devis accepté directement)
    if (s === 'quoted') assert.ok(canTransitionProject(s, 'approved'))
    else if (s === 'approved' || s === 'in_progress' || s === 'testing' || s === 'completed') assert.ok(canTransitionProject(s, next), `${s} → ${next}`)
  })
  assert.ok(!canTransitionProject('lead', 'completed'))
  assert.ok(!canTransitionProject('cancelled', 'in_progress'))
})

test('pause : reprise vers toute phase active', () => {
  assert.deepEqual(new Set(allowedTransitions('on_hold')), new Set(['lead', 'quoted', 'negotiation', 'approved', 'in_progress', 'testing']))
})

test('démarrage bloqué sans devis accepté, autorisé sinon', () => {
  assert.ok(checkProjectTransition('quoted', 'approved', ctx()).blocking)
  assert.equal(checkProjectTransition('quoted', 'approved', ctx({ acceptedQuotes: 1 })).blocking, undefined)
  assert.ok(checkProjectTransition('approved', 'in_progress', ctx()).blocking)
})

test('livraison : avertissements non bloquants', () => {
  const r = checkProjectTransition('testing', 'completed', ctx({ tasksOpen: 2, remainingToInvoice: 1000, acceptedQuotes: 1 }))
  assert.equal(r.allowed, true)
  assert.equal(r.blocking, undefined)
  assert.equal(r.warnings.length, 3)
})

test('passage non prévu refusé', () => {
  const r = checkProjectTransition('lead', 'completed', ctx())
  assert.equal(r.allowed, false)
})

test('prochaines actions selon la phase', () => {
  assert.ok(nextActions('lead', { ...ctx(), projectId: 'p' }).some(a => a.href === '/admin/devis?projectId=p'))
  assert.ok(nextActions('approved', { ...ctx({ remainingToInvoice: 10 }), projectId: 'p' }).some(a => a.key === 'deposit'))
  assert.ok(nextActions('completed', { ...ctx({ outstanding: 10 }), projectId: 'p' }).some(a => a.key === 'collect'))
})

test('avancement déduit des tâches', () => {
  assert.equal(tasksProgress([]), null)
  assert.equal(tasksProgress([{ status: 'done' }, { status: 'todo' }, { status: 'review' }, { status: 'done' }]), 50)
})

console.log('Montants projet')

const quote = (id: string, status: string, total: number) => ({ _id: id, numero: `DEV-${id}`, status, total, subtotal: total })
const invoice = (id: string, status: string, total: number, extra: Record<string, unknown> = {}) => ({ _id: id, numero: `FAC-${id}`, status, total, ...extra })

test('montant contractuel = devis acceptés uniquement', () => {
  const f = buildProjectFinance([quote('1', 'accepted', 1_000_000), quote('2', 'sent', 500_000), quote('3', 'superseded', 900_000)], [], 1_000_000)
  assert.equal(f.contracted, 1_000_000)
  assert.equal(f.pipeline, 500_000)
  assert.equal(f.coherent, true)
})

test('acompte + solde = contrat, encaissements et reste dû', () => {
  const f = buildProjectFinance(
    [quote('1', 'accepted', 1_000_000)],
    [
      invoice('a', 'paid', 300_000, { quoteId: '1', amountPaid: 300_000 }),
      invoice('b', 'sent', 700_000, { quoteId: '1', amountPaid: 0 }),
      invoice('c', 'draft', 50_000),
      invoice('d', 'cancelled', 999_999, { quoteId: '1' }),
    ],
    1_000_000,
  )
  assert.equal(f.invoiced, 1_000_000)
  assert.equal(f.draftInvoiced, 50_000)
  assert.equal(f.paid, 300_000)
  assert.equal(f.outstanding, 700_000)
  assert.equal(f.remainingToInvoice, 0)
  assert.equal(f.quotes[0].invoiced, 1_000_000)
  assert.equal(f.coherent, true)
})

test('avoir déduit du facturé', () => {
  const f = buildProjectFinance([quote('1', 'accepted', 1_000)], [invoice('a', 'sent', 1_000, { quoteId: '1', creditedAmount: 200 })], 1_000)
  assert.equal(f.invoiced, 800)
  assert.equal(f.remainingToInvoice, 200)
  assert.equal(f.outstanding, 800)
})

test('alertes : montant projet divergent, sur-facturation, facture sans devis', () => {
  const divergent = buildProjectFinance([quote('1', 'accepted', 1_000)], [], 5_000)
  assert.ok(divergent.warnings.some(w => w.startsWith('Le montant du projet')))
  const over = buildProjectFinance([quote('1', 'accepted', 1_000)], [invoice('a', 'sent', 1_500, { quoteId: '1' })], 1_000)
  assert.equal(over.overInvoiced, 500)
  assert.equal(over.coherent, false)
  const orphan = buildProjectFinance([], [invoice('a', 'sent', 1_000)], 0)
  assert.ok(orphan.warnings.some(w => w.includes('sans devis accepté')))
})

test('acompte/solde : régime sans taxe, total = montant saisi', () => {
  const t = computeInvoiceTotals([{ description: 'Acompte', quantity: 1, unitPrice: 300_000, category: 'products' }], { taxRegime: 'none' })
  assert.equal(t.total, 300_000)
  assert.equal(t.taxAmount, 0)
  assert.equal(t.brsAmount, 0)
})

console.log(`\n${passed} test(s) OK`)
