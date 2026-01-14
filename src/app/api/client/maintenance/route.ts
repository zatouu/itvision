/**
 * API Route Client - Mes Contrats de Maintenance
 */

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { connectMongoose } from '@/lib/mongoose'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import Intervention from '@/lib/models/Intervention'

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

    // Récupérer les contrats du client
    const contracts = await MaintenanceContract.find({ clientId: userId })
      .populate('projectId', 'name address')
      .sort({ status: 1, endDate: 1 })
      .lean()

    // Récupérer les interventions liées
    const contractIds = contracts.map((c: any) => c._id)
    const interventions = await Intervention.find({
      maintenanceContractId: { $in: contractIds }
    })
      .select('maintenanceContractId date status typeIntervention')
      .sort({ date: -1 })
      .lean()

    // Grouper les interventions par contrat
    const interventionsByContract = interventions.reduce((acc: any, int: any) => {
      const contractId = int.maintenanceContractId?.toString()
      if (contractId) {
        if (!acc[contractId]) acc[contractId] = []
        acc[contractId].push(int)
      }
      return acc
    }, {})

    // Enrichir les contrats avec les stats
    const now = new Date()
    const enrichedContracts = contracts.map((contract: any) => {
      const contractId = contract._id.toString()
      const contractInterventions = interventionsByContract[contractId] || []
      
      const daysUntilExpiration = Math.floor((new Date(contract.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      const usageRate = contract.coverage.interventionsIncluded > 0 
        ? (contract.coverage.interventionsUsed / contract.coverage.interventionsIncluded) * 100 
        : 0

      return {
        _id: contractId,
        contractNumber: contract.contractNumber,
        name: contract.name,
        type: contract.type,
        status: contract.status,
        startDate: contract.startDate,
        endDate: contract.endDate,
        annualPrice: contract.annualPrice,
        paymentFrequency: contract.paymentFrequency,
        coverage: contract.coverage,
        services: contract.services,
        equipment: contract.equipment,
        projectId: contract.projectId,
        daysUntilExpiration,
        isNearExpiration: daysUntilExpiration <= 60 && daysUntilExpiration > 0,
        isExpired: daysUntilExpiration <= 0,
        usageRate,
        interventionsRemaining: Math.max(0, contract.coverage.interventionsIncluded - contract.coverage.interventionsUsed),
        recentInterventions: contractInterventions.slice(0, 5),
        stats: contract.stats
      }
    })

    return NextResponse.json({
      success: true,
      contracts: enrichedContracts
    })
  } catch (error) {
    console.error('Erreur récupération contrats maintenance client:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    )
  }
}





