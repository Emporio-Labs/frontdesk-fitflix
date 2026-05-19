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
  MEAL_SLOTS,
  NUTRITION_GOALS,
  templateSchema,
  type FoodItem,
  type NutritionTemplate,
  type TemplateFormValues,
} from '@/lib/types/nutrition'
import { useFoods, useCreateTemplate, useUpdateTemplate } from '@/hooks/use-nutrition'

const EMPTY: TemplateFormValues = {
  name: '',
  description: '',
  goal: 'maintenance',
  meals: [{ slot: 'Breakfast', items: [] }],
}

function round(n: number) {
  return Math.round(n * 10) / 10
}

function scaleItem(food: FoodItem, quantity: number) {
  const factor = food.servingSize > 0 ? quantity / food.servingSize : 0
  return {
    foodId: food._id,
    foodName: food.name,
    unit: food.unit,
    quantity,
    calories: round(food.calories * factor),
    protein: round(food.protein * factor),
    carbs: round(food.carbs * factor),
    fat: round(food.fat * factor),
  }
}

interface MealCardProps {
  mealIndex: number
  control: Control<TemplateFormValues>
  setValue: UseFormSetValue<TemplateFormValues>
  foods: FoodItem[]
  onRemove: () => void
}

function MealCard({ mealIndex, control, setValue, foods, onRemove }: MealCardProps) {
  const { getValues } = useFormContext<TemplateFormValues>()
  const { fields, append, remove } = useFieldArray({
    control,
    name: `meals.${mealIndex}.items`,
  })

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="w-48">
          <FormField
            control={control}
            name={`meals.${mealIndex}.slot`}
            render={({ field }) => (
              <FormItem>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Meal slot" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MEAL_SLOTS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
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
        {fields.map((f, itemIndex) => (
          <div
            key={f.id}
            className="grid grid-cols-1 md:grid-cols-[1fr_120px_auto] gap-2 items-end"
          >
            <FormField
              control={control}
              name={`meals.${mealIndex}.items.${itemIndex}.foodId`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Food</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(foodId) => {
                      const food = foods.find((x) => x._id === foodId)
                      if (food) {
                        setValue(
                          `meals.${mealIndex}.items.${itemIndex}`,
                          scaleItem(food, food.servingSize),
                          { shouldValidate: true }
                        )
                      }
                    }}
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
              name={`meals.${mealIndex}.items.${itemIndex}.quantity`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Quantity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      {...field}
                      onChange={(e) => {
                        const qty = Number(e.target.value)
                        field.onChange(e)
                        const foodId = getValues(
                          `meals.${mealIndex}.items.${itemIndex}.foodId`
                        )
                        const food = foods.find((x) => x._id === foodId)
                        if (food && !Number.isNaN(qty)) {
                          setValue(
                            `meals.${mealIndex}.items.${itemIndex}`,
                            scaleItem(food, qty),
                            { shouldValidate: true }
                          )
                        }
                      }}
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
              className="text-red-500"
              onClick={() => remove(itemIndex)}
            >
              <IconTrash className="w-4 h-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append({
              foodId: '',
              foodName: '',
              quantity: 0,
              unit: '',
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0,
            })
          }
        >
          <IconPlus className="w-4 h-4 mr-1" /> Add food
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

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: template
      ? {
          name: template.name,
          description: template.description ?? '',
          goal: template.goal,
          meals: template.meals,
        }
      : EMPTY,
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'meals',
  })

  const watchedMeals = form.watch('meals')
  const totals = useMemo(() => {
    let calories = 0
    let protein = 0
    let carbs = 0
    let fat = 0
    for (const meal of watchedMeals ?? []) {
      for (const item of meal.items ?? []) {
        calories += Number(item.calories) || 0
        protein += Number(item.protein) || 0
        carbs += Number(item.carbs) || 0
        fat += Number(item.fat) || 0
      }
    }
    return {
      calories: round(calories),
      protein: round(protein),
      carbs: round(carbs),
      fat: round(fat),
    }
  }, [watchedMeals])

  const onSubmit = async (values: TemplateFormValues) => {
    const payload = {
      name: values.name,
      description: values.description,
      goal: values.goal,
      meals: values.meals,
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
                            {g.replace(/_/g, ' ')}
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
              <span>
                <strong>{totals.calories}</strong> kcal
              </span>
              <span>P: <strong>{totals.protein}g</strong></span>
              <span>C: <strong>{totals.carbs}g</strong></span>
              <span>F: <strong>{totals.fat}g</strong></span>
            </div>
          </CardContent>
        </Card>

        {fields.map((f, i) => (
          <MealCard
            key={f.id}
            mealIndex={i}
            control={form.control}
            setValue={form.setValue}
            foods={foods}
            onRemove={() => remove(i)}
          />
        ))}

        {typeof form.formState.errors.meals?.message === 'string' && (
          <p className="text-sm font-medium text-destructive">
            {form.formState.errors.meals.message}
          </p>
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => append({ slot: 'Snack', items: [] })}
          >
            <IconPlus className="w-4 h-4 mr-1" /> Add meal
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
