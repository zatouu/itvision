import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import MaintenanceReport from '@/lib/models/MaintenanceReport'
import jwt from 'jsonwebtoken'

function getAdminToken(request: NextRequest): any {
  const token = request.cookies.get('admin-auth-token')?.value 
              || request.cookies.get('auth-token')?.value 
              || request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) throw new Error('Token manquant')
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
  if (decoded.role !== 'admin' && decoded.role !== 'supervisor') {
    throw new Error('Accès non autorisé')
  }
  return decoded
}

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    getAdminToken(request)

    const [pending, validated, rejected, published, avgValidationTimeAgg] = await Promise.all([
      MaintenanceReport.countDocuments({ status: 'pending_validation' }),
      MaintenanceReport.countDocuments({ status: 'validated' }),
      MaintenanceReport.countDocuments({ status: 'rejected' }),
      MaintenanceReport.countDocuments({ status: 'published' }),
      MaintenanceReport.aggregate([
        { $match: { 'validation.validatedAt': { $exists: true } } },
        { $group: { _id: null, avg: { $avg: '$analytics.adminValidationTime' } } }
      ])
    ])

    const avgValidationTime = Math.round((avgValidationTimeAgg[0]?.avg || 0) as number)
    const totalValidated = validated + published
    const approvalRate = totalValidated > 0 ? Math.round((totalValidated / (totalValidated + rejected)) * 100) : 0

    return NextResponse.json({
      success: true,
      analytics: {
        totalPending: pending,
        avgValidationTime,
        approvalRate,
        urgentReports: 0
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Accès non autorisé' }, { status: 401 })
  }
}


