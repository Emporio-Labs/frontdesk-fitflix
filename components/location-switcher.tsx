'use client'

import { useEffect } from 'react'
import { IconBuildingStore, IconMapPin } from '@tabler/icons-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useOptionalLocationScope } from '@/components/location-scope-provider'
import { useAuth } from '@/hooks/use-auth'

const ALL_BRANCHES = '__all__'

/**
 * Branch selector for the admin console.
 *
 * Deliberately renders as a plain label while only one branch exists — a
 * dropdown with a single option is noise, and the backend resolves the sole
 * active location on its own. It becomes a real control the moment a second
 * branch is created, with no code change.
 */
export function LocationSwitcher() {
  // Tolerant: this header is shared across layouts, and chrome must never be
  // able to crash a page just because its subtree has no scope provider.
  const scope = useOptionalLocationScope()
  const { user } = useAuth()
  if (!scope) return null

  const {
    locations,
    isLoading,
    selectedLocationId,
    selectedLocation,
    setSelectedLocationId,
    isSingleLocation,
  } = scope

  // FX-19.3 — only a super admin may read across every branch at once, so only
  // they are offered "All branches". Everyone else (branch-scoped staff per
  // FX-18, and clinic admins) views one branch at a time. The backend scopes
  // data regardless; this is the matching UI.
  const canSeeAllBranches = user?.role === 'super_admin'

  // Anyone without the "All branches" option must always have a concrete branch
  // selected, so default to the first available branch once the list is known.
  // A super admin is unaffected — they default to "All branches".
  useEffect(() => {
    if (
      !canSeeAllBranches &&
      !selectedLocationId &&
      locations.length > 0
    ) {
      setSelectedLocationId(locations[0]._id)
    }
  }, [canSeeAllBranches, selectedLocationId, locations, setSelectedLocationId])

  if (isLoading) {
    return <Skeleton className="h-8 w-32" />
  }

  if (locations.length === 0) {
    return (
      <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
        <IconMapPin className="size-3.5" />
        No branch configured
      </span>
    )
  }

  if (isSingleLocation) {
    return (
      // Which branch you're operating on matters at the desk, so keep this on
      // mobile too — just cap the width and truncate instead of hiding it.
      <span className="flex min-w-0 max-w-[40vw] items-center gap-1.5 text-sm text-muted-foreground sm:max-w-none">
        <IconMapPin className="size-4 shrink-0" />
        <span className="truncate">{selectedLocation?.name ?? locations[0]?.name}</span>
      </span>
    )
  }

  return (
    <Select
      value={
        selectedLocationId ?? (canSeeAllBranches ? ALL_BRANCHES : locations[0]?._id)
      }
      onValueChange={(value) =>
        setSelectedLocationId(value === ALL_BRANCHES ? null : value)
      }
    >
      <SelectTrigger className="h-8 w-[132px] shrink sm:w-[180px]" aria-label="Select branch">
        <IconBuildingStore className="size-4 shrink-0" />
        <SelectValue placeholder="Select branch" />
      </SelectTrigger>
      <SelectContent>
        {/* FX-19.3 — only a super admin gets "All branches". */}
        {canSeeAllBranches && (
          <SelectItem value={ALL_BRANCHES}>All branches</SelectItem>
        )}
        {locations.map((location) => (
          <SelectItem key={location._id} value={location._id}>
            {location.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
