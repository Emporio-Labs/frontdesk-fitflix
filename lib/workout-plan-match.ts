import type { PlanGoal, WorkoutPlan } from '@/types/workout'

/**
 * Template suggestions for a member, from their age and health goals.
 *
 * Templates carry no structured age field, so the age band is read from the
 * name / template category ("45–60 Fat loss", "Age 60+"). Health goals are
 * free text on the member, so they're matched by keyword.
 */

const GOAL_RULES: Array<{ test: RegExp; goals: PlanGoal[]; keywords: string[] }> = [
  { test: /fat|weight|slim|lose|loss/i, goals: ['WeightLoss'], keywords: ['fat loss', 'weight loss'] },
  { test: /muscle|hypertroph|bulk|mass|tone/i, goals: ['Hypertrophy', 'MuscleGain'], keywords: ['muscle'] },
  { test: /strength|strong|power/i, goals: ['Strength'], keywords: ['strength'] },
  { test: /endurance|stamina|cardio|run/i, goals: ['Endurance'], keywords: ['endurance'] },
  { test: /mobility|flexib|stretch/i, goals: ['Mobility'], keywords: ['mobility'] },
  { test: /perform|athlet|sport|agility/i, goals: [], keywords: ['performance'] },
  { test: /fitness|health|general|active|maint/i, goals: ['GeneralFitness', 'Maintenance'], keywords: ['general fitness'] },
]

/** Age range in a template's name/category, e.g. "30–45" → [30, 45), "60+" → [60, ∞). */
export function planAgeBand(plan: Pick<WorkoutPlan, 'name' | 'templateCategory'>): [number, number] | null {
  const text = `${plan.templateCategory ?? ''} ${plan.name ?? ''}`
  const range = /(\d{2})\s*[–—-]\s*(\d{2})/.exec(text)
  if (range) return [Number(range[1]), Number(range[2])]
  const open = /(\d{2})\s*\+/.exec(text)
  if (open) return [Number(open[1]), Number.POSITIVE_INFINITY]
  return null
}

export function memberAge(member: { age?: number; dateOfBirth?: string }): number | null {
  if (member.age && member.age > 0) return member.age
  if (!member.dateOfBirth) return null
  const dob = new Date(member.dateOfBirth)
  if (Number.isNaN(dob.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  if (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate())) age--
  return age > 0 ? age : null
}

export interface PlanMatch {
  score: number
  reasons: string[]
}

export function matchPlanToMember(
  plan: Pick<WorkoutPlan, 'name' | 'templateCategory' | 'goal'>,
  member: { age?: number; dateOfBirth?: string; healthGoals?: string[] },
): PlanMatch {
  const reasons: string[] = []
  let score = 0

  const age = memberAge(member)
  const band = planAgeBand(plan)
  if (age !== null && band && age >= band[0] && age < band[1]) {
    score += 2
    reasons.push(`Age ${age}`)
  }

  const text = `${plan.name ?? ''} ${plan.templateCategory ?? ''}`.toLowerCase()
  const goal = (member.healthGoals ?? []).find((g) =>
    GOAL_RULES.some(
      (rule) =>
        rule.test.test(g) &&
        (rule.goals.includes(plan.goal) || rule.keywords.some((k) => text.includes(k)))
    )
  )
  if (goal) {
    score += 1
    reasons.push(goal)
  }

  return { score, reasons }
}
