import assert from 'node:assert/strict'
import { assessSourcingProposal, resolveSourcingSingleImportRate } from '../src/lib/agents/sourcing/request-policy'

const product = { logisticsExtracted: true, weightKg: 1, lengthCm: 10, widthCm: 10, heightCm: 10, moq: 1 }
const request = { qty: 10, budgetMaxFCFA: 10000, budgetScope: 'unit' as const }

for (const rate of [0, 12.5, 18, 100]) {
	assert.equal(resolveSourcingSingleImportRate({ singleImportServiceFeeRate: rate }), rate)
}
assert.equal(resolveSourcingSingleImportRate(undefined), undefined)
for (const snapshot of [null, {}, '18', { singleImportServiceFeeRate: '18' }, { singleImportServiceFeeRate: -1 }, { singleImportServiceFeeRate: 101 }, { singleImportServiceFeeRate: NaN }]) {
	assert.throws(() => resolveSourcingSingleImportRate(snapshot))
}

assert.equal(assessSourcingProposal(request, product, 100000).withinBudget, true)
assert.equal(assessSourcingProposal(request, product, 100001).withinBudget, false)
assert.equal(assessSourcingProposal({ ...request, budgetScope: 'total' }, product, 100000).withinBudget, false)
assert.equal(assessSourcingProposal({ qty: 10, budgetMaxFCFA: 10000 }, product, 9000).withinBudget, false)
assert.deepEqual(assessSourcingProposal(request, product, 100000).riskFlags, [])
assert.ok(assessSourcingProposal(request, { ...product, logisticsExtracted: false }, 9000).riskFlags.length)
assert.ok(assessSourcingProposal(request, { ...product, weightKg: NaN }, 9000).riskFlags.length)
assert.ok(assessSourcingProposal(request, { ...product, moq: 20 }, 9000).riskFlags.length)
assert.ok(assessSourcingProposal(request, { ...product, moq: undefined }, 9000).riskFlags.length)
assert.ok(assessSourcingProposal(request, { ...product, variantGroups: [{}] }, 9000).riskFlags.length)
assert.ok(assessSourcingProposal({ ...request, deliveryNeededBy: '2030-01-01' }, product, 9000).riskFlags.length)
assert.ok(assessSourcingProposal({ ...request, qty: 1.5 }, product, 9000).riskFlags.length)
console.log('Politique sourcing : assertions OK')