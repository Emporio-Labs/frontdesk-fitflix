import { NextRequest, NextResponse } from 'next/server'
import { createPlan, getPlansByGym } from '@/lib/server/membership-plans-store'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      gym_id,
      plan_name,
      duration_months,
      total_price,
      currency,
      features,
      benefits,
      status,
    } = body || {}

    if (!gym_id || !plan_name || !duration_months || total_price == null) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
    }

    const plan = await createPlan({
      gym_id: String(gym_id),
      plan_name: String(plan_name),
      duration_months: Number(duration_months),
      total_price: Number(total_price),
      currency: String(currency || 'USD'),
      features,
      benefits,
      status: status === 'inactive' ? 'inactive' : 'active',
    })

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

    const plans = await getPlansByGym(gymId)

    return NextResponse.json({
      plans: plans.map((plan) => ({
        plan_id: plan.plan_id,
        plan_name: plan.plan_name,
        duration_months: plan.duration_months,
        total_price: plan.total_price,
        currency: plan.currency,
        status: plan.status,
        features: plan.features,
        benefits: plan.benefits,
        created_at: plan.created_at,
        updated_at: plan.updated_at,
      })),
    })
  } catch (error) {
    return NextResponse.json({ message: 'Failed to fetch membership plans', error: String(error) }, { status: 500 })
  }
}
