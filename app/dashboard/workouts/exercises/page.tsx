'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  IconChevronLeft,
  IconSearch,
  IconFlame,
  IconPlus,
  IconTrash,
  IconEdit,
  IconRefresh,
  IconDumbbell,
  IconRun,
  IconYoga,
  IconFilter,
  IconX,
} from '@tabler/icons-react'
import { toast } from 'sonner'
import {
  useExercises,
  useCreateExercise,
  useDeleteExercise,
  useUpdateExercise,
} from '@/hooks/use-exercises'
import {
  MUSCLE_GROUPS,
  DIFFICULTIES,
  WORKOUT_SECTIONS,
  MuscleGroup,
  Difficulty,
  WorkoutSection,
} from '@/types/workout'
import type { Exercise, CreateExercisePayload, UpdateExercisePayload } from '@/types/workout'
import { ExerciseDetailsDialog } from '@/components/workouts/exercise-details-dialog'
import { ExerciseAnimation } from '@/components/workouts/exercise-animation'

// ─── Section Meta ─────────────────────────────────────────────────────────────
const SECTION_META: Record<
  WorkoutSection,
  { label: string; color: string; bg: string; icon: React.ReactNode; description: string }
> = {
  warmup: {
    label: 'Warm Up',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800',
    icon: <IconRun className="w-3.5 h-3.5" />,
    description: 'Prepares the body for exercise',
  },
  workout: {
    label: 'Workout',
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-100 dark:bg-violet-900/30 border-violet-200 dark:border-violet-800',
    icon: <IconDumbbell className="w-3.5 h-3.5" />,
    description: 'Main muscle-targeting exercises',
  },
  stretching: {
    label: 'Stretching',
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-100 dark:bg-teal-900/30 border-teal-200 dark:border-teal-800',
    icon: <IconYoga className="w-3.5 h-3.5" />,
    description: 'Cool-down and flexibility work',
  },
}

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  Beginner:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-transparent',
  Intermediate:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-transparent',
  Advanced:
    'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-transparent',
}

// ─── Form Types ───────────────────────────────────────────────────────────────
type FormState = {
  name: string
  muscleGroups: MuscleGroup[]
  difficulty: Difficulty | ''
  sectionTypes: WorkoutSection[]
  equipment: string
  instructions: string
  caloriesPerSet: number | ''
  tips: string
  commonMistakes: string
  targetedMuscles: string
  imageUrl: string
}

function defaultForm(): FormState {
  return {
    name: '',
    muscleGroups: [],
    difficulty: '',
    sectionTypes: ['workout'],
    equipment: '',
    instructions: '',
    caloriesPerSet: '',
    tips: '',
    commonMistakes: '',
    targetedMuscles: '',
    imageUrl: '',
  }
}

