import { NextRequest, NextResponse } from 'next/server'
import { requireDomainAccess, companyCapabilities } from '@/lib/domain-access'
import { connectDB } from '@/lib/db'
import InAppNotification from '@/lib/models/InAppNotification'

// Une notification ciblée (personne ou entreprise) n'est jamais visible via le seul rôle : sinon fuite entre clients
function visibilityFilterFor(userId: string, role: string, companyClientId?: string) {
  return {
    $or: [
      { userId },
      ...(companyClientId ? [{ teamId: companyClientId }] : []),
      { roles: role, userId: { $exists: false }, teamId: { $exists: false } },
      { roles: { $exists: false }, userId: { $exists: false }, teamId: { $exists: false } }
    ]
  }
}

export async function GET(request: NextRequest) {
  const result = await requireDomainAccess(request, 'corporate')
  if (!result.ok) return result.response
  const { access } = result

  await connectDB()

  const userId = access.userId
  const docs = await InAppNotification.find({
    deletedBy: { $ne: userId },
    ...visibilityFilterFor(userId, access.role, access.profiles.companyClientId)
  })
    .sort({ createdAt: -1 })
    .limit(60)
    .lean() as any[]

  // Droit requis (ex. factures réservées aux membres ayant accès aux finances)
  const caps = companyCapabilities(access)
  const notifs = docs
    .filter(n => access.isAdmin || !n.metadata?.requires || caps.has(n.metadata.requires))
    .slice(0, 40)

  return NextResponse.json(notifs)
}

export async function PATCH(request: NextRequest) {
  const result = await requireDomainAccess(request, 'corporate')
  if (!result.ok) return result.response
  const { access } = result

  const body = await request.json()
  await connectDB()

  const userId = access.userId
  const filter = {
    deletedBy: { $ne: userId },
    ...visibilityFilterFor(userId, access.role, access.profiles.companyClientId)
  }

  if (body.all) {
    await InAppNotification.updateMany(
      { ...filter, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    )
  } else if (body.id) {
    await InAppNotification.updateOne(
      { _id: body.id, ...filter },
      { $addToSet: { readBy: userId } }
    )
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const result = await requireDomainAccess(request, 'corporate')
  if (!result.ok) return result.response
  const { access } = result

  const body = await request.json()
  if (!body.id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  await connectDB()

  await InAppNotification.updateOne(
    {
      _id: body.id,
      ...visibilityFilterFor(access.userId, access.role, access.profiles.companyClientId)
    },
    { $addToSet: { deletedBy: access.userId } }
  )

  return NextResponse.json({ ok: true })
}
