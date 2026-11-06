import { NextResponse } from 'next/server'

export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY
  if (!publicKey) {
    return NextResponse.json({ success: false, error: 'Web Push non configuré' }, { status: 503 })
  }
  return NextResponse.json({ success: true, publicKey })
}
