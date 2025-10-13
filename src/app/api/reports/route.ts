import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import MaintenanceReport from '@/lib/models/MaintenanceReport'
import { connectMongoose } from '@/lib/mongoose'

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    const session = await getServerSession()
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      site,
      clientName,
      clientContact,
      interventionDate,
      startTime,
      endTime,
      duration,
      initialObservations,
      problemDescription,
      problemSeverity,
      tasksPerformed,
      results,
      recommendations,
      technicianSignature,
      clientSignature,
      clientTitle,
      gpsLatitude,
      gpsLongitude,
      status
    } = body

    // Validation des champs requis
    if (!site || !clientName || !initialObservations || !problemDescription) {
      return NextResponse.json(
        { error: 'Champs requis manquants' },
        { status: 400 }
      )
    }

    // Créer le rapport (reportId auto via middleware Mongoose)
    const report = await MaintenanceReport.create({
      technicianId: session.user.id,
      site,
      clientName,
      clientContact,
      interventionDate: new Date(interventionDate),
      startTime,
      endTime,
      duration,
      initialObservations,
      problemDescription,
      problemSeverity: (problemSeverity?.toLowerCase() || 'medium'),
      tasksPerformed,
      results: results || '',
      recommendations,
      signatures: {
        technician: technicianSignature ? { signature: technicianSignature, name: session.user.username, timestamp: new Date() } : undefined,
        client: clientSignature ? { signature: clientSignature, name: clientTitle || '', title: clientTitle || '', timestamp: new Date() } : undefined
      },
      gpsLocation: (gpsLatitude && gpsLongitude) ? { lat: parseFloat(gpsLatitude), lng: parseFloat(gpsLongitude), accuracy: 0, timestamp: new Date() } : undefined,
      status: (status?.toLowerCase() || 'draft')
    })

    return NextResponse.json({
      success: true,
      report
    }, { status: 201 })

  } catch (error) {
    console.error('Erreur création rapport:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    const session = await getServerSession()
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const technicianId = searchParams.get('technicianId')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Construire les filtres
    const query: any = {}
    if (status) query.status = status.toLowerCase()
    if (technicianId) {
      query.technicianId = technicianId
    } else if (session.user.role === 'TECHNICIAN') {
      query.technicianId = session.user.id
    }

    const [reports, total] = await Promise.all([
      MaintenanceReport.find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      MaintenanceReport.countDocuments(query)
    ])

    return NextResponse.json({
      success: true,
      reports,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })

  } catch (error) {
    console.error('Erreur récupération rapports:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}