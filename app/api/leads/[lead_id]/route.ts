import { NextRequest, NextResponse } from 'next/server'
import { getLeadById, softDeleteLead, updateLead } from '@/lib/server/leads-store'

type Params = { params: { lead_id: string } }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const notesLimitParam = req.nextUrl.searchParams.get('notesLimit')
    const notesLimit = notesLimitParam ? Number(notesLimitParam) : 10
    const lead = await getLeadById(params.lead_id, Number.isFinite(notesLimit) ? notesLimit : 10)
    if (!lead) {
      return NextResponse.json({ message: 'Lead not found' }, { status: 404 })
    }
    return NextResponse.json({ lead })
  } catch (error) {
    return NextResponse.json({ message: 'Failed to fetch lead', error: String(error) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json()
    const expectedRevision = body?.expectedRevision

    const updated = await updateLead(params.lead_id, {
      leadName: body?.leadName,
      email: body?.email,
      phone: body?.phone,
      source: body?.source,
      status: body?.status,
      notes: body?.notes,
      interestedIn: body?.interestedIn,
      tags: body?.tags,
      ownerId: body?.ownerId,
      assignedStaffName: body?.assignedStaffName,
      followUpDate: body?.followUpDate,
      expectedRevision: expectedRevision != null ? Number(expectedRevision) : undefined,
    })

    if (!updated) {
      return NextResponse.json({ message: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Lead updated successfully', lead: updated })
  } catch (error: any) {
    if (error?.code === 'INVALID_TRANSITION') {
      return NextResponse.json(
        { message: 'Invalid stage transition. Follow new -> contacted -> qualified -> converted.' },
        { status: 400 }
      )
    }

    if (error?.code === 'REVISION_MISMATCH') {
      return NextResponse.json(
        { message: 'Lead was updated by someone else. Refresh and retry.' },
        { status: 409 }
      )
    }

    return NextResponse.json({ message: 'Failed to update lead', error: String(error) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const deleted = await softDeleteLead(params.lead_id)
    if (!deleted) {
      return NextResponse.json({ message: 'Lead not found' }, { status: 404 })
    }
    return NextResponse.json({ message: 'Lead deleted successfully', lead: deleted })
  } catch (error) {
    return NextResponse.json({ message: 'Failed to delete lead', error: String(error) }, { status: 500 })
  }
}
