import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string || 'general'
    
    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      )
    }

    // Vérifier le type de fichier
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Type de fichier non autorisé' },
        { status: 400 }
      )
    }

    // Vérifier la taille (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux (5MB max)' },
        { status: 400 }
      )
    }

    // Créer le nom de fichier unique
    const timestamp = Date.now()
    const randomString = crypto.randomUUID().replace(/-/g, '').substring(0, 13)
    const extension = path.extname(file.name)
    const filename = `${timestamp}-${randomString}${extension}`

    // Créer le dossier de destination
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', type)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Sauvegarder le fichier
    const filepath = path.join(uploadDir, filename)
    const bytes = await file.arrayBuffer()
    await writeFile(filepath, new Uint8Array(bytes))

    // URL publique
    const publicUrl = `/uploads/${type}/${filename}`

    return NextResponse.json({
      success: true,
      filename,
      url: publicUrl,
      size: file.size,
      type: file.type
    })

  } catch (error) {
    console.error('Erreur upload:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload' },
      { status: 500 }
    )
  }
}