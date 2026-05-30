'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  useFieldArray,
  useForm,
  useFormContext,
  type Control,
  type UseFormSetValue,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  IconPlus,
  IconTrash,
  IconChevronDown,
  IconChevronUp,
  IconLeaf,
} from '@tabler/icons-react'
import {
  MEAL_TYPES,
  MEAL_TYPE_LABELS,
  TIMELINE_SLOTS,
  TIMELINE_SLOT_LABELS,
  TIMELINE_TO_MEALTYPE,
  MEAL_REASON_TAGS,
  MEAL_REASON_TAG_LABELS,
  LIFESTYLE_CATEGORIES,
  LIFESTYLE_CATEGORY_LABELS,
  NUTRITION_GOALS,
  NUTRITION_GOAL_LABELS,
  FOOD_PREFERENCES,
  ALLERGIES,
  MEDICAL_CONDITIONS,
  MEAL_PATTERNS,
  templateSchema,
  type FoodItem,
  type MealReasonTag,
  type NutritionTemplate,
  type TemplateFormValues,
} from '@/lib/types/nutrition'
import {
  useFoods,
  useCreateTemplate,
  useUpdateTemplate,
  useUpdatePlan,
} from '@/hooks/use-nutrition'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ── Pure helpers ─────────────────────────────────────────────────────────────

function round(n: number) {
  return Math.round(n * 10) / 10
}

function scaleMacros(food: FoodItem, quantityG: number) {
  const base = food.basePer > 0 ? food.basePer : 100
  const factor = quantityG / base
  return {
    caloriesKcal: round(food.caloriesKcal * factor),
    proteinG: round(food.proteinG * factor),
    carbsG: round(food.carbsG * factor),
    fatG: round(food.fatG * factor),
  }
}

function newOption(index: number) {
  return {
    optionId: `opt-${Date.now()}-${index}`,
    label: `Option ${index + 1}`,
    isDefault: index === 0,
    items: [{ foodId: '', quantityG: 100 }],
  }
}

// ── OptionCard (one meal option — label + food items) ────────────────────────

interface OptionCardProps {
  dayIndex: number
  mealIndex: number
  optionIndex: number
  control: Control<TemplateFormValues>
  foods: FoodItem[]
  isDefault: boolean
  onSetDefault: () => void
  onRemove: () => void
}

