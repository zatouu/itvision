/**
 * Profitability Engine - IT Vision
 * 
 * Moteur de rentabilité pour analyser et optimiser les marges.
 * Calcule la rentabilité par:
 * - Produit
 * - Catégorie
 * - Client
 * - Période
 * 
 * @module lib/engines/profitability
 */

import { BaseConsumer } from '../kafka/consumer'
import { ORDER_TOPICS, PAYMENT_TOPICS, SHIPPING_TOPICS } from '../kafka/topics'
import type { TopicName } from '../kafka/topics'
import type { 
  BaseEvent, 
  OrderPlacedPayload,
  PaymentCompletedPayload,
  ShipmentDeliveredPayload 
} from '../kafka/types'

// ============================================================================
// TYPES
// ============================================================================

export interface ProductProfitability {
  productId: string
  name?: string
  periodStart: Date
  periodEnd: Date
  metrics: {
    unitsSold: number
    revenue: number
    costOfGoods: number
    shippingCosts: number
    serviceFees: number
    grossProfit: number
    grossMargin: number
    netProfit: number
    netMargin: number
  }
}

export interface CategoryProfitability {
  categoryId: string
  categoryName: string
  productCount: number
  metrics: ProductProfitability['metrics']
}

export interface CustomerProfitability {
  customerId: string
  customerName?: string
  metrics: {
    totalOrders: number
    totalRevenue: number
    totalCost: number
    totalProfit: number
    averageOrderValue: number
    acquisitionCost?: number
    lifetimeValue: number
    profitabilityScore: number
  }
}

export interface ProfitabilityReport {
  period: {
    start: string
    end: string
    type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  }
  summary: {
    totalRevenue: number
    totalCost: number
    grossProfit: number
    grossMargin: number
    operatingExpenses: number
    netProfit: number
    netMargin: number
  }
  byProduct: ProductProfitability[]
  byCategory: CategoryProfitability[]
  topCustomers: CustomerProfitability[]
  trends: {
    revenueGrowth: number
    profitGrowth: number
    marginTrend: 'improving' | 'stable' | 'declining'
  }
}

// ============================================================================
// IN-MEMORY STORES (à remplacer par MongoDB/TimescaleDB en production)
// ============================================================================

interface OrderRecord {
  orderId: string
  customerId: string
  items: Array<{
    productId: string
    quantity: number
    unitPrice: number
    cost: number
  }>
  shippingCost: number
  serviceFees: number
  total: number
  completedAt?: Date
}

const orderRecords: Map<string, OrderRecord> = new Map()
const productCosts: Map<string, number> = new Map() // Coût d'achat par produit
const customerMetrics: Map<string, {
  orders: number
  revenue: number
  cost: number
}> = new Map()

// ============================================================================
// PROFITABILITY ENGINE CLASS
// ============================================================================

export class ProfitabilityEngine {
  private static instance: ProfitabilityEngine | null = null

  private constructor() {}

  static getInstance(): ProfitabilityEngine {
    if (!ProfitabilityEngine.instance) {
      ProfitabilityEngine.instance = new ProfitabilityEngine()
    }
    return ProfitabilityEngine.instance
  }

