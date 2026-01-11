import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { connectMongoose } from '@/lib/mongoose'
import Workflow from '@/lib/models/Workflow'

// Vérification d'authentification
async function verifyAuth(request: NextRequest): Promise<{ authenticated: boolean; role?: string; userId?: string }> {
  const token = request.cookies.get('auth-token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '')
  
  if (!token) return { authenticated: false }
  
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key')
    const { payload } = await jwtVerify(token, secret)
    return { 
      authenticated: true, 
      role: String(payload.role || '').toUpperCase(),
      userId: payload.userId as string
    }
  } catch {
    return { authenticated: false }
  }
}

export async function GET(request: NextRequest) {
  try {
    // SÉCURITÉ: Vérifier l'authentification
    const auth = await verifyAuth(request)
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    await connectMongoose()
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const workflows = await Workflow.find(projectId ? { projectId } : {}).sort({ createdAt: -1 }).lean()
    return NextResponse.json({ success: true, workflows })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur liste workflows' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // SÉCURITÉ: Vérifier l'authentification et le rôle admin
    const auth = await verifyAuth(request)
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }
    if (auth.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
    }

    await connectMongoose()
    const body = await request.json()
    const { projectId, serviceType, steps } = body || {}
    if (!projectId || !serviceType || !steps || steps.length === 0) return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    const wf = await Workflow.create({ projectId, serviceType, steps, currentStep: steps[0].id })
    return NextResponse.json({ success: true, workflow: wf })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur création workflow' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // SÉCURITÉ: Vérifier l'authentification
    const auth = await verifyAuth(request)
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    }

    await connectMongoose()
    const body = await request.json()
    const { id, stepId, action } = body || {}
    if (!id || !stepId || !action) return NextResponse.json({ error: 'Champs requis' }, { status: 400 })
    const wf = await Workflow.findById(id)
    if (!wf) return NextResponse.json({ error: 'Workflow introuvable' }, { status: 404 })

    const stepsAny = ((wf as any).steps || []) as any[]
    const step = stepsAny.find((s: any) => s?.id === stepId)
    if (!step) return NextResponse.json({ error: 'Étape introuvable' }, { status: 404 })

    if (action === 'start') (step as any).status = 'in_progress'
    if (action === 'complete') (step as any).status = 'completed'

    const completed = stepsAny.filter((s: any) => s.status === 'completed').length
    ;(wf as any).progress = Math.round((completed / stepsAny.length) * 100)
    const nextPending = stepsAny.find((s: any) => s.status === 'pending' && s.dependencies.every((d: string) => stepsAny.find((x: any) => x.id === d)?.status === 'completed'))
    if (nextPending) (wf as any).currentStep = nextPending.id

    if ((wf as any).progress >= 100) {
      (wf as any).status = 'completed'
      ;(wf as any).actualEndDate = new Date()
    }

    await wf.save()
    return NextResponse.json({ success: true, workflow: wf })
  } catch (e) {
    return NextResponse.json({ error: 'Erreur mise à jour workflow' }, { status: 500 })
  }
}
