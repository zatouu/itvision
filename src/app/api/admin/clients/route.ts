import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { safeSearchRegex } from '@/lib/security-utils'
import Client from '@/lib/models/Client'
import Contact from '@/lib/models/Contact'
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
    const { name, email, phone, company, address, city, country, canAccessPortal, notes, tags, category, rating, contacts, contactPrincipal } = body
    const normalizedEmail = String(email || '').toLowerCase().trim()

    // Validation
    if (!name || !email || !phone) {
      return NextResponse.json({ 
        success: false, 
        error: 'Les champs nom, email et téléphone sont obligatoires' 
      }, { status: 400 })
    }

    // Vérifier si l'email existe déjà
    const existingClient = await Client.findOne({ email: normalizedEmail })
    if (existingClient) {
      return NextResponse.json({ 
        success: false, 
        error: 'Un client avec cet email existe déjà' 
      }, { status: 400 })
    }

    // Générer un clientId unique basé sur le max des IDs existants
    const lastClient = await Client.findOne({ clientId: { $exists: true, $ne: null, $regex: /^CL\d+$/ } })
      .sort({ clientId: -1 })
      .select('clientId')
      .lean() as { clientId: string } | null
    let nextNumber = 1
    if (lastClient?.clientId) {
      const match = lastClient.clientId.match(/CL(\d+)/)
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1
      }
    }
    let clientId = `CL${String(nextNumber).padStart(4, '0')}`

    // Vérifier que l'ID n'existe pas déjà (sécurité)
    let existing = await Client.findOne({ clientId }).select('_id').lean()
    while (existing) {
      nextNumber++
      clientId = `CL${String(nextNumber).padStart(4, '0')}`
      existing = await Client.findOne({ clientId }).select('_id').lean()
    }

    // Créer le client
    const client = await Client.create({
      clientId,
      name,
      email: normalizedEmail,
      phone,
      company: company || '',
      address: address || '',
      city: city || '',
      country: country || 'Sénégal',
      contactPerson: contactPrincipal || '',
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

    // Sauvegarder les contacts supplémentaires
    if (Array.isArray(contacts) && contacts.length > 0) {
      const contactDocs = contacts
        .filter((c: any) => c.nom?.trim())
        .map((c: any) => ({
          clientId: client._id,
          nom: c.nom.trim(),
          fonction: c.fonction?.trim() || undefined,
          telephone: c.telephone?.trim() || undefined,
          email: c.email?.trim().toLowerCase() || undefined,
          isPrimary: c.isPrimary || false
        }))
      if (contactDocs.length > 0) {
        await Contact.insertMany(contactDocs)
      }
    }

    // Unification: chaque fiche client entreprise doit avoir un compte utilisateur CLIENT lié
    try {
      const userExists = await User.findOne({ email: normalizedEmail })
      const shouldEnablePortal = Boolean(canAccessPortal)

      if (!userExists) {
        const resetToken = crypto.randomBytes(32).toString('hex')
        const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000)
        const tempPassword = crypto.randomBytes(32).toString('hex')
        const passwordHash = await bcrypt.hash(tempPassword, 10)

        await User.create({
          username: normalizedEmail.split('@')[0] + '_' + Math.floor(Math.random() * 1000),
          email: normalizedEmail,
          passwordHash,
          name,
          role: 'CLIENT',
          company: company || name,
          companyClientId: client._id,
          isActive: shouldEnablePortal,
          forcePasswordReset: true,
          ...(shouldEnablePortal ? {
            passwordResetToken: resetToken,
            passwordResetExpires: tokenExpires
          } : {})
        })

        if (shouldEnablePortal) {
          const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}&email=${encodeURIComponent(normalizedEmail)}`
          const emailContent = getClientInvitationEmail(name, resetUrl)
          await emailService.sendEmail({
            to: normalizedEmail,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text
          })
          console.log(`[CLIENT_CREATED] Email d'invitation envoyé à ${normalizedEmail} avec token de réinitialisation`)
        }
      } else if (String(userExists.role || '').toUpperCase() === 'CLIENT') {
        await User.updateOne(
          { _id: userExists._id },
          {
            $set: {
              name,
              company: company || name,
              companyClientId: client._id,
              ...(shouldEnablePortal ? { isActive: true } : {})
            }
          }
        )
      }
    } catch (err) {
      const syncWarning = err instanceof Error ? err.message : 'Synchronisation compte portail échouée'
      console.error('Erreur lors de la synchronisation du compte utilisateur client:', err)
      return NextResponse.json({
        success: true,
        client,
        message: 'Client créé avec succès',
        warning: `Client enregistré, mais la création du compte portail a échoué : ${syncWarning}`
      })
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
