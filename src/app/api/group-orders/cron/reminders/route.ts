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
    
    // Bornes pour J+3 (début et fin de journée)
    const threeDayStart = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    threeDayStart.setHours(0, 0, 0, 0)
    const threeDayEnd = new Date(threeDayStart)
    threeDayEnd.setHours(23, 59, 59, 999)
    
    // Bornes pour J+1 (début et fin de journée)
    const oneDayStart = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000)
    oneDayStart.setHours(0, 0, 0, 0)
    const oneDayEnd = new Date(oneDayStart)
    oneDayEnd.setHours(23, 59, 59, 999)
    
    // Trouver les achats groupés ouverts avec deadline dans 3 jours
    const groupsThreeDays = await GroupOrder.find({
      status: 'open',
      deadline: { $gte: threeDayStart, $lt: threeDayEnd }
    }).lean()
    
    // Trouver les achats groupés ouverts avec deadline dans 1 jour
    const groupsOneDay = await GroupOrder.find({
      status: 'open',
      deadline: { $gte: oneDayStart, $lt: oneDayEnd }
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