function parseStringList(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function buildFormFromExercise(ex: Exercise): FormState {
  return {
    name: ex.name,
    muscleGroups: ex.muscleGroups || [],
    difficulty: ex.difficulty,
    sectionTypes: ex.sectionTypes?.length ? (ex.sectionTypes as WorkoutSection[]) : ['workout'],
    equipment: ex.equipment ?? '',
    instructions: ex.instructions ?? '',
    caloriesPerSet: ex.caloriesPerSet || '',
    tips: (ex.tips ?? []).join(', '),
    commonMistakes: (ex.commonMistakes ?? []).join(', '),
    targetedMuscles: (ex.targetedMuscles ?? []).join(', '),
    imageUrl: ex.imageUrl ?? '',
  }
}

// ─── Create / Edit Dialog ─────────────────────────────────────────────────────
function ExerciseFormDialog({
  open,
  onOpenChange,
  editingExercise,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editingExercise: Exercise | null
}) {
  const isEditing = !!editingExercise
  const createExercise = useCreateExercise()
  const updateExercise = useUpdateExercise()
  const isSaving = createExercise.isPending || updateExercise.isPending

  const [form, setForm] = useState<FormState>(() =>
    editingExercise ? buildFormFromExercise(editingExercise) : defaultForm()
  )

  // Re-sync form when editingExercise changes (dialog re-opens with different exercise)
  const [lastId, setLastId] = useState<string | null>(editingExercise?._id ?? null)
  const currentId = editingExercise?._id ?? null
  if (currentId !== lastId) {
    setLastId(currentId)
    setForm(editingExercise ? buildFormFromExercise(editingExercise) : defaultForm())
  }

  const toggleSection = (section: WorkoutSection) => {
    setForm((prev) => {
      const already = prev.sectionTypes.includes(section)
      if (already && prev.sectionTypes.length === 1) {
        toast.error('At least one section type must be selected')
        return prev
      }
      return {
        ...prev,
        sectionTypes: already
          ? prev.sectionTypes.filter((s) => s !== section)
          : [...prev.sectionTypes, section],
      }
    })
  }

  const onSave = async () => {
    if (!form.name.trim()) { toast.error('Exercise name is required'); return }
    if (!form.muscleGroups.length) { toast.error('At least one muscle group is required'); return }
    if (!form.difficulty) { toast.error('Difficulty is required'); return }
    if (!form.sectionTypes.length) { toast.error('At least one section type is required'); return }

    const payload: CreateExercisePayload = {
      name: form.name.trim(),
      muscleGroups: form.muscleGroups,
      difficulty: form.difficulty as Difficulty,
      sectionTypes: form.sectionTypes,
      equipment: form.equipment.trim() || undefined,
      instructions: form.instructions.trim() || undefined,
      caloriesPerSet: form.caloriesPerSet !== '' ? Number(form.caloriesPerSet) : undefined,
      tips: parseStringList(form.tips),
      commonMistakes: parseStringList(form.commonMistakes),
      targetedMuscles: parseStringList(form.targetedMuscles),
      imageUrl: form.imageUrl.trim() || undefined,
    }

    if (isEditing && editingExercise) {
      await updateExercise.mutateAsync({ id: editingExercise._id, payload: payload as UpdateExercisePayload })
    } else {
      await createExercise.mutateAsync(payload)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <IconDumbbell className="w-5 h-5 text-primary" />
            {isEditing ? 'Edit Exercise' : 'Create Exercise'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the details for this exercise.'
              : 'Add a new exercise to the library. It will be tagged with your account.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="ex-name">
              Exercise Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ex-name"
              placeholder="e.g. Barbell Squat"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          {/* Muscle Group + Difficulty */}
          <div className="space-y-2">
            <Label>
              Muscle Groups <span className="text-destructive">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              Select one or more primary muscle groups targeted.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1">
              {MUSCLE_GROUPS.map((g) => {
                const checked = form.muscleGroups.includes(g)
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        muscleGroups: checked
                          ? prev.muscleGroups.filter((m) => m !== g)
                          : [...prev.muscleGroups, g],
                      }))
                    }}
                    className={`relative rounded-lg border p-2 text-center text-xs font-medium transition-all ${
                      checked
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card border-border hover:bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    {g}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>
                Difficulty <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.difficulty}
                onValueChange={(v) => setForm({ ...form, difficulty: v as Difficulty })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Section Types — the key UX differentiation */}
          <div className="space-y-2">
            <Label>
              Exercise Category <span className="text-destructive">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              Select where this exercise can be used. You can select multiple sections.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
              {WORKOUT_SECTIONS.map((section) => {
                const meta = SECTION_META[section]
                const checked = form.sectionTypes.includes(section)
                return (
                  <button
                    key={section}
                    type="button"
                    onClick={() => toggleSection(section)}
                    className={`relative flex flex-col items-start gap-1.5 rounded-xl border-2 p-3.5 text-left transition-all ${
                      checked
                        ? `${meta.bg} ${meta.color} border-current`
                        : 'border-border bg-card hover:bg-muted/50 text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-sm">
                      {meta.icon}
                      {meta.label}
                    </div>
                    <p className="text-[11px] leading-snug opacity-80">{meta.description}</p>
                    {checked && (
                      <span className={`absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full text-background text-[9px] font-bold bg-current`}>
                        ✓
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Equipment */}
          <div className="space-y-1.5">
            <Label htmlFor="ex-equipment">Equipment</Label>
            <Input
              id="ex-equipment"
              placeholder="e.g. Barbell, Resistance Band, Bodyweight"
              value={form.equipment}
              onChange={(e) => setForm({ ...form, equipment: e.target.value })}
            />
          </div>

          {/* Image URL */}
          <div className="space-y-1.5">
            <Label htmlFor="ex-image-url">Image URL</Label>
            <Input
              id="ex-image-url"
              type="url"
              placeholder="https://..."
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            />
            {form.imageUrl.trim() !== '' && (
              <img
                src={form.imageUrl.trim()}
                alt=""
                className="h-16 w-16 object-cover rounded-md border"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            )}
          </div>

          {/* Calories */}
          <div className="space-y-1.5">
            <Label htmlFor="ex-cals">Calories per Set</Label>
            <Input
              id="ex-cals"
              type="number"
              min={0}
              placeholder="e.g. 12"
              value={form.caloriesPerSet}
              onChange={(e) =>
                setForm({ ...form, caloriesPerSet: e.target.value === '' ? '' : Number(e.target.value) })
              }
            />
          </div>

          {/* Targeted Muscles */}
          <div className="space-y-1.5">
            <Label htmlFor="ex-muscles">Targeted Muscles (comma-separated)</Label>
            <Input
              id="ex-muscles"
              placeholder="e.g. Quadriceps, Glutes, Hamstrings"
              value={form.targetedMuscles}
              onChange={(e) => setForm({ ...form, targetedMuscles: e.target.value })}
            />
          </div>

          {/* Instructions */}
          <div className="space-y-1.5">
            <Label htmlFor="ex-instructions">Instructions</Label>
            <Textarea
              id="ex-instructions"
              placeholder="Step-by-step instructions for performing this exercise correctly..."
              rows={3}
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
            />
          </div>

          {/* Tips */}
          <div className="space-y-1.5">
            <Label htmlFor="ex-tips">Tips (comma-separated)</Label>
            <Textarea
              id="ex-tips"
              placeholder="e.g. Keep your core tight, Breathe out on exertion"
              rows={2}
              value={form.tips}
              onChange={(e) => setForm({ ...form, tips: e.target.value })}
            />
          </div>

          {/* Common Mistakes */}
          <div className="space-y-1.5">
            <Label htmlFor="ex-mistakes">Common Mistakes (comma-separated)</Label>
            <Textarea
              id="ex-mistakes"
              placeholder="e.g. Rounding the lower back, Knees caving inward"
              rows={2}
              value={form.commonMistakes}
              onChange={(e) => setForm({ ...form, commonMistakes: e.target.value })}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={onSave} disabled={isSaving} className="flex-1">
              {isSaving
                ? isEditing ? 'Saving...' : 'Creating...'
                : isEditing ? 'Save Changes' : 'Create Exercise'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Section Badge ─────────────────────────────────────────────────────────────
function SectionBadge({ section }: { section: WorkoutSection }) {
  const meta = SECTION_META[section]
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.bg} ${meta.color}`}
    >
      {meta.icon}
      {meta.label}
    </span>
  )
}

// ─── Exercise Card ─────────────────────────────────────────────────────────────
function ExerciseGridCard({
  exercise,
  onEdit,
  onDelete,
  onView,
}: {
  exercise: Exercise
  onEdit: (ex: Exercise) => void
  onDelete: (ex: Exercise) => void
  onView: (ex: Exercise) => void
}) {
  const sections = (exercise.sectionTypes ?? ['workout']) as WorkoutSection[]
  return (
    <Card 
      className="group flex flex-col hover:shadow-md transition-all cursor-pointer"
      onClick={() => onView(exercise)}
    >
      {exercise.imageUrl && (
        <ExerciseAnimation
          urls={[exercise.imageUrl]}
          className="w-full aspect-[4/3] overflow-hidden rounded-t-xl border-b bg-muted"
        />
      )}
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {sections.map((s) => (
              <SectionBadge key={s} section={s} />
            ))}
          </div>
          {exercise.isSystem && (
            <Badge variant="secondary" className="text-[9px] shrink-0">
              System
            </Badge>
          )}
        </div>
        <CardTitle className="mt-2 text-base font-bold line-clamp-1">
          {exercise.name}
        </CardTitle>
        <CardDescription className="flex flex-wrap gap-2 text-xs mt-1">
          <Badge
            className={`text-[10px] font-semibold ${DIFFICULTY_COLORS[exercise.difficulty]}`}
          >
            {exercise.difficulty}
          </Badge>
          {exercise.muscleGroups?.map(m => (
            <Badge key={m} variant="outline" className="text-[10px]">
              {m}
            </Badge>
          ))}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 flex-1">
        <p className="text-xs text-muted-foreground line-clamp-3 min-h-[48px]">
          {exercise.instructions || 'No instructions provided.'}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate">{exercise.equipment || 'Bodyweight'}</span>
          {exercise.caloriesPerSet > 0 && (
            <span className="flex items-center gap-1 shrink-0 font-semibold">
              <IconFlame className="w-3.5 h-3.5 text-orange-500" />
              {exercise.caloriesPerSet} kcal/set
            </span>
          )}
        </div>
        {!exercise.isSystem && (
          <div className="flex gap-1.5 pt-1 border-t opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-7 text-xs"
              onClick={(e) => { e.stopPropagation(); onEdit(exercise); }}
            >
              <IconEdit className="w-3 h-3 mr-1" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-7 text-xs text-destructive hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(exercise); }}
            >
              <IconTrash className="w-3 h-3 mr-1" />
              Delete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Tab types ────────────────────────────────────────────────────────────────
const ALL_TAB = 'all' as const
type SectionTab = WorkoutSection | typeof ALL_TAB

const SECTION_TABS: { label: string; value: SectionTab; icon: React.ReactNode }[] = [
  { label: 'All', value: 'all', icon: null },
  { label: 'Warm Up', value: 'warmup', icon: <IconRun className="w-3.5 h-3.5" /> },
  { label: 'Workout', value: 'workout', icon: <IconDumbbell className="w-3.5 h-3.5" /> },
  { label: 'Stretching', value: 'stretching', icon: <IconYoga className="w-3.5 h-3.5" /> },
]

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function ExercisesPage() {
  const [search, setSearch] = useState('')
  const [muscleGroup, setMuscleGroup] = useState<string>('All')
  const [difficulty, setDifficulty] = useState<string>('All')
  const [sectionTab, setSectionTab] = useState<SectionTab>('all')
  const [page, setPage] = useState(1)
  const limit = 24

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  const [viewingExercise, setViewingExercise] = useState<Exercise | null>(null)

  const deleteExercise = useDeleteExercise()

  const { data: listResponse, isLoading, isError, refetch } = useExercises({
    search: search.trim() || undefined,
    muscleGroup: muscleGroup !== 'All' ? (muscleGroup as MuscleGroup) : undefined,
    difficulty: difficulty !== 'All' ? (difficulty as Difficulty) : undefined,
    section: sectionTab !== 'all' ? (sectionTab as WorkoutSection) : undefined,
    page,
    limit,
  })

  const exercises = listResponse?.exercises ?? []
  const pagination = listResponse?.pagination

  const openCreate = () => {
    setEditingExercise(null)
    setDialogOpen(true)
  }

  const openEdit = (ex: Exercise) => {
    setEditingExercise(ex)
    setDialogOpen(true)
  }

  const openView = (ex: Exercise) => {
    setViewingExercise(ex)
  }

  const handleDelete = async (ex: Exercise) => {
    if (!confirm(`Delete "${ex.name}"? This action cannot be undone.`)) return
    try {
      await deleteExercise.mutateAsync(ex._id)
    } catch {}
  }

  const hasActiveFilters =
    search.trim() || muscleGroup !== 'All' || difficulty !== 'All' || sectionTab !== 'all'

  const clearFilters = () => {
    setSearch('')
    setMuscleGroup('All')
    setDifficulty('All')
    setSectionTab('all')
    setPage(1)
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild className="h-8 px-2">
              <Link href="/dashboard/workouts">
                <IconChevronLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <span className="text-xs text-muted-foreground">Workouts / Exercises</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Exercise Library</h1>
          <p className="text-muted-foreground text-sm">
            Browse, create, and manage all exercises — categorised by Warm Up, Workout, and Stretching
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <IconRefresh className="h-4 w-4" />
          </Button>
          <Button onClick={openCreate}>
            <IconPlus className="mr-2 h-4 w-4" />
            Create Exercise
          </Button>
        </div>
      </div>

      {/* Section stat cards — click to filter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {WORKOUT_SECTIONS.map((section) => {
          const meta = SECTION_META[section]
          const active = sectionTab === section
          return (
            <button
              key={section}
              onClick={() => {
                setSectionTab((prev) => (prev === section ? 'all' : section))
                setPage(1)
              }}
              className={`rounded-xl border-2 p-4 text-left transition-all hover:shadow-sm ${
                active
                  ? `${meta.bg} ${meta.color} border-current`
                  : 'bg-card border-border hover:border-muted-foreground/30'
              }`}
            >
              <div
                className={`flex items-center gap-2 font-semibold text-sm mb-1 ${
                  active ? meta.color : ''
                }`}
              >
                {meta.icon}
                {meta.label}
              </div>
              <p className="text-xs text-muted-foreground">{meta.description}</p>
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <IconFilter className="w-4 h-4" />
            Filters &amp; Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search exercises by name..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="pl-9"
              />
            </div>
            <div className="w-[180px]">
              <Select value={muscleGroup} onValueChange={(v) => { setMuscleGroup(v); setPage(1) }}>
                <SelectTrigger>
                  <SelectValue placeholder="Muscle Group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Muscles</SelectItem>
                  {MUSCLE_GROUPS.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[180px]">
              <Select value={difficulty} onValueChange={(v) => { setDifficulty(v); setPage(1) }}>
                <SelectTrigger>
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Levels</SelectItem>
                  {DIFFICULTIES.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-10">
                <IconX className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Section tabs */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Category:</span>
            <div className="flex gap-1.5 flex-wrap">
              {SECTION_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => { setSectionTab(tab.value); setPage(1) }}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    sectionTab === tab.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                {sectionTab !== 'all'
                  ? SECTION_META[sectionTab as WorkoutSection].label
                  : 'All Exercises'}
              </CardTitle>
              <CardDescription>
                {isLoading
                  ? 'Loading exercises...'
                  : pagination
                  ? `Showing ${exercises.length} of ${pagination.total} exercises`
                  : `${exercises.length} exercises`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isError && (
            <div className="text-center py-8 text-destructive">
              Failed to load exercises.{' '}
              <button className="underline" onClick={() => refetch()}>Retry</button>
            </div>
          )}

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-52 w-full rounded-lg" />
              ))}
            </div>
          ) : exercises.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border rounded-xl bg-muted/20">
              <IconDumbbell className="w-10 h-10 text-muted-foreground mb-3" />
              <p className="font-medium text-muted-foreground">No exercises found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {hasActiveFilters
                  ? 'Try adjusting your filters or search term'
                  : 'Create your first exercise to get started'}
              </p>
              {!hasActiveFilters && (
                <Button className="mt-4" onClick={openCreate}>
                  <IconPlus className="mr-2 h-4 w-4" />
                  Create Exercise
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {exercises.map((ex: Exercise) => (
                  <ExerciseGridCard
                    key={ex._id}
                    exercise={ex}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onView={openView}
                  />
                ))}
              </div>
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-end gap-2 pt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={page === pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <ExerciseFormDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v)
          if (!v) setEditingExercise(null)
        }}
        editingExercise={editingExercise}
      />

      <ExerciseDetailsDialog
        open={!!viewingExercise}
        onOpenChange={(open) => !open && setViewingExercise(null)}
        exercise={viewingExercise}
      />
    </div>
  )
}
