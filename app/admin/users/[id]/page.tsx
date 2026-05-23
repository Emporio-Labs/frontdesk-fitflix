'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  IconArrowLeft,
  IconEdit,
  IconMail,
  IconPhone,
  IconCheck,
  IconX,
  IconStethoscope,
  IconSalad,
} from '@tabler/icons-react'
import { useUser } from '@/hooks/use-users'
import { useMemberships } from '@/hooks/use-memberships'
import { useBookings } from '@/hooks/use-bookings'
import { StatusBadge } from '@/components/status-badge'
import { OnboardingTimeline } from '@/components/onboarding-timeline'

function StatusFlag({ label, value }: { label: string; value: boolean | undefined }) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {value ? (
        <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
          <IconCheck className="h-4 w-4" /> Completed
        </span>
      ) : (
        <span className="flex items-center gap-1 text-muted-foreground">
          <IconX className="h-4 w-4" /> Pending
        </span>
      )}
    </div>
  )
}

export default function UserDetailPage() {
  const params = useParams<{ id?: string | string[] }>()
  const idParam = params?.id
  const userId = Array.isArray(idParam) ? idParam[0] : idParam || ''

  const { data: user, isLoading, isError } = useUser(userId)
  const { data: memberships = [], isLoading: membershipsLoading } = useMemberships()
  const { data: bookings = [], isLoading: bookingsLoading } = useBookings()

  // Debug: temporary logs to inspect API data shapes
  if (typeof window !== 'undefined') {
    console.debug('UserDetail: userId', userId)
    console.debug('UserDetail: user', user)
    console.debug('UserDetail: memberships (raw)', memberships)
    console.debug('UserDetail: bookings (raw)', bookings)
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/users">
          <Button variant="ghost" size="sm">
            <IconArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Button>
        </Link>
      </div>

      {isLoading && (
        <Card>
          <CardHeader>
            <CardTitle>Loading user...</CardTitle>
          </CardHeader>
        </Card>
      )}

      {isError && (
        <Card>
          <CardHeader>
            <CardTitle>Failed to load user</CardTitle>
            <CardDescription>Please verify API connectivity.</CardDescription>
          </CardHeader>
        </Card>
      )}

      {!isLoading && !user && !isError && (
        <Card>
          <CardHeader>
            <CardTitle>User not found</CardTitle>
          </CardHeader>
        </Card>
      )}

      {user && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-2xl">{user.username}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </div>
              <Button>
                <IconEdit className="w-4 h-4 mr-2" />
                Edit User
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <IconMail className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <IconPhone className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{user.phone || 'N/A'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Gender</p>
                  <p className="font-medium">{user.gender || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Age</p>
                  <p className="font-medium">{user.age || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-medium">{user.createdAt}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Updated</p>
                  <p className="font-medium">{user.updatedAt}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Health Goals</CardTitle>
              <CardDescription>User-submitted goals</CardDescription>
            </CardHeader>
            <CardContent>
              {user.healthGoals && user.healthGoals.length ? (
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  {user.healthGoals.map((goal) => (
                    <li key={goal}>{goal}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No goals provided yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Memberships</CardTitle>
              <CardDescription>Memberships associated with this user</CardDescription>
            </CardHeader>
            <CardContent>
              {membershipsLoading ? (
                <p className="text-sm text-gray-500">Loading memberships…</p>
              ) : (
                (() => {
                  const userMemberships = (memberships || []).filter((m: any) => String(m.userId || m.user || m.user?._id || '') === String(userId))
                  console.debug('UserDetail: userMemberships', userMemberships)
                  return userMemberships.length ? (
                    <div className="space-y-3">
                      {userMemberships.map((m: any) => (
                        <div key={m.id || m._id || m.planId} className="rounded-md border px-4 py-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{m.planName || m.plan?.name || 'Membership'}</div>
                              <div className="text-sm text-muted-foreground">{m.status}</div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {m.startDate ? new Date(m.startDate).toLocaleDateString() : '—'}
                              {' '}–{' '}
                              {m.endDate ? new Date(m.endDate).toLocaleDateString() : '—'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No membership data available.</p>
                  )
                })()
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bookings</CardTitle>
              <CardDescription>Booking history and sessions</CardDescription>
            </CardHeader>
            <CardContent>
              {bookingsLoading ? (
                <p className="text-sm text-gray-500">Loading bookings…</p>
              ) : (
                (() => {
                  const userBookings = (bookings || []).filter((b: any) => String(b.user || b.userId || b.user?._id || '') === String(userId))
                  console.debug('UserDetail: userBookings', userBookings)
                  return userBookings.length ? (
                    <div className="space-y-3">
                      {userBookings.map((b: any) => (
                        <div key={b._id || b.id || `${b.service}-${b._id}`} className="rounded-md border px-4 py-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{b.service || b.serviceName || 'Booking'}</div>
                              <div className="text-sm text-muted-foreground">Status: {String(b.status)}</div>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {b.bookingDate ? new Date(b.bookingDate).toLocaleString() : (b.createdAt ? new Date(b.createdAt).toLocaleString() : '—')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No booking data available.</p>
                  )
                })()
              )}
            </CardContent>
          </Card>

          {/* ─── ONBOARDING PROGRESS ─── */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Onboarding Progress</CardTitle>
                <CardDescription>
                  Live progression from the onboarding workflow engine
                </CardDescription>
              </div>
              {(() => {
                const summary = user.onboardingStatus
                if (summary?.onboardingCompleted || user.onboarded) {
                  return <StatusBadge status="completed" size="sm" />
                }
                if (
                  summary?.currentStep ||
                  (summary?.completedSteps && summary.completedSteps.length > 0)
                ) {
                  return <StatusBadge status="in_progress" size="sm" />
                }
                return <StatusBadge status="not_started" size="sm" />
              })()}
            </CardHeader>
            <CardContent className="space-y-6">
              {(() => {
                const summary = user.onboardingStatus
                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                        <span className="text-muted-foreground">Current Step</span>
                        {summary?.currentStep ? (
                          <span className="font-medium">
                            {summary.currentStep.replace(/_/g, ' ')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                        <span className="text-muted-foreground">Completed Steps</span>
                        <span className="font-medium">
                          {summary?.completedSteps?.length ?? 0} / 7
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <StatusFlag label="Health Markers" value={summary?.healthMarkersCompleted} />
                      <StatusFlag label="Health Goals" value={summary?.healthGoalsCompleted} />
                      <StatusFlag label="Consent" value={summary?.consentCompleted} />
                      <StatusFlag label="Reports Uploaded" value={summary?.reportsUploaded} />
                      <StatusFlag label="Onboarding Completed" value={summary?.onboardingCompleted} />
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Onboarding Appointments</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          {
                            key: 'sports',
                            label: 'Sports Scientist',
                            Icon: IconStethoscope,
                            booked: !!summary?.sportsScientistBooked,
                          },
                          {
                            key: 'nutrition',
                            label: 'Nutritionist',
                            Icon: IconSalad,
                            booked: !!summary?.nutritionistBooked,
                          },
                        ].map(({ key, label, Icon, booked }) => (
                          <div
                            key={key}
                            className="flex items-center justify-between gap-3 rounded-md border px-4 py-3"
                          >
                            <div className="flex items-center gap-3">
                              <Icon className="h-5 w-5 text-muted-foreground" />
                              <p className="font-medium text-sm">{label}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {booked && (
                                <IconCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                              )}
                              <StatusBadge status={booked ? 'booked' : 'pending'} size="sm" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2">
                      <OnboardingTimeline
                        currentStep={summary?.currentStep}
                        completedSteps={summary?.completedSteps}
                      />
                    </div>
                  </>
                )
              })()}
            </CardContent>
          </Card>

        </>
      )}
    </div>
  )
}
