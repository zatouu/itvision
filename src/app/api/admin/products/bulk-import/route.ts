/**
 * API Route - Import en masse de produits
 * 
 * POST /api/admin/products/bulk-import
 * Body: FormData avec:
 * - file: CSV/Excel
 * - imagesZip: (optionnel) Archive ZIP avec images
 * 
 * Format CSV attendu:
 * name,description,baseCost,sourceUrl,category,sku,images
 * "Répéteur WiFi","Description...",45.50,"https://...","reseaux","REP-001","image1.jpg,image2.jpg"
 * 
 * Les images dans le ZIP doivent avoir les noms référencés dans la colonne images
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthServer } from '@/lib/auth-server'
import connectDB from '@/lib/mongodb'
import Product from '@/lib/models/Product'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { parse } from 'csv-parse/sync'
import AdmZip from 'adm-zip'
import { CatalogProducer } from '@/lib/kafka'

interface ProductRow {
  name: string
  description?: string
  baseCost: number
  sourceUrl?: string
  category?: string
  sku?: string
  images?: string // comma-separated filenames
  variants?: string // JSON string
  tags?: string // comma-separated
}

export async function POST(req: NextRequest) {
  try {
    // Vérifier authentification admin
    const authResult = await verifyAuthServer(req)
    if (!authResult.isAuthenticated || authResult.user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Accès refusé - Admin requis' },
        { status: 403 }
      )
    }

    const formData = await req.formData()
    const csvFile = formData.get('file') as File
    const imagesZip = formData.get('imagesZip') as File | null

    if (!csvFile) {
      return NextResponse.json(
        { error: 'Fichier CSV requis' },
        { status: 400 }
      )
    }

    // Parser le CSV
    const csvContent = await csvFile.text()
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as ProductRow[]

    console.log(`[Bulk Import] ${records.length} produits à importer`)

    // Extraire les images du ZIP si fourni
    const imageFiles = new Map<string, Buffer>()
    if (imagesZip) {
      try {
        const zipBuffer = Buffer.from(await imagesZip.arrayBuffer())
        const zip = new AdmZip(zipBuffer)
        const zipEntries = zip.getEntries()

        for (const entry of zipEntries) {
          if (!entry.isDirectory && /\.(jpg|jpeg|png|webp|gif)$/i.test(entry.entryName)) {
            const filename = entry.entryName.split('/').pop() || entry.entryName
            imageFiles.set(filename, entry.getData())
            console.log(`[Bulk Import] Image extraite: ${filename}`)
          }
        }

        console.log(`[Bulk Import] ${imageFiles.size} images extraites du ZIP`)
      } catch (error) {
        console.error('[Bulk Import] Erreur extraction ZIP:', error)
        return NextResponse.json(
          { error: 'Erreur lors de l\'extraction du ZIP' },
          { status: 400 }
        )
      }
    }

    // Créer le dossier uploads si nécessaire
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'products')
    await mkdir(uploadDir, { recursive: true })

    await connectDB()

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; product: string; error: string }>,
    }

    // Importer chaque produit
    for (let i = 0; i < records.length; i++) {
      const row = records[i]
      const rowNumber = i + 2 // +2 car ligne 1 = headers, index commence à 0

      try {
        // Valider les champs requis
        if (!row.name || !row.baseCost) {
          throw new Error('name et baseCost sont requis')
        }

        // Traiter les images
        const productImages: string[] = []
        if (row.images) {
          const imageFilenames = row.images.split(',').map(s => s.trim())
          
          for (const filename of imageFilenames) {
            const imageBuffer = imageFiles.get(filename)
            if (imageBuffer) {
              // Générer un nom unique
              const timestamp = Date.now()
              const ext = filename.split('.').pop()
              const uniqueName = `${row.sku || `product-${timestamp}`}-${productImages.length}.${ext}`
              const imagePath = join(uploadDir, uniqueName)
              
              await writeFile(imagePath, imageBuffer)
              productImages.push(`/uploads/products/${uniqueName}`)
              console.log(`[Bulk Import] Image sauvegardée: ${uniqueName}`)
            } else {
              console.warn(`[Bulk Import] Image non trouvée dans le ZIP: ${filename}`)
            }
          }
        }

        // Parser les variants si JSON fourni
        let variants = []
        if (row.variants) {
          try {
            variants = JSON.parse(row.variants)
          } catch {
            console.warn(`[Bulk Import] Format variants invalide ligne ${rowNumber}`)
          }
        }

        // Parser les tags
        const tags = row.tags 
          ? row.tags.split(',').map(t => t.trim()).filter(Boolean)
          : []

        // Créer le produit
        const product = await Product.create({
          name: row.name,
          description: row.description || '',
          baseCost: parseFloat(String(row.baseCost)),
          sourceUrl: row.sourceUrl || '',
          category: row.category || 'general',
          sku: row.sku || `SKU-${Date.now()}-${i}`,
          images: productImages,
          variants,
          tags,
          status: 'active',
          stock: 0,
          isFeatured: false,
          isAvailable: true,
        })

        // Émettre événement Kafka
        try {
          await CatalogProducer.productCreated({
            productId: product._id.toString(),
            name: product.name,
            sourceUrl: product.sourceUrl,
            baseCost: product.baseCost,
            currency: 'CNY',
            categoryId: product.category,
            variants: product.variants.map((v: any) => ({
              variantId: v._id.toString(),
              sku: v.sku,
              price: v.price || product.baseCost,
              attributes: v.attributes || {},
            })),
          }, {
            userId: authResult.user?.id,
            source: 'bulk-import',
          })
        } catch (kafkaError) {
          console.warn('[Bulk Import] Kafka event failed (non-blocking):', kafkaError)
        }

        results.success++
        console.log(`[Bulk Import] ✅ Produit créé: ${row.name}`)

      } catch (error) {
        results.failed++
        results.errors.push({
          row: rowNumber,
          product: row.name || `Ligne ${rowNumber}`,
          error: error instanceof Error ? error.message : 'Erreur inconnue',
        })
        console.error(`[Bulk Import] ❌ Erreur ligne ${rowNumber}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import terminé: ${results.success} succès, ${results.failed} échecs`,
      data: results,
    })

  } catch (error) {
    console.error('[Bulk Import] Erreur globale:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'import en masse' },
      { status: 500 }
    )
  }
}

// GET: Télécharger un template CSV
export async function GET() {
  const template = `name,description,baseCost,sourceUrl,category,sku,images,tags
"Répéteur WiFi 5GHz","Amplificateur de signal sans fil double bande",45.50,"https://example.com/product","reseaux","REP-001","repeteur1.jpg,repeteur2.jpg","wifi,reseau"
"Caméra IP 4K","Caméra de surveillance extérieure étanche",89.99,"https://example.com/camera","surveillance","CAM-001","camera1.jpg,camera2.jpg,camera3.jpg","camera,4k,surveillance"
"Switch PoE 8 ports","Switch réseau avec Power over Ethernet",125.00,"https://example.com/switch","reseaux","SWT-001","switch1.jpg","reseau,poe,switch"`

  return new NextResponse(template, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="template-import-produits.csv"',
    },
  })
}
