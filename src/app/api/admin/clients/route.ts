import { NextRequest, NextResponse } from 'next/server'
import { connectMongoose } from '@/lib/mongoose'
import { safeSearchRegex } from '@/lib/security-utils'
import Client from '@/lib/models/Client'
import User from '@/lib/models/User'
import { requireAuth } from '@/lib/jwt'
import bcrypt from 'bcryptjs'
import { emailService } from '@/lib/email-service'
import { getClientCredentialsEmail } from '@/lib/email-templates'

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

    // Générer un clientId unique
    const count = await Client.countDocuments()
    const clientId = `CL${String(count + 1).padStart(4, '0')}`

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
          // Générer un mot de passe aléatoire (10 char, alphanum)
          const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-2).toUpperCase()
          const passwordHash = await bcrypt.hash(tempPassword, 10)
          
          await User.create({
            username: email.split('@')[0] + '_' + Math.floor(Math.random() * 1000),
            email,
            passwordHash,
            name,
            role: 'CLIENT',
            company: company || name,
            companyClientId: client._id,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          })

          // Envoyer l'email
          const loginUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/login`
          const emailContent = getClientCredentialsEmail(name, email, loginUrl, tempPassword)
          
          await emailService.sendEmail({
            to: email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text
          })
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
