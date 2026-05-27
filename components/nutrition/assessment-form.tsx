'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  assessmentSchema,
  type AssessmentFormValues,
  type NutritionAssessment,
  DIETARY_PREFERENCES,
  DIETARY_PREFERENCE_LABELS,
} from '@/lib/types/nutrition'
import { useSaveAssessment } from '@/hooks/use-nutrition'

const PREF_UNSET = '__unset__'

function csvToArray(v: string): string[] {
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function emptyValues(): AssessmentFormValues {
  return {
    dietaryPreference: null,
    preferredFoods: [],
    dislikedFoods: [],
    mealsPerDay: null,
    waterTargetMl: null,
    targetCaloriesKcal: null,
    targetMacros: {
      proteinG: null,
      carbsG: null,
      fatG: null,
      fiberG: null,
      sugarG: null,
    },
    notes: '',
  }
}

interface AssessmentFormProps {
  userId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  assessment?: NutritionAssessment | null
}

export function AssessmentForm({
  userId,
  open,
  onOpenChange,
  assessment,
}: AssessmentFormProps) {
  const saveAssessment = useSaveAssessment()
  const form = useForm<AssessmentFormValues>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: emptyValues(),
  })

  useEffect(() => {
    if (open) {
      form.reset(
        assessment
          ? {
              dietaryPreference: assessment.dietaryPreference ?? null,
              preferredFoods: assessment.preferredFoods ?? [],
              dislikedFoods: assessment.dislikedFoods ?? [],
              mealsPerDay: assessment.mealsPerDay ?? null,
              waterTargetMl: assessment.waterTargetMl ?? null,
              targetCaloriesKcal: assessment.targetCaloriesKcal ?? null,
              targetMacros: {
                proteinG: assessment.targetMacros?.proteinG ?? null,
                carbsG: assessment.targetMacros?.carbsG ?? null,
                fatG: assessment.targetMacros?.fatG ?? null,
                fiberG: assessment.targetMacros?.fiberG ?? null,
                sugarG: assessment.targetMacros?.sugarG ?? null,
              },
              notes: assessment.notes ?? '',
            }
          : emptyValues()
      )
    }
  }, [open, assessment, form])

  const onSubmit = async (values: AssessmentFormValues) => {
    await saveAssessment.mutateAsync({ userId, ...values })
    onOpenChange(false)
  }

  const numberField = (
    name:
      | 'mealsPerDay'
      | 'waterTargetMl'
      | 'targetCaloriesKcal'
      | 'targetMacros.proteinG'
      | 'targetMacros.carbsG'
      | 'targetMacros.fatG'
      | 'targetMacros.fiberG'
      | 'targetMacros.sugarG',
    label: string
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              step="any"
              value={field.value ?? ''}
              onChange={(e) =>
                field.onChange(
                  e.target.value === '' ? null : Number(e.target.value)
                )
              }
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {assessment ? 'Edit Assessment' : 'New Assessment'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="max-h-[70vh] space-y-4 overflow-y-auto pt-2"
          >
            <FormField
              control={form.control}
              name="dietaryPreference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dietary Preference</FormLabel>
                  <Select
                    value={field.value ?? PREF_UNSET}
                    onValueChange={(v) =>
                      field.onChange(v === PREF_UNSET ? null : v)
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={PREF_UNSET}>Unspecified</SelectItem>
                      {DIETARY_PREFERENCES.map((dp) => (
                        <SelectItem key={dp} value={dp}>
                          {DIETARY_PREFERENCE_LABELS[dp]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-3">
              {numberField('mealsPerDay', 'Meals / day')}
              {numberField('waterTargetMl', 'Water (ml)')}
              {numberField('targetCaloriesKcal', 'Calories')}
            </div>

            <div className="rounded-lg border p-3">
              <p className="mb-3 text-sm font-medium">Target Macros</p>
              <div className="grid grid-cols-3 gap-3">
                {numberField('targetMacros.proteinG', 'Protein (g)')}
                {numberField('targetMacros.carbsG', 'Carbs (g)')}
                {numberField('targetMacros.fatG', 'Fat (g)')}
                {numberField('targetMacros.fiberG', 'Fiber (g)')}
                {numberField('targetMacros.sugarG', 'Sugar (g)')}
              </div>
            </div>

            <FormField
              control={form.control}
              name="preferredFoods"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Foods</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Oats, Paneer, Spinach"
                      value={(field.value ?? []).join(', ')}
                      onChange={(e) =>
                        field.onChange(csvToArray(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dislikedFoods"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Disliked Foods</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Mushrooms, Tofu"
                      value={(field.value ?? []).join(', ')}
                      onChange={(e) =>
                        field.onChange(csvToArray(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saveAssessment.isPending}>
                {saveAssessment.isPending ? 'Saving…' : 'Save Assessment'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
