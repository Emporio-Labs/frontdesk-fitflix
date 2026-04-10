import { NextResponse } from 'next/server'
import { getDailyDigest } from '@/lib/server/leads-store'

export async function GET() {
  try {
    const digest = await getDailyDigest()
    return NextResponse.json(digest)
  } catch (error) {
    return NextResponse.json({ message: 'Failed to fetch daily digest', error: String(error) }, { status: 500 })
  }
}
