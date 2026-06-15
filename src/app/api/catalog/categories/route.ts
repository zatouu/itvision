import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ProductCategory from '@/lib/models/ProductCategory'

export async function GET() {
  try {
    await connectMongoose()
    const items = await ProductCategory.find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .lean()
    return NextResponse.json({ success: true, items })
  } catch (error) {
    console.error('GET /api/catalog/categories error', error)
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
  }
}
