'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/empty-state'
import { IconTarget } from '@tabler/icons-react'
import type { HealthGoalsData } from '@/lib/services/onboarding.service'

interface HealthGoalsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data?: HealthGoalsData
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string' && value.trim() === '') return true
  if (Array.isArray(value) && value.length === 0) return true
  if (
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value as object).length === 0
  ) {
    return true
  }
  return false
}

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (s) => s.toUpperCase())
    .trim()
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.map((v) => formatValue(v)).join(', ')
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => !isEmptyValue(v))
      .map(([k, v]) => {
        const inner = Array.isArray(v) || typeof v !== 'object' ? formatValue(v) : JSON.stringify(v)
        return `${humanizeKey(k)}: ${inner}`
      })
      .join('; ')
  }
  return String(value)
}

function Field({ label, value }: { label: string; value: unknown }) {
  if (isEmptyValue(value)) return null
  return (
    <div className="rounded-md border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5 break-words">{formatValue(value)}</p>
    </div>
  )
}

const PRIMARY_KEYS = ['goals', 'primaryGoals', 'transformationTargets'] as const
const TARGET_KEYS = [
  'targetWeight',
  'targetWeightKg',
  'currentWeight',
  'timeline',
  'targetDate',
] as const
const WORKOUT_KEYS = ['workoutExperience', 'workoutGoals'] as const
const FOOD_KEYS = ['foodPreferences', 'dietPreferences'] as const
const NOTES_KEYS = ['notes', 'userNotes'] as const

const LABELS: Record<string, string> = {
  goals: 'Goals',
  primaryGoals: 'Primary Goals',
  transformationTargets: 'Transformation Targets',
  targetWeight: 'Target Weight',
  targetWeightKg: 'Target Weight (kg)',
  currentWeight: 'Current Weight',
  timeline: 'Timeline',
  targetDate: 'Target Date',
  workoutExperience: 'Workout Experience',
  workoutGoals: 'Workout Goals',
  foodPreferences: 'Food Preferences',
  dietPreferences: 'Diet Preferences',
  notes: 'Notes',
  userNotes: 'User Notes',
}

const KNOWN_KEYS = new Set<string>([
  ...PRIMARY_KEYS,
  ...TARGET_KEYS,
  ...WORKOUT_KEYS,
  ...FOOD_KEYS,
  ...NOTES_KEYS,
])

export function HealthGoalsDialog({ open, onOpenChange, data }: HealthGoalsDialogProps) {
  const hasAnyValue =
    data && Object.entries(data).some(([, value]) => !isEmptyValue(value))

  const extraEntries = data
    ? Object.entries(data).filter(
        ([key, value]) => !KNOWN_KEYS.has(key) && !isEmptyValue(value),
      )
    : []

  const renderSection = (title: string, keys: readonly string[]) => {
    if (!data) return null
    const visibleKeys = keys.filter((k) => !isEmptyValue((data as Record<string, unknown>)[k]))
    if (visibleKeys.length === 0) return null
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {visibleKeys.map((key) => (
            <Field
              key={key}
              label={LABELS[key] || humanizeKey(key)}
              value={(data as Record<string, unknown>)[key]}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Health Goals</DialogTitle>
          <DialogDescription>
            Submitted health goals for this member. Read-only view.
          </DialogDescription>
        </DialogHeader>

        {hasAnyValue ? (
          <div className="space-y-6 pt-2">
            {renderSection('Primary Goals', PRIMARY_KEYS)}
            {renderSection('Target & Timeline', TARGET_KEYS)}
            {renderSection('Workout', WORKOUT_KEYS)}
            {renderSection('Food', FOOD_KEYS)}
            {renderSection('Notes', NOTES_KEYS)}

            {extraEntries.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Other</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {extraEntries.map(([key, value]) => (
                    <Field key={key} label={humanizeKey(key)} value={value} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            icon={<IconTarget className="h-10 w-10" />}
            title="No health goals submitted"
            description="This member has not submitted their health goals yet."
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
