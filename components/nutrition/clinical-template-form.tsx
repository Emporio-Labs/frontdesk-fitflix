'use client'

import { useEffect, useMemo, useState } from 'react'
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
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  IconPlus,
  IconTrash,
  IconChevronDown,
  IconChevronUp,
  IconLeaf,
  IconSparkles,
  IconFlame,
  IconMeat,
  IconBread,
  IconButterfly,
  IconDroplet,
  IconSearch,
} from '@tabler/icons-react'
import {
  MEAL_TYPES,
  MEAL_TYPE_LABELS,
  TIMELINE_SLOTS,
  TIMELINE_SLOT_LABELS,
  TIMELINE_TO_MEALTYPE,
  MEALTYPE_TO_TIMELINE,
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
  type Recipe,
} from '@/lib/types/nutrition'
import { type NutritionTargetValues } from './nutrition-target-cards'
import {
  useFoods,
  useRecipes,
  useCreateTemplate,
  useUpdateTemplate,
  useUpdatePlan,
  useAssignPlan,
  useNutritionAssessment,
  useNutritionTemplates,
} from '@/hooks/use-nutrition'
import { useUser } from '@/hooks/use-users'
import { toast } from 'sonner'
import { computeBmi, getBmiCategory } from '@/lib/health-insights'
import { computeNutritionTargets, profileFromUser } from '@/lib/nutrition/derive-targets'
import { nutritionService } from '@/lib/services/nutrition.service'

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

function serializeMeals(meals: any[]) {
  if (!meals) return ''
  return JSON.stringify(meals.map(m => ({
    mealType: m.mealType,
    name: m.name,
    timeOfDay: m.timeOfDay,
    timelineSlot: m.timelineSlot,
    notes: m.notes,
    reasoning: m.reasoning,
    options: m.options?.map((o: any) => ({
      title: o.title || o.label,
      isDefault: o.isDefault,
      reasoning: o.reasoning,
      recipeId: o.recipeId,
      recipeName: o.recipeName,
      foods: (o.foods || o.items || []).map((f: any) => ({
        foodId: f.foodId,
        quantityG: f.quantityG,
        recipeSource: f.recipeSource
      }))
    })) || m.items?.map((item: any) => ({
      foodId: item.foodId,
      quantityG: item.quantityG
    }))
  })))
}

function groupDaysByMeals(days: any[]): any[] {
  const groups: { [serialized: string]: { dayNumbers: number[], meals: any[] } } = {}
  days.forEach((day) => {
    const serialized = serializeMeals(day.meals)
    if (!groups[serialized]) {
      groups[serialized] = {
        dayNumbers: [],
        meals: day.meals
      }
    }
    groups[serialized].dayNumbers.push(day.dayNumber)
  })

  return Object.values(groups).map((g) => {
    const getWeekday = (num: number) => {
      const idx = num === 7 ? 0 : num
      return WEEKDAYS[idx] || 'Mon'
    }

    return {
      selectedDays: g.dayNumbers.map(getWeekday),
      meals: g.meals.map((m: any) => ({
        mealType: m.mealType,
        name: m.name,
        timeOfDay: m.timeOfDay ?? undefined,
        timelineSlot: m.timelineSlot ?? undefined,
        notes: m.notes ?? undefined,
        reasoning: m.reasoning,
        items: [],
        options: m.options?.length
          ? m.options.map((o: any, oIdx: number) => ({
              optionId: o.optionId || `opt-${Date.now()}-${oIdx}`,
              label: o.title || o.label || `Option ${oIdx + 1}`,
              isDefault: o.isDefault ?? false,
              reasoning: o.reasoning,
              recipeId: o.recipeId,
              recipeName: o.recipeName,
              items: (o.foods || o.items || []).map((item: any) => ({
                foodId: item.foodId,
                quantityG: item.quantityG,
                recipeSource: item.recipeSource,
              })),
            }))
          : [
              {
                optionId: 'opt-legacy',
                label: 'Option 1',
                isDefault: true,
                items: (m.items || []).map((item: any) => ({
                  foodId: item.foodId,
                  quantityG: item.quantityG,
                })),
              },
            ],
      }))
    }
  })
}

// ── IngredientRow (single ingredient inside table grid) ──────────────────────

interface IngredientRowProps {
  mi: number
  activeOi: number
  itemIdx: number
  control: Control<TemplateFormValues>
  foods: FoodItem[]
  onRemove: () => void
}

