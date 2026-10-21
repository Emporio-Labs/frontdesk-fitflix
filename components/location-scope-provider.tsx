'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useLocations } from '@/hooks/use-locations'
import type { Location } from '@/lib/services/location.service'

/**
 * Which branch the admin console is currently looking at.
 *
 * Every location-scoped query must fold `locationId` into its React Query key.
 * Without that, switching branches would serve branch A's cached rows under
 * branch B — the failure mode is silent and looks like stale data, so the
 * `scopedKey` helper below exists to make doing it the path of least effort.
 *
 * While exactly one branch exists the switcher renders as a static label and
 * the backend resolves the location on its own, so nothing has to be selected.
 */

import { useAuth } from '@/hooks/use-auth'

type LocationScopeValue = {
  locations: Location[]
  allLocations: Location[]
  isLoading: boolean
  /** Selected branch, or null for "all branches". */
  selectedLocationId: string | null
  selectedLocation: Location | null
  setSelectedLocationId: (id: string | null) => void
  /** True while there is nothing to choose between. */
  isSingleLocation: boolean
  /** Whether the current signed-in user is confined to specific branch(es). */
  isBranchRestricted: boolean
  /** The branch IDs assigned to current user. */
  assignedBranchIds: string[]
  /**
   * Fold the active scope into a query key.
   *   queryKey: scopedKey(queryKeys.bookings.all())
   */
  scopedKey: <T extends readonly unknown[]>(
    key: T
  ) => readonly [...T, string]
}

const STORAGE_KEY = 'hh_selected_location'

const LocationScopeContext = createContext<LocationScopeValue | null>(null)

export function LocationScopeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = useAuth()
  const { data: locations, isLoading } = useLocations()
  const [selectedLocationId, setSelectedLocationIdState] = useState<
    string | null
  >(null)
  const [hydrated, setHydrated] = useState(false)

  // Determine if the signed-in user is restricted to assigned branches.
  // Super admins are always global. Any account with allBranches: true is global.
  // Any account with scope: 'branch' or with populated branchIds and !allBranches is branch-scoped.
  const isBranchRestricted = Boolean(
    user &&
    user.role !== 'super_admin' &&
    !user.allBranches &&
    (user.scope === 'branch' || (Array.isArray(user.branchIds) && user.branchIds.length > 0))
  )

  const assignedBranchIds = useMemo(() => {
    return Array.isArray(user?.branchIds) ? user.branchIds.map(String) : []
  }, [user?.branchIds])

  // Restore the previous selection after mount so SSR and first client render
  // agree; reading localStorage during render would cause a hydration mismatch.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) setSelectedLocationIdState(stored)
    } catch {
      // Private browsing / storage disabled — fall back to "all branches".
    }
    setHydrated(true)
  }, [])

  // For branch-restricted staff, the available locations list contains ONLY their assigned branches.
  const list = useMemo(() => {
    const raw = locations ?? []
    if (!isBranchRestricted || assignedBranchIds.length === 0) return raw
    return raw.filter((loc) => assignedBranchIds.includes(String(loc._id)))
  }, [locations, isBranchRestricted, assignedBranchIds])

  // Ensure selected branch is valid and strictly confined for branch-restricted users
  useEffect(() => {
    if (!hydrated) return

    if (isBranchRestricted && assignedBranchIds.length > 0) {
      // Must be set to an assigned branch; if not or invalid, clamp to the first assigned branch.
      if (!selectedLocationId || !assignedBranchIds.includes(selectedLocationId)) {
        const fallback = assignedBranchIds[0]
        setSelectedLocationIdState(fallback)
        try {
          window.localStorage.setItem(STORAGE_KEY, fallback)
        } catch {}
      }
      return
    }

    if (list.length === 0 || !selectedLocationId) return
    if (!list.some((l) => l._id === selectedLocationId)) {
      setSelectedLocationIdState(null)
      try {
        window.localStorage.removeItem(STORAGE_KEY)
      } catch {}
    }
  }, [hydrated, list, selectedLocationId, isBranchRestricted, assignedBranchIds])

  const setSelectedLocationId = (id: string | null) => {
    // If user is branch-restricted, they cannot shift to unauthorized branch or "all branches".
    if (isBranchRestricted && assignedBranchIds.length > 0) {
      if (!id || !assignedBranchIds.includes(id)) {
        return
      }
    }

    setSelectedLocationIdState(id)
    try {
      if (id) window.localStorage.setItem(STORAGE_KEY, id)
      else window.localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }

  const value = useMemo<LocationScopeValue>(() => {
    const isSingleLocation = list.length <= 1
    // With one branch the effective scope is that branch, selected or not.
    const effectiveId =
      selectedLocationId ?? (list.length === 1 ? (list[0]?._id ?? null) : null)

    return {
      locations: list,
      allLocations: locations ?? [],
      isLoading,
      selectedLocationId: effectiveId,
      selectedLocation: list.find((l) => l._id === effectiveId) ?? null,
      setSelectedLocationId,
      isSingleLocation,
      isBranchRestricted,
      assignedBranchIds,
      scopedKey: (key) => [...key, effectiveId ?? 'all'] as const,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, locations, isLoading, selectedLocationId, isBranchRestricted, assignedBranchIds])

  return (
    <LocationScopeContext.Provider value={value}>
      {children}
    </LocationScopeContext.Provider>
  )
}

/**
 * Strict accessor — throws when there is no provider.
 *
 * Use this from anything that scopes data by branch: a missing provider there
 * means queries would silently run unscoped, which is worse than a loud error.
 */
export function useLocationScope(): LocationScopeValue {
  const ctx = useContext(LocationScopeContext)
  if (!ctx) {
    throw new Error(
      'useLocationScope must be used inside a LocationScopeProvider'
    )
  }
  return ctx
}

/**
 * Tolerant accessor — returns null when there is no provider.
 *
 * For presentational chrome that may render outside a scoped subtree. The
 * header is shared between the admin and dashboard layouts, so a switcher that
 * threw here took down every page in whichever layout lacked the provider.
 */
export function useOptionalLocationScope(): LocationScopeValue | null {
  return useContext(LocationScopeContext)
}
