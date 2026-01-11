import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

// ============================================================================
// API - AVIS PRODUITS AVEC MÉDIAS
// ============================================================================
// 
// CRUD complet pour les avis clients avec support upload images/vidéos.
//
// GET    /api/products/[id]/reviews - Liste des avis avec pagination
// POST   /api/products/[id]/reviews - Créer un nouvel avis (auth requise)
// ============================================================================

interface ReviewMedia {
  type: 'image' | 'video'
  url: string
  thumbnail?: string
}

interface Review {
  id: string
  productId: string
  userId: string
  userName: string
  userAvatar?: string
  rating: number
  title?: string
  comment: string
  media: ReviewMedia[]
  verified: boolean
  helpful: number
  notHelpful: number
  createdAt: string
  updatedAt: string
  reply?: {
    message: string
    createdAt: string
  }
}

// ============================================================================
// GET - LISTE DES AVIS
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params
    const { searchParams } = new URL(request.url)
    
    // Paramètres de pagination et filtrage
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)
    const filter = searchParams.get('filter') || 'all' // all, with_media, 5star, 4star_plus
    const sort = searchParams.get('sort') || 'recent' // recent, helpful, rating_high, rating_low
    
    // TODO: Remplacer par une vraie requête MongoDB
    // const reviews = await ReviewModel.find({ productId })
    //   .sort(sortCriteria)
    //   .skip((page - 1) * limit)
    //   .limit(limit)
    
    // Données mock pour la démo
    const mockReviews: Review[] = [
      {
        id: 'rev-001',
        productId,
        userId: 'user-001',
        userName: 'Jean Diallo',
        rating: 5,
        title: 'Excellent produit, installation parfaite',
        comment: 'J\'ai commandé ce produit pour mon entreprise et je suis très satisfait. L\'équipe IT Vision a assuré une installation rapide et professionnelle. Le produit fonctionne parfaitement depuis 3 mois.',
        media: [
          { type: 'image', url: '/uploads/reviews/rev-001-1.jpg' },
          { type: 'image', url: '/uploads/reviews/rev-001-2.jpg' }
        ],
        verified: true,
        helpful: 24,
        notHelpful: 2,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        reply: {
          message: 'Merci Jean pour votre confiance ! Nous sommes ravis que le produit réponde à vos attentes. N\'hésitez pas à nous contacter pour tout besoin de maintenance.',
          createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
        }
      },
      {
        id: 'rev-002',
        productId,
        userId: 'user-002',
        userName: 'Fatou Sow',
        rating: 4,
        title: 'Bon rapport qualité-prix',
        comment: 'Produit conforme à la description. La livraison a pris un peu plus de temps que prévu mais le support client m\'a tenu informée. Je recommande.',
        media: [],
        verified: true,
        helpful: 15,
        notHelpful: 1,
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'rev-003',
        productId,
        userId: 'user-003',
        userName: 'Moussa Ndiaye',
        rating: 5,
        title: 'Service client au top !',
        comment: 'Installation réalisée en moins de 2 heures. Le technicien était très professionnel et m\'a expliqué le fonctionnement en détail. Vraiment satisfait !',
        media: [
          { type: 'video', url: '/uploads/reviews/rev-003-video.mp4', thumbnail: '/uploads/reviews/rev-003-thumb.jpg' }
        ],
        verified: true,
        helpful: 32,
        notHelpful: 0,
        createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
    
    // Appliquer les filtres
    let filteredReviews = [...mockReviews]
    
    switch (filter) {
      case 'with_media':
        filteredReviews = filteredReviews.filter(r => r.media.length > 0)
        break
      case '5star':
        filteredReviews = filteredReviews.filter(r => r.rating === 5)
        break
      case '4star_plus':
        filteredReviews = filteredReviews.filter(r => r.rating >= 4)
        break
    }
    
    // Appliquer le tri
    switch (sort) {
      case 'helpful':
        filteredReviews.sort((a, b) => b.helpful - a.helpful)
        break
      case 'rating_high':
        filteredReviews.sort((a, b) => b.rating - a.rating)
        break
      case 'rating_low':
        filteredReviews.sort((a, b) => a.rating - b.rating)
        break
      default: // recent
        filteredReviews.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
    }
    
    // Calculer les statistiques
    const totalReviews = mockReviews.length
    const averageRating = mockReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
    const ratingDistribution = {
      5: mockReviews.filter(r => r.rating === 5).length,
      4: mockReviews.filter(r => r.rating === 4).length,
      3: mockReviews.filter(r => r.rating === 3).length,
      2: mockReviews.filter(r => r.rating === 2).length,
      1: mockReviews.filter(r => r.rating === 1).length
    }
    const totalPhotos = mockReviews.reduce((sum, r) => 
      sum + r.media.filter(m => m.type === 'image').length, 0
    )
    const totalVideos = mockReviews.reduce((sum, r) => 
      sum + r.media.filter(m => m.type === 'video').length, 0
    )
    
    // Pagination
    const start = (page - 1) * limit
    const paginatedReviews = filteredReviews.slice(start, start + limit)
    
    return NextResponse.json({
      success: true,
      data: {
        reviews: paginatedReviews,
        stats: {
          totalReviews,
          averageRating: Math.round(averageRating * 10) / 10,
          ratingDistribution,
          totalPhotos,
          totalVideos,
          verifiedCount: mockReviews.filter(r => r.verified).length
        },
        pagination: {
          page,
          limit,
          totalPages: Math.ceil(filteredReviews.length / limit),
          totalResults: filteredReviews.length,
          hasNext: start + limit < filteredReviews.length,
          hasPrev: page > 1
        }
      }
    })
    
  } catch (error) {
    console.error('[API] Reviews GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la récupération des avis' },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST - CRÉER UN AVIS
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params
    
    // Vérifier l'authentification
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentification requise', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }
    
    const formData = await request.formData()
    
    // Extraire les données du formulaire
    const rating = parseInt(formData.get('rating') as string)
    const title = formData.get('title') as string | null
    const comment = formData.get('comment') as string
    
    // Validation
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'Note invalide (1-5 requis)', code: 'INVALID_RATING' },
        { status: 400 }
      )
    }
    
    if (!comment || comment.trim().length < 10) {
      return NextResponse.json(
        { success: false, error: 'Commentaire trop court (min 10 caractères)', code: 'COMMENT_TOO_SHORT' },
        { status: 400 }
      )
    }
    
    if (comment.length > 2000) {
      return NextResponse.json(
        { success: false, error: 'Commentaire trop long (max 2000 caractères)', code: 'COMMENT_TOO_LONG' },
        { status: 400 }
      )
    }
    
    // Traiter les médias uploadés
    const mediaFiles: File[] = []
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('media_') && value instanceof File) {
        mediaFiles.push(value)
      }
    }
    
    // Limite de 5 fichiers max
    if (mediaFiles.length > 5) {
      return NextResponse.json(
        { success: false, error: 'Maximum 5 fichiers autorisés', code: 'TOO_MANY_FILES' },
        { status: 400 }
      )
    }
    
    // Uploader les médias
    const uploadedMedia: ReviewMedia[] = []
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'reviews')
    await mkdir(uploadDir, { recursive: true })
    
    for (const file of mediaFiles) {
      // Vérifier le type
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      
      if (!isImage && !isVideo) {
        continue // Ignorer les fichiers non supportés
      }
      
      // Vérifier la taille (images: 5MB, vidéos: 50MB)
      const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024
      if (file.size > maxSize) {
        continue // Ignorer les fichiers trop gros
      }
      
      // Sauvegarder le fichier
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const ext = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg')
      const filename = `review_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`
      const filepath = path.join(uploadDir, filename)
      
      await writeFile(filepath, buffer)
      
      uploadedMedia.push({
        type: isVideo ? 'video' : 'image',
        url: `/uploads/reviews/${filename}`,
        thumbnail: isVideo ? undefined : `/uploads/reviews/${filename}`
      })
    }
    
    // Créer l'avis
    const reviewId = `rev-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
    const now = new Date().toISOString()
    
    const newReview: Review = {
      id: reviewId,
      productId,
      userId: (session.user as any).id || 'anonymous',
      userName: session.user.name || 'Client IT Vision',
      userAvatar: (session.user as any).image || undefined,
      rating,
      title: title?.trim() || undefined,
      comment: comment.trim(),
      media: uploadedMedia,
      verified: false, // Sera vérifié après validation d'achat
      helpful: 0,
      notHelpful: 0,
      createdAt: now,
      updatedAt: now
    }
    
    // TODO: Sauvegarder en base MongoDB
    // await ReviewModel.create(newReview)
    
    // TODO: Vérifier si l'utilisateur a acheté ce produit pour marquer comme "verified"
    // const hasPurchased = await OrderModel.exists({ userId: newReview.userId, 'items.productId': productId })
    // if (hasPurchased) newReview.verified = true
    
    return NextResponse.json({
      success: true,
      data: newReview,
      message: 'Avis publié avec succès'
    }, { status: 201 })
    
  } catch (error) {
    console.error('[API] Reviews POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création de l\'avis' },
      { status: 500 }
    )
  }
}
