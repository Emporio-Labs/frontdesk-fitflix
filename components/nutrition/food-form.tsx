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
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  foodSchema,
  type FoodFormValues,
  type FoodItem,
  MEAL_TYPES,
  MEAL_TYPE_LABELS,
  DIETARY_PREFERENCES,
  DIETARY_PREFERENCE_LABELS,
} from '@/lib/types/nutrition'
import { useCreateFood, useUpdateFood } from '@/hooks/use-nutrition'

const EMPTY: FoodFormValues = {
  name: '',
  brand: '',
  basePer: 100,
  servingLabel: '100 g',
  caloriesKcal: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  fiberG: null,
  sugarG: null,
  barcode: '',
  isVeg: null,
  allergens: [],
  mealTypes: [],
  foodTags: [],
  dietaryPreferences: [],
}

const VEG_UNSET = '__unset__'

function csvToArray(v: string): string[] {
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function toggle<T>(list: T[] | undefined, value: T): T[] {
  const arr = list ?? []
  return arr.includes(value)
    ? arr.filter((v) => v !== value)
    : [...arr, value]
}

interface FoodFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  food?: FoodItem | null
}

export function FoodForm({ open, onOpenChange, food }: FoodFormProps) {
  const createFood = useCreateFood()
  const updateFood = useUpdateFood()
  const isEdit = !!food

  const form = useForm<FoodFormValues>({
    resolver: zodResolver(foodSchema),
    defaultValues: EMPTY,
  })

  useEffect(() => {
    if (open) {
      form.reset(
        food
          ? {
              name: food.name,
              brand: food.brand ?? '',
              basePer: food.basePer,
              servingLabel: food.servingLabel ?? '100 g',
              caloriesKcal: food.caloriesKcal,
              proteinG: food.proteinG,
              carbsG: food.carbsG,
              fatG: food.fatG,
              fiberG: food.fiberG ?? null,
              sugarG: food.sugarG ?? null,
              barcode: food.barcode ?? '',
              isVeg: food.isVeg ?? null,
              allergens: food.allergens ?? [],
              mealTypes: food.mealTypes ?? [],
              foodTags: food.foodTags ?? [],
              dietaryPreferences: food.dietaryPreferences ?? [],
            }
          : EMPTY
      )
    }
  }, [open, food, form])

  const onSubmit = async (values: FoodFormValues) => {
    if (isEdit && food) {
      await updateFood.mutateAsync({ id: food._id, payload: values })
    } else {
      await createFood.mutateAsync(values)
    }
    onOpenChange(false)
  }

  const isPending = createFood.isPending || updateFood.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Food' : 'Add Food'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Grilled chicken breast" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>
                    <FormControl>
                      <Input placeholder="Generic" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Barcode</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="basePer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Per (g)</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="servingLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serving Label</FormLabel>
                    <FormControl>
                      <Input placeholder="100 g" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="caloriesKcal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Calories (kcal) *</FormLabel>
                  <FormControl>
                    <Input type="number" step="any" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="proteinG"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Protein (g) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="carbsG"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carbs (g) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fatG"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fat (g) *</FormLabel>
                    <FormControl>
                      <Input type="number" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="fiberG"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fiber (g)</FormLabel>
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
              <FormField
                control={form.control}
                name="sugarG"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sugar (g)</FormLabel>
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
            </div>
            <div className="space-y-4 rounded-lg border p-3">
              <p className="text-sm font-medium">Clinical metadata</p>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="isVeg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Veg / Non-Veg</FormLabel>
                      <Select
                        value={
                          field.value === true
                            ? 'veg'
                            : field.value === false
                              ? 'nonveg'
                              : VEG_UNSET
                        }
                        onValueChange={(v) =>
                          field.onChange(
                            v === 'veg'
                              ? true
                              : v === 'nonveg'
                                ? false
                                : null
                          )
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={VEG_UNSET}>Unspecified</SelectItem>
                          <SelectItem value="veg">Vegetarian</SelectItem>
                          <SelectItem value="nonveg">Non-Vegetarian</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="allergens"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Allergens</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Dairy, Gluten, Nuts"
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
              </div>
              <FormField
                control={form.control}
                name="foodTags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="HighProtein, LowGI, AntiInflammatory"
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
                name="mealTypes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Suitable Meal Types</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {MEAL_TYPES.map((mt) => {
                        const active = (field.value ?? []).includes(mt)
                        return (
                          <Button
                            key={mt}
                            type="button"
                            size="sm"
                            variant={active ? 'default' : 'outline'}
                            onClick={() =>
                              field.onChange(toggle(field.value, mt))
                            }
                          >
                            {MEAL_TYPE_LABELS[mt]}
                          </Button>
                        )
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dietaryPreferences"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dietary Preferences</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {DIETARY_PREFERENCES.map((dp) => {
                        const active = (field.value ?? []).includes(dp)
                        return (
                          <Button
                            key={dp}
                            type="button"
                            size="sm"
                            variant={active ? 'default' : 'outline'}
                            onClick={() =>
                              field.onChange(toggle(field.value, dp))
                            }
                          >
                            {DIETARY_PREFERENCE_LABELS[dp]}
                          </Button>
                        )
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Food'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
