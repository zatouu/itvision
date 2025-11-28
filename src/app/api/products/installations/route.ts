import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import MaintenanceActivity from '@/lib/models/MaintenanceActivity'

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
      status: 'open'
    })

    return NextResponse.json({
      success: true,
      activityId: activity._id.toString()
    })
  } catch (error) {
    console.error('Erreur création activité installation produit:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}



