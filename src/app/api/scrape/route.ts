/**
 * API Route pour scraping via navigateur (Playwright)
 * Routes: 
 * - GET /api/scrape/preview?url=... - Preview produit depuis URL
 * - POST /api/scrape/bulk - Import bulk via navigateur
 * - GET /api/scrape/check?url=... - Vérifier si bloqué
 */

import { NextRequest, NextResponse } from 'next/server'
import { BrowserScraper, scrape1688WithBrowser, scrapeAliExpressWithBrowser } from '@/lib/browser-scraper'
import { connectMongoose } from '@/lib/mongoose'
import Product from '@/lib/models/Product.validated'
import { requireAuth } from '@/lib/jwt'

// URLs patterns
function is1688Url(url: string): boolean {
  return /1688\.com$/i.test(new URL(url).hostname)
}

function isAliExpressUrl(url: string): boolean {
  return /aliexpress\.com$/i.test(new URL(url).hostname)
}

async function requireManagerRole(request: NextRequest) {
  try {
    const { role } = await requireAuth(request)
    const allowed = role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'PRODUCT_MANAGER'
    if (!allowed) return { ok: false as const, status: 403, error: 'Accès refusé' as const }
    return { ok: true as const }
  } catch {
    return { ok: false as const, status: 401, error: 'Non authentifié' as const }
  }
}