function IngredientRow({
  mi,
  activeOi,
  itemIdx,
  control,
  foods,
  onRemove,
}: IngredientRowProps) {
  const { watch } = useFormContext<TemplateFormValues>()
  const base = `days.0.meals.${mi}.options.${activeOi}.items.${itemIdx}` as const

  const foodId = watch(`${base}.foodId` as any)
  const quantityG = watch(`${base}.quantityG` as any) ?? 100

  const food = foods.find((f) => f._id === foodId)
  const calories = food ? scaleMacros(food, quantityG).caloriesKcal : 0

  return (
    <div className="grid grid-cols-[1fr_120px_100px_auto] gap-3 items-center">
      <FormField
        control={control}
        name={`${base}.foodId` as any}
        render={({ field }) => (
          <FormItem className="space-y-0">
            <Select value={field.value ?? ''} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select food" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Foods</SelectLabel>
                  {foods.map((food) => (
                    <SelectItem key={food._id} value={food._id}>
                      <span className="flex items-center gap-1 text-xs">
                        {food.isVeg && <IconLeaf className="h-3.5 w-3.5 text-green-600 inline shrink-0" />}
                        {food.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={`${base}.quantityG` as any}
        render={({ field }) => (
          <FormItem className="space-y-0">
            <div className="relative flex items-center">
              <Input
                type="number"
                min={0}
                className="h-9 pr-6 text-xs font-medium"
                {...field}
                onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))}
              />
              <span className="absolute right-2.5 text-[10px] text-muted-foreground font-bold uppercase pointer-events-none">g</span>
            </div>
          </FormItem>
        )}
      />

      <div className="text-xs font-semibold text-foreground bg-muted/40 rounded border h-9 px-2 flex items-center justify-center whitespace-nowrap">
        {calories} kcal
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 text-destructive hover:bg-destructive/10 shrink-0"
        onClick={onRemove}
      >
        <IconTrash className="h-4 w-4" />
      </Button>
    </div>
  )
}

// ── OptionIngredientsEditor (manages ingredients collection) ─────────────────

interface OptionIngredientsEditorProps {
  mi: number
  activeOi: number
  control: Control<TemplateFormValues>
  foods: FoodItem[]
  onOpenLibraryForAppend: (mi: number, activeOi: number) => void
}

function OptionIngredientsEditor({
  mi,
  activeOi,
  control,
  foods,
  onOpenLibraryForAppend,
}: OptionIngredientsEditorProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `days.0.meals.${mi}.options.${activeOi}.items` as any,
  })
  const { watch } = useFormContext<TemplateFormValues>()

  // Group items by recipeSource, preserving order
  const groups = useMemo(() => {
    const result: { source: string | undefined; indices: number[] }[] = []
    let lastSource: string | undefined | null = null

    fields.forEach((field, idx) => {
      const src = (field as any).recipeSource as string | undefined
      if (src !== lastSource || result.length === 0) {
        result.push({ source: src, indices: [idx] })
        lastSource = src
      } else {
        result[result.length - 1].indices.push(idx)
      }
    })
    return result
  }, [fields])

  // Calculate per-group kcal subtotals
  const watchedItems = watch(`days.0.meals.${mi}.options.${activeOi}.items` as any) ?? []

  return (
    <div className="space-y-3 pt-2">
      {fields.length === 0 && (
        <p className="text-xs text-muted-foreground italic">No ingredients added. Click below to add one.</p>
      )}
      {groups.map((group, gi) => {
        const groupKcal = group.indices.reduce((acc, idx) => {
          const item = (watchedItems as any[])[idx]
          if (!item) return acc
          const food = foods.find((f) => f._id === item.foodId)
          if (!food || !(item.quantityG > 0)) return acc
          return acc + scaleMacros(food, item.quantityG).caloriesKcal
        }, 0)

        return (
          <div key={`group-${gi}`} className="space-y-2">
            {/* Group header */}
            <div className="flex items-center gap-2 pt-1">
              <div className={`h-px flex-1 ${
                group.source
                  ? 'bg-[#0D9488]/20'
                  : 'bg-muted-foreground/15'
              }`} />
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border shrink-0 flex items-center gap-1.5 ${
                group.source
                  ? 'text-[#0D9488] bg-[#0D9488]/5 border-[#0D9488]/15'
                  : 'text-muted-foreground bg-muted/40 border-muted-foreground/10'
              }`}>
                {group.source || 'Manual'}
                <span className="text-[9px] font-bold opacity-70">{Math.round(groupKcal)} kcal</span>
              </span>
              <div className={`h-px flex-1 ${
                group.source
                  ? 'bg-[#0D9488]/20'
                  : 'bg-muted-foreground/15'
              }`} />
            </div>
            {/* Ingredient rows for this group */}
            {group.indices.map((itemIdx) => (
              <IngredientRow
                key={fields[itemIdx].id}
                mi={mi}
                activeOi={activeOi}
                itemIdx={itemIdx}
                control={control}
                foods={foods}
                onRemove={() => remove(itemIdx)}
              />
            ))}
          </div>
        )
      })}
      <div className="flex flex-wrap gap-2 mt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs flex items-center gap-1 text-primary font-bold hover:bg-muted"
          onClick={() => append({ foodId: '', quantityG: 100 })}
        >
          <IconPlus className="h-3 w-3 mr-1" /> Add Ingredient
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs flex items-center gap-1 text-[#0D9488] font-bold border-[#0D9488]/30 hover:bg-[#0D9488]/5"
          onClick={() => onOpenLibraryForAppend(mi, activeOi)}
        >
          <IconPlus className="h-3 w-3 mr-1" /> Add Meal / Recipe
        </Button>
      </div>
    </div>
  )
}

// ── MealSlotCard (one itinerary meal block, expandable) ──────────────────────

interface MealSlotCardProps {
  mi: number
  control: Control<TemplateFormValues>
  setValue: UseFormSetValue<TemplateFormValues>
  foods: FoodItem[]
  recipes: Recipe[]
  onRemove: () => void
  onOpenLibrary: (mi: number, activeOi: number) => void
  onOpenLibraryForAppend: (mi: number, activeOi: number) => void
}

function MealSlotCard({
  mi,
  control,
  setValue,
  foods,
  recipes,
  onRemove,
  onOpenLibrary,
  onOpenLibraryForAppend,
}: MealSlotCardProps) {
  const { watch, getValues } = useFormContext<TemplateFormValues>()
  const [expanded, setExpanded] = useState(true)
  const [activeOi, setActiveOi] = useState(0)

  const base = `days.0.meals.${mi}` as const

  const mealType = watch(`${base}.mealType` as any)
  const name = watch(`${base}.name` as any)
  const timelineSlot = watch(`${base}.timelineSlot` as any)

  const { fields: optFields, append: appendOpt, remove: removeOpt } = useFieldArray({
    control,
    name: `${base}.options` as any,
  })

  const safeActiveOi = activeOi >= optFields.length ? 0 : activeOi
  const currentOpt = optFields[safeActiveOi]

  const currentOptItems = watch(`${base}.options.${safeActiveOi}.items` as any) ?? []
  const watchedRecipeId = watch(`${base}.options.${safeActiveOi}.recipeId` as any)
  const watchedRecipeName = watch(`${base}.options.${safeActiveOi}.recipeName` as any)
  const kcal = useMemo(() => {
    return Math.round(
      (currentOptItems as any[]).reduce((acc, item) => {
        const food = foods.find((f) => f._id === item.foodId)
        if (!food || !(item.quantityG > 0)) return acc
        return acc + scaleMacros(food, item.quantityG).caloriesKcal
      }, 0)
    )
  }, [currentOptItems, foods])

  const handleLoadRecipe = async (recipeId: string) => {
    if (!recipeId) return
    try {
      const res = await nutritionService.getRecipeWithIngredients(recipeId)
      if (res?.ingredients?.length) {
        const recipeName = res.recipe?.name || 'Recipe'
        setValue(`${base}.options.${safeActiveOi}.items` as any, [])
        const items = res.ingredients
          .filter(ing => ing.foodId)
          .map(ing => ({ foodId: ing.foodId, quantityG: ing.quantity ?? 100, recipeSource: recipeName }))
        setValue(`${base}.options.${safeActiveOi}.items` as any, items)
        setValue(`${base}.options.${safeActiveOi}.recipeId` as any, recipeId)
        setValue(`${base}.options.${safeActiveOi}.recipeName` as any, recipeName)
        
        if (res.recipe?.defaultMealType) {
          const slot = MEALTYPE_TO_TIMELINE[res.recipe.defaultMealType as keyof typeof MEALTYPE_TO_TIMELINE]
          if (slot) {
            setValue(`${base}.timelineSlot` as any, slot)
            setValue(`${base}.mealType` as any, res.recipe.defaultMealType)
          }
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleDuplicateOption = () => {
    if (!currentOpt) return
    const itemsToDup = currentOptItems.map((it: any) => ({ foodId: it.foodId, quantityG: it.quantityG }))
    const nextIdx = optFields.length
    appendOpt({
      optionId: `opt-${Date.now()}-${nextIdx}`,
      label: `Option ${nextIdx + 1}`,
      isDefault: false,
      items: itemsToDup,
      recipeId: watchedRecipeId,
      recipeName: watchedRecipeName,
    } as any)
    setActiveOi(nextIdx)
  }

  const handleRemoveOption = () => {
    if (optFields.length <= 1) return
    removeOpt(safeActiveOi)
    setActiveOi(0)
  }

  const handleSetDefault = () => {
    optFields.forEach((_, idx) => {
      setValue(`${base}.options.${idx}.isDefault` as any, idx === safeActiveOi)
    })
  }

  const isCurrentDefault = currentOpt ? (currentOpt as any).isDefault : false

  return (
    <Card className="border-muted shadow-sm overflow-hidden bg-card rounded-xl">
      <CardHeader className="py-3 px-4 border-b bg-muted/20 flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:bg-muted"
            onClick={() => setExpanded(!expanded)}
          >
            <IconChevronDown className={`h-4 w-4 transition-transform duration-200 ${expanded ? '' : '-rotate-90'}`} />
          </Button>

          <span className="h-6 w-6 rounded-full bg-[#E6F4EA] text-[#137333] border border-[#137333]/20 flex items-center justify-center font-bold text-xs shrink-0">
            {mi + 1}
          </span>

          <FormField
            control={control}
            name={`${base}.name` as any}
            render={({ field }) => (
              <FormItem className="space-y-0 flex-1 min-w-[120px]">
                <FormControl>
                  <Input
                    className="h-8 text-xs font-bold bg-white"
                    placeholder="Meal name (e.g. Egg sandwich)..."
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Timeline Slot Selector */}
          <div className="w-36 shrink-0">
            <FormField
              control={control}
              name={`${base}.timelineSlot` as any}
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <Select
                    value={field.value ?? ''}
                    onValueChange={(v) => {
                      field.onChange(v || null)
                      if (v) {
                        const mt = TIMELINE_TO_MEALTYPE[v as keyof typeof TIMELINE_TO_MEALTYPE]
                        if (mt) {
                          setValue(`${base}.mealType` as any, mt)
                          const currentName = getValues(`${base}.name` as any)
                          const isDefaultName = !currentName || Object.values(TIMELINE_SLOT_LABELS).includes(currentName)
                          if (isDefaultName) {
                            setValue(`${base}.name` as any, TIMELINE_SLOT_LABELS[v as keyof typeof TIMELINE_SLOT_LABELS] ?? mt)
                          }
                        }
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="h-8 text-xs font-semibold px-2 bg-white">
                        <SelectValue placeholder="Select Slot" />
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

          {/* Time Selector */}
          <div className="w-28 shrink-0">
            <FormField
              control={control}
              name={`${base}.timeOfDay` as any}
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <div className="relative flex items-center">
                    <Input
                      type="time"
                      className="h-8 text-xs px-2 font-medium bg-white"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  </div>
                </FormItem>
              )}
            />
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0"
          onClick={onRemove}
        >
          <IconTrash className="h-4 w-4" />
        </Button>
      </CardHeader>

      {expanded && (
        <CardContent className="p-4 space-y-4">
          {/* Options tabs */}
          <div className="flex flex-wrap items-center gap-2 border-b pb-3">
            {optFields.map((of, oi) => {
              const isSelected = oi === safeActiveOi
              const isDefault = (of as any).isDefault ?? false
              return (
                <button
                  key={of.id}
                  type="button"
                  onClick={() => setActiveOi(oi)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-1.5 transition-all ${
                    isSelected
                      ? 'bg-[#0B1520] text-white border-[#0B1520] shadow-sm'
                      : 'bg-background hover:bg-muted border-input text-muted-foreground'
                  }`}
                >
                  Option {oi + 1}
                  {isDefault && (
                    <span className="bg-green-500/10 text-green-500 text-[9px] px-1.5 rounded uppercase font-extrabold tracking-wider">
                      Default
                    </span>
                  )}
                </button>
              )
            })}

            <button
              type="button"
              onClick={() => {
                const nextIdx = optFields.length
                appendOpt(newOption(nextIdx))
                setActiveOi(nextIdx)
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-dashed border-muted-foreground/30 text-muted-foreground hover:bg-muted/50 transition-all flex items-center justify-center"
            >
              + Add Alternate Option
            </button>
          </div>

          {currentOpt && (
            <div className="space-y-4">
              {/* Option metadata and tools */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/15 p-2 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-[#0B1520]/10 text-[#0B1520] hover:bg-[#0B1520]/15 font-bold text-xs px-2.5 py-0.5 border border-[#0B1520]/10">
                    {kcal} kcal
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Select value="" onValueChange={handleLoadRecipe}>
                    <SelectTrigger className="h-7 text-[11px] font-semibold w-28 bg-white border border-input shrink-0">
                      <SelectValue placeholder="Quick Recipe" />
                    </SelectTrigger>
                    <SelectContent>
                      {recipes.map((r) => (
                        <SelectItem key={r._id} value={r._id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-7 text-[11px] px-2.5 bg-white shrink-0 font-semibold"
                    onClick={() => onOpenLibrary(mi, safeActiveOi)}
                  >
                    Library & Details
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="h-7 text-[11px] px-2.5 bg-white shrink-0 font-semibold flex items-center gap-1"
                    onClick={handleDuplicateOption}
                  >
                    Duplicate
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={`h-7 px-2.5 text-[11px] font-semibold flex items-center gap-1 ${
                      isCurrentDefault
                        ? 'text-green-600 bg-green-50 hover:bg-green-100/80 cursor-default'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={isCurrentDefault ? undefined : handleSetDefault}
                  >
                    {isCurrentDefault ? '✓ Default' : 'Set Default'}
                  </Button>

                  {optFields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={handleRemoveOption}
                    >
                      <IconTrash className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Linked recipe banner */}
              {watchedRecipeId && (
                <div className="bg-[#E6F4EA] border border-[#137333]/15 text-[#137333] text-xs px-3 py-2 rounded-lg flex items-center justify-between shadow-sm">
                  <span className="font-semibold">Linked Recipe: {watchedRecipeName}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setValue(`${base}.options.${safeActiveOi}.recipeId` as any, undefined)
                      setValue(`${base}.options.${safeActiveOi}.recipeName` as any, undefined)
                    }}
                    className="text-[10px] font-bold underline hover:no-underline text-[#137333] uppercase tracking-wider"
                  >
                    Reset to Template
                  </button>
                </div>
              )}

              {/* Food item listing */}
              <OptionIngredientsEditor
                mi={mi}
                activeOi={safeActiveOi}
                control={control}
                foods={foods}
                onOpenLibraryForAppend={onOpenLibraryForAppend}
              />
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

// ── ClinicalTemplateForm (top-level refactored component) ────────────────────

interface ClinicalTemplateFormProps {
  template?: NutritionTemplate
  plan?: any
  mode?: 'template' | 'plan'
  userId?: string
  initialTargets?: {
    calories?: number | null
    proteinG?: number | null
    carbsG?: number | null
    fatG?: number | null
    waterMl?: number | null
  }
  targetsOverride?: {
    calories?: number | null
    proteinG?: number | null
    carbsG?: number | null
    fatG?: number | null
    waterMl?: number | null
  }
}

export function ClinicalTemplateForm({
  template,
  plan,
  mode = 'template',
  userId,
  initialTargets,
}: ClinicalTemplateFormProps) {
  const router = useRouter()
  const { data: foods = [] } = useFoods()
  const { data: recipes = [] } = useRecipes()
  const createTemplate = useCreateTemplate()
  const updateTemplate = useUpdateTemplate()
  const updatePlanMutation = useUpdatePlan()
  const assignPlanMutation = useAssignPlan()
  const { data: templates = [] } = useNutritionTemplates()

  const [templateImportOpen, setTemplateImportOpen] = useState(false)
  const [templateSearch, setTemplateSearch] = useState('')
  const [selectedSourceDay, setSelectedSourceDay] = useState('')

  const sourceData = plan || template
  const isEdit = !!sourceData

  // ── Load Clinical EMR Details (Read-only status info) ──────────────────────
  const effectiveUserId = userId || plan?.userId || ''
  const { data: user } = useUser(effectiveUserId || undefined)
  const { data: assessment } = useNutritionAssessment(effectiveUserId || undefined)

  const weight = user?.healthMarkers?.weight ?? null
  const height = user?.healthMarkers?.height ?? null
  const ageNum = user?.age ? Number(user.age) : null
  const activity = user?.healthMarkers?.activityLevel ?? 'Moderate'

  const bmi = useMemo(() => {
    return computeBmi(height, weight)
  }, [height, weight])

  const bmiCategory = useMemo(() => {
    return getBmiCategory(bmi)
  }, [bmi])

  // Compute calculated base targets using Mifflin-St Jeor
  const derived = useMemo(() => {
    if (!user) return null
    return computeNutritionTargets(null, assessment, profileFromUser(user))
  }, [user, assessment])

  // ── Nutritional Targets local state (ADJUST TARGET PARAMETERS) ──────────────
  const [targets, setTargets] = useState<NutritionTargetValues>({
    calories: initialTargets?.calories ?? sourceData?.targetCaloriesKcal ?? 1800,
    proteinG: initialTargets?.proteinG ?? sourceData?.targetMacros?.proteinG ?? 140,
    carbsG: initialTargets?.carbsG ?? sourceData?.targetMacros?.carbsG ?? 180,
    fatG: initialTargets?.fatG ?? sourceData?.targetMacros?.fatG ?? 55,
    waterMl: initialTargets?.waterMl ?? 3000,
  })

  // Sync derived targets once from profile when loaded, until manually customized
  const [touchedTargets, setTouchedTargets] = useState(false)
  useEffect(() => {
    if (!derived || touchedTargets) return
    setTargets({
      calories: derived.calories ?? 1800,
      proteinG: derived.proteinG ?? 140,
      carbsG: derived.carbsG ?? 180,
      fatG: derived.fatG ?? 55,
      waterMl: derived.waterMl ?? 3000,
    })
  }, [derived, touchedTargets])

  // Load water target from source data Hydration instructions if present
  useEffect(() => {
    if (sourceData?.lifestyle) {
      const hyd = sourceData.lifestyle.find((l: any) => l.category === 'Hydration')
      if (hyd?.title) {
        const val = parseInt(hyd.title)
        if (Number.isFinite(val) && val > 0) {
          setTargets((prev) => ({ ...prev, waterMl: val }))
        }
      }
    }
  }, [sourceData])

  const handleTargetChange = (key: keyof NutritionTargetValues, val: number | null) => {
    setTouchedTargets(true)
    setTargets((prev) => ({ ...prev, [key]: val }))
  }

  const filteredTemplates = useMemo(() => {
    return (templates || []).filter((t: any) =>
      t.name.toLowerCase().includes(templateSearch.toLowerCase())
    )
  }, [templates, templateSearch])

  const handleImportTemplate = (tpl: NutritionTemplate) => {
    if (!tpl) return

    const mappedValues: TemplateFormValues = {
      name: `${tpl.name} (Copy)`,
      description: tpl.description ?? '',
      goal: tpl.goal,
      targetCaloriesKcal: tpl.targetCaloriesKcal ?? undefined,
      targetMacros: tpl.targetMacros ?? undefined,
      durationDays: tpl.durationDays ?? 7,
      conditionTags: tpl.conditionTags ?? [],
      foodPreference: (tpl.conditionTags ?? []).find((t: string) => t.startsWith('pref:'))?.replace('pref:', ''),
      allergies: (tpl.conditionTags ?? []).filter((t: string) => t.startsWith('allergy:')).map((t: string) => t.replace('allergy:', '')),
      medicalConditions: (tpl.conditionTags ?? []).filter((t: string) => t.startsWith('medical:')).map((t: string) => t.replace('medical:', '')),
      mealPattern: (tpl.conditionTags ?? []).find((t: string) => t.startsWith('pattern:'))?.replace('pattern:', '') || '3 Meals',
      lifestyle: tpl.lifestyle ?? [],
      days: tpl.days && tpl.days.length
        ? groupDaysByMeals(tpl.days)
        : [
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

    form.reset(mappedValues)

    const cal = tpl.targetCaloriesKcal ?? derived?.calories ?? 1800
    const prot = tpl.targetMacros?.proteinG ?? derived?.proteinG ?? 140
    const carb = tpl.targetMacros?.carbsG ?? derived?.carbsG ?? 180
    const fat = tpl.targetMacros?.fatG ?? derived?.fatG ?? 55

    let water = derived?.waterMl ?? 3000
    if (tpl.lifestyle) {
      const hyd = tpl.lifestyle.find((l: any) => l.category === 'Hydration')
      if (hyd?.title) {
        const val = parseInt(hyd.title)
        if (Number.isFinite(val) && val > 0) {
          water = val
        }
      }
    }

    setTargets({
      calories: cal,
      proteinG: prot,
      carbsG: carb,
      fatG: fat,
      waterMl: water,
    })
    setTouchedTargets(true)

    toast.success(`Imported template: ${tpl.name}`)
  }

  // ── Form declaration ───────────────────────────────────────────────────────
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
        days: sourceData.days.length
          ? groupDaysByMeals(sourceData.days)
          : [
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
    : {
        name: '',
        description: '',
        goal: 'WeightLoss' as const,
        targetCaloriesKcal: initialTargets?.calories ?? undefined,
        targetMacros:
          initialTargets &&
          (initialTargets.proteinG != null ||
            initialTargets.carbsG != null ||
            initialTargets.fatG != null)
            ? {
                proteinG: initialTargets.proteinG ?? undefined,
                carbsG: initialTargets.carbsG ?? undefined,
                fatG: initialTargets.fatG ?? undefined,
              }
            : undefined,
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

  // We maintain rotation day lists and meals inside the first group days[0]
  const { fields: dayFields, append: appendDay, remove: removeDay } = useFieldArray({
    control: form.control,
    name: 'days',
  })

  const watchedForm = form.watch()
  const [activeDayBlockIdx, setActiveDayBlockIdx] = useState(0)

  const { fields: mealFields, append: appendMeal, remove: removeMeal } = useFieldArray({
    control: form.control,
    name: `days.${activeDayBlockIdx}.meals` as any,
  })

  // ── Calculation of Live evaluation sums ────────────────────────────────────
  const dayTotals = useMemo(() => {
    const days = form.getValues('days')
    const day = days?.[activeDayBlockIdx]
    if (!day || !day.meals) return { calories: 0, protein: 0, carbs: 0, fat: 0 }

    let totalCalories = 0
    let totalProtein = 0
    let totalCarbs = 0
    let totalFat = 0

    day.meals.forEach((meal: any) => {
      const opts = meal.options ?? []
      const defaultOpt = opts.find((o: any) => o.isDefault) ?? opts[0]
      if (defaultOpt && defaultOpt.items) {
        defaultOpt.items.forEach((item: any) => {
          const food = foods.find((f) => f._id === item.foodId)
          if (food && item.quantityG > 0) {
            const scaled = scaleMacros(food, item.quantityG)
            totalCalories += scaled.caloriesKcal
            totalProtein += scaled.proteinG
            totalCarbs += scaled.carbsG
            totalFat += scaled.fatG
          }
        })
      }
    })

    return {
      calories: Math.round(totalCalories),
      protein: Math.round(totalProtein),
      carbs: Math.round(totalCarbs),
      fat: Math.round(totalFat),
    }
  }, [watchedForm, activeDayBlockIdx, foods])

  // ── Recipe library popup state ─────────────────────────────────────────────
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [libraryAppendMode, setLibraryAppendMode] = useState(false)
  const [targetMealIdx, setTargetMealIdx] = useState<number | null>(null)
  const [targetOptIdx, setTargetOptIdx] = useState<number | null>(null)
  const [recipeSearch, setRecipeSearch] = useState('')

  const filteredRecipes = useMemo(() => {
    return recipes.filter(r => r.name.toLowerCase().includes(recipeSearch.toLowerCase()))
  }, [recipes, recipeSearch])

  const handleOpenLibrary = (mi: number, activeOi: number) => {
    setTargetMealIdx(mi)
    setTargetOptIdx(activeOi)
    setRecipeSearch('')
    setLibraryAppendMode(false)
    setLibraryOpen(true)
  }

  const handleOpenLibraryForAppend = (mi: number, activeOi: number) => {
    setTargetMealIdx(mi)
    setTargetOptIdx(activeOi)
    setRecipeSearch('')
    setLibraryAppendMode(true)
    setLibraryOpen(true)
  }

  const handleSelectLibraryRecipe = async (recipeId: string) => {
    if (targetMealIdx === null || targetOptIdx === null) return
    try {
      const res = await nutritionService.getRecipeWithIngredients(recipeId)
      if (res?.ingredients?.length) {
        const newRecipeName = res.recipe?.name || 'Recipe'
        const newItems = res.ingredients
          .filter(ing => ing.foodId)
          .map(ing => ({ foodId: ing.foodId, quantityG: ing.quantity ?? 100, recipeSource: newRecipeName }))

        if (libraryAppendMode) {
          // Append mode: merge new ingredients with existing ones
          const existingItems = form.getValues(`days.0.meals.${targetMealIdx}.options.${targetOptIdx}.items` as any) ?? []
          const mergedItems = [...existingItems, ...newItems]
          form.setValue(`days.0.meals.${targetMealIdx}.options.${targetOptIdx}.items` as any, mergedItems)

          // Merge recipe IDs and names
          const existingRecipeId = form.getValues(`days.0.meals.${targetMealIdx}.options.${targetOptIdx}.recipeId` as any) ?? ''
          const existingRecipeName = form.getValues(`days.0.meals.${targetMealIdx}.options.${targetOptIdx}.recipeName` as any) ?? ''

          const mergedId = existingRecipeId ? `${existingRecipeId},${recipeId}` : recipeId
          const mergedName = existingRecipeName ? `${existingRecipeName} + ${newRecipeName}` : newRecipeName

          form.setValue(`days.0.meals.${targetMealIdx}.options.${targetOptIdx}.recipeId` as any, mergedId)
          form.setValue(`days.0.meals.${targetMealIdx}.options.${targetOptIdx}.recipeName` as any, mergedName)
        } else {
          // Replace mode: overwrite everything
          form.setValue(`days.0.meals.${targetMealIdx}.options.${targetOptIdx}.items` as any, [])
          form.setValue(`days.0.meals.${targetMealIdx}.options.${targetOptIdx}.items` as any, newItems)
          form.setValue(`days.0.meals.${targetMealIdx}.options.${targetOptIdx}.recipeId` as any, recipeId)
          form.setValue(`days.0.meals.${targetMealIdx}.options.${targetOptIdx}.recipeName` as any, newRecipeName)

          if (res.recipe?.defaultMealType) {
            const slot = MEALTYPE_TO_TIMELINE[res.recipe.defaultMealType as keyof typeof MEALTYPE_TO_TIMELINE]
            if (slot) {
              form.setValue(`days.0.meals.${targetMealIdx}.timelineSlot` as any, slot)
              form.setValue(`days.0.meals.${targetMealIdx}.mealType` as any, res.recipe.defaultMealType)
            }
          }
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLibraryOpen(false)
      setLibraryAppendMode(false)
      setTargetMealIdx(null)
      setTargetOptIdx(null)
    }
  }

  const handleApplyCopy = (sourceDay: string, strategy: string) => {
    const currentBlocks = form.getValues('days')
    const sourceBlock = currentBlocks.find((b) => b.selectedDays.includes(sourceDay))
    if (!sourceBlock) {
      toast.error(`No configured meals found for source day: ${sourceDay}`)
      return
    }
    const sourceMeals = sourceBlock.meals

    if (strategy === 'replicate') {
      form.setValue('days', [
        {
          selectedDays: WEEKDAYS,
          meals: sourceMeals,
        },
      ], { shouldDirty: true, shouldValidate: true })
      setActiveDayBlockIdx(0)
      toast.success(`Replicated ${sourceDay}'s structure to all days.`)
    } else if (strategy === 'alternate') {
      if (currentBlocks.length < 2) {
        toast.error('Alternate strategy requires at least 2 configured day blocks.')
        return
      }
      const mealsA = currentBlocks[0].meals
      const mealsB = currentBlocks[1].meals

      const selectedA = WEEKDAYS.filter((_, idx) => idx % 2 === 0)
      const selectedB = WEEKDAYS.filter((_, idx) => idx % 2 !== 0)

      form.setValue('days', [
        { selectedDays: selectedA, meals: mealsA },
        { selectedDays: selectedB, meals: mealsB },
      ], { shouldDirty: true, shouldValidate: true })
      setActiveDayBlockIdx(0)
      toast.success('Alternated structure A and B across the week.')
    } else if (strategy === 'split_weekdays') {
      const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
      const updatedBlocks = currentBlocks.map((b) => ({
        ...b,
        selectedDays: b.selectedDays.filter((d) => !weekdays.includes(d)),
      })).filter((b) => b.selectedDays.length > 0)

      updatedBlocks.push({
        selectedDays: weekdays,
        meals: sourceMeals,
      })

      form.setValue('days', updatedBlocks, { shouldDirty: true, shouldValidate: true })
      setActiveDayBlockIdx(updatedBlocks.length - 1)
      toast.success(`Cloned ${sourceDay}'s structure to Weekdays (Mon-Fri).`)
    } else if (strategy === 'split_weekends') {
      const weekends = ['Sun', 'Sat']
      const updatedBlocks = currentBlocks.map((b) => ({
        ...b,
        selectedDays: b.selectedDays.filter((d) => !weekends.includes(d)),
      })).filter((b) => b.selectedDays.length > 0)

      updatedBlocks.push({
        selectedDays: weekends,
        meals: sourceMeals,
      })

      form.setValue('days', updatedBlocks, { shouldDirty: true, shouldValidate: true })
      setActiveDayBlockIdx(updatedBlocks.length - 1)
      toast.success(`Cloned ${sourceDay}'s structure to Weekends (Sun, Sat).`)
    }
    setSelectedSourceDay('')
  }

  // ── Form submits ──────────────────────────────────────────────────────────
  const onSubmit = async (values: TemplateFormValues) => {
    // Flatten daily configurations
    const days = values.days.flatMap((day) => {
      return day.selectedDays.map((weekday) => {
        let dayNumber = WEEKDAYS.indexOf(weekday)
        if (dayNumber === 0) dayNumber = 7 // Sun maps to 7

        return {
          dayNumber,
          meals: day.meals.map((meal) => {
            const opts = meal.options ?? []
            const defaultOpt = opts.find((o) => o.isDefault) ?? opts[0]
            const mirroredItems = defaultOpt?.items ?? meal.items ?? []

            // Strip extra UI state from items, but KEEP recipeSource for grouping
            const cleanItems = (items: any[]) =>
              items.map(({ foodId, quantityG, recipeSource }: any) => ({ 
                foodId, 
                quantityG, 
                ...(recipeSource ? { recipeSource } : {})
              }))

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
              items: cleanItems(mirroredItems),
              options: opts.length
                ? opts.map((o) => ({
                    title: o.label || 'Option',
                    isDefault: o.isDefault,
                    reasoning: o.reasoning?.rationale || undefined,
                    foods: cleanItems(o.items ?? []),
                    recipeId: (o as any).recipeId || undefined,
                    recipeName: (o as any).recipeName || undefined,
                  }))
                : undefined,
            }
          }),
        }
      })
    })

    const payload = {
      name: values.name,
      description: values.description || undefined,
      goal: values.goal,
      targetCaloriesKcal: targets.calories ?? undefined,
      targetMacros: {
        proteinG: targets.proteinG ?? undefined,
        carbsG: targets.carbsG ?? undefined,
        fatG: targets.fatG ?? undefined,
      },
      durationDays: values.durationDays,
      days,
      lifestyle: [
        ...(values.lifestyle?.filter(l => l.category !== 'Hydration') ?? []),
        ...(targets.waterMl ? [{ category: 'Hydration' as const, title: `${targets.waterMl} ml`, detail: 'Daily water intake target' }] : []),
      ],
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
      const created = await createTemplate.mutateAsync(payload)
      if (userId && created?.template?._id) {
        await assignPlanMutation.mutateAsync({
          planId: created.template._id,
          userId,
          startDate: new Date().toISOString().slice(0, 10),
        })
        router.push(`/admin/nutrition?tab=bookings&review=${userId}`)
      } else {
        router.push('/admin/nutrition?tab=diet-plans')
      }
    }
  }

  const handleReset = () => {
    form.reset(defaultValues)
    setTouchedTargets(false)
    if (derived) {
      setTargets({
        calories: derived.calories ?? 1800,
        proteinG: derived.proteinG ?? 140,
        carbsG: derived.carbsG ?? 180,
        fatG: derived.fatG ?? 55,
        waterMl: derived.waterMl ?? 3000,
      })
    } else {
      setTargets({
        calories: 1800,
        proteinG: 140,
        carbsG: 180,
        fatG: 55,
        waterMl: 3000,
      })
    }
  }

  const isPending =
    createTemplate.isPending ||
    updateTemplate.isPending ||
    updatePlanMutation.isPending ||
    assignPlanMutation.isPending

  const selectedDays = useMemo(() => {
    const days = form.getValues('days')
    return days?.[activeDayBlockIdx]?.selectedDays ?? []
  }, [watchedForm, activeDayBlockIdx])

  const toggleDay = (day: string) => {
    const next = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day]
    form.setValue(`days.${activeDayBlockIdx}.selectedDays` as any, next, { shouldValidate: true, shouldDirty: true })
  }

  const toggleAll = () => {
    if (selectedDays.length === WEEKDAYS.length) {
      form.setValue(`days.${activeDayBlockIdx}.selectedDays` as any, [], { shouldValidate: true, shouldDirty: true })
    } else {
      form.setValue(`days.${activeDayBlockIdx}.selectedDays` as any, WEEKDAYS, { shouldValidate: true, shouldDirty: true })
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, (errors) => {
          console.error('Diet Plan Validation Errors:', errors)
          alert('Validation failed:\n' + JSON.stringify(errors, null, 2))
        })}
        className="w-full"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main area (left column) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Section 1: Clinical Metrics & Overrides (Read-only display) */}
            {effectiveUserId && (
              <Card className="rounded-xl border shadow-sm bg-card">
                <CardContent className="pt-5 space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Clinical Metrics & Overrides</h3>
                    <button type="button" className="text-xs text-primary font-bold flex items-center gap-1 cursor-default">
                      <span className="h-2 w-2 bg-green-500 rounded-full inline-block animate-pulse"></span>
                      Linked to EMR
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="rounded-lg border bg-muted/10 px-3 py-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">Weight</span>
                      <span className="text-sm font-extrabold text-foreground">{weight != null ? (String(weight).toLowerCase().endsWith('kg') ? weight : `${weight} kg`) : '—'}</span>
                    </div>
                    <div className="rounded-lg border bg-muted/10 px-3 py-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">Height</span>
                      <span className="text-sm font-extrabold text-foreground">{height != null ? (String(height).toLowerCase().endsWith('cm') ? height : `${height} cm`) : '—'}</span>
                    </div>
                    <div className="rounded-lg border bg-muted/10 px-3 py-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">Age</span>
                      <span className="text-sm font-extrabold text-foreground">{ageNum != null ? `${ageNum} yrs` : '—'}</span>
                    </div>
                    <div className="rounded-lg border bg-muted/10 px-3 py-2 flex flex-col justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">Calculated BMI</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-extrabold text-foreground">{bmi != null ? String(bmi) : '—'}</span>
                        {bmiCategory && (
                          <span className={`text-[8px] font-black uppercase px-1 rounded-md tracking-wider leading-none py-0.5 ${
                            bmiCategory === 'Normal' ? 'bg-green-100 text-green-800 border border-green-200' :
                            bmiCategory === 'Overweight' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                            bmiCategory === 'Obese' ? 'bg-red-100 text-red-800 border border-red-200' :
                            'bg-sky-100 text-sky-800 border border-sky-200'
                          }`}>
                            {bmiCategory === 'Normal' ? 'HEALTHY' : bmiCategory.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="rounded-lg border bg-muted/10 px-3 py-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">Activity Level</span>
                      <span className="text-sm font-extrabold text-foreground truncate block">{activity || '—'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Section 2: Plan Definitions & Rules */}
            <Card className="rounded-xl border shadow-sm bg-card">
              <CardContent className="pt-5 space-y-5">
                <div className="border-b pb-2 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Plan Definitions & Rules</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs font-bold text-primary border-primary/30 hover:bg-primary/5 flex items-center gap-1.5"
                    onClick={() => {
                      setTemplateSearch('')
                      setTemplateImportOpen(true)
                    }}
                  >
                    <IconSparkles className="h-3.5 w-3.5" />
                    Import Template / Plan
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-muted-foreground">Plan Template Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Plan name..." {...field} />
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
                        <FormLabel className="text-xs font-bold text-muted-foreground">Dietary Target Goal</FormLabel>
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

                  <FormField
                    control={form.control}
                    name="foodPreference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-muted-foreground">Food Preference</FormLabel>
                        <Select value={field.value ?? ''} onValueChange={field.onChange}>
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

                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="mealPattern"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-muted-foreground">Daily Frequency Pattern</FormLabel>
                        <Select value={field.value ?? ''} onValueChange={field.onChange}>
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

                  <div className="sm:col-span-2">
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold text-muted-foreground">Special Clinical Directives</FormLabel>
                          <FormControl>
                            <Textarea rows={1} placeholder="e.g. Keep simple sugars under 10% of carbs..." {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Exclusions & Allergens */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-muted-foreground">Exclusions & Allergens</span>
                  <FormField
                    control={form.control}
                    name="allergies"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <div className="flex flex-wrap gap-2 pt-1">
                          {ALLERGIES.map((allergy) => {
                            const isSelected = field.value?.includes(allergy)
                            return (
                              <Badge
                                key={allergy}
                                variant={isSelected ? 'default' : 'outline'}
                                className={`cursor-pointer hover:opacity-95 font-bold transition-colors ${
                                  isSelected
                                    ? 'bg-[#EF4444] text-white border-[#EF4444]'
                                    : 'border-input text-muted-foreground'
                                }`}
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
                </div>

                {/* Targeted Health Conditions */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-muted-foreground">Targeted Health Conditions</span>
                  <FormField
                    control={form.control}
                    name="medicalConditions"
                    render={({ field }) => (
                      <FormItem className="space-y-0">
                        <div className="flex flex-wrap gap-2 pt-1">
                          {MEDICAL_CONDITIONS.map((cond) => {
                            const isSelected = field.value?.includes(cond)
                            return (
                              <Badge
                                key={cond}
                                variant={isSelected ? 'default' : 'outline'}
                                className={`cursor-pointer hover:opacity-95 font-bold transition-colors ${
                                  isSelected
                                    ? 'bg-[#0D9488] text-white border-[#0D9488]'
                                    : 'border-input text-muted-foreground'
                                }`}
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

                {/* Assigned Rotation Days */}
                <div className="space-y-2 pt-1 border-t">
                  <span className="text-xs font-bold text-muted-foreground">Assigned Rotation Days</span>
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {WEEKDAYS.map((day) => {
                      const isSelected = selectedDays.includes(day)
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors border ${
                            isSelected
                              ? 'bg-[#0B1520] text-white border-[#0B1520]'
                              : 'bg-background hover:bg-muted border-input text-muted-foreground'
                          }`}
                        >
                          {day}
                        </button>
                      )
                    })}
                    <button
                      type="button"
                      onClick={toggleAll}
                      className="px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors border border-input bg-muted/50 hover:bg-muted text-muted-foreground ml-2"
                    >
                      {selectedDays.length === WEEKDAYS.length ? 'Clear All' : 'Select All'}
                    </button>
                  </div>
                </div>

                {/* Copy Structure Toolbar */}
                <div className="flex flex-wrap items-center gap-3 pt-3 border-t mt-3">
                  <span className="text-xs font-bold text-muted-foreground">Copy Structure From...</span>
                  <Select onValueChange={(sourceDay) => {
                    setSelectedSourceDay(sourceDay)
                  }} value={selectedSourceDay}>
                    <SelectTrigger className="h-8 text-xs w-32 bg-white">
                      <SelectValue placeholder="Select Day" />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAYS.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedSourceDay && (
                    <>
                      <Select onValueChange={(strat) => handleApplyCopy(selectedSourceDay, strat)} value="">
                        <SelectTrigger className="h-8 text-xs w-56 bg-white">
                          <SelectValue placeholder="Select Copy Strategy" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="replicate">Strategy A (Replicate to Remaining)</SelectItem>
                          <SelectItem value="alternate">Strategy B (Alternate Pattern/Zigzag)</SelectItem>
                          <SelectItem value="split_weekdays">Strategy C (Clone to Weekdays Only)</SelectItem>
                          <SelectItem value="split_weekends">Strategy C (Clone to Weekends Only)</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-muted-foreground hover:bg-muted"
                        onClick={() => setSelectedSourceDay('')}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Section 3: Daily Itinerary Blueprint */}
            <Card className="rounded-xl border shadow-sm bg-card">
              <CardContent className="pt-5 space-y-4">
                
                {/* Block tab selector if there are multiple */}
                {dayFields.length > 1 && (
                  <div className="flex flex-wrap gap-2 mb-3 bg-muted/10 p-2 rounded-lg border">
                    {dayFields.map((df, di) => {
                      const daysVal = form.getValues('days')
                      const selDays = daysVal?.[di]?.selectedDays ?? []
                      const label = selDays.length > 0 ? selDays.join(', ') : `Block ${di + 1}`
                      return (
                        <div key={df.id} className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setActiveDayBlockIdx(di)}
                            className={`px-3 py-1 text-xs font-bold rounded-full border transition-colors ${
                              di === activeDayBlockIdx
                                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                : 'bg-background hover:bg-accent border-input'
                            }`}
                          >
                            {label}
                          </button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:bg-destructive/10 rounded-full"
                            onClick={() => {
                              removeDay(di)
                              if (activeDayBlockIdx >= dayFields.length - 1) {
                                setActiveDayBlockIdx(Math.max(0, dayFields.length - 2))
                              }
                            }}
                          >
                            ×
                          </Button>
                        </div>
                      )
                    })}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs font-bold"
                      onClick={() => {
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
                        setActiveDayBlockIdx(dayFields.length)
                      }}
                    >
                      + Add Block
                    </Button>
                  </div>
                )}

                <div className="flex items-center justify-between border-b pb-2">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Daily Itinerary Blueprint</h3>
                    <p className="text-[11px] text-muted-foreground">
                      Configure alternating options, or click &quot;Quick Recipe&quot; to load data from database catalog.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {mealFields.map((mf, mi) => (
                    <MealSlotCard
                      key={mf.id}
                      mi={mi}
                      control={form.control}
                      setValue={form.setValue}
                      foods={foods}
                      recipes={recipes}
                      onRemove={() => removeMeal(mi)}
                      onOpenLibrary={handleOpenLibrary}
                      onOpenLibraryForAppend={handleOpenLibraryForAppend}
                    />
                  ))}
                  {mealFields.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg bg-muted/5">
                      No meal slots configured yet. Click &quot;Add Meal Slot&quot; to begin formulating.
                    </p>
                  ) : (
                    <div className="flex justify-center pt-2">
                      <Button
                        type="button"
                        size="sm"
                        className="bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold h-8 text-xs flex items-center gap-1"
                        onClick={() =>
                          appendMeal({
                            mealType: 'Lunch',
                            name: 'Lunch',
                            items: [],
                            options: [newOption(0)],
                          })
                        }
                      >
                        <IconPlus className="h-3.5 w-3.5 mr-1" /> Add Meal Slot
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Area (right column) */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-[80px] lg:self-start">
            
            {/* Live Evaluation dark panel */}
            <div className="bg-[#0B1520] text-white rounded-2xl border border-slate-800 shadow-xl p-5 space-y-5">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[#2DD4BF] text-[10px] font-black uppercase tracking-widest block">LIVE EVALUATION</span>
                  <span className="text-[10px] text-slate-400 font-bold block">Resolution instantly on changes</span>
                </div>
                <Badge variant="outline" className="border-green-500/35 bg-green-500/10 text-green-400 font-extrabold text-[10px] uppercase tracking-wider px-2 py-0.5 select-none shrink-0">
                  Target Sync
                </Badge>
              </div>

              {/* Progress bars */}
              <div className="space-y-3.5">
                {/* Calories */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-300">Calories Balance</span>
                    <span className="text-slate-200">{dayTotals.calories} / {targets.calories ?? 0} kcal</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#2DD4BF] rounded-full transition-all duration-300"
                      style={{ width: `${targets.calories ? Math.min(100, Math.round((dayTotals.calories / targets.calories) * 100)) : 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* Protein */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-300">Protein Target</span>
                    <span className="text-slate-200">{dayTotals.protein}g / {targets.proteinG ?? 0}g</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#0EA5E9] rounded-full transition-all duration-300"
                      style={{ width: `${targets.proteinG ? Math.min(100, Math.round((dayTotals.protein / targets.proteinG) * 100)) : 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* Carbs */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-300">Carbohydrates Target</span>
                    <span className="text-slate-200">{dayTotals.carbs}g / {targets.carbsG ?? 0}g</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#F59E0B] rounded-full transition-all duration-300"
                      style={{ width: `${targets.carbsG ? Math.min(100, Math.round((dayTotals.carbs / targets.carbsG) * 100)) : 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* Fat */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-300">Dietary Fats Target</span>
                    <span className="text-slate-200">{dayTotals.fat}g / {targets.fatG ?? 0}g</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#EC4899] rounded-full transition-all duration-300"
                      style={{ width: `${targets.fatG ? Math.min(100, Math.round((dayTotals.fat / targets.fatG) * 100)) : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Adjust targets parameters section */}
              <div className="space-y-3.5 pt-4 border-t border-slate-800">
                <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider block">ADJUST TARGET PARAMETERS</span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Calories Target</label>
                    <Input
                      type="number"
                      className="h-8 bg-slate-900 border-slate-800 text-white text-xs font-bold focus-visible:ring-teal-400"
                      value={targets.calories ?? ''}
                      onChange={(e) => handleTargetChange('calories', e.target.value === '' ? null : Number(e.target.value))}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Water Target (ml)</label>
                    <Input
                      type="number"
                      className="h-8 bg-slate-900 border-slate-800 text-white text-xs font-bold focus-visible:ring-teal-400"
                      value={targets.waterMl ?? ''}
                      onChange={(e) => handleTargetChange('waterMl', e.target.value === '' ? null : Number(e.target.value))}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Protein Target (g)</label>
                    <Input
                      type="number"
                      className="h-8 bg-slate-900 border-slate-800 text-white text-xs font-bold focus-visible:ring-sky-400"
                      value={targets.proteinG ?? ''}
                      onChange={(e) => handleTargetChange('proteinG', e.target.value === '' ? null : Number(e.target.value))}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Carbs Target (g)</label>
                    <Input
                      type="number"
                      className="h-8 bg-slate-900 border-slate-800 text-white text-xs font-bold focus-visible:ring-yellow-400"
                      value={targets.carbsG ?? ''}
                      onChange={(e) => handleTargetChange('carbsG', e.target.value === '' ? null : Number(e.target.value))}
                    />
                  </div>

                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fats Target (g)</label>
                    <Input
                      type="number"
                      className="h-8 bg-slate-900 border-slate-800 text-white text-xs font-bold focus-visible:ring-rose-400"
                      value={targets.fatG ?? ''}
                      onChange={(e) => handleTargetChange('fatG', e.target.value === '' ? null : Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Formulation overview */}
            <Card className="rounded-xl border shadow-sm bg-card">
              <CardContent className="pt-5 space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block border-b pb-1.5">FORMULATION OVERVIEW</span>
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground font-semibold">Active Name</span>
                    <span className="font-extrabold text-foreground text-right truncate max-w-[160px] block">
                      {form.watch('name') || 'Unnamed Plan'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground font-semibold">Calorie Budget Met</span>
                    <span className="font-extrabold text-foreground">
                      {targets.calories ? Math.round((dayTotals.calories / targets.calories) * 100) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-muted-foreground font-semibold">Active Rotation</span>
                    <span className="font-extrabold text-foreground">{selectedDays.length} Days</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground font-semibold">Allergen Overview</span>
                    <span className="font-extrabold text-[#EF4444] text-right truncate max-w-[160px] block">
                      {form.watch('allergies')?.join(', ') || 'None'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit / actions */}
            <div className="space-y-3.5 pt-2">
              <Button
                type="submit"
                disabled={isPending}
                className="w-full h-11 bg-[#0D9488] hover:bg-[#0F766E] text-white font-extrabold text-xs uppercase tracking-widest rounded-lg shadow-md transition-colors flex items-center justify-center"
              >
                {isPending ? 'Saving Plan...' : 'Save & Publish Template'}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full h-11 border bg-transparent text-muted-foreground hover:bg-muted font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center"
                onClick={handleReset}
              >
                Reset Template Inputs
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Recipe Library search popup dialog */}
      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{libraryAppendMode ? 'Add Meal / Recipe' : 'Recipe Library'}</DialogTitle>
            <DialogDescription>
              {libraryAppendMode
                ? 'Search and add another recipe\'s ingredients to the current meal option.'
                : 'Search and import custom recipe formulations directly as ingredients into your meal option.'}
            </DialogDescription>
          </DialogHeader>

          <div className="relative flex items-center mb-4">
            <IconSearch className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search recipes..."
              className="pl-9 h-10"
              value={recipeSearch}
              onChange={(e) => setRecipeSearch(e.target.value)}
            />
          </div>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {filteredRecipes.map((r) => (
              <div
                key={r._id}
                className="p-3 border rounded-lg flex items-center justify-between hover:bg-muted/30 transition-all gap-4"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{r.name}</span>
                    {r.isVeg && (
                      <span className="bg-green-50 text-green-700 text-[9px] font-black uppercase px-1 py-0.5 rounded border border-green-200">
                        Veg
                      </span>
                    )}
                  </div>
                  {r.description && <p className="text-xs text-muted-foreground truncate">{r.description}</p>}
                  
                  {/* Macros info */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-[11px] text-muted-foreground">
                    <span>Calories: <strong className="text-foreground">{Math.round(r.totals.caloriesKcal)} kcal</strong></span>
                    <span>Protein: <strong className="text-foreground">{Math.round(r.totals.proteinG)}g</strong></span>
                    <span>Carbs: <strong className="text-foreground">{Math.round(r.totals.carbsG)}g</strong></span>
                    <span>Fat: <strong className="text-foreground">{Math.round(r.totals.fatG)}g</strong></span>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  className="bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold shrink-0"
                  onClick={() => handleSelectLibraryRecipe(r._id)}
                >
                  {libraryAppendMode ? '+ Add to Meal' : 'Import Recipe'}
                </Button>
              </div>
            ))}
            {filteredRecipes.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">No matching recipes found.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Import Dialog */}
      <Dialog open={templateImportOpen} onOpenChange={setTemplateImportOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IconSparkles className="h-5 w-5 text-primary" />
              Import Diet Template
            </DialogTitle>
            <DialogDescription>
              Choose from your saved diet plan templates to pre-populate this client&apos;s custom plan.
            </DialogDescription>
          </DialogHeader>

          <div className="relative flex items-center mb-4">
            <IconSearch className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search templates..."
              className="pl-9 h-10"
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
            />
          </div>

          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {filteredTemplates.map((t) => {
              const cal = t.targetCaloriesKcal ?? '—'
              const prot = t.targetMacros?.proteinG ?? '—'
              const carb = t.targetMacros?.carbsG ?? '—'
              const fat = t.targetMacros?.fatG ?? '—'
              const goalLabel = NUTRITION_GOAL_LABELS[t.goal] ?? t.goal

              return (
                <div
                  key={t._id}
                  className="p-4 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between hover:bg-muted/30 transition-all gap-4 bg-card"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm text-foreground">{t.name}</span>
                      <Badge variant="outline" className="text-[10px] font-bold bg-primary/5 text-primary border-primary/20">
                        {goalLabel}
                      </Badge>
                    </div>
                    {t.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                    )}
                    
                    {/* Macros grid summary */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[11px] text-muted-foreground font-semibold">
                      <span className="flex items-center gap-1">
                        <IconFlame className="h-3.5 w-3.5 text-orange-500 inline" />
                        Calories: <strong className="text-foreground">{cal} kcal</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <IconMeat className="h-3.5 w-3.5 text-sky-500 inline" />
                        Protein: <strong className="text-foreground">{prot}g</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <IconBread className="h-3.5 w-3.5 text-amber-500 inline" />
                        Carbs: <strong className="text-foreground">{carb}g</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <IconButterfly className="h-3.5 w-3.5 text-rose-500 inline" />
                        Fat: <strong className="text-foreground">{fat}g</strong>
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    className="bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold shrink-0 self-end sm:self-center"
                    onClick={() => {
                      handleImportTemplate(t)
                      setTemplateImportOpen(false)
                    }}
                  >
                    Import Template
                  </Button>
                </div>
              )
            })}
            {filteredTemplates.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">No matching templates found.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Form>
  )
}
