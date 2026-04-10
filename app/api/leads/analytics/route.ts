import { NextResponse } from 'next/server'
import { getLeadAnalytics } from '@/lib/server/leads-store'

export async function GET() {
  try {
    const analytics = await getLeadAnalytics()
    return NextResponse.json({ analytics })
  } catch (error) {
    return NextResponse.json({ message: 'Failed to fetch lead analytics', error: String(error) }, { status: 500 })
  }
}
