import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/jwt'
import { aiAssist, type AssistType } from '@/lib/ai/assist'
import { checkAiAvailability } from '@/lib/ai/qwen'
import { applyRateLimit, aiRateLimiter } from '@/lib/rate-limiter'
import { connectMongoose } from '@/lib/mongoose'
import ServiceRequest from '@/lib/models/ServiceRequest'
import Offer from '@/lib/models/Offer'
import ProviderProfile from '@/lib/models/ProviderProfile'

const VALID_TYPES: AssistType[] = ['enhance_request', 'clarify_request', 'analyze_request', 'mission_help', 'daily_tips', 'suggest_offer']

async function computeMarketPrices(category: string): Promise<{ category: string; count: number; medianPrice: number; minPrice: number; maxPrice: number; avgPrice: number } | undefined> {
  try {
    await connectMongoose()
    // Find accepted offers for completed missions in the same category
    const completedRequests = await ServiceRequest.find(
      { category, status: 'completed' },
      { _id: 1 }
    ).limit(200).lean()

    if (completedRequests.length === 0) return undefined

    const requestIds = completedRequests.map(r => r._id)
    const offers = await Offer.find(
      { requestId: { $in: requestIds }, status: 'accepted' },
      { price: 1 }
    ).lean()

    const prices = offers.map(o => o.price).filter(p => typeof p === 'number' && p > 0)
    if (prices.length === 0) return undefined

    prices.sort((a, b) => a - b)
    const mid = Math.floor(prices.length / 2)
    const median = prices.length % 2 === 0 ? Math.round((prices[mid - 1] + prices[mid]) / 2) : prices[mid]

    return {
      category,
      count: prices.length,
      medianPrice: median,
      minPrice: prices[0],
      maxPrice: prices[prices.length - 1],
      avgPrice: Math.round(prices.reduce((s, p) => s + p, 0) / prices.length),
    }
  } catch (err) {
    console.warn('[AI assist] computeMarketPrices failed:', err instanceof Error ? err.message : err)
    return undefined
  }
}

async function getProviderStats(userId: string): Promise<{ completedMissions: number; rating: number }> {
  try {
    await connectMongoose()
    const profile = await ProviderProfile.findOne({ userId }).lean()
    const completedMissions = profile?.providerStats?.completedMissions || 0
    const rating = profile?.scoreXeuy || 0
    return { completedMissions, rating }
  } catch {
    return { completedMissions: 0, rating: 0 }
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request, aiRateLimiter)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const { userId } = await requireAuth(request)
    if (!userId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload invalide' }, { status: 400 })
    }

    const { type, category, description, attributes, answers, question, missionStatus, profile, nearbyCount, earnings, rating, requestBudget } = body as any

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: 'Type invalide' }, { status: 400 })
    }

    // For suggest_offer, compute market prices and provider stats
    let marketPrices: any
    let providerCompletedMissions: number | undefined
    let providerRating: number | undefined

    if (type === 'suggest_offer') {
      if (category) {
        marketPrices = await computeMarketPrices(category)
      }
      const stats = await getProviderStats(userId)
      providerCompletedMissions = stats.completedMissions
      providerRating = stats.rating
    }

    const result = await aiAssist({
      type: type as AssistType,
      category,
      description,
      attributes,
      answers: Array.isArray(answers) ? answers : undefined,
      question,
      missionStatus,
      profile,
      nearbyCount,
      earnings,
      rating: rating ?? providerRating,
      requestBudget,
      marketPrices,
      providerCompletedMissions,
    })

    return NextResponse.json({
      text: result.text,
      questions: result.questions,
      suggestedPrice: result.suggestedPrice,
      suggestedMessage: result.suggestedMessage,
      reasoning: result.reasoning,
      marketPrices: marketPrices ? { count: marketPrices.count, medianPrice: marketPrices.medianPrice, avgPrice: marketPrices.avgPrice } : undefined,
      source: result.source,
      model: result.model,
    })
  } catch (e: any) {
    if (e.message === 'Non authentifié') return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    console.error('[POST /api/ai/assist]', e)
    return NextResponse.json({ error: e.message || 'AI service unavailable' }, { status: 503 })
  }
}

export async function GET() {
  const status = await checkAiAvailability()
  return NextResponse.json(status)
}
