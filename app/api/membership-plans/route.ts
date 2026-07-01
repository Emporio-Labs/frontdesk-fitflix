import { NextRequest, NextResponse } from 'next/server'
import { API_BASE_URL } from '@/lib/api-client'

function translateBackendPlanToFrontend(backendPlan: any) {
  // Support both camelCase and snake_case field names from the backend
  const durationDays = backendPlan.durationDays ?? backendPlan.duration_days ?? null
  return {
    plan_id: backendPlan.id || backendPlan._id,
    gym_id: backendPlan.gymId || backendPlan.gym_id || '',
    plan_name: backendPlan.name || backendPlan.plan_name || 'Unnamed Plan',
    duration_months: backendPlan.durationMonths ?? backendPlan.duration_months ?? 1,
    duration_days: durationDays !== undefined && durationDays !== null && Number(durationDays) > 0
      ? Number(durationDays)
      : null,
    total_price: backendPlan.price ?? backendPlan.total_price ?? 0,
    currency: backendPlan.currency || 'USD',
    status: backendPlan.active ? 'active' : 'inactive',
    features: backendPlan.features || [],
    benefits: backendPlan.benefits || {},
    created_at: backendPlan.createdAt || backendPlan.created_at || '',
    updated_at: backendPlan.updatedAt || backendPlan.updated_at || '',
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      gym_id,
      plan_name,
      duration_months,
      duration_days,
      total_price,
      currency,
      features,
      benefits,
      status,
    } = body || {}

    if (!gym_id || !plan_name || !duration_months || total_price == null) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
    }

    const backendPayload = {
      gymId: String(gym_id),
      name: String(plan_name),
      durationMonths: Number(duration_months),
      durationDays: duration_days !== undefined && duration_days !== null ? Number(duration_days) : undefined,
      price: Number(total_price),
      currency: String(currency || 'USD'),
      features: features || [],
      benefits: benefits && typeof benefits === 'object' ? benefits : {},
      creditsIncluded: Number(benefits?.credits || 0),
      active: status !== 'inactive',
    }

    const token = req.headers.get('Authorization')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers['Authorization'] = token
    }

    const backendRes = await fetch(`${API_BASE_URL}/membership-plans`, {
      method: 'POST',
      headers,
      body: JSON.stringify(backendPayload),
    })

    if (!backendRes.ok) {
      const errData = await backendRes.json().catch(() => ({}))
      return NextResponse.json(
        { message: errData.message || 'Failed to create membership plan on backend', error: errData },
        { status: backendRes.status }
      )
    }

    const responseData = await backendRes.json()
    const plan = translateBackendPlanToFrontend(responseData.plan)

    return NextResponse.json({ message: 'Membership plan created successfully', plan }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ message: 'Failed to create membership plan', error: String(error) }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const gymId = req.nextUrl.searchParams.get('gym_id')
    if (!gymId) {
      return NextResponse.json({ message: 'gym_id query param is required' }, { status: 400 })
    }

    const token = req.headers.get('Authorization')
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = token
    }

    const backendRes = await fetch(`${API_BASE_URL}/membership-plans`, {
      method: 'GET',
      headers,
    })

    if (!backendRes.ok) {
      const errData = await backendRes.json().catch(() => ({}))
      return NextResponse.json(
        { message: errData.message || 'Failed to fetch membership plans from backend', error: errData },
        { status: backendRes.status }
      )
    }

    const responseData = await backendRes.json()
    const backendPlans = responseData.plans || []

    const plans = backendPlans
      .filter((plan: any) => plan.gymId === gymId)
      .map(translateBackendPlanToFrontend)

    return NextResponse.json({ plans })
  } catch (error) {
    return NextResponse.json({ message: 'Failed to fetch membership plans', error: String(error) }, { status: 500 })
  }
}
