/**
 * API Route - Gestion des Contrats de Maintenance
 */

import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import User from '@/lib/models/User'
import { emitUserNotification } from '@/lib/socket-emit'
import { requireApiUser, authErrorResponse } from '@/lib/api-auth'

function errorResponse(error: unknown, context: string) {
  const authRes = authErrorResponse(error)
  if (authRes) return authRes
  console.error(context, error)
  return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
}

// GET - Liste des contrats
export async function GET(request: NextRequest) {
  try {
    const { userId, role } = await requireApiUser(request)
    
    await connectMongoose()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const clientId = searchParams.get('clientId')

    const query: any = {}
    
    // Si client, filtrer par son ID
    if (role === 'CLIENT') {
      query.clientId = userId
    } else if (clientId && role === 'ADMIN') {
      query.clientId = clientId
    }
    
    if (status && status !== 'all') {
      query.status = status
    }

    const contracts = await MaintenanceContract.find(query)
      .populate('clientId', 'name email company phone')
      .populate('projectId', 'name address')
      .populate('preferredTechnicians', 'name email phone')
      .sort({ createdAt: -1 })
      .lean()

    // Vérifier les contrats proches de l'expiration
    const now = new Date()
    const contractsWithFlags = contracts.map((contract: any) => {
      const daysUntilExpiration = Math.floor((new Date(contract.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return {
        ...contract,
        _id: contract._id.toString(),
        daysUntilExpiration,
        isNearExpiration: daysUntilExpiration <= 60 && daysUntilExpiration > 0,
        isExpired: daysUntilExpiration <= 0,
        usageRate: contract.coverage.interventionsIncluded > 0 
          ? (contract.coverage.interventionsUsed / contract.coverage.interventionsIncluded) * 100 
          : 0
      }
    })

    return NextResponse.json({
      success: true,
      contracts: contractsWithFlags
    })
  } catch (error) {
    return errorResponse(error, 'Erreur récupération contrats:')
  }
}

// POST - Créer un contrat
export async function POST(request: NextRequest) {
  try {
    const { userId, role } = await requireApiUser(request)
    
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
    }

    await connectMongoose()

    const body = await request.json()
    
    let equipmentPayload = body.equipment
    if (typeof equipmentPayload === 'string') {
      try {
        equipmentPayload = JSON.parse(equipmentPayload)
      } catch {
        equipmentPayload = []
      }
    }
    const normalizedEquipment = Array.isArray(equipmentPayload)
      ? equipmentPayload.map((item: any) => ({
          type: item?.type || 'Équipement',
          quantity: Number(item?.quantity) || 0,
          location: item?.location || '',
          serialNumbers: Array.isArray(item?.serialNumbers) ? item.serialNumbers : []
        }))
      : []

    const servicesPayload = Array.isArray(body.services)
      ? body.services.map((service: any) => ({
          name: service?.name || 'Service',
          description: service?.description || '',
          frequency: service?.frequency || ''
        }))
      : []

    const contract = await MaintenanceContract.create({
      ...body,
      equipment: normalizedEquipment,
      services: servicesPayload,
      preferredTechnicians: Array.isArray(body.preferredTechnicians)
        ? body.preferredTechnicians
        : [],
      status: body.status || 'draft',
      history: [{
        date: new Date(),
        action: 'Contrat créé',
        performedBy: userId
      }]
    })

    // Notifier le client
    if (body.status === 'active' && body.clientId) {
      emitUserNotification(body.clientId, {
        type: 'success',
        title: 'Nouveau Contrat de Maintenance',
        message: `Votre contrat ${contract.name} est maintenant actif`,
        data: { contractId: contract._id.toString() }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Contrat créé avec succès',
      contract: {
        _id: contract._id.toString(),
        contractNumber: contract.contractNumber,
        name: contract.name,
        status: contract.status
      }
    })
  } catch (error) {
    return errorResponse(error, 'Erreur création contrat:')
  }
}

// PATCH - Mettre à jour un contrat
export async function PATCH(request: NextRequest) {
  try {
    const { userId, role } = await requireApiUser(request)
    
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Accès réservé aux administrateurs' }, { status: 403 })
    }

    await connectMongoose()

    const body = await request.json()
    const { contractId, ...updates } = body

    const contract = await MaintenanceContract.findById(contractId)
    if (!contract) {
      return NextResponse.json({ error: 'Contrat non trouvé' }, { status: 404 })
    }

    // Ajouter à l'historique
    contract.history.push({
      date: new Date(),
      action: `Contrat mis à jour`,
      performedBy: userId as any,
      note: JSON.stringify(updates)
    })

    Object.assign(contract, updates)
    await contract.save()

    return NextResponse.json({
      success: true,
      message: 'Contrat mis à jour'
    })
  } catch (error) {
    return errorResponse(error, 'Erreur mise à jour contrat:')
  }
}



