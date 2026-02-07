#!/usr/bin/env node
/**
 * Script d'import bulk robuste pour 1688 et AliExpress
 * Usage: npx tsx scripts/bulk-import.ts --file urls.txt [--dry-run]
 * 
 * Ce script lit une liste d'URLs depuis un fichier et les importe
 * avec le scraping navigateur (Playwright) pour maximum fiabilité.
 */

import fs from 'fs/promises'
import path from 'path'
import { BrowserScraper } from '../src/lib/browser-scraper'
import { connectMongoose } from '../src/lib/mongoose'
import Product from '../src/lib/models/Product.validated'

interface ImportResult {
  url: string
  ok: boolean
  action?: 'created' | 'updated' | 'failed' | 'skipped'
  productId?: string
  error?: string
  durationMs: number
}

interface ImportSummary {
  total: number
  created: number
  updated: number
  failed: number
  skipped: number
  totalDurationMs: number
}

function is1688Url(url: string): boolean {
  return url.includes('1688.com')
}

function isAliExpressUrl(url: string): boolean {
  return url.includes('aliexpress.com')
}

function parseArgs(): { file: string; dryRun: boolean; concurrency: number; resume: boolean } {
  const args = process.argv.slice(2)
  let file = ''
  let dryRun = false
  let concurrency = 3
  let resume = false

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--file':
      case '-f':
        file = args[++i]
        break
      case '--dry-run':
      case '-d':
        dryRun = true
        break
      case '--concurrency':
      case '-c':
        concurrency = parseInt(args[++i], 10) || 3
        break
      case '--resume':
      case '-r':
        resume = true
        break
      case '--help':
      case '-h':
        console.log(`
Usage: npx tsx scripts/bulk-import.ts [options]

Options:
  -f, --file <path>        Fichier contenant les URLs (une par ligne)
  -d, --dry-run            Mode test sans sauvegarde
  -c, --concurrency <n>    Nombre d'imports parallèles (défaut: 3)
  -r, --resume             Reprendre depuis le dernier checkpoint
  -h, --help               Afficher cette aide

Exemples:
  npx tsx scripts/bulk-import.ts -f data/produits-1688.txt
  npx tsx scripts/bulk-import.ts -f data/mix.txt -d -c 5
  npx tsx scripts/bulk-import.ts -f data/produits.txt -r
        `)
        process.exit(0)
    }
  }

  if (!file) {
    console.error('❌ Erreur: Fichier requis (--file)')
    console.log('Utilisez --help pour voir les options')
    process.exit(1)
  }

  return { file, dryRun, concurrency, resume }
}

async function loadUrls(filePath: string, resume: boolean): Promise<string[]> {
  const content = await fs.readFile(path.resolve(filePath), 'utf-8')
  const allUrls = content
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .filter(l => is1688Url(l) || isAliExpressUrl(l))

  if (resume) {
    // Charger le checkpoint si existe
    try {
      const checkpoint = await fs.readFile('.import-checkpoint.json', 'utf-8')
      const done = new Set(JSON.parse(checkpoint).done || [])
      const remaining = allUrls.filter(u => !done.has(u))
      console.log(`📌 Reprise: ${done.size} déjà importés, ${remaining.length} restants`)
      return remaining
    } catch {
      console.log('📌 Aucun checkpoint trouvé, démarrage depuis le début')
    }
  }

  return allUrls
}

async function saveCheckpoint(done: string[]) {
  await fs.writeFile('.import-checkpoint.json', JSON.stringify({ done, timestamp: new Date().toISOString() }, null, 2))
}

