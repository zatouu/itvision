import { test, expect } from '@playwright/test'
import { scrape1688WithBrowser } from '@/lib/browser-scraper'

/**
 * Test unitaire de scraping d'une page produit 1688.
 * URL: https://detail.1688.com/offer/860338935387.html
 */

test.describe('Scraper 1688', () => {
  // Dépend du réseau externe (1688.com) — CAPTCHA/timeouts fréquents.
  // Activé uniquement via RUN_LIVE_SCRAPER=1.
  test.skip(!process.env.RUN_LIVE_SCRAPER, 'Test live externe — définir RUN_LIVE_SCRAPER=1 pour l’exécuter')

  test('scrape une page produit 1688 et retourne les données structurées', async () => {
    const url = 'https://detail.1688.com/offer/860338935387.html?offerId=860338935387&hotSaleSkuId=5784344749081&spm=a260k.home2025.recommendpart.113'

    const result = await scrape1688WithBrowser(url)

    // --- Assertions structurelles ---
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.attempts).toBeGreaterThanOrEqual(1)
    expect(result.durationMs).toBeGreaterThan(0)

    const product = result.data!

    // Nom du produit
    expect(product.name).toBeDefined()
    expect(product.name.length).toBeGreaterThan(3)
    console.log('Nom produit:', product.name)

    // URL
    expect(product.productUrl).toBe(url)

    // Images (gallery)
    expect(product.gallery).toBeDefined()
    expect(product.gallery.length).toBeGreaterThanOrEqual(1)
    console.log('Images trouvées:', product.gallery.length)
    product.gallery.forEach((img, i) => {
      expect(img).toMatch(/^https?:\/\//)
      console.log(`  Image ${i}:`, img.slice(0, 120))
    })

    // Prix usine
    if (product.price1688) {
      expect(product.price1688).toBeGreaterThan(0)
      console.log('Prix 1688:', product.price1688, 'CNY')
    }

    // Catégorie & tagline
    expect(product.category).toBeDefined()
    expect(product.tagline).toBeDefined()

    // Devise
    expect(product.currency).toBe('FCFA')
    expect(product.price1688Currency).toBe('CNY')

    // Poids & dimensions
    expect(product.weightKg).toBeGreaterThanOrEqual(0)
    expect(product.lengthCm).toBeGreaterThan(0)
    expect(product.widthCm).toBeGreaterThan(0)
    expect(product.heightCm).toBeGreaterThan(0)
    console.log('Poids:', product.weightKg, 'kg')
    console.log('Dimensions:', `${product.lengthCm}x${product.widthCm}x${product.heightCm}cm`)

    // Features
    expect(product.features).toBeDefined()
    expect(product.features.length).toBeGreaterThanOrEqual(0)
    console.log('Features:', product.features)

    // Spécifications
    expect(product.specifications).toBeDefined()
    console.log('Spécifications:', Object.keys(product.specifications).slice(0, 10))

    // Fournisseur
    if (product.supplier) {
      expect(product.supplier.name).toBeDefined()
      expect(product.supplier.location).toBeDefined()
      console.log('Fournisseur:', product.supplier.name, '-', product.supplier.location)
    }

    // Variantes
    if (product.variantGroups && product.variantGroups.length > 0) {
      console.log('Groupes de variantes:', product.variantGroups.length)
      product.variantGroups.forEach((vg) => {
        console.log(`  ${vg.name}:`, vg.variants.length, 'variantes')
      })
    }
  })

  test('détecte le blocage (CAPTCHA/cloudflare)', async () => {
    // Ce test peut être lancé manuellement si on suspecte un blocage
    const url = 'https://detail.1688.com/offer/860338935387.html'
    const result = await scrape1688WithBrowser(url)

    if (!result.success) {
      console.log('Blocage détecté:', result.error)
      expect(result.error).toBeDefined()
    } else {
      test.skip()
    }
  })
})
