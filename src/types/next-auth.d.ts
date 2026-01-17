import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      username: string
      role: string
    }
  }

  interface User {
    id: string
    name: string
    email: string
    username: string
    role: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string
    username: string
  }
}

export {}