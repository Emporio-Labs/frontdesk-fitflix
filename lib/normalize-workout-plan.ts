import type { WorkoutPlan } from '@/types/workout'

/** Map the raw API/lean response to the frontend WorkoutPlan shape. */
export function normalizeApiPlan(raw: any): WorkoutPlan {
  return {
    ...raw,
    // .lean() returns _id; Mongoose Documents expose the virtual `id` too — handle both
    id: raw._id?.toString() ?? raw.id,
    // Backend stores null by default; our Zod schema only accepts string | undefined
    templateCategory: raw.templateCategory ?? undefined,
    description: raw.description ?? undefined,
    // assignedUsers may be populated objects or plain string IDs
    assignedUsers: (raw.assignedUsers || []).map((u: any) =>
      typeof u === 'string' ? u : (u._id?.toString() ?? u.id ?? '')
    ),
  }
}

/**
 * An unsaved copy of a template for the builder. Both ids are cleared so the
 * first save creates a new plan instead of overwriting the template.
 */
export function templateToDraft(template: WorkoutPlan): WorkoutPlan {
  const now = new Date().toISOString()
  return {
    ...template,
    _id: '',
    id: undefined,
    name: `${template.name} (Copy)`,
    status: 'Draft',
    isTemplate: false,
    templateCategory: undefined,
    assignedUsers: [],
    createdAt: now,
    updatedAt: now,
  }
}
