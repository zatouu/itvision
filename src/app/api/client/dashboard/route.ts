import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { connectMongoose } from '@/lib/mongoose'
import Project from '@/lib/models/Project'
import Quote from '@/lib/models/Quote'
import Intervention from '@/lib/models/Intervention'
import AdminQuote from '@/lib/models/AdminQuote'

interface DecodedToken {
  userId: string
  role: string
  email: string
}

async function verifyToken(request: NextRequest): Promise<DecodedToken> {
  const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
  
  if (!token) {
    throw new Error('Non authentifié')
  }

  const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key')
  const { payload } = await jwtVerify(token, secret)
  
  // Vérifier que les propriétés requises existent
  if (!payload.userId || !payload.role || !payload.email) {
    throw new Error('Token invalide')
  }
  
  return {
    userId: payload.userId as string,
    role: payload.role as string,
    email: payload.email as string
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId, role } = await verifyToken(request)
    
    if (role !== 'CLIENT') {
      return NextResponse.json({ error: 'Accès réservé aux clients' }, { status: 403 })
    }

    await connectMongoose()

    // Récupérer tous les projets du client
    const projects = await Project.find({ clientId: userId }).lean()
    
    // Récupérer les devis du client
    const quotes = await Quote.find({ clientId: userId }).lean()
    const adminQuotes = await AdminQuote.find({ 'client.id': userId }).lean()
    
    // Récupérer les interventions liées aux projets du client
    const projectIds = projects.map((p: any) => p._id.toString())
    const interventions = await Intervention.find({ 
      projectId: { $in: projectIds } 
    }).lean()

    // Calculer les KPIs
    const activeProjects = projects.filter((p: any) => 
      p.status === 'in_progress' || p.status === 'planning'
    ).length
    
    const completedProjects = projects.filter((p: any) => 
      p.status === 'completed'
    ).length
    
    const totalInvestment = projects.reduce((sum, p) => {
      return sum + (p.budget || 0)
    }, 0)
    
    const avgProgress = projects.length > 0
      ? Math.round(projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length)
      : 0

    const pendingQuotes = [...quotes, ...adminQuotes].filter(q => 
      q.status === 'pending' || q.status === 'draft'
    ).length

    const recentInterventions = interventions
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)

    // Activités récentes
    const activities: Array<{
      type: string
      title: string
      description: string
      date: any
      icon: string
    }> = []
    
    // Ajouter les projets récemment mis à jour
    projects
      .sort((a: any, b: any) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
      .slice(0, 3)
      .forEach((project: any) => {
        activities.push({
          type: 'project_update',
          title: 'Projet mis à jour',
          description: `${project.name} - ${project.currentPhase || project.status}`,
          date: project.updatedAt,
          icon: 'project'
        })
      })

    // Ajouter les interventions récentes
    recentInterventions.slice(0, 2).forEach((intervention: any) => {
      activities.push({
        type: 'intervention',
        title: 'Intervention effectuée',
        description: intervention.site || 'Intervention technique',
        date: intervention.date,
        icon: 'wrench'
      })
    })

    // Trier par date
    activities.sort((a: any, b: any) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    return NextResponse.json({
      success: true,
      data: {
        kpis: {
          activeProjects,
          completedProjects,
          totalInvestment,
          avgProgress,
          pendingQuotes,
          totalProjects: projects.length,
          recentInterventionsCount: recentInterventions.length
        },
        activeProjects: projects
          .filter((p: any) => p.status === 'in_progress')
          .slice(0, 5)
          .map((p: any) => ({
            _id: p._id.toString(),
            name: p.name,
            status: p.status,
            progress: p.progress || 0,
            currentPhase: p.currentPhase,
            address: p.address,
            startDate: p.startDate,
            budget: p.budget
          })),
        activities: activities.slice(0, 5)
      }
    })
  } catch (error) {
    console.error('Erreur dashboard client:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}