  /**
   * Enregistre une commande pour analyse
   */
  recordOrder(order: OrderPlacedPayload): void {
    const record: OrderRecord = {
      orderId: order.orderId,
      customerId: order.userId,
      items: order.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        cost: this.getProductCost(item.productId) * item.quantity,
      })),
      shippingCost: order.shippingCost,
      serviceFees: order.total * 0.10, // Approximation des frais de service
      total: order.total,
    }

    orderRecords.set(order.orderId, record)

    // Mettre à jour les métriques client
    const customerData = customerMetrics.get(order.userId) || {
      orders: 0,
      revenue: 0,
      cost: 0,
    }
    customerData.orders++
    customerData.revenue += order.total
    customerData.cost += record.items.reduce((sum, item) => sum + item.cost, 0)
    customerMetrics.set(order.userId, customerData)

    console.log(`[Profitability] Order ${order.orderId} recorded`)
  }

  /**
   * Marque une commande comme complétée (payée et livrée)
   */
  completeOrder(orderId: string): void {
    const record = orderRecords.get(orderId)
    if (record) {
      record.completedAt = new Date()
      console.log(`[Profitability] Order ${orderId} completed`)
    }
  }

  /**
   * Définit le coût d'achat d'un produit
   */
  setProductCost(productId: string, cost: number): void {
    productCosts.set(productId, cost)
  }

  /**
   * Récupère le coût d'un produit
   */
  getProductCost(productId: string): number {
    return productCosts.get(productId) || 0
  }

  /**
   * Calcule la rentabilité d'un produit sur une période
   */
  getProductProfitability(
    productId: string,
    periodStart: Date,
    periodEnd: Date
  ): ProductProfitability {
    let unitsSold = 0
    let revenue = 0
    let costOfGoods = 0
    let shippingCosts = 0
    let serviceFees = 0

    for (const record of orderRecords.values()) {
      if (record.completedAt && 
          record.completedAt >= periodStart && 
          record.completedAt <= periodEnd) {
        for (const item of record.items) {
          if (item.productId === productId) {
            unitsSold += item.quantity
            revenue += item.unitPrice * item.quantity
            costOfGoods += item.cost
            // Répartir les frais proportionnellement
            const orderTotal = record.total
            const itemShare = (item.unitPrice * item.quantity) / orderTotal
            shippingCosts += record.shippingCost * itemShare
            serviceFees += record.serviceFees * itemShare
          }
        }
      }
    }

    const grossProfit = revenue - costOfGoods
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0
    const netProfit = grossProfit - shippingCosts - serviceFees
    const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0

    return {
      productId,
      periodStart,
      periodEnd,
      metrics: {
        unitsSold,
        revenue,
        costOfGoods,
        shippingCosts,
        serviceFees,
        grossProfit,
        grossMargin,
        netProfit,
        netMargin,
      },
    }
  }

  /**
   * Calcule la rentabilité par client
   */
  getCustomerProfitability(customerId: string): CustomerProfitability {
    const data = customerMetrics.get(customerId) || {
      orders: 0,
      revenue: 0,
      cost: 0,
    }

    const totalProfit = data.revenue - data.cost
    const averageOrderValue = data.orders > 0 ? data.revenue / data.orders : 0
    
    // Score de rentabilité: combinaison de volume et marge
    const profitabilityScore = (totalProfit / 10000) * (data.orders / 10)

    return {
      customerId,
      metrics: {
        totalOrders: data.orders,
        totalRevenue: data.revenue,
        totalCost: data.cost,
        totalProfit,
        averageOrderValue,
        lifetimeValue: data.revenue, // Simplifié pour l'exemple
        profitabilityScore,
      },
    }
  }

  /**
   * Génère un rapport de rentabilité global
   */
  generateReport(
    periodStart: Date,
    periodEnd: Date,
    periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'monthly'
  ): ProfitabilityReport {
    let totalRevenue = 0
    let totalCost = 0
    let totalShipping = 0
    let totalServiceFees = 0
    const productMetrics: Map<string, {
      units: number
      revenue: number
      cost: number
      shipping: number
      fees: number
    }> = new Map()

    // Agréger les données des commandes
    for (const record of orderRecords.values()) {
      if (record.completedAt && 
          record.completedAt >= periodStart && 
          record.completedAt <= periodEnd) {
        totalRevenue += record.total
        totalShipping += record.shippingCost
        totalServiceFees += record.serviceFees

        for (const item of record.items) {
          totalCost += item.cost
          
          const existing = productMetrics.get(item.productId) || {
            units: 0,
            revenue: 0,
            cost: 0,
            shipping: 0,
            fees: 0,
          }
          const itemShare = (item.unitPrice * item.quantity) / record.total
          existing.units += item.quantity
          existing.revenue += item.unitPrice * item.quantity
          existing.cost += item.cost
          existing.shipping += record.shippingCost * itemShare
          existing.fees += record.serviceFees * itemShare
          productMetrics.set(item.productId, existing)
        }
      }
    }

    // Calculer les marges globales
    const grossProfit = totalRevenue - totalCost
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
    const operatingExpenses = totalShipping + totalServiceFees
    const netProfit = grossProfit - operatingExpenses
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

    // Top produits par rentabilité
    const byProduct: ProductProfitability[] = Array.from(productMetrics.entries())
      .map(([productId, metrics]) => ({
        productId,
        periodStart,
        periodEnd,
        metrics: {
          unitsSold: metrics.units,
          revenue: metrics.revenue,
          costOfGoods: metrics.cost,
          shippingCosts: metrics.shipping,
          serviceFees: metrics.fees,
          grossProfit: metrics.revenue - metrics.cost,
          grossMargin: metrics.revenue > 0 
            ? ((metrics.revenue - metrics.cost) / metrics.revenue) * 100 
            : 0,
          netProfit: metrics.revenue - metrics.cost - metrics.shipping - metrics.fees,
          netMargin: metrics.revenue > 0 
            ? ((metrics.revenue - metrics.cost - metrics.shipping - metrics.fees) / metrics.revenue) * 100 
            : 0,
        },
      }))
      .sort((a, b) => b.metrics.netProfit - a.metrics.netProfit)
      .slice(0, 10)

    // Top clients
    const topCustomers: CustomerProfitability[] = Array.from(customerMetrics.keys())
      .map(customerId => this.getCustomerProfitability(customerId))
      .sort((a, b) => b.metrics.profitabilityScore - a.metrics.profitabilityScore)
      .slice(0, 10)

    return {
      period: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString(),
        type: periodType,
      },
      summary: {
        totalRevenue,
        totalCost,
        grossProfit,
        grossMargin,
        operatingExpenses,
        netProfit,
        netMargin,
      },
      byProduct,
      byCategory: [], // À implémenter avec les catégories
      topCustomers,
      trends: {
        revenueGrowth: 0, // À implémenter avec données historiques
        profitGrowth: 0,
        marginTrend: 'stable',
      },
    }
  }

  /**
   * Identifie les produits à faible marge
   */
  getLowMarginProducts(threshold = 15): ProductProfitability[] {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    const allProducts = new Set<string>()
    for (const record of orderRecords.values()) {
      for (const item of record.items) {
        allProducts.add(item.productId)
      }
    }

    return Array.from(allProducts)
      .map(productId => this.getProductProfitability(productId, thirtyDaysAgo, now))
      .filter(p => p.metrics.netMargin < threshold && p.metrics.unitsSold > 0)
      .sort((a, b) => a.metrics.netMargin - b.metrics.netMargin)
  }

  /**
   * Suggère des ajustements de prix pour améliorer les marges
   */
  suggestPriceAdjustments(): Array<{
    productId: string
    currentMargin: number
    suggestedIncrease: number
    reason: string
  }> {
    const lowMarginProducts = this.getLowMarginProducts(20)
    
    return lowMarginProducts.map(product => {
      const targetMargin = 25 // Marge cible
      const currentRevenue = product.metrics.revenue
      const cost = product.metrics.costOfGoods + product.metrics.shippingCosts + product.metrics.serviceFees
      const units = product.metrics.unitsSold

      if (units === 0) {
        return {
          productId: product.productId,
          currentMargin: 0,
          suggestedIncrease: 0,
          reason: 'Aucune vente',
        }
      }

      const currentPrice = currentRevenue / units
      // Prix nécessaire pour atteindre la marge cible
      const targetPrice = (cost / units) / (1 - targetMargin / 100)
      const suggestedIncrease = ((targetPrice - currentPrice) / currentPrice) * 100

      return {
        productId: product.productId,
        currentMargin: product.metrics.netMargin,
        suggestedIncrease: Math.max(0, suggestedIncrease),
        reason: suggestedIncrease > 20 
          ? 'Marge critique - révision nécessaire'
          : suggestedIncrease > 10 
            ? 'Marge faible - ajustement recommandé'
            : 'Marge acceptable - ajustement optionnel',
      }
    }).filter(s => s.suggestedIncrease > 0)
  }
}

