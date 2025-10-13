import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import User from '@/lib/models/User'
import { authRateLimiter } from '@/lib/rate-limiter'

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
        userType: { label: 'User Type', type: 'text' }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        try {
          const user = await User.findOne({
            $or: [
              { username: credentials.username },
              { email: credentials.username?.toLowerCase() }
            ]
          })

          if (!user) {
            console.warn('[AUTH] Tentative de connexion avec utilisateur inexistant:', credentials.username)
            return null
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          )

          if (!isPasswordValid) {
            console.warn('[AUTH] Mot de passe incorrect pour:', user.username)
            return null
          }

          console.log('[AUTH] Connexion réussie:', user.username, 'Role:', user.role)

          // Vérifier le type d'utilisateur si spécifié
          if (credentials.userType) {
            const expectedRole = credentials.userType.toUpperCase()
            if (user.role !== expectedRole) {
              return null
            }
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            username: user.username,
            role: user.role,
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 heures
    updateAge: 30 * 60, // Mise à jour toutes les 30 minutes
  },
  jwt: {
    maxAge: 8 * 60 * 60, // 8 heures
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.username = user.username
      }
      return token
    },
    async session({ session, token }) {
      if (token && token.sub) {
        session.user.id = token.sub
        session.user.role = token.role
        session.user.username = token.username
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
})

export { handler as GET, handler as POST }