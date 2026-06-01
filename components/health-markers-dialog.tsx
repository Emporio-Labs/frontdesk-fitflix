'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/empty-state'
import { IconActivityHeartbeat } from '@tabler/icons-react'
import type { HealthMarkers } from '@/lib/services/user.service'
import {
  computeBmi,
  computeProteinGoalGrams,
  computeWaterIntakeLiters,
  formatHealthMarkerTimestamp,
  getBmiCategory,
  getSleepQuality,
  toNumberSafe,
} from '@/lib/health-insights'

interface HealthMarkersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data?: HealthMarkers
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string' && value.trim() === '') return true
  if (Array.isArray(value) && value.length === 0) return true
  return false
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (s) => s.toUpperCase())
    .trim()
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

function InsightField({
  label,
  value,
}: {
  label: string
  value: string | number | null | undefined
}) {
  const display =
    value === null || value === undefined || value === '' ? '—' : String(value)
  return (
    <div className="rounded-md border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium mt-0.5 break-words">{display}</p>
    </div>
  )
}

const BASIC_KEYS = ['height', 'weight', 'age', 'gender', 'bodyFatPercent'] as const
const MEDICAL_KEYS = [
  'medicalConditions',
  'injuries',
  'allergies',
  'medications',
  'diseaseHistory',
] as const
const LIFESTYLE_KEYS = [
  'sleepHours',
  'activityLevel',
  'smoking',
  'alcohol',
  'diet',
  'occupation',
  'stressLevel',
  'hydration',
] as const

const LABELS: Record<string, string> = {
  height: 'Height',
  weight: 'Weight',
  age: 'Age',
  gender: 'Gender',
  bodyFatPercent: 'Body Fat %',
  medicalConditions: 'Medical Conditions',
  injuries: 'Injuries',
  allergies: 'Allergies',
  medications: 'Medications',
  diseaseHistory: 'Disease History',
  sleepHours: 'Sleep (hours)',
  activityLevel: 'Activity Level',
  smoking: 'Smoking',
  alcohol: 'Alcohol',
  diet: 'Diet',
  occupation: 'Occupation',
  stressLevel: 'Stress Level',
  hydration: 'Hydration',
}

const SYSTEM_KEYS = new Set<string>(['createdAt', 'updatedAt'])
const KNOWN_KEYS = new Set<string>([
  ...BASIC_KEYS,
  ...MEDICAL_KEYS,
  ...LIFESTYLE_KEYS,
  'bmi',
])

export function HealthMarkersDialog({ open, onOpenChange, data }: HealthMarkersDialogProps) {
  const hasCoreValue =
    data &&
    Object.entries(data).some(
      ([key, value]) => !SYSTEM_KEYS.has(key) && !isEmptyValue(value),
    )

  const extraEntries = data
    ? Object.entries(data).filter(
        ([key, value]) =>
          !KNOWN_KEYS.has(key) &&
          !SYSTEM_KEYS.has(key) &&
          !isEmptyValue(value),
      )
    : []

  const bmi =
    data?.bmi != null && data.bmi !== ''
      ? toNumberSafe(data.bmi)
      : computeBmi(data?.height, data?.weight)
  const bmiCategory = getBmiCategory(bmi)
  const waterL = computeWaterIntakeLiters(data?.weight)
  const proteinG = computeProteinGoalGrams(data?.weight)
  const sleepQuality = getSleepQuality(data?.sleepHours)

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
          <DialogTitle>Health Markers</DialogTitle>
          <DialogDescription>
            Submitted health information for this member. Read-only view.
          </DialogDescription>
        </DialogHeader>

        {hasCoreValue ? (
          <div className="space-y-6 pt-2">
            {renderSection('Basic', BASIC_KEYS)}
            {renderSection('Medical', MEDICAL_KEYS)}
            {renderSection('Lifestyle', LIFESTYLE_KEYS)}

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Calculated Insights</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InsightField label="BMI" value={bmi} />
                <InsightField label="BMI Category" value={bmiCategory} />
                <InsightField
                  label="Water Intake"
                  value={waterL !== null ? `${waterL} L/day` : null}
                />
                <InsightField
                  label="Protein Goal"
                  value={proteinG !== null ? `${proteinG} g/day` : null}
                />
                <InsightField label="Sleep Quality" value={sleepQuality} />
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">System Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InsightField
                  label="Recorded On"
                  value={formatHealthMarkerTimestamp(data?.createdAt)}
                />
                <InsightField
                  label="Last Updated"
                  value={formatHealthMarkerTimestamp(data?.updatedAt)}
                />
              </div>
            </div>

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
            icon={<IconActivityHeartbeat className="h-10 w-10" />}
            title="No health markers submitted"
            description="This member has not submitted their health markers yet."
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
