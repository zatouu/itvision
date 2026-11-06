import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { requireAdminApi } from '@/lib/api-auth'
import AppConfig from '@/lib/models/AppConfig'
import { invalidateAppConfigCache } from '@/lib/wallet'

const DEFAULT_SCHEDULE = '0 2 * * *'

function sanitizeAutoImportConfig(value: any) {
  if (!value || typeof value !== 'object') {
    return {
      enabled: false,
      schedule: DEFAULT_SCHEDULE,
      urls: [],
      concurrency: 1,
      dryRun: false,
      apiBaseUrl: '',
      apiToken: '',
      lastRun: undefined,
    }
  }

  const urls = Array.isArray(value.urls)
    ? value.urls
        .map((u: any) => String(u || '').trim())
        .filter((u: string) => u && (u.includes('1688.com') || u.includes('aliexpress.com')))
    : []

  const concurrency = Math.min(10, Math.max(1, Number(value.concurrency) || 1))

  return {
    enabled: Boolean(value.enabled),
    schedule: String(value.schedule || DEFAULT_SCHEDULE).trim() || DEFAULT_SCHEDULE,
    urls,
    concurrency,
    dryRun: Boolean(value.dryRun),
    apiBaseUrl: String(value.apiBaseUrl || '').trim(),
    apiToken: String(value.apiToken || '').trim(),
    lastRun: value.lastRun && typeof value.lastRun === 'object'
      ? {
          startedAt: String(value.lastRun.startedAt || ''),
          finishedAt: String(value.lastRun.finishedAt || ''),
          created: Number(value.lastRun.created) || 0,
          failed: Number(value.lastRun.failed) || 0,
          urls: Number(value.lastRun.urls) || 0,
          errors: Array.isArray(value.lastRun.errors)
            ? value.lastRun.errors.map((e: any) => String(e || '')).filter(Boolean)
            : [],
        }
      : undefined,
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER'])
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    let cfg: any = await AppConfig.findOne({ key: 'global' }).lean()
    if (!cfg) {
      const created = await AppConfig.create({ key: 'global' })
      cfg = created.toObject()
    }

    const autoImport = sanitizeAutoImportConfig((cfg as any)?.autoImport)

    return NextResponse.json({
      success: true,
      config: autoImport,
    })
  } catch (error) {
    console.error('[GET /api/admin/auto-import]', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER'])
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const body = await request.json().catch(() => ({}))
    const incoming = sanitizeAutoImportConfig(body)

    // Empêcher une écrasement accidentel du lastRun si non fourni
    const existing = (await AppConfig.findOne({ key: 'global' }).lean()) as any
    const existingAutoImport = existing?.autoImport || {}
    const lastRun = incoming.lastRun !== undefined ? incoming.lastRun : existingAutoImport.lastRun

    const update = {
      ...incoming,
      lastRun,
    }

    await AppConfig.findOneAndUpdate(
      { key: 'global' },
      { $set: { autoImport: update } },
      { new: true, upsert: true }
    )

    invalidateAppConfigCache()

    return NextResponse.json({
      success: true,
      config: update,
    })
  } catch (error) {
    console.error('[POST /api/admin/auto-import]', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
