import { NextResponse } from 'next/server'
import { getReminderSummary } from '@/lib/server/leads-store'

export async function GET() {
  try {
    const summary = await getReminderSummary()
    return NextResponse.json(summary)
  } catch (error) {
    return NextResponse.json({ message: 'Failed to fetch reminders', error: String(error) }, { status: 500 })
  }
}
