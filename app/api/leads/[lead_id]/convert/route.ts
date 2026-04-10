import { NextRequest, NextResponse } from 'next/server'
import { convertLead } from '@/lib/server/leads-store'

type Params = { params: Promise<{ lead_id: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const { lead_id } = await params
    const updated = await convertLead(lead_id)
    if (!updated) {
      return NextResponse.json({ message: 'Lead not found' }, { status: 404 })
    }
    return NextResponse.json({ message: 'Lead converted successfully', lead: updated })
  } catch (error: any) {
    if (error?.code === 'INVALID_TRANSITION') {
      return NextResponse.json(
        { message: 'Invalid stage transition. Follow new -> contacted -> qualified -> converted.' },
        { status: 400 }
      )
    }
    return NextResponse.json({ message: 'Failed to convert lead', error: String(error) }, { status: 500 })
  }
}
