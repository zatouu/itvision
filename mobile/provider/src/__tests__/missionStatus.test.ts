import { statusLabelKey, resolvePaymentLabel, paymentLabelI18nKey } from '../utils/missionStatus'

const fr = require('../i18n/fr.json')
const en = require('../i18n/en.json')
const wo = require('../i18n/wo.json')

describe('statusLabelKey', () => {
  it('mappe chaque statut métier connu sur une clé i18n dédiée', () => {
    const statuses = [
      'accepted', 'assigned', 'on_the_way', 'provider_arriving', 'arrived',
      'in_progress', 'paused', 'awaiting_validation', 'completed', 'cancelled', 'dispute',
    ]
    for (const st of statuses) {
      const key = statusLabelKey(st)
      expect(fr.providerMissionDetails[key]).toBeTruthy()
      expect(en.providerMissionDetails[key]).toBeTruthy()
      expect(wo.providerMissionDetails[key]).toBeTruthy()
    }
  })

  it('a un fallback pour un statut inconnu', () => {
    expect(statusLabelKey('unknown_status')).toBe('statusInProgress')
  })
})

describe('resolvePaymentLabel', () => {
  it('released => received', () => {
    expect(resolvePaymentLabel({ status: 'released' })).toBe('received')
  })

  it('held => secured', () => {
    expect(resolvePaymentLabel({ status: 'held' })).toBe('secured')
  })

  it('pending => pending (jamais "reçu" sans confirmation backend)', () => {
    expect(resolvePaymentLabel({ status: 'pending' })).toBe('pending')
  })

  it('failed/refunded => failed', () => {
    expect(resolvePaymentLabel({ status: 'failed' })).toBe('failed')
    expect(resolvePaymentLabel({ status: 'refunded' })).toBe('failed')
  })

  it('aucun enregistrement paiement => null (aucun libellé affiché)', () => {
    expect(resolvePaymentLabel(null)).toBeNull()
    expect(resolvePaymentLabel(undefined)).toBeNull()
    expect(resolvePaymentLabel({ status: null })).toBeNull()
  })

  it('mission terminée sans paiement ne produit jamais "received"', () => {
    // completed mission + paymentStatus PENDING_CONFIRMATION != RECEIVED
    expect(resolvePaymentLabel({ status: 'pending' })).not.toBe('received')
    expect(resolvePaymentLabel(null)).not.toBe('received')
  })
})

describe('paymentLabelI18nKey', () => {
  it('chaque libellé pointe vers une clé traduite dans les 3 locales', () => {
    for (const label of ['received', 'secured', 'pending', 'failed'] as const) {
      const fullKey = paymentLabelI18nKey(label)
      expect(fullKey).toBeTruthy()
      const key = fullKey!.replace('providerMissionCompleted.', '')
      expect(fr.providerMissionCompleted[key]).toBeTruthy()
      expect(en.providerMissionCompleted[key]).toBeTruthy()
      expect(wo.providerMissionCompleted[key]).toBeTruthy()
    }
  })

  it('null => aucune clé', () => {
    expect(paymentLabelI18nKey(null)).toBeNull()
  })
})

describe('i18n namespaces mission (aucune clé brute possible)', () => {
  it('providerMissionCompleted et providerMissionDetails ont parité fr/en/wo', () => {
    for (const ns of ['providerMissionCompleted', 'providerMissionDetails']) {
      const frKeys = Object.keys(fr[ns]).sort()
      expect(Object.keys(en[ns]).sort()).toEqual(frKeys)
      expect(Object.keys(wo[ns]).sort()).toEqual(frKeys)
      for (const k of frKeys) {
        const value: string = fr[ns][k]
        // Une traduction résolue ne ressemble jamais à une clé brute
        expect(value).not.toMatch(/^[a-zA-Z]+\.[a-zA-Z]+$/)
        expect(value.trim().length).toBeGreaterThan(0)
      }
    }
  })
})