function OptionCard({
  dayIndex,
  mealIndex,
  optionIndex,
  control,
  foods,
  isDefault,
  onSetDefault,
  onRemove,
}: OptionCardProps) {
  const { watch } = useFormContext<TemplateFormValues>()
  const base = `days.${dayIndex}.meals.${mealIndex}.options.${optionIndex}` as const

  const { fields, append, remove } = useFieldArray({
    control,
    name: `${base}.items` as `days.0.meals.0.options.0.items`,
  })

  const watchedItems = watch(`${base}.items` as `days.0.meals.0.options.0.items`) ?? []

  const kcal = useMemo(() => {
    return round(
      (watchedItems as { foodId: string; quantityG: number }[]).reduce(
        (acc, item) => {
          const food = foods.find((f) => f._id === item.foodId)
          if (!food || !(item.quantityG > 0)) return acc
          return acc + scaleMacros(food, item.quantityG).caloriesKcal
        },
        0
      )
    )
  }, [watchedItems, foods])

  return (
    <div className="rounded-md border bg-muted/20 p-3 space-y-3">
      {/* Option header: label + default toggle + remove */}
      <div className="flex items-center gap-2">
        <FormField
          control={control}
          name={`${base}.label` as `days.0.meals.0.options.0.label`}
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormControl>
                <Select
                  value={field.value ?? ''}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger className="h-7 text-sm">
                      <SelectValue placeholder={`Option ${optionIndex + 1}`} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Array.from({ length: 6 }).map((_, i) => {
                      const label = `Option ${i + 1}`
                      return (
                        <SelectItem key={label} value={label}>
                          {label}
                        </SelectItem>
                      )
                    })}
                    {field.value && !field.value.startsWith('Option') && (
                      <SelectItem key={field.value} value={field.value}>
                        {field.value}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </FormControl>
            </FormItem>
          )}
        />
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {kcal} kcal
        </span>
        <Button
          type="button"
          size="sm"
          variant={isDefault ? 'default' : 'outline'}
          className="h-7 px-2 text-xs shrink-0"
          onClick={onSetDefault}
        >
          {isDefault ? '✓ Default' : 'Set default'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 w-7 p-0 text-destructive shrink-0"
          onClick={onRemove}
        >
          <IconTrash className="h-3 w-3" />
        </Button>
      </div>

      {/* Food items */}
      {fields.map((f, ii) => (
        <div
          key={f.id}
          className="grid grid-cols-1 sm:grid-cols-[1fr_100px_auto] gap-2 items-end"
        >
          <FormField
            control={control}
            name={
              `${base}.items.${ii}.foodId` as `days.0.meals.0.options.0.items.0.foodId`
            }
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Food</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select food" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {foods.map((food) => (
                      <SelectItem key={food._id} value={food._id}>
                        <span className="flex items-center gap-1">
                          {food.isVeg && (
                            <IconLeaf className="h-3 w-3 text-green-600" />
                          )}
                          {food.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={
              `${base}.items.${ii}.quantityG` as `days.0.meals.0.options.0.items.0.quantityG`
            }
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Qty (g)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="any"
                    min={0}
                    className="h-8"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 text-destructive"
            onClick={() => remove(ii)}
          >
            <IconTrash className="h-3 w-3" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full h-7 text-xs"
        onClick={() => append({ foodId: '', quantityG: 100 })}
      >
        <IconPlus className="h-3 w-3 mr-1" /> Add food
      </Button>
    </div>
  )
}

// ── ClinicalMealCard ─────────────────────────────────────────────────────────

interface ClinicalMealCardProps {
  dayIndex: number
  mealIndex: number
  control: Control<TemplateFormValues>
  setValue: UseFormSetValue<TemplateFormValues>
  foods: FoodItem[]
  onRemove: () => void
}

function ClinicalMealCard({
  dayIndex,
  mealIndex,
  control,
  setValue,
  foods,
  onRemove,
}: ClinicalMealCardProps) {
  const { watch } = useFormContext<TemplateFormValues>()
  const [showReasoning, setShowReasoning] = useState(false)
  const base = `days.${dayIndex}.meals.${mealIndex}` as const

  const { fields: optFields, append: appendOpt, remove: removeOpt } =
    useFieldArray({
      control,
      name: `${base}.options` as `days.0.meals.0.options`,
    })

  const watchedTags =
    (watch(`${base}.reasoning.tags` as `days.0.meals.0.reasoning.tags`) as
      | MealReasonTag[]
      | undefined) ?? []

  const toggleTag = (tag: MealReasonTag) => {
    const next = watchedTags.includes(tag)
      ? watchedTags.filter((t) => t !== tag)
      : [...watchedTags, tag]
    setValue(
      `${base}.reasoning.tags` as `days.0.meals.0.reasoning.tags`,
      next,
      { shouldDirty: true }
    )
  }

  const setDefault = (oi: number) => {
    optFields.forEach((_, i) => {
      setValue(
        `${base}.options.${i}.isDefault` as `days.0.meals.0.options.0.isDefault`,
        i === oi,
        { shouldDirty: true }
      )
    })
  }

  // Derive which option is currently flagged as default
  const defaultFlagIndex = optFields.findIndex(
    (_, i) =>
      watch(
        `${base}.options.${i}.isDefault` as `days.0.meals.0.options.0.isDefault`
      ) === true
  )
  const effectiveDefaultIndex =
    defaultFlagIndex === -1 ? 0 : defaultFlagIndex

  return (
    <Card className="border-muted">
      <CardHeader className="pb-3 space-y-2">
        <div className="flex flex-wrap items-end gap-3">
          {/* Meal type */}
          <div className="w-44">
            <FormField
              control={control}
              name={`${base}.mealType` as `days.0.meals.0.mealType`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Meal type</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v)
                      setValue(
                        `${base}.name` as `days.0.meals.0.name`,
                        MEAL_TYPE_LABELS[v as keyof typeof MEAL_TYPE_LABELS] ??
                          v
                      )
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MEAL_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {MEAL_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>

          {/* Timeline slot */}
          <div className="w-48">
            <FormField
              control={control}
              name={
                `${base}.timelineSlot` as `days.0.meals.0.timelineSlot`
              }
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Timeline slot</FormLabel>
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(v) => {
                      field.onChange(v || null)
                      if (v) {
                        const mt =
                          TIMELINE_TO_MEALTYPE[
                            v as keyof typeof TIMELINE_TO_MEALTYPE
                          ]
                        if (mt) {
                          setValue(
                            `${base}.mealType` as `days.0.meals.0.mealType`,
                            mt
                          )
                          setValue(
                            `${base}.name` as `days.0.meals.0.name`,
                            TIMELINE_SLOT_LABELS[
                              v as keyof typeof TIMELINE_SLOT_LABELS
                            ] ?? mt
                          )
                        }
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Select slot" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TIMELINE_SLOTS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {TIMELINE_SLOT_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>

          {/* Time of day */}
          <div className="w-28">
            <FormField
              control={control}
              name={`${base}.timeOfDay` as `days.0.meals.0.timeOfDay`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Time</FormLabel>
                  <FormControl>
                    <Input
                      type="time"
                      className="h-8"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="ml-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive h-8"
              onClick={onRemove}
            >
              <IconTrash className="h-3.5 w-3.5 mr-1" /> Remove meal
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Reasoning collapsible */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs text-muted-foreground -mt-2"
          onClick={() => setShowReasoning((v) => !v)}
        >
          {showReasoning ? (
            <IconChevronUp className="h-3 w-3" />
          ) : (
            <IconChevronDown className="h-3 w-3" />
          )}
          Why this meal?
        </Button>

        {showReasoning && (
          <div className="rounded-md border p-3 space-y-3 bg-muted/10">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Reason tags
              </p>
              <div className="flex flex-wrap gap-1.5">
                {MEAL_REASON_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                      watchedTags.includes(tag)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input bg-background hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    {MEAL_REASON_TAG_LABELS[tag]}
                  </button>
                ))}
              </div>
            </div>
            <FormField
              control={control}
              name={
                `${base}.reasoning.rationale` as `days.0.meals.0.reasoning.rationale`
              }
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Meal Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="e.g. High-fibre breakfast to support insulin sensitivity…"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Options section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              Meal options
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                ({optFields.length})
              </span>
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => appendOpt(newOption(optFields.length))}
            >
              <IconPlus className="h-3 w-3 mr-1" /> Add option
            </Button>
          </div>

          {optFields.length === 0 && (
            <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground text-center">
              Add at least one meal option with foods, or switch to the Simple
              builder for flat item lists.
            </p>
          )}

          {optFields.map((of, oi) => (
            <OptionCard
              key={of.id}
              dayIndex={dayIndex}
              mealIndex={mealIndex}
              optionIndex={oi}
              control={control}
              foods={foods}
              isDefault={oi === effectiveDefaultIndex}
              onSetDefault={() => setDefault(oi)}
              onRemove={() => removeOpt(oi)}
            />
          ))}
        </div>

        {/* Validation message from superRefine */}
        <FormField
          control={control}
          name={`${base}.items` as `days.0.meals.0.items`}
          render={() => <FormMessage />}
        />
      </CardContent>
    </Card>
  )
}

// ── ClinicalDayCard ───────────────────────────────────────────────────────────

interface ClinicalDayCardProps {
  dayIndex: number
  control: Control<TemplateFormValues>
  setValue: UseFormSetValue<TemplateFormValues>
  foods: FoodItem[]
  onRemoveDay: () => void
}

function ClinicalDayCard({
  dayIndex,
  control,
  setValue,
  foods,
  onRemoveDay,
}: ClinicalDayCardProps) {
  const { watch } = useFormContext<TemplateFormValues>()
  const { fields: mealFields, append: appendMeal, remove: removeMeal } =
    useFieldArray({ control, name: `days.${dayIndex}.meals` })

  const selectedDays = watch(`days.${dayIndex}.selectedDays`) ?? []

  const toggleDay = (day: string) => {
    const next = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day]
    setValue(`days.${dayIndex}.selectedDays`, next, { shouldValidate: true, shouldDirty: true })
  }

  const toggleAll = () => {
    if (selectedDays.length === WEEKDAYS.length) {
      setValue(`days.${dayIndex}.selectedDays`, [], { shouldValidate: true, shouldDirty: true })
    } else {
      setValue(`days.${dayIndex}.selectedDays`, WEEKDAYS, { shouldValidate: true, shouldDirty: true })
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col space-y-4 pb-3">
        <div className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            Weekly Schedule
          </CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive"
            onClick={onRemoveDay}
          >
            <IconTrash className="h-4 w-4 mr-1" /> Remove day
          </Button>
        </div>
        
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {WEEKDAYS.map((day) => {
              const isSelected = selectedDays.includes(day)
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-background hover:bg-accent hover:text-accent-foreground border-input'
                  }`}
                >
                  {day}
                </button>
              )
            })}
            <button
              type="button"
              onClick={toggleAll}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors border border-input bg-muted/50 hover:bg-muted text-muted-foreground ml-2"
            >
              {selectedDays.length === WEEKDAYS.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <FormField
            control={control}
            name={`days.${dayIndex}.selectedDays`}
            render={() => <FormMessage />}
          />
          <p className="text-xs text-muted-foreground">
            Apply this meal structure to selected days
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {mealFields.map((mf, mi) => (
          <ClinicalMealCard
            key={mf.id}
            dayIndex={dayIndex}
            mealIndex={mi}
            control={control}
            setValue={setValue}
            foods={foods}
            onRemove={() => removeMeal(mi)}
          />
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            appendMeal({
              mealType: 'Breakfast',
              name: 'Breakfast',
              items: [],
              options: [newOption(0)],
            })
          }
        >
          <IconPlus className="h-4 w-4 mr-1" /> Add meal
        </Button>
      </CardContent>
    </Card>
  )
}

// ── LifestyleEditor ───────────────────────────────────────────────────────────

interface LifestyleEditorProps {
  control: Control<TemplateFormValues>
}

function LifestyleEditor({ control }: LifestyleEditorProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lifestyle',
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Lifestyle Recommendations</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sleep, hydration, recovery, and digestion guidance to accompany the
            plan
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append({ category: 'Hydration', title: '', detail: null })
          }
        >
          <IconPlus className="h-4 w-4 mr-1" /> Add
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No lifestyle recommendations yet.
          </p>
        )}
        {fields.map((f, i) => (
          <div key={f.id} className="rounded-lg border p-3 space-y-2 relative">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-2 h-6 w-6 p-0 text-destructive"
              onClick={() => remove(i)}
            >
              <IconTrash className="h-3 w-3" />
            </Button>
            <div className="grid grid-cols-2 gap-2 pr-8">
              <FormField
                control={control}
                name={`lifestyle.${i}.category`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Category</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LIFESTYLE_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {LIFESTYLE_CATEGORY_LABELS[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`lifestyle.${i}.title`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Title</FormLabel>
                    <FormControl>
                      <Input
                        className="h-8"
                        placeholder="e.g. Drink 8 glasses/day"
                        value={field.value ?? ''}
                        onChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={control}
              name={`lifestyle.${i}.detail`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Guidance</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="Supporting detail…"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ── ClinicalTemplateForm (top-level export) ───────────────────────────────────

interface ClinicalTemplateFormProps {
  template?: NutritionTemplate
  plan?: any // UserNutritionPlan, but imported lazily or type is close enough
  mode?: 'template' | 'plan'
}

export function ClinicalTemplateForm({
  template,
  plan,
  mode = 'template',
}: ClinicalTemplateFormProps) {
  const router = useRouter()
  const { data: foods = [] } = useFoods()
  const createTemplate = useCreateTemplate()
  const updateTemplate = useUpdateTemplate()
  const updatePlanMutation = useUpdatePlan()
  
  const sourceData = plan || template
  const isEdit = !!sourceData

  const defaultValues: TemplateFormValues = sourceData
    ? {
        name: sourceData.name,
        description: sourceData.description ?? '',
        goal: sourceData.goal,
        targetCaloriesKcal: sourceData.targetCaloriesKcal ?? undefined,
        targetMacros: sourceData.targetMacros ?? undefined,
        durationDays: sourceData.durationDays ?? 7,
        conditionTags: sourceData.conditionTags ?? [],
        foodPreference: (sourceData.conditionTags ?? []).find((t: string) => t.startsWith('pref:'))?.replace('pref:', ''),
        allergies: (sourceData.conditionTags ?? []).filter((t: string) => t.startsWith('allergy:')).map((t: string) => t.replace('allergy:', '')),
        medicalConditions: (sourceData.conditionTags ?? []).filter((t: string) => t.startsWith('medical:')).map((t: string) => t.replace('medical:', '')),
        mealPattern: (sourceData.conditionTags ?? []).find((t: string) => t.startsWith('pattern:'))?.replace('pattern:', '') || '3 Meals',
        lifestyle: sourceData.lifestyle ?? [],
        days: sourceData.days.map((d: any) => ({
          selectedDays: [WEEKDAYS[d.dayNumber % 7] ?? 'Mon'],
          meals: d.meals.map((m: any) => ({
            mealType: m.mealType,
            name: m.name,
            timeOfDay: m.timeOfDay ?? undefined,
            timelineSlot: m.timelineSlot ?? undefined,
            notes: m.notes ?? undefined,
            reasoning: m.reasoning,
            // If the template already has options, use them; otherwise synthesize
            // one option from the flat items so old templates open in clinical view.
            items: [],
            options: m.options?.length
              ? m.options.map((o: any) => ({
                  optionId: o.optionId ?? '',
                  label: o.label ?? 'Option 1',
                  isDefault: o.isDefault ?? false,
                  reasoning: o.reasoning,
                  items: o.items.map((item: any) => ({
                    foodId: item.foodId,
                    quantityG: item.quantityG,
                  })),
                }))
              : [
                  {
                    optionId: 'opt-legacy',
                    label: 'Option 1',
                    isDefault: true,
                    items: m.items.map((item: any) => ({
                      foodId: item.foodId,
                      quantityG: item.quantityG,
                    })),
                  },
                ],
          })),
        })),
      }
    : {
        name: '',
        description: '',
        goal: 'WeightLoss' as const,
        durationDays: 7,
        conditionTags: [],
        foodPreference: undefined,
        allergies: [],
        medicalConditions: [],
        mealPattern: '3 Meals',
        lifestyle: [],
        days: [
          {
            selectedDays: WEEKDAYS,
            meals: [
              {
                mealType: 'Breakfast' as const,
                name: 'Breakfast',
                items: [],
                options: [newOption(0)],
              },
            ],
          },
        ],
      }

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues,
  })

  const { fields: dayFields, append: appendDay, remove: removeDay } =
    useFieldArray({ control: form.control, name: 'days' })

  const watchedDays = form.watch('days')

  const onSubmit = async (values: TemplateFormValues) => {
    // Mirror default-option items into meal.items for backward compat with
    // backends that ignore the `options` field.
    const days = values.days.flatMap((day) => {
      return day.selectedDays.map((weekday) => {
        let dayNumber = WEEKDAYS.indexOf(weekday)
        if (dayNumber === 0) dayNumber = 7 // Sun
        
        return {
          dayNumber,
          meals: day.meals.map((meal) => {
          const opts = meal.options ?? []
          const defaultOpt = opts.find((o) => o.isDefault) ?? opts[0]
          const mirroredItems = defaultOpt?.items ?? meal.items ?? []
          return {
            mealType: meal.mealType,
            name: meal.name,
            timeOfDay: meal.timeOfDay || undefined,
            timelineSlot: meal.timelineSlot || undefined,
            notes: meal.notes || undefined,
            reasoning:
              meal.reasoning?.tags?.length || meal.reasoning?.rationale
                ? meal.reasoning
                : undefined,
            items: mirroredItems, // backward-compat flat mirror
            options: opts.length ? opts : undefined,
          }
        }),
      }
    })
    })

    const payload = {
      name: values.name,
      description: values.description || undefined,
      goal: values.goal,
      targetCaloriesKcal: values.targetCaloriesKcal ?? undefined,
      targetMacros: values.targetMacros,
      durationDays: values.durationDays,
      days,
      lifestyle: values.lifestyle?.length ? values.lifestyle : undefined,
      conditionTags: [
        ...(values.foodPreference ? [`pref:${values.foodPreference}`] : []),
        ...(values.allergies?.map(a => `allergy:${a}`) ?? []),
        ...(values.medicalConditions?.map(m => `medical:${m}`) ?? []),
        ...(values.mealPattern ? [`pattern:${values.mealPattern}`] : []),
      ].filter(Boolean),
    }

    if (mode === 'plan' && plan) {
      await updatePlanMutation.mutateAsync({ id: plan._id, payload })
      router.push('/admin/nutrition')
    } else if (isEdit && template) {
      await updateTemplate.mutateAsync({ id: template._id, payload })
      router.push('/admin/nutrition?tab=diet-plans')
    } else {
      await createTemplate.mutateAsync(payload)
      router.push('/admin/nutrition?tab=diet-plans')
    }
  }

  const isPending = createTemplate.isPending || updateTemplate.isPending || updatePlanMutation.isPending

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* ── User Diet Profile ────────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>
              {mode === 'plan' ? 'Edit Assigned Plan' : isEdit ? 'Edit Diet Plan' : 'Create Diet Plan'}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Create personalized meal plans based on goals, food preferences, allergies, and lifestyle.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Weight Loss Plan - Vegetarian"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="goal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Goal *</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select goal" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {NUTRITION_GOALS.map((g) => (
                          <SelectItem key={g} value={g}>
                            {NUTRITION_GOAL_LABELS[g]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="foodPreference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Food Preference</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select preference" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FOOD_PREFERENCES.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="mealPattern"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Daily Meal Pattern</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select pattern" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MEAL_PATTERNS.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional instructions (Optional)</FormLabel>
                    <FormControl>
                      <Textarea rows={1} placeholder="Special instructions for this plan..." {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4 pt-2">
              <FormField
                control={form.control}
                name="allergies"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allergies / Restrictions</FormLabel>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {ALLERGIES.map((allergy) => {
                        const isSelected = field.value?.includes(allergy)
                        return (
                          <Badge
                            key={allergy}
                            variant={isSelected ? 'default' : 'outline'}
                            className="cursor-pointer hover:bg-primary/90 hover:text-primary-foreground transition-colors"
                            onClick={() => {
                              const next = isSelected 
                                ? (field.value || []).filter((a: string) => a !== allergy)
                                : [...(field.value || []), allergy]
                              field.onChange(next)
                            }}
                          >
                            {allergy}
                          </Badge>
                        )
                      })}
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="medicalConditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medical / Health Conditions</FormLabel>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {MEDICAL_CONDITIONS.map((cond) => {
                        const isSelected = field.value?.includes(cond)
                        return (
                          <Badge
                            key={cond}
                            variant={isSelected ? 'default' : 'outline'}
                            className="cursor-pointer hover:bg-primary/90 hover:text-primary-foreground transition-colors"
                            onClick={() => {
                              const next = isSelected 
                                ? (field.value || []).filter((c: string) => c !== cond)
                                : [...(field.value || []), cond]
                              field.onChange(next)
                            }}
                          >
                            {cond}
                          </Badge>
                        )
                      })}
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Day cards ─────────────────────────────────────────────────── */}
        {dayFields.map((df, di) => (
          <ClinicalDayCard
            key={df.id}
            dayIndex={di}
            control={form.control}
            setValue={form.setValue}
            foods={foods}
            onRemoveDay={() => removeDay(di)}
          />
        ))}

        {/* ── Lifestyle recommendations ──────────────────────────────────── */}
        <LifestyleEditor control={form.control} />

        {/* ── Submit / navigation ───────────────────────────────────────── */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              appendDay({
                selectedDays: [],
                meals: [
                  {
                    mealType: 'Breakfast',
                    name: 'Breakfast',
                    items: [],
                    options: [newOption(0)],
                  },
                ],
              })
            }
          >
            <IconPlus className="h-4 w-4 mr-1" /> Add day
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending
              ? 'Saving…'
              : isEdit
              ? 'Save Changes'
              : 'Create Template'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push(mode === 'plan' ? '/admin/nutrition' : '/admin/nutrition?tab=diet-plans')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  )
}
