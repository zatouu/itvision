import { test, expect } from '@playwright/test'
import { connectMongoose } from '@/lib/mongoose'
import AccountingEntry from '@/lib/models/AccountingEntry'

/**
 * Régression — numérotation des écritures comptables.
 *
 * `entryNumber` est `required` mais généré par hook : en `pre('save')` la
 * validation passait AVANT la génération, donc toute écriture de vente
 * marketplace échouait (« entryNumber: Path `entryNumber` is required »).
 * Le hook doit tourner en `pre('validate')`.
 */

test.describe('Comptabilité — numérotation automatique', () => {
  test.beforeAll(async () => {
    await connectMongoose()
    await AccountingEntry.deleteMany({ productName: /^E2E-ACCOUNTING/ })
  })

  test.afterAll(async () => {
    await AccountingEntry.deleteMany({ productName: /^E2E-ACCOUNTING/ })
  })

  test('une écriture de vente sans entryNumber est acceptée et numérotée', async () => {
    const year = new Date().getFullYear()
    const entry = await AccountingEntry.create({
      entryType: 'sale',
      productName: `E2E-ACCOUNTING-${Date.now()}`,
      amount: 25000,
      currency: 'FCFA',
      category: 'product_sale',
      transactionDate: new Date(),
      status: 'confirmed',
    })

    expect(entry.entryNumber).toMatch(new RegExp(`^ACC-${year}-\\d{6}$`))
  })

  test('des écritures concurrentes reçoivent des numéros distincts', async () => {
    const stamp = Date.now()
    const entries = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        AccountingEntry.create({
          entryType: 'sale',
          productName: `E2E-ACCOUNTING-concurrent-${stamp}-${i}`,
          amount: 1000 + i,
          currency: 'FCFA',
          category: 'product_sale',
          transactionDate: new Date(),
          status: 'confirmed',
        })
      )
    )
    const numbers = entries.map(e => e.entryNumber)
    expect(new Set(numbers).size).toBe(numbers.length)
  })

  test('le numéro fourni explicitement est conservé', async () => {
    const custom = `ACC-TEST-${Date.now()}`
    const entry = await AccountingEntry.create({
      entryNumber: custom,
      entryType: 'sale',
      productName: `E2E-ACCOUNTING-custom-${Date.now()}`,
      amount: 1000,
      currency: 'FCFA',
      category: 'product_sale',
      transactionDate: new Date(),
      status: 'confirmed',
    })

    expect(entry.entryNumber).toBe(custom)
  })
})
