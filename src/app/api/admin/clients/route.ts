import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { safeSearchRegex } from '@/lib/security-utils'
import Client from '@/lib/models/Client'
import User from '@/lib/models/User'
import { requireAuth } from '@/lib/jwt'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { emailService } from '@/lib/email-service'
import { getClientInvitationEmail } from '@/lib/email-templates'

function requireAdmin(request: NextRequest) {
  return requireAuth(request).then(({ role }) => {
    const r = String(role || '').toUpperCase()
    if (!['ADMIN', 'SUPER_ADMIN'].includes(r)) throw new Error('Accès non autorisé')
  })
}

export async function GET(request: NextRequest) {
  try {
    await connectMongoose()
    await requireAdmin(request)

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const company = (searchParams.get('company') || '').trim()
    const status = (searchParams.get('status') || '').trim()
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = parseInt(searchParams.get('skip') || '0')

    const query: any = {}
    if (q) {
      const searchRegex = safeSearchRegex(q)
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { company: searchRegex },
      ]
    }
    if (company) query.company = safeSearchRegex(company)
    if (status === 'active') query.isActive = true
    if (status === 'inactive') query.isActive = false

    const [clientsRaw, total, totalClients, activeClients, portalEnabledClients] = await Promise.all([
      Client.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Client.countDocuments(query),
      Client.countDocuments({}),
      Client.countDocuments({ isActive: true }),
      Client.countDocuments({ 'permissions.canAccessPortal': true })
    ])

    // Enrichir les clients avec les contrats actifs calculés
    const clients = clientsRaw.map((client: any) => ({
      ...client,
      activeContracts: Array.isArray(client.contracts)
        ? client.contracts.filter((contract: any) => {
            const isActive = contract.status === 'active'
            const notExpired = !contract.endDate || new Date(contract.endDate) > new Date()
            return isActive && notExpired
          }).map((contract: any) => ({
            contractId: contract.contractId,
            type: contract.type
          }))
        : []
    }))

    return NextResponse.json({ 
      success: true, 
      clients, 
      total, 
      skip, 
      limit,
      metrics: {
        totalClients,
        activeClients,
        portalEnabledClients
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur'
    const status = message.includes('auth') || message.includes('autorisé') ? 401 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectMongoose()
    await requireAdmin(request)

    const body = await request.json()
    const { name, email, phone, company, address, city, country, canAccessPortal, notes, tags, category, rating } = body

    // Validation
    if (!name || !email || !phone) {
      return NextResponse.json({ 
        success: false, 
        error: 'Les champs nom, email et téléphone sont obligatoires' 
      }, { status: 400 })
    }

    // Vérifier si l'email existe déjà
    const existingClient = await Client.findOne({ email })
    if (existingClient) {
      return NextResponse.json({ 
        success: false, 
        error: 'Un client avec cet email existe déjà' 
      }, { status: 400 })
    }

    // Générer un clientId unique basé sur le max des IDs existants
    const lastClient = await Client.findOne().sort({ clientId: -1 }).select('clientId').lean()
    let nextNumber = 1
    if (lastClient?.clientId) {
      const match = lastClient.clientId.match(/CL(\d+)/)
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1
      }
    }
    const clientId = `CL${String(nextNumber).padStart(4, '0')}`

    // Créer le client
    const client = await Client.create({
      clientId,
      name,
      email,
      phone,
      company: company || '',
      address: address || '',
      city: city || '',
      country: country || 'Sénégal',
      isActive: true,
      permissions: {
        canAccessPortal: canAccessPortal ?? true
      },
      notes: notes || '',
      tags: tags || [],
      category: category || '',
      rating: rating || 0,
      lastContact: new Date()
    })

    // Création automatique du compte utilisateur si l'accès portail est activé
    if (canAccessPortal) {
      try {
        const userExists = await User.findOne({ email })
        if (!userExists) {
          // Générer un token de réinitialisation de mot de passe
          const resetToken = crypto.randomBytes(32).toString('hex')
          const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 heures
          
          // Créer l'utilisateur avec un mot de passe invalide (force reset)
          const tempPassword = crypto.randomBytes(32).toString('hex')
          const passwordHash = await bcrypt.hash(tempPassword, 10)
          
          const user = await User.create({
            username: email.split('@')[0] + '_' + Math.floor(Math.random() * 1000),
            email,
            passwordHash,
            name,
            role: 'CLIENT',
            company: company || name,
            companyClientId: client._id,
            isActive: true,
            forcePasswordReset: true,
            passwordResetToken: resetToken,
            passwordResetExpires: tokenExpires,
            createdAt: new Date(),
            updatedAt: new Date()
          })

          // Envoyer l'email d'invitation avec le lien de réinitialisation
          const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`
          const emailContent = getClientInvitationEmail(name, resetUrl)
          
          await emailService.sendEmail({
            to: email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text
          })
          
          console.log(`[CLIENT_CREATED] Email d'invitation envoyé à ${email} avec token de réinitialisation`)
        }
      } catch (err) {
        console.error('Erreur lors de la création du compte utilisateur:', err)
        // On ne bloque pas la réponse si le user fail, mais on log
      }
    }

    return NextResponse.json({ 
      success: true, 
      client,
      message: 'Client créé avec succès'
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erreur lors de la création'
    const status = message.includes('auth') || message.includes('autorisé') ? 401 : 500
    return NextResponse.json({ error: message, success: false }, { status })
  }
}
