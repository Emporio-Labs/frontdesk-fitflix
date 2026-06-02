'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { IconPlus, IconTrash, IconSparkles, IconLeaf } from '@tabler/icons-react'
import { MEAL_TYPES, MEAL_TYPE_LABELS, UserNutritionPlan } from '@/lib/types/nutrition'
import { useFoods, useRecipes, useUpdatePlan } from '@/hooks/use-nutrition'
import { nutritionService } from '@/lib/services/nutrition.service'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const targetedMealSchema = z.object({
  selectedDays: z.array(z.string()).min(1, 'Select at least one day'),
  mealType: z.enum(MEAL_TYPES),
  timeOfDay: z.string().optional(),
  items: z.array(
    z.object({
      foodId: z.string().min(1, 'Select a food'),
      quantityG: z.coerce.number().positive('Must be > 0'),
    })
  ).min(1, 'Add at least one food item'),
})

type TargetedMealFormValues = z.infer<typeof targetedMealSchema>

interface TargetedMealEditorProps {
  plan: UserNutritionPlan
  onSuccess: () => void
  onCancel: () => void
}

export function TargetedMealEditor({ plan, onSuccess, onCancel }: TargetedMealEditorProps) {
  const { data: foods = [] } = useFoods()
  const { data: recipes = [] } = useRecipes()
  const updatePlan = useUpdatePlan()

  const form = useForm<TargetedMealFormValues>({
    resolver: zodResolver(targetedMealSchema),
    defaultValues: {
      selectedDays: [],
      mealType: 'Breakfast',
      timeOfDay: '',
      items: [{ foodId: '', quantityG: 100 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const selectedDays = form.watch('selectedDays')

  const toggleDay = (day: string) => {
    const next = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day]
    form.setValue('selectedDays', next, { shouldValidate: true })
  }

  const onSubmit = async (values: TargetedMealFormValues) => {
    // 1. Clone the days array
    const updatedDays = JSON.parse(JSON.stringify(plan.days))

    // 2. For each selected day, update or append the specific meal
    values.selectedDays.forEach((weekday) => {
      let dayNumber = WEEKDAYS.indexOf(weekday)
      if (dayNumber === 0) dayNumber = 7 // Sun maps to 7 by our convention (or 0, let's stick to 1-7, Mon=1)
      if (dayNumber === -1) return

      let dayObj = updatedDays.find((d: any) => d.dayNumber === dayNumber)
      if (!dayObj) {
        dayObj = { dayNumber, meals: [] }
        updatedDays.push(dayObj)
      }

      const mealObj = {
        mealType: values.mealType,
        name: MEAL_TYPE_LABELS[values.mealType],
        timeOfDay: values.timeOfDay || undefined,
        items: values.items.map((item) => ({
          foodId: item.foodId,
          quantityG: item.quantityG,
        })),
      }

      const existingMealIndex = dayObj.meals.findIndex(
        (m: any) => m.mealType === values.mealType
      )
      if (existingMealIndex >= 0) {
        // Retain other properties of the meal (options, notes) if any, but replace items
        dayObj.meals[existingMealIndex] = {
          ...dayObj.meals[existingMealIndex],
          ...mealObj,
        }
      } else {
        dayObj.meals.push(mealObj)
      }
    })

    // 3. Submit
    await updatePlan.mutateAsync({
      id: plan._id,
      payload: { days: updatedDays },
    })

    onSuccess()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <div>
            <FormLabel>Apply to Days</FormLabel>
            <div className="flex flex-wrap gap-2 mt-2">
              {WEEKDAYS.map((day) => {
                const isSelected = selectedDays.includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors border ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-background hover:bg-accent hover:text-accent-foreground border-input'
                    }`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
            {form.formState.errors.selectedDays && (
              <p className="text-[0.8rem] font-medium text-destructive mt-1">
                {form.formState.errors.selectedDays.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="mealType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meal</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select meal" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MEAL_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {MEAL_TYPE_LABELS[type]}
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
              name="timeOfDay"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time (Optional)</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-3">
            <FormLabel>Foods</FormLabel>
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-2">
                <FormField
                  control={form.control}
                  name={`items.${index}.foodId`}
                  render={({ field: f }) => (
                    <FormItem className="flex-1">
                      <Select
                        value={f.value}
                        onValueChange={async (val) => {
                          if (val.startsWith('recipe:')) {
                            const recipeId = val.replace('recipe:', '')
                            try {
                              const res = await nutritionService.getRecipeWithIngredients(recipeId)
                              if (res?.ingredients?.length) {
                                const firstIng = res.ingredients[0]
                                if (firstIng?.foodId) {
                                  f.onChange(firstIng.foodId)
                                  form.setValue(`items.${index}.quantityG` as `items.0.quantityG`, firstIng.quantity ?? 100, { shouldDirty: true })
                                }
                                res.ingredients.slice(1).forEach((ing) => {
                                  if (ing.foodId) {
                                    append({ foodId: ing.foodId, quantityG: ing.quantity ?? 100 })
                                  }
                                })
                              }
                            } catch (e) {
                              console.error("Failed to load recipe ingredients:", e)
                            }
                          } else {
                            f.onChange(val)
                          }
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a food" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Individual Foods</SelectLabel>
                            {foods.map((food) => (
                              <SelectItem key={food._id} value={food._id}>
                                <span className="flex items-center gap-1">
                                  {food.isVeg && (
                                    <IconLeaf className="h-3 w-3 text-green-600" />
                                  )}
                                  {food.name} ({food.servingLabel})
                                </span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                          <SelectGroup>
                            <SelectLabel>Recipes</SelectLabel>
                            {recipes.map((r) => (
                              <SelectItem key={r._id} value={`recipe:${r._id}`}>
                                <span className="flex items-center gap-1 text-primary">
                                  <IconSparkles className="h-3 w-3" />
                                  {r.name}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.quantityG`}
                  render={({ field: f }) => (
                    <FormItem className="w-24">
                      <FormControl>
                        <Input type="number" placeholder="Qty" {...f} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="text-destructive shrink-0"
                  onClick={() => remove(index)}
                >
                  <IconTrash className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ foodId: '', quantityG: 100 })}
            >
              <IconPlus className="h-4 w-4 mr-1" /> Add Food
            </Button>
            {form.formState.errors.items?.root?.message && (
              <p className="text-[0.8rem] font-medium text-destructive mt-1">
                {form.formState.errors.items.root.message}
              </p>
            )}
            {form.formState.errors.items?.message && (
              <p className="text-[0.8rem] font-medium text-destructive mt-1">
                {form.formState.errors.items.message}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={updatePlan.isPending}>
            {updatePlan.isPending ? 'Saving...' : 'Save Updates'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
