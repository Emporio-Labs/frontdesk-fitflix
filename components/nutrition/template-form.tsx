'use client'

import { useMemo } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IconPlus, IconTrash } from '@tabler/icons-react'
import {
  MEAL_TYPES,
  MEAL_TYPE_LABELS,
  NUTRITION_GOALS,
  NUTRITION_GOAL_LABELS,
  templateSchema,
  type FoodItem,
  type NutritionTemplate,
  type TemplateFormValues,
} from '@/lib/types/nutrition'
import { useFoods, useCreateTemplate, useUpdateTemplate } from '@/hooks/use-nutrition'

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

interface MealCardProps {
  dayIndex: number
  mealIndex: number
  control: Control<TemplateFormValues>
  setValue: UseFormSetValue<TemplateFormValues>
  foods: FoodItem[]
  onRemove: () => void
}

function MealCard({ dayIndex, mealIndex, control, setValue, foods, onRemove }: MealCardProps) {
  const { getValues, watch } = useFormContext<TemplateFormValues>()
  const { fields, append, remove } = useFieldArray({
    control,
    name: `days.${dayIndex}.meals.${mealIndex}.items`,
  })

  const watchedItems = watch(`days.${dayIndex}.meals.${mealIndex}.items`)

  const mealMacros = useMemo(() => {
    let caloriesKcal = 0, proteinG = 0, carbsG = 0, fatG = 0
    for (const item of watchedItems ?? []) {
      const food = foods.find((f) => f._id === item.foodId)
      if (food && item.quantityG > 0) {
        const scaled = scaleMacros(food, item.quantityG)
        caloriesKcal += scaled.caloriesKcal
        proteinG += scaled.proteinG
        carbsG += scaled.carbsG
        fatG += scaled.fatG
      }
    }
    return { caloriesKcal: round(caloriesKcal), proteinG: round(proteinG), carbsG: round(carbsG), fatG: round(fatG) }
  }, [watchedItems, foods])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-48">
            <FormField
              control={control}
              name={`days.${dayIndex}.meals.${mealIndex}.mealType`}
              render={({ field }) => (
                <FormItem>
                  <Select value={field.value} onValueChange={(v) => {
                    field.onChange(v)
                    setValue(`days.${dayIndex}.meals.${mealIndex}.name`, MEAL_TYPE_LABELS[v as keyof typeof MEAL_TYPE_LABELS] ?? v)
                  }}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Meal type" />
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
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <span className="text-xs text-muted-foreground">
            {mealMacros.caloriesKcal} kcal | P:{mealMacros.proteinG}g C:{mealMacros.carbsG}g F:{mealMacros.fatG}g
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-red-500"
          onClick={onRemove}
        >
          <IconTrash className="w-4 h-4 mr-1" /> Remove meal
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground">No foods added to this meal.</p>
        )}
        {fields.map((f, itemIndex) => {
          const foodId = getValues(`days.${dayIndex}.meals.${mealIndex}.items.${itemIndex}.foodId`)
          const qty = getValues(`days.${dayIndex}.meals.${mealIndex}.items.${itemIndex}.quantityG`)
          const food = foods.find((x) => x._id === foodId)
          const itemMacros = food && qty > 0 ? scaleMacros(food, qty) : null

          return (
            <div
              key={f.id}
              className="grid grid-cols-1 md:grid-cols-[1fr_120px_auto_auto] gap-2 items-end"
            >
              <FormField
                control={control}
                name={`days.${dayIndex}.meals.${mealIndex}.items.${itemIndex}.foodId`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Food</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select food" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {foods.map((food) => (
                          <SelectItem key={food._id} value={food._id}>
                            {food.name}
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
                name={`days.${dayIndex}.meals.${mealIndex}.items.${itemIndex}.quantityG`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Quantity (g)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        min={0}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {itemMacros && (
                <span className="text-xs text-muted-foreground whitespace-nowrap pb-2">
                  {itemMacros.caloriesKcal} kcal
                </span>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-red-500"
                onClick={() => remove(itemIndex)}
              >
                <IconTrash className="w-4 h-4" />
              </Button>
            </div>
          )
        })}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append({ foodId: '', quantityG: 100 })
          }
        >
          <IconPlus className="w-4 h-4 mr-1" /> Add food
        </Button>
      </CardContent>
    </Card>
  )
}

interface DayCardProps {
  dayIndex: number
  control: Control<TemplateFormValues>
  setValue: UseFormSetValue<TemplateFormValues>
  foods: FoodItem[]
  onRemoveDay: () => void
}

function DayCard({ dayIndex, control, setValue, foods, onRemoveDay }: DayCardProps) {
  const { fields: mealFields, append: appendMeal, remove: removeMeal } = useFieldArray({
    control,
    name: `days.${dayIndex}.meals`,
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">
          <FormField
            control={control}
            name={`days.${dayIndex}.dayNumber`}
            render={({ field }) => (
              <span className="flex items-center gap-2">
                Day
                <Input
                  type="number"
                  className="w-16 h-7 text-sm"
                  min={1}
                  max={366}
                  {...field}
                />
              </span>
            )}
          />
        </CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-red-500"
          onClick={onRemoveDay}
        >
          <IconTrash className="w-4 h-4 mr-1" /> Remove day
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {mealFields.map((mf, mi) => (
          <MealCard
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
              mealType: 'Snack',
              name: 'Snack',
              items: [],
              options: [],
            })
          }
        >
          <IconPlus className="w-4 h-4 mr-1" /> Add meal
        </Button>
      </CardContent>
    </Card>
  )
}

interface TemplateFormProps {
  template?: NutritionTemplate
}

export function TemplateForm({ template }: TemplateFormProps) {
  const router = useRouter()
  const { data: foods = [] } = useFoods()
  const createTemplate = useCreateTemplate()
  const updateTemplate = useUpdateTemplate()
  const isEdit = !!template

  const defaultValues: TemplateFormValues = template
    ? {
        name: template.name,
        description: template.description ?? '',
        goal: template.goal,
        targetCaloriesKcal: template.targetCaloriesKcal ?? undefined,
        targetMacros: template.targetMacros ?? undefined,
        durationDays: template.durationDays ?? 7,
        days: template.days.map((d) => ({
          dayNumber: d.dayNumber,
          meals: d.meals.map((m) => ({
            mealType: m.mealType,
            name: m.name,
            timeOfDay: m.timeOfDay ?? undefined,
            notes: m.notes ?? undefined,
            items: m.items.map((item) => ({
              foodId: item.foodId,
              quantityG: item.quantityG,
            })),
            options: [],
          })),
        })),
        lifestyle: [],
      }
    : {
        name: '',
        description: '',
        goal: 'Maintenance' as const,
        durationDays: 7,
        lifestyle: [],
        days: [
          {
            dayNumber: 1,
            meals: [{ mealType: 'Breakfast' as const, name: 'Breakfast', items: [], options: [] }],
          },
        ],
      }

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues,
  })

  const { fields: dayFields, append: appendDay, remove: removeDay } = useFieldArray({
    control: form.control,
    name: 'days',
  })

  const watchedDays = form.watch('days')

  const totals = useMemo(() => {
    let caloriesKcal = 0, proteinG = 0, carbsG = 0, fatG = 0
    for (const day of watchedDays ?? []) {
      for (const meal of day.meals ?? []) {
        for (const item of meal.items ?? []) {
          const food = foods.find((f) => f._id === item.foodId)
          if (food && item.quantityG > 0) {
            const scaled = scaleMacros(food, item.quantityG)
            caloriesKcal += scaled.caloriesKcal
            proteinG += scaled.proteinG
            carbsG += scaled.carbsG
            fatG += scaled.fatG
          }
        }
      }
    }
    const numDays = (watchedDays?.length || 1)
    return {
      caloriesKcal: round(caloriesKcal / numDays),
      proteinG: round(proteinG / numDays),
      carbsG: round(carbsG / numDays),
      fatG: round(fatG / numDays),
    }
  }, [watchedDays, foods])

  const onSubmit = async (values: TemplateFormValues) => {
    const payload = {
      name: values.name,
      description: values.description || undefined,
      goal: values.goal,
      targetCaloriesKcal: values.targetCaloriesKcal ?? undefined,
      targetMacros: values.targetMacros,
      durationDays: values.durationDays,
      days: values.days.map((d) => ({
        dayNumber: d.dayNumber,
        meals: d.meals.map((m) => ({
          mealType: m.mealType,
          name: m.name,
          timeOfDay: m.timeOfDay || undefined,
          notes: m.notes || undefined,
          items: m.items.map((item) => ({
            foodId: item.foodId,
            quantityG: item.quantityG,
          })),
        })),
      })),
    }
    if (isEdit && template) {
      await updateTemplate.mutateAsync({ id: template._id, payload })
    } else {
      await createTemplate.mutateAsync(payload)
    }
    router.push('/admin/nutrition/templates')
  }

  const isPending = createTemplate.isPending || updateTemplate.isPending

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{isEdit ? 'Edit Template' : 'New Template'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="High-protein cut" {...field} />
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
                    <Select value={field.value} onValueChange={field.onChange}>
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
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-wrap gap-4 rounded-lg border p-3 text-sm">
              <span>Avg/day:</span>
              <span>
                <strong>{totals.caloriesKcal}</strong> kcal
              </span>
              <span>P: <strong>{totals.proteinG}g</strong></span>
              <span>C: <strong>{totals.carbsG}g</strong></span>
              <span>F: <strong>{totals.fatG}g</strong></span>
            </div>
          </CardContent>
        </Card>

        {dayFields.map((df, di) => (
          <DayCard
            key={df.id}
            dayIndex={di}
            control={form.control}
            setValue={form.setValue}
            foods={foods}
            onRemoveDay={() => removeDay(di)}
          />
        ))}

        {typeof form.formState.errors.days?.message === 'string' && (
          <p className="text-sm font-medium text-destructive">
            {form.formState.errors.days.message}
          </p>
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              appendDay({
                dayNumber: (watchedDays?.length ?? 0) + 1,
                meals: [{ mealType: 'Breakfast', name: 'Breakfast', items: [], options: [] }],
              })
            }
          >
            <IconPlus className="w-4 h-4 mr-1" /> Add day
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Template'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push('/admin/nutrition/templates')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  )
}
