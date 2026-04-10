import { NextRequest, NextResponse } from 'next/server'
import { deletePlanById, getPlanById, updatePlanById } from '@/lib/server/membership-plans-store'

type Params = { params: { plan_id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const plan = await getPlanById(params.plan_id)
    if (!plan) {
      return NextResponse.json({ message: 'Plan not found' }, { status: 404 })
    }
    return NextResponse.json({ plan })
  } catch (error) {
    return NextResponse.json({ message: 'Failed to fetch plan', error: String(error) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const body = await req.json()
    const updated = await updatePlanById(params.plan_id, {
      total_price: body?.total_price,
      duration_months: body?.duration_months,
      features: body?.features,
      benefits: body?.benefits,
      status: body?.status,
      plan_name: body?.plan_name,
      currency: body?.currency,
    })

    if (!updated) {
      return NextResponse.json({ message: 'Plan not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Membership plan updated successfully', plan: updated })
  } catch (error) {
    return NextResponse.json({ message: 'Failed to update plan', error: String(error) }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const deleted = await deletePlanById(params.plan_id)
    if (!deleted) {
      return NextResponse.json({ message: 'Plan not found' }, { status: 404 })
    }
    return NextResponse.json({ message: 'Membership plan deactivated successfully', plan: deleted })
  } catch (error) {
    return NextResponse.json({ message: 'Failed to delete/deactivate plan', error: String(error) }, { status: 500 })
  }
}
