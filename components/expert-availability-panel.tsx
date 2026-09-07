'use client'

import { useMemo, useState } from 'react'
import { ExpertAvailabilityEditor } from '@/components/expert-availability-editor'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useAuth } from '@/hooks/use-auth'
import { useExpertDirectory } from '@/hooks/use-expert-schedule'
import type { ExpertTypeValue } from '@/lib/services/expert-schedule.service'

/**
 * Availability editing for a 1:1 expert type, wired to whoever is signed in.
 *
 * An expert editing their own schedule addresses it as "me" and never needs
 * their own id. Admin and front-desk staff get a picker over everyone
 * registered as that expert type — which is exactly the set pooled availability
 * draws from, so an empty picker is itself the answer to "why can nobody book?".
 */
export function ExpertAvailabilityPanel({
  expertType,
  title,
  description,
}: {
  expertType: ExpertTypeValue
  title?: string
  description?: string
}) {
  const { user, role } = useAuth()
  const isSelf = role === expertType
  const { data: directory, isLoading } = useExpertDirectory(expertType, !isSelf)
  const [selectedId, setSelectedId] = useState<string>('')

  const activeId = useMemo(() => {
    if (isSelf) return 'me'
    return selectedId || directory?.[0]?.id || ''
  }, [isSelf, selectedId, directory])

  const activeName = isSelf
    ? user?.name || 'My Schedule'
    : directory?.find((e) => e.id === activeId)?.name

  if (!isSelf && !isLoading && (directory ?? []).length === 0) {
    return (
      <Alert>
        <AlertTitle>No {expertType.replace('_', ' ')} accounts yet</AlertTitle>
        <AlertDescription>
          Availability is per person, so somebody has to exist first. Create the
          account under Users and set their staff role to{' '}
          <code className="font-mono">{expertType}</code>. Until then, members
          see no bookable times for this service.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <ExpertAvailabilityEditor
      expertType={expertType}
      expertId={activeId}
      expertName={activeName}
      title={title}
      description={description}
      allowDurationEdit
      headerAction={
        isSelf ? undefined : (
          <select
            value={activeId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm font-medium"
          >
            {(directory ?? []).map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        )
      }
    />
  )
}
