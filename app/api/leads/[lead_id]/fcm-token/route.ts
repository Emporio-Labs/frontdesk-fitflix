import { NextRequest, NextResponse } from 'next/server'
import { removeFcmToken, upsertFcmToken } from '@/lib/server/leads-store'

type Params = { params: { lead_id: string } }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json()
    const token = String(body?.token || '').trim()
    if (!token) {
      return NextResponse.json({ message: 'token is required' }, { status: 400 })
    }

    const updated = await upsertFcmToken(params.lead_id, token)
    if (!updated) {
      return NextResponse.json({ message: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'FCM token saved', lead: updated })
  } catch (error) {
    return NextResponse.json({ message: 'Failed to save FCM token', error: String(error) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json()
    const token = String(body?.token || '').trim()
    if (!token) {
      return NextResponse.json({ message: 'token is required' }, { status: 400 })
    }

    const updated = await removeFcmToken(params.lead_id, token)
    if (!updated) {
      return NextResponse.json({ message: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'FCM token removed', lead: updated })
  } catch (error) {
    return NextResponse.json({ message: 'Failed to remove FCM token', error: String(error) }, { status: 500 })
  }
}
