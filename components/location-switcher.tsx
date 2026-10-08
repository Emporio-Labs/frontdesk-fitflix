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

  // FX-18 — a branch-scoped staffer only ever works at their own branches, so
  // they are never offered "All branches": they view one branch at a time. A
  // global admin (or a legacy session with no scope) keeps the "All branches"
  // option. The backend scopes data regardless; this is the matching UI.
  const branchScoped = user?.scope === 'branch' && !user?.allBranches

  // A branch-scoped staffer must always have a concrete branch selected (there
  // is no "All branches" for them), so default to their first branch once the
  // list is known. Members/global admins are unaffected.
  useEffect(() => {
    if (
      branchScoped &&
      !selectedLocationId &&
      locations.length > 0
    ) {
      setSelectedLocationId(locations[0]._id)
    }
  }, [branchScoped, selectedLocationId, locations, setSelectedLocationId])

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
        selectedLocationId ?? (branchScoped ? locations[0]?._id : ALL_BRANCHES)
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
        {/* FX-18 — branch-scoped staff never get "All branches". */}
        {!branchScoped && (
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
