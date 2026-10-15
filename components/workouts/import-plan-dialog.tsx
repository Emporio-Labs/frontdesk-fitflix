'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconDownload,
  IconFileSpreadsheet,
  IconUpload,
} from '@tabler/icons-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DifficultyBadge } from '@/components/workouts/difficulty-badge'
import { useImportWorkoutPlan, usePreviewWorkoutPlanImport } from '@/hooks/use-workout-plans'
import {
  workoutPlanService,
  type PlanImportIssue,
  type PlanImportPreview,
} from '@/lib/services/workout-plan.service'
import type { Difficulty } from '@/types/workout'

const SECTION_LABEL: Record<string, string> = {
  warmup: 'Warm-up',
  workout: 'Workout',
  stretching: 'Stretching',
}

const splitWords = (value: string) => value.replace(/([a-z])([A-Z])/g, '$1 $2')

function IssueTable({ issues }: { issues: PlanImportIssue[] }) {
  return (
    <div className="max-h-64 overflow-y-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-28">Sheet</TableHead>
            <TableHead className="w-16">Cell</TableHead>
            <TableHead>Problem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {issues.map((issue, i) => (
            <TableRow key={i}>
              <TableCell className="text-xs">{issue.sheet}</TableCell>
              <TableCell className="font-mono text-xs">
                {issue.row ? `${issue.column ?? ''}${issue.row}` : '—'}
              </TableCell>
              <TableCell className="text-xs whitespace-normal">{issue.message}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function PlanPreview({ preview }: { preview: PlanImportPreview }) {
  const { plan, summary } = preview
  if (!plan || !summary) return null
  return (
    <div className="space-y-3">
      <div className="rounded-md border p-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{plan.name}</span>
          <DifficultyBadge difficulty={plan.difficulty as Difficulty} />
          <Badge variant="outline">{splitWords(plan.goal)}</Badge>
          {plan.isTemplate && <Badge variant="secondary">Template</Badge>}
          <Badge variant="outline">{plan.status}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {plan.duration} week{plan.duration === 1 ? '' : 's'} · {summary.days} days (
          {summary.trainingDays} training, {summary.restDays} rest) · {summary.exercises} exercises
          {plan.templateCategory ? ` · ${plan.templateCategory}` : ''}
        </p>
      </div>
      <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
        {plan.days.map((day) => (
          <div key={day.dayNumber} className="rounded-md border px-3 py-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                Day {day.dayNumber} · {day.name}
              </span>
              {day.isRestDay ? (
                <Badge variant="secondary">Rest</Badge>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {day.exercises.length} exercise{day.exercises.length === 1 ? '' : 's'}
                </span>
              )}
            </div>
            {!day.isRestDay && (
              <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                {day.exercises.map((ex, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span className="truncate">
                      {ex.section !== 'workout' && (
                        <span className="mr-1 text-[10px] uppercase tracking-wide">
                          {SECTION_LABEL[ex.section] ?? ex.section}
                        </span>
                      )}
                      {ex.exerciseName}
                    </span>
                    <span className="shrink-0 tabular-nums">
                      {ex.targetSets} ×{' '}
                      {ex.durationSeconds ? `${ex.durationSeconds}s` : ex.targetReps}
                      {ex.targetWeightKg > 0 ? ` @ ${ex.targetWeightKg} kg` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * "Import from Excel" button + dialog. Flow: download template → choose the
 * filled file → server dry-run preview (errors by cell, or a day-by-day
 * summary) → import → open the new plan.
 */
export function ImportPlanDialog({ triggerVariant = 'outline' }: { triggerVariant?: 'outline' | 'default' }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PlanImportPreview | null>(null)
  const [downloading, setDownloading] = useState(false)

  const previewMutation = usePreviewWorkoutPlanImport()
  const importMutation = useImportWorkoutPlan()

  const reset = () => {
    setFile(null)
    setPreview(null)
    previewMutation.reset()
    importMutation.reset()
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    setOpen(next)
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const blob = await workoutPlanService.downloadImportTemplate()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'workout-plan-template.xlsx'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to download the template')
    } finally {
      setDownloading(false)
    }
  }

  const handleFile = (selected: File | undefined) => {
    if (!selected) return
    if (!/\.xlsx$/i.test(selected.name)) {
      toast.error('Choose an Excel .xlsx file')
      return
    }
    setFile(selected)
    setPreview(null)
    previewMutation.mutate(selected, { onSuccess: setPreview })
  }

  const handleImport = () => {
    if (!file) return
    importMutation.mutate(file, {
      onSuccess: (data) => {
        handleOpenChange(false)
        if (data.plan?._id) router.push(`/dashboard/workouts/${data.plan._id}`)
      },
      onError: (err: any) => {
        // Library changed between preview and import: show the fresh errors.
        const errors = err?.response?.data?.details?.errors
        if (Array.isArray(errors) && preview) {
          setPreview({ ...preview, valid: false, errors })
        }
      },
    })
  }

  const errors = preview?.errors ?? []
  const warnings = preview?.warnings ?? []

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant}>
          <IconFileSpreadsheet className="mr-2 h-4 w-4" />
          Import from Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import workout plan from Excel</DialogTitle>
          <DialogDescription>
            Fill in the template&apos;s <strong>Plan Details</strong> and <strong>Workout</strong>{' '}
            sheets, one row per exercise. Copy exercise names from the{' '}
            <strong>Exercise Library</strong> sheet. You&apos;ll see a preview before anything is
            saved.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border p-3 space-y-2">
            <p className="text-sm font-medium">1. Get the template</p>
            <p className="text-xs text-muted-foreground">
              Includes instructions, a filled example and the current exercise library.
            </p>
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading}>
              <IconDownload className="mr-2 h-4 w-4" />
              {downloading ? 'Downloading…' : 'Download template'}
            </Button>
          </div>
          <div className="rounded-md border p-3 space-y-2">
            <p className="text-sm font-medium">2. Upload the filled file</p>
            <p className="text-xs text-muted-foreground truncate">
              {file ? file.name : '.xlsx, up to 5 MB'}
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={previewMutation.isPending || importMutation.isPending}
            >
              <IconUpload className="mr-2 h-4 w-4" />
              {previewMutation.isPending ? 'Checking…' : file ? 'Choose another file' : 'Choose file'}
            </Button>
          </div>
        </div>

        {preview && errors.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-destructive">
              <IconAlertTriangle className="h-4 w-4" />
              {errors.length} problem{errors.length === 1 ? '' : 's'} to fix in the file, then upload
              it again
            </div>
            <IssueTable issues={errors} />
          </div>
        )}

        {preview && errors.length === 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
              <IconCircleCheck className="h-4 w-4" />
              File looks good — review and import
            </div>
            <PlanPreview preview={preview} />
          </div>
        )}

        {preview && warnings.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
              <IconAlertTriangle className="h-4 w-4" />
              {warnings.length} warning{warnings.length === 1 ? '' : 's'} (won&apos;t block the
              import)
            </div>
            <IssueTable issues={warnings} />
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!preview?.valid || errors.length > 0 || importMutation.isPending}
          >
            {importMutation.isPending ? 'Importing…' : 'Import plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
