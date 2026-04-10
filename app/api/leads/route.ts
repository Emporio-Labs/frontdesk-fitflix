import { NextRequest, NextResponse } from 'next/server'
import { createLead, listLeads } from '@/lib/server/leads-store'

export async function GET(req: NextRequest) {
  try {
    const notesLimitParam = req.nextUrl.searchParams.get('notesLimit')
    const includeDeleted = req.nextUrl.searchParams.get('includeDeleted') === 'true'
    const notesLimit = notesLimitParam ? Number(notesLimitParam) : 10

    const leads = await listLeads({
      includeDeleted,
      notesLimit: Number.isFinite(notesLimit) ? notesLimit : 10,
    })

    return NextResponse.json({ leads })
  } catch (error) {
    return NextResponse.json({ message: 'Failed to fetch leads', error: String(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { leadName, email } = body || {}

    if (!leadName || !email) {
      return NextResponse.json({ message: 'leadName and email are required' }, { status: 400 })
    }

    const created = await createLead({
      leadName: String(leadName),
      email: String(email),
      phone: body?.phone,
      source: body?.source,
      interestedIn: body?.interestedIn,
      notes: body?.notes,
      tags: body?.tags,
      ownerId: body?.ownerId,
      assignedStaffName: body?.assignedStaffName,
      followUpDate: body?.followUpDate,
      status: body?.status,
    })

    if (created.duplicate) {
      return NextResponse.json(
        { message: 'Duplicate phone number detected', duplicateLead: created.duplicate },
        { status: 409 }
      )
    }

    return NextResponse.json({ message: 'Lead created successfully', lead: created.lead }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ message: 'Failed to create lead', error: String(error) }, { status: 500 })
  }
}
