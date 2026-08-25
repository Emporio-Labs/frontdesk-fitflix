'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  IconCalendarEvent,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconDna,
  IconFlask,
  IconLock,
  IconPlayerPlay,
  IconRun,
  IconSalad,
  IconStethoscope,
  IconUserCheck,
} from '@tabler/icons-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { ExpertAppointment } from '@/lib/services/onboarding.service'
import type { UserOnboardingSummary } from '@/lib/services/user.service'
import { useUpdateSharedOnboardingStep } from '@/hooks/use-onboarding'
import {
  MEMBER_ONBOARDING_STEPS,
  getMemberOnboardingStatus,
  type MemberOnboardingStepKey,
} from '@/lib/member-onboarding'

const STEP_ICONS = {
  ACTIVE_X_TEST: IconPlayerPlay,
  DNA_SAMPLE: IconDna,
  VALD_TEST: IconFlask,
  NUTRITION_APPOINTMENT: IconSalad,
  SPORT_SCIENTIST_APPOINTMENT: IconStethoscope,
  PLAN_TRAINER_ASSIGNMENT: IconRun,
} as const

function formatAppointment(appointment?: ExpertAppointment) {
  if (!appointment) return ''
  const date = appointment.appointmentDate || appointment.appointmentStart
  if (!date) return ''
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return String(date)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed)
}

function findAppointment(appointments: ExpertAppointment[] | undefined, type: 'nutritionist' | 'sports_scientist') {
  return (appointments ?? []).find((appointment) => appointment.expertType === type)
}

export function MemberOnboardingWorkflow({
  userId,
  userName,
  hasActiveMembership,
  hasTrainerAssigned,
  onboarding,
  expertAppointments,
}: {
  userId: string
  userName: string
  hasActiveMembership: boolean
  hasTrainerAssigned: boolean
  onboarding?: UserOnboardingSummary
  expertAppointments?: ExpertAppointment[]
}) {
  const updateSharedStep = useUpdateSharedOnboardingStep()
  const readiness = useMemo(
    () => getMemberOnboardingStatus({ onboarding, expertAppointments, hasActiveMembership, hasTrainerAssigned }),
    [expertAppointments, hasActiveMembership, hasTrainerAssigned, onboarding],
  )
  const isComplete = readiness.completedCount === MEMBER_ONBOARDING_STEPS.length

  const markPhysicalStep = (step: MemberOnboardingStepKey, completed: boolean) => {
    updateSharedStep.mutate({ userId, step, completed })
  }

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader className="gap-4 border-b bg-primary/[0.03] sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Membership onboarding</CardTitle>
            <Badge variant={isComplete ? 'default' : 'secondary'}>
              {readiness.completedCount}/{MEMBER_ONBOARDING_STEPS.length} complete
            </Badge>
          </div>
          <CardDescription className="mt-1 max-w-2xl">
            Shared member readiness record. The app owns profile information and nutrition booking; the centre records physical tests, sport scientist booking status, and plan/PT assignment.
          </CardDescription>
        </div>
        <div className="flex shrink-0 items-center gap-3 rounded-lg border bg-background px-3 py-2 text-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"><IconCalendarEvent className="h-5 w-5" /></div>
          <div><p className="font-medium">{readiness.pendingSteps.length} outstanding</p><p className="text-xs text-muted-foreground">{userName}</p></div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        {!hasActiveMembership ? (
          <div className="flex items-start gap-3 rounded-lg border border-amber-300/60 bg-amber-50/70 p-4 text-sm dark:bg-amber-950/20">
            <IconLock className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
            <div>
              <p className="font-medium text-amber-950 dark:text-amber-100">Activate a membership to start onboarding</p>
              <p className="mt-1 text-amber-900/80 dark:text-amber-200/80">The shared record is visible, but centre onboarding starts after a membership plan is active.</p>
              <Button asChild variant="link" className="h-auto px-0 pt-2 text-amber-800 dark:text-amber-200"><Link href={`/admin/memberships?assignUserId=${encodeURIComponent(userId)}`}>Assign membership <IconChevronRight className="ml-1 h-4 w-4" /></Link></Button>
            </div>
          </div>
        ) : (
          <div className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 ${isComplete ? 'border-emerald-300/70 bg-emerald-50/60 dark:bg-emerald-950/15' : 'border-amber-300/70 bg-amber-50/60 dark:bg-amber-950/15'}`}>
            <div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Check-in readiness</p><p className="mt-1 text-sm font-medium">{isComplete ? 'All six onboarding actions complete' : `${readiness.pendingSteps.length} action${readiness.pendingSteps.length === 1 ? '' : 's'} still outstanding`}</p></div>
            {isComplete ? <IconUserCheck className="h-5 w-5 text-emerald-700 dark:text-emerald-300" /> : <span className="hidden text-xs text-muted-foreground sm:block">Any order · shared with member app</span>}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {readiness.steps.map((step, index) => {
            const Icon = STEP_ICONS[step.key]
            const appointment = step.appointment ? findAppointment(expertAppointments, step.appointment) : undefined
            const appointmentLabel = formatAppointment(appointment)
            const isPhysical = step.key === 'ACTIVE_X_TEST' || step.key === 'DNA_SAMPLE' || step.key === 'VALD_TEST'
            const isPending = step.status === 'pending'

            return (
              <div key={step.key} className={`rounded-xl border p-4 ${step.status === 'complete' ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/60 dark:bg-emerald-950/15' : step.status === 'scheduled' ? 'border-blue-200 bg-blue-50/40 dark:border-blue-900/60 dark:bg-blue-950/15' : 'bg-background'}`}>
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${step.status === 'complete' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : step.status === 'scheduled' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : 'bg-muted text-muted-foreground'}`}>{step.status === 'complete' ? <IconCheck className="h-5 w-5" /> : <Icon className="h-5 w-5" />}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2"><div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{String(index + 1).padStart(2, '0')}</p><p className="mt-0.5 font-semibold">{step.title}</p></div><Badge variant={step.status === 'complete' ? 'default' : step.status === 'scheduled' ? 'secondary' : 'outline'} className="shrink-0 capitalize">{step.status === 'scheduled' ? 'Scheduled' : step.status === 'complete' ? 'Complete' : 'Pending'}</Badge></div>
                    <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
                    {appointmentLabel && <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-300"><IconClock className="h-3.5 w-3.5" />{appointmentLabel}</p>}
                    <p className="mt-2 text-xs text-muted-foreground">{step.helper}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {isPhysical ? (
                        <Button size="sm" variant={step.status === 'complete' ? 'outline' : 'default'} disabled={!hasActiveMembership || updateSharedStep.isPending} onClick={() => markPhysicalStep(step.key, isPending)}>{step.status === 'complete' ? 'Mark pending' : updateSharedStep.isPending ? 'Saving…' : 'Mark complete'}</Button>
                      ) : step.key === 'PLAN_TRAINER_ASSIGNMENT' ? (
                        <Button asChild size="sm" variant={step.status === 'complete' ? 'outline' : 'default'} disabled={!hasActiveMembership}><Link href="#trainer-assignment">{step.status === 'complete' ? 'Review assignment' : 'Assign plan & trainer'}<IconChevronRight className="ml-1.5 h-4 w-4" /></Link></Button>
                      ) : (
                        <span className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground"><IconCalendarEvent className="h-3.5 w-3.5" />Member books in app</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
