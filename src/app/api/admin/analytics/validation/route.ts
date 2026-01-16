import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import MaintenanceReport from '@/lib/models/MaintenanceReport'
import { requireAdminApi } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const auth = await requireAdminApi(request, ['ADMIN', 'SUPER_ADMIN', 'SUPERVISOR'])
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

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


