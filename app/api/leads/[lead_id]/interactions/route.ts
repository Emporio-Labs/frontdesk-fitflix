import { NextRequest, NextResponse } from 'next/server'
import { addInteraction, getLeadById } from '@/lib/server/leads-store'

type Params = { params: Promise<{ lead_id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { lead_id } = await params
    const notesLimitParam = req.nextUrl.searchParams.get('notesLimit')
    const notesLimit = notesLimitParam ? Number(notesLimitParam) : 10
    const lead = await getLeadById(lead_id, Number.isFinite(notesLimit) ? notesLimit : 10)
    if (!lead) {
      return NextResponse.json({ message: 'Lead not found' }, { status: 404 })
    }
    return NextResponse.json({ interactions: lead.interactions })
  } catch (error) {
    return NextResponse.json({ message: 'Failed to fetch interactions', error: String(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { lead_id } = await params
    const body = await req.json()
    if (!body?.note || !String(body.note).trim()) {
      return NextResponse.json({ message: 'note is required' }, { status: 400 })
    }

    const updated = await addInteraction(lead_id, {
      note: String(body.note),
      type: body?.type,
      createdBy: body?.createdBy,
    })

    if (!updated) {
      return NextResponse.json({ message: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Interaction added', lead: updated })
  } catch (error) {
    return NextResponse.json({ message: 'Failed to add interaction', error: String(error) }, { status: 500 })
  }
}
