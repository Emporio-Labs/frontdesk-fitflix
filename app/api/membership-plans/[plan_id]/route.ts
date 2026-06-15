import { NextRequest, NextResponse } from 'next/server'
import { API_BASE_URL } from '@/lib/api-client'

type Params = { params: Promise<{ plan_id: string }> }

function translateBackendPlanToFrontend(backendPlan: any) {
  return {
    plan_id: backendPlan.id || backendPlan._id,
    gym_id: backendPlan.gymId || '',
    plan_name: backendPlan.name || 'Unnamed Plan',
    duration_months: backendPlan.durationMonths || 1,
    total_price: backendPlan.price || 0,
    currency: backendPlan.currency || 'USD',
    status: backendPlan.active ? 'active' : 'inactive',
    features: backendPlan.features || [],
    benefits: backendPlan.benefits || {},
    created_at: backendPlan.createdAt || '',
    updated_at: backendPlan.updatedAt || '',
  }
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { plan_id } = await params
    const token = req.headers.get('Authorization')
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = token
    }

    const backendRes = await fetch(`${API_BASE_URL}/membership-plans/${plan_id}`, {
      method: 'GET',
      headers,
    })

    if (!backendRes.ok) {
      const errData = await backendRes.json().catch(() => ({}))
      return NextResponse.json(
        { message: errData.message || 'Plan not found' },
        { status: backendRes.status }
      )
    }

    const responseData = await backendRes.json()
    const plan = translateBackendPlanToFrontend(responseData.plan)
    return NextResponse.json({ plan })
  } catch (error) {
    return NextResponse.json({ message: 'Failed to fetch plan', error: String(error) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { plan_id } = await params
    const body = await req.json()

    const backendPayload: Record<string, any> = {}
    if (body?.plan_name !== undefined) backendPayload.name = String(body.plan_name)
    if (body?.total_price !== undefined) backendPayload.price = Number(body.total_price)
    if (body?.duration_months !== undefined) backendPayload.durationMonths = Number(body.duration_months)
    if (body?.currency !== undefined) backendPayload.currency = String(body.currency)
    if (body?.features !== undefined) backendPayload.features = body.features
    if (body?.benefits !== undefined) {
      backendPayload.benefits = body.benefits
      if (body.benefits?.credits !== undefined) {
        backendPayload.creditsIncluded = Number(body.benefits.credits || 0)
      }
    }
    if (body?.status !== undefined) {
      backendPayload.active = body.status !== 'inactive'
    }

    const token = req.headers.get('Authorization')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers['Authorization'] = token
    }

    const backendRes = await fetch(`${API_BASE_URL}/membership-plans/${plan_id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(backendPayload),
    })

    if (!backendRes.ok) {
      const errData = await backendRes.json().catch(() => ({}))
      return NextResponse.json(
        { message: errData.message || 'Failed to update plan' },
        { status: backendRes.status }
      )
    }

    const responseData = await backendRes.json()
    const plan = translateBackendPlanToFrontend(responseData.plan)

    return NextResponse.json({ message: 'Membership plan updated successfully', plan })
  } catch (error) {
    return NextResponse.json({ message: 'Failed to update plan', error: String(error) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { plan_id } = await params
    const token = req.headers.get('Authorization')
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = token
    }

    const backendRes = await fetch(`${API_BASE_URL}/membership-plans/${plan_id}`, {
      method: 'DELETE',
      headers,
    })

    if (!backendRes.ok) {
      const errData = await backendRes.json().catch(() => ({}))
      return NextResponse.json(
        { message: errData.message || 'Failed to delete plan' },
        { status: backendRes.status }
      )
    }

    const responseData = await backendRes.json()
    return NextResponse.json({ message: responseData.message || 'Membership plan deleted successfully' })
  } catch (error) {
    return NextResponse.json({ message: 'Failed to delete/deactivate plan', error: String(error) }, { status: 500 })
  }
}
