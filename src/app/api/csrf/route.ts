import { NextRequest } from 'next/server'
import { generateCSRFResponse } from '@/lib/csrf-protection'

export async function GET(request: NextRequest) {
  return generateCSRFResponse(request)
}