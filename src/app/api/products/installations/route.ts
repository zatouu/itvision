import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import MaintenanceActivity from '@/lib/models/MaintenanceActivity'

// Émettre une notification socket aux techniciens (si global.io disponible)
function notifyTechnicians(activity: any) {
  try {
    const io = (global as any).io
    if (io) {
      io.emit('new-installation-mission', {
        id: activity._id?.toString(),
        productName: activity.productName,
        clientName: activity.clientName,
        site: activity.site,
        date: activity.date,
        category: 'product_install'
      })
      console.log('📢 Notification envoyée aux techniciens pour nouvelle mission installation')
    }
  } catch (err) {
    console.error('Erreur notification socket techniciens:', err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      productId,
      productName,
      quantity,
      includeMaterials,
      preferredDate,
      notes,
      clientName,
      clientEmail,
      clientPhone,
      address
    } = body

    if (!productId || !productName || !clientName || !clientPhone) {
      return NextResponse.json(
        { error: 'Informations incomplètes pour planifier une installation' },
        { status: 400 }
      )
    }

    await connectMongoose()

    const parsedPreferredDate = preferredDate ? new Date(preferredDate) : undefined
    const activity = await MaintenanceActivity.create({
      category: 'product_install',
      clientName,
      clientContact: {
        name: clientName,
        email: clientEmail,
        phone: clientPhone,
        address
      },
      site: address,
      date: parsedPreferredDate || new Date(),
      isContractual: false,
      allowMarketplace: true,
      productId,
      productName,
      installationOptions: {
        includeMaterials: Boolean(includeMaterials),
        preferredDate: parsedPreferredDate,
        notes,
        quantity: quantity ? Number(quantity) : undefined
      },
      status: 'open',
      marketplaceReason: 'Installation produit depuis catalogue'
    })

    // Notifier les techniciens en temps réel
    notifyTechnicians(activity)

    return NextResponse.json({
      success: true,
      activityId: activity._id.toString(),
      message: 'Votre demande a été publiée. Les techniciens certifiés de votre zone seront notifiés.'
    })
  } catch (error) {
    console.error('Erreur création activité installation produit:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}