// ============================================================================
// PROFITABILITY CONSUMER (écoute Kafka)
// ============================================================================

export class ProfitabilityConsumer extends BaseConsumer {
  private engine: ProfitabilityEngine

  constructor() {
    super({
      name: 'ProfitabilityEngine',
      groupId: 'profitability-engine',
      topics: [
        ORDER_TOPICS.ORDER_PLACED,
        PAYMENT_TOPICS.PAYMENT_COMPLETED,
        SHIPPING_TOPICS.SHIPMENT_DELIVERED,
      ],
    })
    this.engine = ProfitabilityEngine.getInstance()
  }

  protected async processEvent(
    topic: TopicName,
    event: BaseEvent,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _metadata: { topic: string; partition: number; offset: string; timestamp: string; headers: Record<string, string | undefined> }
  ): Promise<void> {
    switch (topic) {
      case ORDER_TOPICS.ORDER_PLACED:
        await this.handleOrderPlaced(event as BaseEvent<OrderPlacedPayload>)
        break
      case PAYMENT_TOPICS.PAYMENT_COMPLETED:
        await this.handlePaymentCompleted(event as BaseEvent<PaymentCompletedPayload>)
        break
      case SHIPPING_TOPICS.SHIPMENT_DELIVERED:
        await this.handleShipmentDelivered(event as BaseEvent<ShipmentDeliveredPayload>)
        break
    }
  }

  private async handleOrderPlaced(event: BaseEvent<OrderPlacedPayload>): Promise<void> {
    this.engine.recordOrder(event.payload)
  }

  private async handlePaymentCompleted(event: BaseEvent<PaymentCompletedPayload>): Promise<void> {
    // Le paiement est une étape vers la completion
    console.log(`[Profitability] Payment completed for order ${event.payload.orderId}`)
  }

  private async handleShipmentDelivered(event: BaseEvent<ShipmentDeliveredPayload>): Promise<void> {
    // Marquer la commande comme complète quand livrée
    this.engine.completeOrder(event.payload.orderId)
  }
}

// Export singleton
export const profitabilityEngine = ProfitabilityEngine.getInstance()
