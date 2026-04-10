import { NextRequest, NextResponse } from 'next/server'
import { recordContactAttempt } from '@/lib/server/leads-store'

type Params = { params: Promise<{ lead_id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { lead_id } = await params
    const body = await req.json()
    const updated = await recordContactAttempt(lead_id, {
      channel: body?.channel,
      note: body?.note,
      createdBy: body?.createdBy,
    })

    if (!updated) {
      return NextResponse.json({ message: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Contact attempt recorded', lead: updated })
  } catch (error) {
    return NextResponse.json({ message: 'Failed to record contact attempt', error: String(error) }, { status: 500 })
  }
}
