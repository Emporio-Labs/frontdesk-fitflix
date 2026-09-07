'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  IconActivity,
  IconCalendarEvent,
  IconClockHour4,
  IconUsers,
} from '@tabler/icons-react'
import { ExpertAvailabilityPanel } from '@/components/expert-availability-panel'
import { OverviewTab } from '@/components/sports-scientist/overview-tab'
import { BookingsTab } from '@/components/sports-scientist/bookings-tab'
import { ActiveUsersTab } from '@/components/sports-scientist/active-users-tab'

function SportsScientistDashboardContent() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') ?? 'overview'
  const [activeTab, setActiveTab] = useState(initialTab)
  const [userFilter, setUserFilter] = useState<'all' | 'activex' | 'vald' | 'sports_scientist'>('all')

  useEffect(() => {
    const paramTab = searchParams.get('tab')
    if (
      paramTab &&
      ['overview', 'bookings', 'active-users', 'availability'].includes(paramTab)
    ) {
      setActiveTab(paramTab)
    }
  }, [searchParams])

  const handleNavigateTab = (tab: string, filter?: string) => {
    setActiveTab(tab)
    if (filter && ['all', 'activex', 'vald', 'sports_scientist'].includes(filter)) {
      setUserFilter(filter as any)
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sports Scientist</h1>
          <p className="text-sm text-muted-foreground">
            Manage performance consultations, triage appointment bookings, and track active member assessments.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <IconActivity className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="bookings" className="flex items-center gap-2">
            <IconCalendarEvent className="h-4 w-4" />
            <span>Bookings</span>
          </TabsTrigger>
          <TabsTrigger value="active-users" className="flex items-center gap-2">
            <IconUsers className="h-4 w-4" />
            <span>Active Users</span>
          </TabsTrigger>
          <TabsTrigger value="availability" className="flex items-center gap-2">
            <IconClockHour4 className="h-4 w-4" />
            <span>Availability</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab onNavigateTab={handleNavigateTab} />
        </TabsContent>

        <TabsContent value="bookings" className="mt-4">
          <BookingsTab />
        </TabsContent>

        <TabsContent value="active-users" className="mt-4">
          <ActiveUsersTab initialFilter={userFilter} />
        </TabsContent>

        <TabsContent value="availability" className="mt-4">
          {/* Consultations are booked against this schedule now, not against
              slot inventory — what is set here is exactly what members see. */}
          <ExpertAvailabilityPanel
            expertType="sports_scientist"
            title="Consultation Availability"
            description="Working hours, blocked dates and the appointment modes offered. Members can only book times that appear here."
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function SportsScientistDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 space-y-6 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6">
          Loading sports scientist workspace...
        </div>
      }
    >
      <SportsScientistDashboardContent />
    </Suspense>
  )
}
