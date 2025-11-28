import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import User from '@/lib/models/User'
import { generateMaintenanceContractDocx, generateMaintenanceContractPdf } from '@/lib/contracts/export'
import { jwtVerify } from 'jose'

type RouteContext = { params: Promise<{ id: string }> }

async function verifyAdmin(request: NextRequest) {
  const token =
    request.cookies.get('auth-token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) throw new Error('Non authentifié')
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-key')
  const { payload } = await jwtVerify(token, secret)
  if ((payload.role as string)?.toUpperCase() !== 'ADMIN') {
    throw new Error('Accès réservé aux administrateurs')
  }
  return { userId: payload.userId as string }
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await verifyAdmin(request)
    await connectMongoose()

    const { id } = await context.params
    const format = (request.nextUrl.searchParams.get('format') || 'pdf').toLowerCase()

    const contract = await MaintenanceContract.findById(id)
      .populate('clientId', 'name company email phone contactPerson address')
      .populate('projectId', 'name address')
      .populate('preferredTechnicians', 'name email phone')
      .lean()

    const contractRecord =
      contract && !Array.isArray(contract) ? (contract as Record<string, any>) : null

    if (!contractRecord) {
      return NextResponse.json({ error: 'Contrat introuvable' }, { status: 404 })
    }

    const clientUserRaw =
      (await User.findById(contractRecord.clientId).lean()) ||
      (contractRecord.clientId as unknown as Record<string, any>)
    const clientUser =
      clientUserRaw && !Array.isArray(clientUserRaw)
        ? (clientUserRaw as Record<string, any>)
        : null

    const exportData = {
      contractNumber: contractRecord.contractNumber,
      name: contractRecord.name,
      type: contractRecord.type,
      status: contractRecord.status,
      client: {
        name: clientUser?.name || '',
        company: clientUser?.company || clientUser?.name,
        address: clientUser?.address,
        email: clientUser?.email,
        phone: clientUser?.phone,
        contactPerson: clientUser?.contactPerson
      },
      project: contractRecord.projectId
        ? {
            name: (contractRecord.projectId as any)?.name,
            address: (contractRecord.projectId as any)?.address
          }
        : undefined,
      startDate: contractRecord.startDate?.toISOString(),
      endDate: contractRecord.endDate?.toISOString(),
      paymentTerms: contractRecord.paymentTerms || contractRecord.specialConditions,
      coverage: {
        responseTime: contractRecord.coverage?.responseTime,
        supportHours: contractRecord.coverage?.supportHours,
        interventionsIncluded: contractRecord.coverage?.interventionsIncluded
      },
      services: contractRecord.services?.map((service: any) => ({
        name: service?.name,
        description: service?.description,
        frequency: service?.frequency
      })),
      equipment: contractRecord.equipment?.map((equipment: any) => ({
        type: equipment?.type,
        quantity: equipment?.quantity,
        location: equipment?.location
      })),
      notes: contractRecord.notes,
      preferredTechnicians: Array.isArray(contractRecord.preferredTechnicians)
        ? (contractRecord.preferredTechnicians as any[]).map((tech) => ({
            _id: tech._id?.toString?.() || '',
            name: tech?.name || 'Technicien',
            email: tech?.email,
            phone: tech?.phone
          }))
        : undefined
    }

    if (format === 'docx') {
      const buffer = await generateMaintenanceContractDocx(exportData)
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type':
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="${contractRecord.contractNumber || contractRecord.name}.docx"`
        }
      })
    }

    const buffer = generateMaintenanceContractPdf(exportData)
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${contractRecord.contractNumber || contractRecord.name}.pdf"`
      }
    })
  } catch (error) {
    console.error('Erreur export contrat maintenance:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    const status = message.toLowerCase().includes('accès') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

