import { NextRequest, NextResponse } from 'next/server'
import { generateToken04 } from '@/lib/zego-server-assistant'

// Runs server-side only. ZEGO_SERVER_SECRET must never carry a NEXT_PUBLIC_ prefix,
// so it is never bundled into client JS.
export const dynamic = 'force-dynamic'
export const revalidate = 0

const TOKEN_TTL_SECONDS = 3600 // 1 hour

export async function POST(req: NextRequest) {
  try {
    const { userID } = await req.json()

    if (!userID || typeof userID !== 'string') {
      return NextResponse.json({ message: 'userID is required' }, { status: 400 })
    }

    const appId = Number(process.env.NEXT_PUBLIC_ZEGO_APP_ID)
    const serverSecret = process.env.ZEGO_SERVER_SECRET

    if (!appId || !serverSecret) {
      return NextResponse.json(
        { message: 'ZEGO server credentials are not configured (NEXT_PUBLIC_ZEGO_APP_ID / ZEGO_SERVER_SECRET).' },
        { status: 500 }
      )
    }

    const token = generateToken04(appId, userID, serverSecret, TOKEN_TTL_SECONDS, '')

    return NextResponse.json({ token })
  } catch (err: any) {
    console.error('ZEGO token generation error:', err)
    return NextResponse.json(
      { message: err?.errorMessage || err?.message || 'Failed to generate ZEGO token' },
      { status: 500 }
    )
  }
}