async function saveResults(results: ImportResult[], summary: ImportSummary) {
  const output = {
    timestamp: new Date().toISOString(),
    summary,
    results,
    failed: results.filter(r => r.action === 'failed').map(r => ({ url: r.url, error: r.error }))
  }
  
  const filename = `import-results-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  await fs.writeFile(filename, JSON.stringify(output, null, 2))
  console.log(`\n💾 Résultats sauvegardés dans: ${filename}`)
}

async function importProduct(
  url: string, 
  scraper: BrowserScraper, 
  dryRun: boolean
): Promise<ImportResult> {
  const start = Date.now()
  
  try {
    let scrapeResult
    
    if (is1688Url(url)) {
      scrapeResult = await scraper.scrape1688(url)
    } else if (isAliExpressUrl(url)) {
      scrapeResult = await scraper.scrapeAliExpress(url)
    } else {
      return { url, ok: false, action: 'skipped', error: 'URL non supportée', durationMs: Date.now() - start }
    }

    if (!scrapeResult.success || !scrapeResult.data) {
      return { 
        url, 
        ok: false, 
        action: 'failed', 
        error: scrapeResult.error || 'Scraping échoué',
        durationMs: Date.now() - start 
      }
    }

    if (dryRun) {
      return { url, ok: true, action: 'skipped', durationMs: Date.now() - start }
    }

    const data = scrapeResult.data
    const is1688 = is1688Url(url)

    // Construire le payload
    const payload = is1688
      ? {
          name: data.name,
          category: data.category || 'Catalogue import Chine',
          tagline: data.tagline || 'Import 1688',
          description: `Import 1688 navigateur${(data as any).moq ? `\nMOQ: ${(data as any).moq} unités` : ''}`,
          currency: 'FCFA',
          image: data.image,
          gallery: data.gallery || [],
          features: data.features || [],
          requiresQuote: false,
          stockStatus: 'preorder' as const,
          stockQuantity: 0,
          leadTimeDays: 15,
          availabilityNote: data.availabilityNote,
          price1688: (data as any).price1688,
          price1688Currency: 'CNY' as const,
          exchangeRate: (data as any).exchangeRate || 100,
          serviceFeeRate: 10,
          insuranceRate: 2.5,
          weightKg: (data as any).weightKg || 1,
          lengthCm: (data as any).lengthCm || 10,
          widthCm: (data as any).widthCm || 10,
          heightCm: (data as any).heightCm || 10,
          variantGroups: (data as any).variantGroups || [],
          sourcing: {
            platform: '1688' as const,
            supplierName: (data as any).supplier?.name,
            supplierContact: undefined,
            productUrl: url,
            notes: `Import navigateur 1688. MOQ: ${(data as any).moq || '?'}. Fournisseur: ${(data as any).supplier?.name || 'N/A'}`
          },
          shippingOverrides: [],
        }
      : {
          name: data.name,
          category: data.category || 'Catalogue import Chine',
          tagline: data.tagline || 'Import AliExpress',
          description: `Import AliExpress navigateur\nBoutique: ${(data as any).shopName || 'N/A'}`,
          baseCost: (data as any).price ? Math.round((data as any).price * 620) : undefined,
          marginRate: 0,
          price: (data as any).price ? Math.round((data as any).price * 620) : undefined,
          currency: 'FCFA',
          image: data.image,
          gallery: data.gallery || [],
          features: data.features || [],
          requiresQuote: !(data as any).price,
          stockStatus: 'preorder' as const,
          stockQuantity: 0,
          leadTimeDays: 15,
          weightKg: (data as any).weightKg || 1,
          availabilityNote: data.availabilityNote,
          sourcing: {
            platform: 'aliexpress' as const,
            supplierName: (data as any).shopName,
            supplierContact: undefined,
            productUrl: url,
            notes: `Import navigateur AliExpress. Rating: ${(data as any).rating || '?'}/5. Commandes: ${(data as any).orders || '?'}.`
          },
          shippingOverrides: [],
        }

    // Upsert
    const existing = await Product.findOne({ 'sourcing.productUrl': url })
    if (existing) {
      await Product.updateOne({ _id: existing._id }, { $set: payload })
      return { 
        url, 
        ok: true, 
        action: 'updated', 
        productId: String(existing._id),
        durationMs: Date.now() - start 
      }
    } else {
      const created = await Product.create(payload)
      return { 
        url, 
        ok: true, 
        action: 'created', 
        productId: String(created._id),
        durationMs: Date.now() - start 
      }
    }

  } catch (error: any) {
    return { 
      url, 
      ok: false, 
      action: 'failed', 
      error: error.message || 'Erreur inconnue',
      durationMs: Date.now() - start 
    }
  }
}

async function processBatch(
  urls: string[], 
  scraper: BrowserScraper, 
  dryRun: boolean,
  onProgress: (result: ImportResult) => void
): Promise<ImportResult[]> {
  const results: ImportResult[] = []
  
  for (const url of urls) {
    const result = await importProduct(url, scraper, dryRun)
    results.push(result)
    onProgress(result)
  }
  
  return results
}

async function main() {
  const { file, dryRun, concurrency, resume } = parseArgs()
  
  console.log('╔════════════════════════════════════════════════════════╗')
  console.log('║     IMPORT BULK ROBAUSTE 1688/ALIEXPRESS               ║')
  console.log('╚════════════════════════════════════════════════════════╝')
  console.log(`
📁 Fichier: ${file}
🧪 Mode test: ${dryRun ? 'OUI' : 'NON'}
⚡ Concurrence: ${concurrency}
🔄 Reprise: ${resume ? 'OUI' : 'NON'}
`)

  // Charger URLs
  const urls = await loadUrls(file, resume)
  console.log(`📊 ${urls.length} URLs à importer\n`)

  if (urls.length === 0) {
    console.log('✅ Aucun produit à importer')
    process.exit(0)
  }

  // Connexion MongoDB
  if (!dryRun) {
    console.log('🔗 Connexion MongoDB...')
    await connectMongoose()
    console.log('✅ Connecté\n')
  }

  // Initialiser scraper
  const scraper = new BrowserScraper({ headless: true })
  await scraper.init()
  console.log('🚀 Navigateur prêt\n')

  // Traitement par batchs
  const results: ImportResult[] = []
  const done: string[] = []
  const total = urls.length
  const startTime = Date.now()

  console.log('⏳ Import en cours...\n')

  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency)
    const batchResults = await processBatch(batch, scraper, dryRun, (result) => {
      const status = result.ok 
        ? (result.action === 'created' ? '🟢' : '🟡') 
        : '🔴'
      console.log(`${status} [${results.length + 1}/${total}] ${result.url.split('/').pop()} ${result.ok ? '' : `- ${result.error}`}`)
      
      if (result.ok) {
        done.push(result.url)
        // Sauvegarder checkpoint toutes les 5 succès
        if (done.length % 5 === 0) {
          saveCheckpoint(done).catch(console.error)
        }
      }
    })
    
    results.push(...batchResults)
  }

  const totalDuration = Date.now() - startTime

  // Fermeture
  await scraper.close()
  if (!dryRun) {
    // Déconnexion MongoDB implicite par fin process
  }

  // Résumé
  const summary: ImportSummary = {
    total: results.length,
    created: results.filter(r => r.action === 'created').length,
    updated: results.filter(r => r.action === 'updated').length,
    failed: results.filter(r => r.action === 'failed').length,
    skipped: results.filter(r => r.action === 'skipped').length,
    totalDurationMs: totalDuration
  }

  console.log('\n╔════════════════════════════════════════════════════════╗')
  console.log('║                    RÉSULTATS                           ║')
  console.log('╚════════════════════════════════════════════════════════╝')
  console.log(`
📊 Total:      ${summary.total}
🟢 Créés:     ${summary.created}
🟡 Mis à jour: ${summary.updated}
🔴 Échoués:   ${summary.failed}
⚪ Ignorés:   ${summary.skipped}
⏱️  Durée:     ${(summary.totalDurationMs / 1000).toFixed(1)}s
`)

  // Sauvegarder résultats
  await saveResults(results, summary)
  
  // Nettoyer checkpoint si tout OK
  if (summary.failed === 0) {
    try {
      await fs.unlink('.import-checkpoint.json')
      console.log('🗑️  Checkpoint nettoyé')
    } catch {}
  }

  console.log('\n✅ Import terminé!')
  process.exit(summary.failed > 0 ? 1 : 0)
}

main().catch(err => {
  console.error('❌ Erreur fatale:', err)
  process.exit(1)
})
