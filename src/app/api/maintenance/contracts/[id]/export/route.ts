import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import MaintenanceContract from '@/lib/models/MaintenanceContract'
import User from '@/lib/models/User'
import { generateMaintenanceContractDocx, generateMaintenanceContractPdf } from '@/lib/contracts/export'
import { jwtVerify } from 'jose'

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await verifyAdmin(request)
    await connectMongoose()

    const { id } = await params
    const format = (request.nextUrl.searchParams.get('format') || 'pdf').toLowerCase()

    const contract = await MaintenanceContract.findById(id)
      .populate('clientId', 'name company email phone contactPerson address')
      .populate('projectId', 'name address')
      .populate('preferredTechnicians', 'name email phone')
      .lean() as any

    if (!contract) {
      return NextResponse.json({ error: 'Contrat introuvable' }, { status: 404 })
    }

    const clientUser =
      (await User.findById(contract.clientId).lean() as any) ||
      (contract.clientId as unknown as Record<string, any>)

    const exportData = {
      contractNumber: contract.contractNumber,
      name: contract.name,
      type: contract.type,
      status: contract.status,
      client: {
        name: clientUser?.name || '',
        company: clientUser?.company || clientUser?.name,
        address: clientUser?.address,
        email: clientUser?.email,
        phone: clientUser?.phone,
        contactPerson: clientUser?.contactPerson
      },
      project: contract.projectId
        ? {
            name: (contract.projectId as any)?.name,
            address: (contract.projectId as any)?.address
          }
        : undefined,
      startDate: contract.startDate?.toISOString(),
      endDate: contract.endDate?.toISOString(),
      paymentTerms: contract.paymentTerms || contract.specialConditions,
      coverage: {
        responseTime: contract.coverage?.responseTime,
        supportHours: contract.coverage?.supportHours,
        interventionsIncluded: contract.coverage?.interventionsIncluded
      },
      services: contract.services?.map((service: any) => ({
        name: service?.name,
        description: service?.description,
        frequency: service?.frequency
      })),
      equipment: contract.equipment?.map((equipment: any) => ({
        type: equipment?.type,
        quantity: equipment?.quantity,
        location: equipment?.location
      })),
      notes: contract.notes,
      preferredTechnicians: Array.isArray(contract.preferredTechnicians)
        ? (contract.preferredTechnicians as any[]).map((tech) => ({
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
          'Content-Disposition': `attachment; filename="${contract.contractNumber || contract.name}.docx"`
        }
      })
    }

    const buffer = generateMaintenanceContractPdf(exportData)
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${contract.contractNumber || contract.name}.pdf"`
      }
    })
  } catch (error) {
    console.error('Erreur export contrat maintenance:', error)
    const message = error instanceof Error ? error.message : 'Erreur serveur'
    const status = message.toLowerCase().includes('accès') ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

