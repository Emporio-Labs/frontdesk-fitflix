'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/skeleton-loader'
import { StatusBadge } from '@/components/status-badge'
import {
  OnboardingTimeline,
  onboardingStepLabel,
} from '@/components/onboarding-timeline'
import {
  IconUser,
  IconClipboardCheck,
  IconTarget,
  IconFileText,
  IconCalendarEvent,
  IconNotes,
  IconHistory,
  IconExternalLink,
  IconSparkles,
  IconSalad,
  IconActivity,
} from '@tabler/icons-react'
import { useUser } from '@/hooks/use-users'
import { useNutritionPlans } from '@/hooks/use-nutrition'
import { useNutritionistWorkspace } from '@/stores/nutritionist-workspace-store'
import type { ExpertAppointment, MedicalReport } from '@/lib/services/onboarding.service'

interface ClinicalUserDialogProps {
  userId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssignExisting?: (userId: string) => void
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span>{title}</span>
      </div>
      <div className="rounded-lg border bg-card p-4">{children}</div>
    </section>
  )
}

export function ClinicalUserDialog({
  userId,
  open,
  onOpenChange,
  onAssignExisting,
}: ClinicalUserDialogProps) {
  const router = useRouter()
  const { data: user, isLoading: userLoading } = useUser(userId ?? '')
  const { data: previousPlans = [], isLoading: plansLoading } =
    useNutritionPlans(userId ?? undefined)

  const { selectUser, setDraftNote, draftNotes } = useNutritionistWorkspace()
  const persistedNote = userId ? draftNotes[userId] ?? '' : ''
  const [note, setNote] = useState(persistedNote)

  useEffect(() => {
    setNote(persistedNote)
  }, [persistedNote, userId])

  const nutritionistAppointment = useMemo(
    () =>
      user?.expertAppointments?.find(
        (a: ExpertAppointment) => a.expertType === 'nutritionist'
      ),
    [user]
  )

  const onboarding = user?.onboardingStatus
  const reports = user?.reports ?? []
  const healthGoals = user?.healthGoals ?? []

  const fullName = user?.username || user?.email || '—'
  const ageNum = user?.age ? Number(user.age) : NaN
  const age = Number.isFinite(ageNum) && ageNum > 0 ? String(ageNum) : '—'
  const gender = user?.gender || '—'

  const ageDisplay = age !== '—' ? age : 'Not Provided'
  const genderDisplay = gender !== '—' ? gender : 'Not Provided'
  const markers = user?.healthMarkers || {}
  const weight = markers.weight ? (String(markers.weight).toLowerCase().endsWith('kg') ? String(markers.weight) : `${markers.weight}kg`) : 'Not Provided'
  const height = markers.height ? (String(markers.height).toLowerCase().endsWith('cm') ? String(markers.height) : `${markers.height}cm`) : 'Not Provided'
  const bmi = markers.bmi ? String(markers.bmi) : 'Not Provided'
  const bodyFat = markers.bodyFatPercent ? (String(markers.bodyFatPercent).endsWith('%') ? String(markers.bodyFatPercent) : `${markers.bodyFatPercent}%`) : 'Not Provided'
  const activityLvl = markers.activityLevel ? String(markers.activityLevel) : 'Not Provided'
  const targetWeight = (markers.targetWeight || markers.goalWeight) ? (String(markers.targetWeight || markers.goalWeight).toLowerCase().endsWith('kg') ? String(markers.targetWeight || markers.goalWeight) : `${markers.targetWeight || markers.goalWeight}kg`) : 'Not Provided'
  const firstGoal = healthGoals.length > 0 ? healthGoals[0] : 'Not Provided'

  const handleCreatePlan = () => {
    if (!userId) return
    selectUser(userId)
    onOpenChange(false)
    router.push(`/admin/nutrition/diet-plans/new?userId=${userId}`)
  }

  const handleAssignExisting = () => {
    if (!userId) return
    selectUser(userId)
    onOpenChange(false)
    onAssignExisting?.(userId)
  }

  const persistNote = () => {
    if (!userId) return
    setDraftNote(userId, note)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-5xl flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle className="text-lg">Clinical Review</DialogTitle>
          <DialogDescription className="text-xs">
            Primary workspace for reviewing onboarding and creating a personalized plan
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-5 space-y-5">
          {!userId || userLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : !user ? (
            <p className="py-12 text-center text-muted-foreground">
              User not found.
            </p>
          ) : (
            <>
              {/* 1. User Profile Summary */}
              <Section icon={IconUser} title="User Profile">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  <ProfileField label="Name" value={fullName} />
                  <ProfileField label="Age" value={age} />
                  <ProfileField label="Gender" value={gender} />
                  <ProfileField label="Email" value={user.email || '—'} />
                  <ProfileField label="Phone" value={user.phone || '—'} />
                  <ProfileField
                    label="Created"
                    value={
                      user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString()
                        : '—'
                    }
                  />
                </div>
              </Section>

              {/* 1.5. Health Markers / Body Metrics */}
              <Section icon={IconActivity} title="Health Markers">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard label="Weight" value={weight} />
                  <MetricCard label="Age" value={ageDisplay} />
                  <MetricCard label="Goal" value={firstGoal} />
                  <MetricCard label="Height" value={height} />
                  <MetricCard label="Gender" value={genderDisplay} />
                  <MetricCard label="BMI" value={bmi} />
                  <MetricCard label="Activity Level" value={activityLvl} />
                  <MetricCard label="Target Weight" value={targetWeight} />
                  {bodyFat !== 'Not Provided' && (
                    <MetricCard label="Body Fat %" value={bodyFat} />
                  )}
                </div>
              </Section>

              {/* 2. Onboarding Progress Tracker */}
              <Section icon={IconClipboardCheck} title="Onboarding Progress">
                <OnboardingTimeline
                  currentStep={onboarding?.currentStep}
                  completedSteps={onboarding?.completedSteps ?? []}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Current step:{' '}
                  <span className="font-medium text-foreground">
                    {onboardingStepLabel(onboarding?.currentStep)}
                  </span>
                  {' · '}
                  {onboarding?.completedSteps?.length ?? 0} of 7 completed
                </p>
              </Section>

              {/* 3. Health Goals */}
              <Section icon={IconTarget} title="Health Goals">
                {healthGoals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No goals captured yet.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {healthGoals.map((g: string) => (
                      <Badge key={g} variant="secondary">
                        {g}
                      </Badge>
                    ))}
                  </div>
                )}
              </Section>

              {/* 4. Uploaded Reports */}
              <Section icon={IconFileText} title="Uploaded Reports">
                {reports.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No reports uploaded.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Name</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs">Uploaded</TableHead>
                        <TableHead className="text-right text-xs">
                          Open
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((r: MedicalReport) => (
                        <TableRow key={r._id}>
                          <TableCell className="text-sm font-medium">
                            {r.reportName}
                          </TableCell>
                          <TableCell className="text-sm">
                            {r.reportType}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {r.uploadedAt
                              ? new Date(r.uploadedAt).toLocaleDateString()
                              : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            {r.reportUrl ? (
                              <a
                                href={r.reportUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                              >
                                <IconExternalLink className="h-3.5 w-3.5" />
                                View
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Section>

              {/* 5. Appointment Status */}
              <Section icon={IconCalendarEvent} title="Nutritionist Appointment">
                {!nutritionistAppointment ? (
                  <p className="text-sm text-muted-foreground">
                    No nutritionist appointment booked yet.
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <StatusBadge
                      status={nutritionistAppointment.bookingStatus}
                      size="sm"
                    />
                    <span className="text-muted-foreground">
                      {nutritionistAppointment.appointmentDate
                        ? new Date(
                            nutritionistAppointment.appointmentDate
                          ).toLocaleString()
                        : 'Date not set'}
                    </span>
                    {nutritionistAppointment.meetingLink && (
                      <a
                        href={nutritionistAppointment.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <IconExternalLink className="h-3.5 w-3.5" />
                        Join meeting
                      </a>
                    )}
                  </div>
                )}
              </Section>

              {/* 6. Internal Notes */}
              <Section icon={IconNotes} title="Internal Notes">
                <Textarea
                  rows={3}
                  placeholder="Add private clinical notes for this member. Saved locally to your session."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onBlur={persistNote}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Notes are stored in your browser session (not synced to backend).
                </p>
              </Section>

              {/* 7. Previous Plans */}
              <Section icon={IconHistory} title="Previous Plans">
                {plansLoading ? (
                  <Skeleton className="h-16 w-full" />
                ) : previousPlans.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No previous plans for this user.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Plan</TableHead>
                        <TableHead className="text-xs">Goal</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Start</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previousPlans.map((p) => (
                        <TableRow key={p._id}>
                          <TableCell className="text-sm font-medium">
                            <Link
                              href={`/admin/nutrition/plans/${p._id}`}
                              className="hover:underline"
                            >
                              {p.name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-sm">
                            <Badge variant="secondary" className="text-xs">
                              {p.goal.replace(/([a-z])([A-Z])/g, '$1 $2')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={p.status} size="sm" />
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {(p.startDate || p.createdAt)
                              ? new Date((p.startDate || p.createdAt)!).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })
                              : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Section>
            </>
          )}
        </div>

        {/* Modal footer */}
        <div className="shrink-0 border-t border-gray-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3 bg-white">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={handleAssignExisting}
              disabled={!userId}
            >
              <IconSalad className="mr-2 h-4 w-4" />
              Assign Existing Plan
            </Button>
            <Button onClick={handleCreatePlan} disabled={!userId}>
              <IconSparkles className="mr-2 h-4 w-4" />
              Create Plan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-medium truncate">{value}</p>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  )
}
