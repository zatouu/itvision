import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { connectMongoose } from '@/lib/mongoose'
import User from '@/lib/models/User'

async function main() {
  const email = 'admn@itvision.sn'
  const username = 'admin'
  const name = 'Admin IT Vision'
  const password = 'admin123'

  await connectMongoose()

  const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] }).lean() as any
  if (existing) {
    console.log('Utilisateur déjà présent:', existing.email || existing.username)
    process.exit(0)
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const created = await User.create({
    email: email.toLowerCase(),
    username,
    name,
    passwordHash,
    role: 'ADMIN',
    isActive: true
  })

  console.log('Utilisateur admin créé:', created.email)
  process.exit(0)
}

main().catch((err) => {
  console.error('Erreur seed admin:', err)
  process.exit(1)
})


