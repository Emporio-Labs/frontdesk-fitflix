'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useMemberAgenda } from '@/hooks/use-agenda'
import type { AgendaDay, AgendaItem } from '@/types/agenda'
import {
  IconCalendar,
  IconBarbell,
  IconClock,
  IconVideo,
  IconMapPin,
  IconCheck,
  IconAlertCircle,
  IconSparkles,
} from '@tabler/icons-react'

interface MemberAgendaSectionProps {
  userId: string
  memberName?: string
}

export function MemberAgendaSection({ userId, memberName }: MemberAgendaSectionProps) {
  const { data: agenda, isLoading, error, refetch } = useMemberAgenda(userId)

  const todayStr = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate(),
    ).padStart(2, '0')}`
  }, [])

  const [selectedDate, setSelectedDate] = useState<string>(todayStr)

  const selectedDay: AgendaDay | undefined = useMemo(() => {
    if (!agenda?.days?.length) return undefined
    const match = agenda.days.find((d) => d.date === selectedDate)
    return match || agenda.days.find((d) => d.isToday) || agenda.days[0]
  }, [agenda, selectedDate])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-5 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !agenda) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <IconCalendar className="h-5 w-5 text-gray-500" />
            Weekly Agenda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between py-2 text-sm text-gray-500">
            <span>Unable to load member agenda.</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <IconCalendar className="h-5 w-5 text-primary" />
              Member Schedule & Agenda
            </CardTitle>
            <CardDescription>
              {memberName ? `${memberName}'s` : "Member's"} unified schedule across workouts, therapies, classes and coaching
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            {agenda.summary.weekItemCount} activities this week
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Weekly Day Strip Selector */}
        <div className="grid grid-cols-7 gap-2 p-2 bg-muted/30 rounded-xl border">
          {agenda.days.slice(0, 7).map((day) => {
            const isSelected = (selectedDay?.date || todayStr) === day.date
            const dayNum = parseInt(day.date.split('-')[2] || '1', 10)

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelectedDate(day.date)}
                className={`flex flex-col items-center py-2 px-1 rounded-lg text-xs transition-all ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                    : day.isToday
                    ? 'bg-primary/10 text-primary font-medium hover:bg-primary/20'
                    : 'text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <span className="text-[11px] opacity-80">{day.dayInitial}</span>
                <span className="text-sm font-bold mt-0.5">{dayNum}</span>

                {/* Dots indicator */}
                <div className="flex gap-0.5 mt-1 h-1.5 items-center">
                  {day.dots.workout && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                  {day.dots.therapy && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  )}
                  {day.dots.coaching && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  )}
                  {day.dots.classSession && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Selected Day Agenda Items */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>
              {selectedDay ? `${selectedDay.dayName}, ${selectedDay.date}` : 'Selected Day'}
            </span>
            {selectedDay?.isToday && (
              <Badge variant="secondary" className="text-[10px]">
                Today
              </Badge>
            )}
          </div>

          {!selectedDay || selectedDay.items.length === 0 ? (
            <div className="text-center py-8 border rounded-lg bg-background/50 text-muted-foreground text-sm">
              <IconSparkles className="h-6 w-6 mx-auto mb-1 opacity-50" />
              No activities scheduled for this day.
            </div>
          ) : (
            <div className="grid gap-2">
              {selectedDay.items.map((item) => (
                <AgendaItemRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function AgendaItemRow({ item }: { item: AgendaItem }) {
  const badgeInfo = getCategoryBadge(item.category)
  const statusInfo = getStatusBadge(item.status)

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-md ${badgeInfo.bgColor}`}>
          {badgeInfo.icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {badgeInfo.label}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <IconClock className="h-3 w-3" />
              {item.timeLabel}
            </span>
          </div>
          <h4 className="text-sm font-medium text-foreground mt-0.5">{item.title}</h4>
          {item.subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
          )}
          {item.location && (
            <p className="text-xs text-muted-foreground/80 flex items-center gap-1 mt-1">
              {item.isOnline ? <IconVideo className="h-3 w-3" /> : <IconMapPin className="h-3 w-3" />}
              {item.location}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {statusInfo}
      </div>
    </div>
  )
}

function getCategoryBadge(category: string) {
  switch (category) {
    case 'WORKOUT':
      return {
        label: 'Workout',
        bgColor: 'bg-emerald-500/10 text-emerald-600',
        icon: <IconBarbell className="h-4 w-4 text-emerald-600" />,
      }
    case 'THERAPY':
      return {
        label: 'Therapy',
        bgColor: 'bg-amber-500/10 text-amber-600',
        icon: <IconSparkles className="h-4 w-4 text-amber-600" />,
      }
    case 'COACHING':
      return {
        label: '1-on-1 PT',
        bgColor: 'bg-indigo-500/10 text-indigo-600',
        icon: <IconClock className="h-4 w-4 text-indigo-600" />,
      }
    case 'CLASS':
    case 'LIVE_STREAM':
      return {
        label: 'Class',
        bgColor: 'bg-cyan-500/10 text-cyan-600',
        icon: <IconVideo className="h-4 w-4 text-cyan-600" />,
      }
    default:
      return {
        label: 'Session',
        bgColor: 'bg-gray-500/10 text-gray-600',
        icon: <IconCalendar className="h-4 w-4 text-gray-600" />,
      }
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'LIVE_NOW':
      return (
        <Badge className="bg-emerald-600 text-white text-[10px] animate-pulse">
          Live Now
        </Badge>
      )
    case 'COMPLETED':
      return (
        <Badge variant="outline" className="text-emerald-600 border-emerald-300 text-[10px] gap-1">
          <IconCheck className="h-3 w-3" /> Completed
        </Badge>
      )
    case 'MISSED':
      return (
        <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">
          Missed
        </Badge>
      )
    case 'CANCELLED':
      return (
        <Badge variant="secondary" className="text-gray-400 text-[10px]">
          Cancelled
        </Badge>
      )
    case 'REST_DAY':
      return (
        <Badge variant="outline" className="text-blue-500 text-[10px]">
          Rest Day
        </Badge>
      )
    default:
      return (
        <Badge variant="secondary" className="text-xs">
          Scheduled
        </Badge>
      )
  }
}
