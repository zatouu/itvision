import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import ProductQuestion from '@/lib/models/ProductQuestion'
import { requireRole } from '@/lib/auth-server'
import { z } from 'zod'

const patchSchema = z.object({
  status: z.enum(['pending', 'published', 'rejected']).optional(),
  answer: z.string().min(1).max(2000).optional(),
})

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(['ADMIN', 'SUPER_ADMIN', 'PRODUCT_MANAGER'], req)
    if (!auth) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    await connectMongoose()
    const { id } = await context.params
    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues.map((e: any) => `${e.path?.join('.')}: ${e.message}`).join(', ') }, { status: 400 })
    }

    const q = await ProductQuestion.findById(id)
    if (!q) return NextResponse.json({ error: 'Question introuvable' }, { status: 404 })

    if (parsed.data.status !== undefined) {
      q.status = parsed.data.status
      q.isPublished = parsed.data.status === 'published'
    }

    if (parsed.data.answer !== undefined) {
      q.answer = parsed.data.answer.trim()
      q.answeredBy = auth.user?.name || auth.user?.email || 'admin'
      q.answeredByRole = auth.user?.role || 'ADMIN'
      q.answeredAt = new Date()
      q.status = 'published'
      q.isPublished = true
    }

    await q.save()

    return NextResponse.json({ success: true, question: q })
  } catch (error) {
    console.error('PATCH /api/admin/reviews/questions/[id] error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
