import { randomUUID } from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'

export type PlanStatus = 'active' | 'inactive'

export type MembershipPlanRecord = {
  plan_id: string
  gym_id: string
  plan_name: string
  duration_months: number
  total_price: number
  currency: string
  features: string[]
  benefits: Record<string, unknown>
  status: PlanStatus
  created_at: string
  updated_at: string
}

type CreatePlanInput = {
  gym_id: string
  plan_name: string
  duration_months: number
  total_price: number
  currency: string
  features?: string[]
  benefits?: Record<string, unknown>
  status?: PlanStatus
}

const DATA_DIR = path.join(process.cwd(), '.data')
const DATA_FILE = path.join(DATA_DIR, 'membership-plans.json')

async function ensureDataFile() {
  await fs.mkdir(DATA_DIR, { recursive: true })
  try {
    await fs.access(DATA_FILE)
  } catch {
    await fs.writeFile(DATA_FILE, '[]', 'utf8')
  }
}

async function readAllPlans(): Promise<MembershipPlanRecord[]> {
  await ensureDataFile()
  const raw = await fs.readFile(DATA_FILE, 'utf8')
  const parsed = JSON.parse(raw)
  return Array.isArray(parsed) ? parsed : []
}

async function writeAllPlans(plans: MembershipPlanRecord[]) {
  await ensureDataFile()
  await fs.writeFile(DATA_FILE, JSON.stringify(plans, null, 2), 'utf8')
}

function sanitizeFeatures(features: unknown): string[] {
  if (!Array.isArray(features)) {
    return []
  }
  return features.map((item) => String(item).trim()).filter(Boolean)
}

export async function createPlan(input: CreatePlanInput): Promise<MembershipPlanRecord> {
  const now = new Date().toISOString()
  const durationMonths = Number(input.duration_months)
  const totalPrice = Number(input.total_price)

  const newPlan: MembershipPlanRecord = {
    plan_id: randomUUID(),
    gym_id: input.gym_id,
    plan_name: input.plan_name,
    duration_months: durationMonths,
    total_price: totalPrice,
    currency: String(input.currency || 'USD').toUpperCase(),
    features: sanitizeFeatures(input.features),
    benefits: input.benefits && typeof input.benefits === 'object' ? input.benefits : {},
    status: input.status || 'active',
    created_at: now,
    updated_at: now,
  }

  const plans = await readAllPlans()
  plans.push(newPlan)
  await writeAllPlans(plans)
  return newPlan
}

export async function getPlansByGym(gymId: string): Promise<MembershipPlanRecord[]> {
  const plans = await readAllPlans()
  return plans.filter((plan) => plan.gym_id === gymId)
}

export async function getPlanById(planId: string): Promise<MembershipPlanRecord | undefined> {
  const plans = await readAllPlans()
  return plans.find((plan) => plan.plan_id === planId)
}

export async function updatePlanById(
  planId: string,
  payload: Partial<Pick<MembershipPlanRecord, 'total_price' | 'duration_months' | 'features' | 'benefits' | 'status' | 'plan_name' | 'currency'>>
): Promise<MembershipPlanRecord | undefined> {
  const plans = await readAllPlans()
  const idx = plans.findIndex((plan) => plan.plan_id === planId)
  if (idx < 0) {
    return undefined
  }

  const current = plans[idx]
  const nextDuration = payload.duration_months != null ? Number(payload.duration_months) : current.duration_months
  const nextPrice = payload.total_price != null ? Number(payload.total_price) : current.total_price

  const updated: MembershipPlanRecord = {
    ...current,
    plan_name: payload.plan_name ?? current.plan_name,
    currency: payload.currency ? String(payload.currency).toUpperCase() : current.currency,
    duration_months: nextDuration,
    total_price: nextPrice,
    features: payload.features ? sanitizeFeatures(payload.features) : current.features,
    benefits: payload.benefits && typeof payload.benefits === 'object' ? payload.benefits : current.benefits,
    status: payload.status ?? current.status,
    updated_at: new Date().toISOString(),
  }

  plans[idx] = updated
  await writeAllPlans(plans)
  return updated
}

export async function deletePlanById(planId: string): Promise<MembershipPlanRecord | undefined> {
  return updatePlanById(planId, { status: 'inactive' })
}
