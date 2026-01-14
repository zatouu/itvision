import { NextRequest, NextResponse } from 'next/server'
import { GroupOrder } from '@/lib/models/GroupOrder'
import { connectDB } from '@/lib/db'
import { notifyDeadlineReminder } from '@/lib/group-order-notifications'

/**
 * API pour envoyer les rappels de deadline
 * À appeler via un cron job quotidien
 * 
 * Envoie des rappels:
 * - 3 jours avant la deadline
 * - 1 jour avant la deadline
 * 
 * Usage: GET /api/group-orders/cron/reminders
 * Ou avec un cron externe: curl -X GET https://your-domain/api/group-orders/cron/reminders?secret=YOUR_CRON_SECRET
 */
export async function GET(req: NextRequest) {
  try {
    // Vérification du secret pour les appels externes (optionnel)
    const { searchParams } = new URL(req.url)
    const secret = searchParams.get('secret')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && secret !== cronSecret) {
      return NextResponse.json(
        { success: false, error: 'Non autorisé' },
        { status: 401 }
      )
    }
    
    await connectDB()
    
    const now = new Date()
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const oneDayFromNow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000)
    
    // Trouver les achats groupés ouverts avec deadline dans 3 jours
    const groupsThreeDays = await GroupOrder.find({
      status: 'open',
      deadline: {
        $gte: new Date(threeDaysFromNow.setHours(0, 0, 0, 0)),
        $lt: new Date(threeDaysFromNow.setHours(23, 59, 59, 999))
      }
    }).lean()
    
    // Trouver les achats groupés ouverts avec deadline dans 1 jour
    const groupsOneDay = await GroupOrder.find({
      status: 'open',
      deadline: {
        $gte: new Date(oneDayFromNow.setHours(0, 0, 0, 0)),
        $lt: new Date(oneDayFromNow.setHours(23, 59, 59, 999))
      }
    }).lean()
    
    let sentCount = 0
    const errors: string[] = []
    
    // Envoyer rappels 3 jours
    for (const group of groupsThreeDays as any[]) {
      try {
        const participants = group.participants.map((p: any) => ({
          name: p.name, email: p.email, phone: p.phone, qty: p.qty, unitPrice: p.unitPrice, totalAmount: p.totalAmount
        }))
        const groupData = {
          groupId: group.groupId,
          product: group.product,
          currentQty: group.currentQty,
          targetQty: group.targetQty,
          currentUnitPrice: group.currentUnitPrice,
          deadline: group.deadline
        }
        await notifyDeadlineReminder(participants, groupData, 3)
        sentCount++
        console.log(`[CRON] Rappel 3j envoyé pour ${group.groupId}`)
      } catch (error) {
        errors.push(`${group.groupId}: ${error}`)
      }
    }
    
    // Envoyer rappels 1 jour
    for (const group of groupsOneDay as any[]) {
      try {
        const participants = group.participants.map((p: any) => ({
          name: p.name, email: p.email, phone: p.phone, qty: p.qty, unitPrice: p.unitPrice, totalAmount: p.totalAmount
        }))
        const groupData = {
          groupId: group.groupId,
          product: group.product,
          currentQty: group.currentQty,
          targetQty: group.targetQty,
          currentUnitPrice: group.currentUnitPrice,
          deadline: group.deadline
        }
        await notifyDeadlineReminder(participants, groupData, 1)
        sentCount++
        console.log(`[CRON] Rappel 1j envoyé pour ${group.groupId}`)
      } catch (error) {
        errors.push(`${group.groupId}: ${error}`)
      }
    }
    
    // Mettre à jour les achats expirés
    const expiredResult = await GroupOrder.updateMany(
      {
        status: 'open',
        deadline: { $lt: now }
      },
      {
        $set: { status: 'cancelled', internalNotes: 'Expiré automatiquement - deadline dépassée' }
      }
    )
    
    return NextResponse.json({
      success: true,
      message: 'Rappels envoyés',
      stats: {
        threeDaysReminders: groupsThreeDays.length,
        oneDayReminders: groupsOneDay.length,
        totalSent: sentCount,
        expiredCancelled: expiredResult.modifiedCount,
        errors: errors.length > 0 ? errors : undefined
      }
    })
    
  } catch (error) {
    console.error('Erreur cron rappels:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'envoi des rappels' },
      { status: 500 }
    )
  }
}
