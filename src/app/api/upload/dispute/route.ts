/**
 * API pour uploader des photos de litige
 * POST /api/upload/dispute
 */
import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('photos') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      )
    }

    if (files.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 fichiers autorisés' },
        { status: 400 }
      )
    }

    // Créer le dossier si nécessaire
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'disputes')
    await mkdir(uploadDir, { recursive: true })

    const urls: string[] = []

    for (const file of files) {
      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        continue
      }

      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        continue
      }

      // Générer un nom unique
      const ext = file.name.split('.').pop() || 'jpg'
      const fileName = `${uuidv4()}.${ext}`
      const filePath = path.join(uploadDir, fileName)

      // Sauvegarder le fichier
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer)

      // Ajouter l'URL publique
      urls.push(`/uploads/disputes/${fileName}`)
    }

    return NextResponse.json({ urls })

  } catch (error) {
    console.error('Erreur upload dispute:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload' },
      { status: 500 }
    )
  }
}

// Configuration pour les uploads
export const config = {
  api: {
    bodyParser: false,
  },
}
