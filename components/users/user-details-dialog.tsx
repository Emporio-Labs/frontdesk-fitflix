'use client'

import React from 'react'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  IconMail,
  IconPhone,
  IconHeart,
  IconRun,
  IconCalendar,
  IconExternalLink,
  IconBarbell,
  IconClipboardCheck,
} from '@tabler/icons-react'
import { useUser } from '@/hooks/use-users'
import { useTrainers, useAssignTrainerToUser } from '@/hooks/use-trainers'
import { User } from '@/lib/services/user.service'
import { Membership } from '@/lib/services/membership.service'
import { StatusBadge } from '@/components/status-badge'
import { computeBmi, getBmiCategory, toNumberSafe } from '@/lib/health-insights'
import {
  OnboardingTimeline,
  onboardingStepLabel,
} from '@/components/onboarding-timeline'

interface UserDetailsDialogProps {
  user: User | null
  membership?: Membership | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function deriveOnboardingState(u: User): 'completed' | 'in_progress' | 'not_started' {
  const status = u.onboardingStatus
  if (status?.onboardingCompleted || u.onboarded) return 'completed'
  if (status?.currentStep && status.currentStep !== 'HEALTH_MARKERS') return 'in_progress'
  if (status?.completedSteps && status.completedSteps.length > 0) return 'in_progress'
  if (
    status?.healthMarkersCompleted ||
    status?.healthGoalsCompleted ||
    status?.consentCompleted ||
    status?.reportsUploaded
  ) {
    return 'in_progress'
  }
  return 'not_started'
}

export function UserDetailsDialog({
  user: initialUser,
  membership,
  open,
  onOpenChange,
}: UserDetailsDialogProps) {
  const userId = initialUser?._id || ''
  const { data: fullUser, isLoading: userLoading } = useUser(userId)
  const { data: trainers = [] } = useTrainers()
  const assignTrainerMutation = useAssignTrainerToUser()

  const u = fullUser || initialUser

  if (!u) return null

  const currentTrainerId =
    typeof u.assignedTrainer === 'object' && u.assignedTrainer
      ? (u.assignedTrainer as any)._id
      : typeof u.assignedTrainer === 'string'
      ? u.assignedTrainer
      : 'none'

  const currentTrainerName =
    typeof u.assignedTrainer === 'object' && u.assignedTrainer
      ? (u.assignedTrainer as any).trainerName || (u.assignedTrainer as any).email
      : trainers.find((t) => t._id === currentTrainerId)?.trainerName

  const markers = (u.healthMarkers || {}) as Record<string, any>
  const heightVal = markers.height || markers.heightCm
  const weightVal = markers.weight || markers.weightKg
  const heightDisplay = heightVal
    ? String(heightVal).toLowerCase().endsWith('cm')
      ? String(heightVal)
      : `${heightVal} cm`
    : '—'
  const weightDisplay = weightVal
    ? String(weightVal).toLowerCase().endsWith('kg')
      ? String(weightVal)
      : `${weightVal} kg`
    : '—'

  const bmiVal = markers.bmi || computeBmi(heightVal, weightVal)
  const bmiNum = toNumberSafe(bmiVal)
  const bmiDisplay = bmiVal != null ? String(bmiVal) : '—'
  const bmiCategory = getBmiCategory(bmiNum)

  const activityLvl = markers.activityLevel ? String(markers.activityLevel) : '—'
  const targetWeightVal = markers.targetWeight || markers.goalWeight
  const targetWeightDisplay = targetWeightVal
    ? String(targetWeightVal).toLowerCase().endsWith('kg')
      ? String(targetWeightVal)
      : `${targetWeightVal} kg`
    : '—'

  const bloodPressure =
    markers.systolicBp && markers.diastolicBp
      ? `${markers.systolicBp}/${markers.diastolicBp} mmHg`
      : '—'

  const sleepWater = `${markers.sleepHours ? `${markers.sleepHours} hrs` : '—'} / ${
    markers.waterIntakeLiters ? `${markers.waterIntakeLiters} L` : '—'
  }`

  const onboarding = u.onboardingStatus

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-lg flex items-center justify-center shrink-0">
                {u.username.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  {u.username}
                  <Badge variant="outline" className="text-xs font-normal">
                    {u.gender}, {u.age} yrs
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground flex flex-wrap items-center gap-3 mt-1">
                  <span className="flex items-center gap-1">
                    <IconMail className="w-3.5 h-3.5" /> {u.email || 'No email'}
                  </span>
                  <span className="flex items-center gap-1">
                    <IconPhone className="w-3.5 h-3.5" /> {u.phone}
                  </span>
                </DialogDescription>
              </div>
            </div>
            <StatusBadge status={deriveOnboardingState(u)} size="sm" />
          </div>
        </DialogHeader>

        {userLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. Assigned Trainer Management */}
            <Card className="border border-amber-500/30 bg-amber-500/5 shadow-xs">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <IconRun className="w-5 h-5 text-amber-500" />
                    <span>Assigned Personal Trainer</span>
                  </div>
                  {currentTrainerName && (
                    <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      Assigned: {currentTrainerName}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Select
                    value={currentTrainerId}
                    onValueChange={(val) => {
                      const trainerId = val === 'none' ? null : val
                      assignTrainerMutation.mutate({ userId: u._id, trainerId })
                    }}
                    disabled={assignTrainerMutation.isPending}
                  >
                    <SelectTrigger className="flex-1 bg-background text-xs">
                      <SelectValue placeholder="Select personal trainer..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Trainer Assigned</SelectItem>
                      {trainers.map((t) => (
                        <SelectItem key={t._id} value={t._id}>
                          {t.trainerName} ({t.specialities.slice(0, 2).join(', ')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* 2. Health & Fitness Profile */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <IconHeart className="w-4 h-4 text-red-500" />
                Health & Fitness Indicators
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3 rounded-lg border bg-muted/30 space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Height & Weight</p>
                  <p className="text-sm font-semibold truncate">
                    {heightDisplay} / {weightDisplay}
                  </p>
                </div>

                <div className="p-3 rounded-lg border bg-muted/30 space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">BMI Index</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-semibold">{bmiDisplay}</p>
                    {bmiCategory && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                        {bmiCategory}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-lg border bg-muted/30 space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Blood Pressure</p>
                  <p className="text-sm font-semibold truncate">{bloodPressure}</p>
                </div>

                <div className="p-3 rounded-lg border bg-muted/30 space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Sleep / Water</p>
                  <p className="text-sm font-semibold truncate">{sleepWater}</p>
                </div>

                <div className="p-3 rounded-lg border bg-muted/30 space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Activity Level</p>
                  <p className="text-sm font-semibold truncate">{activityLvl}</p>
                </div>

                <div className="p-3 rounded-lg border bg-muted/30 space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Target Weight</p>
                  <p className="text-sm font-semibold truncate">{targetWeightDisplay}</p>
                </div>
              </div>

              {/* Health Goals & Snapshot */}
              <div className="p-3.5 rounded-lg border bg-card space-y-2">
                <p className="text-xs font-semibold">Stated Health Goals</p>
                <div className="flex flex-wrap gap-1.5">
                  {u.healthGoals.length > 0 ? (
                    u.healthGoals.map((goal, idx) => (
                      <Badge key={`${goal}-${idx}`} variant="secondary" className="text-xs">
                        {goal}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">No specific health goals logged.</span>
                  )}
                </div>
              </div>
            </div>

            {/* 3. Onboarding Progress Tracker */}
            {onboarding && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <IconClipboardCheck className="w-4 h-4 text-blue-500" />
                  Onboarding Progress
                </h4>
                <div className="rounded-lg border bg-card p-4 space-y-2">
                  <OnboardingTimeline
                    currentStep={onboarding.currentStep}
                    completedSteps={onboarding.completedSteps ?? []}
                  />
                  <p className="text-xs text-muted-foreground">
                    Current step:{' '}
                    <span className="font-medium text-foreground">
                      {onboardingStepLabel(onboarding.currentStep)}
                    </span>
                    {' · '}
                    {onboarding.completedSteps?.length ?? 0} of 7 completed
                  </p>
                </div>
              </div>
            )}

            {/* 4. Membership Overview */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <IconCalendar className="w-4 h-4 text-emerald-500" />
                Active Membership Plan
              </h4>
              {membership ? (
                <div className="p-4 rounded-lg border bg-emerald-500/5 border-emerald-500/20 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-emerald-600">{membership.planName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Valid: {membership.startDate ? new Date(membership.startDate).toLocaleDateString() : '—'} to{' '}
                      {membership.endDate ? new Date(membership.endDate).toLocaleDateString() : '—'}
                    </p>
                  </div>
                  <Badge variant="outline" className="border-emerald-500 text-emerald-600 font-semibold">
                    {membership.status || 'Active'}
                  </Badge>
                </div>
              ) : (
                <div className="p-4 rounded-lg border border-dashed text-center space-y-2">
                  <p className="text-xs text-muted-foreground">No active membership assigned to this member.</p>
                  <Button asChild size="sm" variant="outline" className="text-xs h-8">
                    <Link href={`/admin/memberships?assignUserId=${encodeURIComponent(u._id)}`}>
                      Assign Membership Now
                    </Link>
                  </Button>
                </div>
              )}
            </div>

            {/* 5. Action Links */}
            <div className="flex flex-wrap gap-3 pt-2 border-t justify-end">
              <Button asChild variant="outline" size="sm" className="text-xs">
                <Link href={`/dashboard/workouts/members/${u._id}`}>
                  <IconBarbell className="w-3.5 h-3.5 mr-1.5 text-primary" />
                  Workout Schedule Workspace
                </Link>
              </Button>
              <Button asChild size="sm" className="text-xs">
                <Link href={`/admin/users/${u._id}`}>
                  <IconExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Full Profile Page
                </Link>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