// GET /api/scrape/preview?url=...
export async function GET(request: NextRequest) {
  const auth = await requireManagerRole(request)
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')?.trim()
  const check = searchParams.get('check') === 'true'

  if (!url) {
    return NextResponse.json({ success: false, error: 'URL requise' }, { status: 400 })
  }

  try {
    new URL(url) // Valider URL
  } catch {
    return NextResponse.json({ success: false, error: 'URL invalide' }, { status: 400 })
  }

  const scraper = new BrowserScraper({ headless: true })

  try {
    await scraper.init()

    // Mode check: juste vérifier si bloqué
    if (check) {
      const checkResult = await scraper.checkBlocking(url)
      return NextResponse.json({
        success: true,
        url,
        ...checkResult,
      })
    }

    // Scraping selon plateforme
    let result
    if (is1688Url(url)) {
      result = await scraper.scrape1688(url)
    } else if (isAliExpressUrl(url)) {
      result = await scraper.scrapeAliExpress(url)
    } else {
      return NextResponse.json(
        { success: false, error: 'Plateforme non supportée. Utilisez: 1688.com, aliexpress.com' },
        { status: 400 }
      )
    }

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          code: 'SCRAPING_FAILED',
          attempts: result.attempts,
          durationMs: result.durationMs,
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      platform: is1688Url(url) ? '1688' : 'aliexpress',
      data: result.data,
      meta: {
        attempts: result.attempts,
        durationMs: result.durationMs,
        scrapedAt: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error('Browser scraping error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur scraping',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  } finally {
    await scraper.close()
  }
}

// POST /api/scrape/bulk
// Body: { urls: string[], dryRun?: boolean }
export async function POST(request: NextRequest) {
  const auth = await requireManagerRole(request)
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
  }

  let body: { urls?: string[]; dryRun?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'JSON invalide' }, { status: 400 })
  }

  const urls = (body.urls || [])
    .filter((u): u is string => typeof u === 'string')
    .map(u => u.trim())
    .filter(u => u.length > 0)
    .slice(0, 10) // Max 10 URLs

  if (urls.length === 0) {
    return NextResponse.json({ success: false, error: 'Aucune URL valide' }, { status: 400 })
  }

  const dryRun = body.dryRun === true
  const results: Array<{
    url: string
    ok: boolean
    action?: 'created' | 'updated' | 'preview' | 'failed'
    productId?: string
    error?: string
    durationMs?: number
  }> = []

  const scraper = new BrowserScraper({ headless: true })

  try {
    await scraper.init()
    await connectMongoose()

    for (const url of urls) {
      const startTime = Date.now()

      try {
        // Déterminer plateforme
        let scrapeResult
        try {
          if (is1688Url(url)) {
            scrapeResult = await scraper.scrape1688(url)
          } else if (isAliExpressUrl(url)) {
            scrapeResult = await scraper.scrapeAliExpress(url)
          } else {
            throw new Error('Plateforme non supportée')
          }
        } catch (e: any) {
          results.push({
            url,
            ok: false,
            action: 'failed',
            error: e.message,
            durationMs: Date.now() - startTime,
          })
          continue
        }

        if (!scrapeResult.success || !scrapeResult.data) {
          results.push({
            url,
            ok: false,
            action: 'failed',
            error: scrapeResult.error || 'Scraping échoué',
            durationMs: Date.now() - startTime,
          })
          continue
        }

        if (dryRun) {
          results.push({
            url,
            ok: true,
            action: 'preview',
            durationMs: Date.now() - startTime,
          })
          continue
        }

        // Sauvegarder en base
        const data = scrapeResult.data as any
        const is1688 = is1688Url(url)

        const payload = is1688
          ? {
              name: data.name,
              category: data.category || 'Catalogue import Chine',
              tagline: data.tagline || 'Import 1688',
              description: data.description || `Import depuis 1688 via navigateur\nMOQ: ${data.moq || 'N/A'}`,
              currency: 'FCFA',
              image: data.image,
              gallery: data.gallery || [],
              features: data.features || [],
              requiresQuote: false,
              stockStatus: 'preorder' as const,
              stockQuantity: 0,
              leadTimeDays: 15,
              availabilityNote: data.availabilityNote,
              price1688: data.price1688,
              price1688Currency: 'CNY' as const,
              exchangeRate: data.exchangeRate || 100,
              serviceFeeRate: 10,
              insuranceRate: 2.5,
              weightKg: data.weightKg || 1,
              lengthCm: data.lengthCm || 10,
              widthCm: data.widthCm || 10,
              heightCm: data.heightCm || 10,
              variantGroups: data.variantGroups || [],
              sourcing: {
                platform: '1688' as const,
                supplierName: data.supplier?.name,
                supplierContact: undefined,
                productUrl: url,
                notes: `Import navigateur 1688. MOQ: ${data.moq || '?'}. Fournisseur: ${data.supplier?.name || 'N/A'}`,
              },
              shippingOverrides: [],
            }
          : {
              name: data.name,
              category: data.category || 'Catalogue import Chine',
              tagline: data.tagline || 'Import AliExpress',
              description: `Import depuis AliExpress via navigateur\nBoutique: ${data.shopName || 'N/A'}`,
              baseCost: data.price ? Math.round(data.price * 620) : undefined,
              marginRate: 0,
              price: data.price ? Math.round(data.price * 620) : undefined,
              currency: 'FCFA',
              image: data.image,
              gallery: data.gallery || [],
              features: data.features || [],
              requiresQuote: !data.price,
              stockStatus: 'preorder' as const,
              stockQuantity: 0,
              leadTimeDays: 15,
              weightKg: data.weightKg || 1,
              availabilityNote: data.availabilityNote,
              sourcing: {
                platform: 'aliexpress' as const,
                supplierName: data.shopName,
                supplierContact: undefined,
                productUrl: url,
                notes: `Import navigateur AliExpress. Rating: ${data.rating || '?'}/5. Commandes: ${data.orders || '?'}.`,
              },
              shippingOverrides: [],
            }

        // Upsert
        const existing = await Product.findOne({ 'sourcing.productUrl': url })
        if (existing) {
          await Product.updateOne({ _id: existing._id }, { $set: payload })
          results.push({
            url,
            ok: true,
            action: 'updated',
            productId: String(existing._id),
            durationMs: Date.now() - startTime,
          })
        } else {
          const created = await Product.create(payload)
          results.push({
            url,
            ok: true,
            action: 'created',
            productId: String(created._id),
            durationMs: Date.now() - startTime,
          })
        }
      } catch (error: any) {
        results.push({
          url,
          ok: false,
          action: 'failed',
          error: error.message || 'Erreur inconnue',
          durationMs: Date.now() - startTime,
        })
      }
    }

    const summary = {
      total: urls.length,
      created: results.filter(r => r.action === 'created').length,
      updated: results.filter(r => r.action === 'updated').length,
      failed: results.filter(r => r.action === 'failed').length,
      preview: results.filter(r => r.action === 'preview').length,
      dryRun,
    }

    return NextResponse.json({
      success: summary.failed === 0 || (summary.created + summary.updated) > 0,
      results,
      summary,
    })
  } catch (error: any) {
    console.error('Bulk scraping error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur bulk import',
      },
      { status: 500 }
    )
  } finally {
    await scraper.close()
  }
}
