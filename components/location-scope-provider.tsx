'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLocations } from '@/hooks/use-locations'
import { useAuth } from '@/hooks/use-auth'
import { setActiveLocationId } from '@/lib/api-client'
import type { UserRole } from '@/lib/rbac'
import type { Location } from '@/lib/services/location.service'

/** Only admins look across branches; everyone else works in their own. */
const BRANCH_PICKER_ROLES: UserRole[] = ['super_admin', 'clinic_admin']

export function canPickBranch(role?: UserRole | null): boolean {
  return !!role && BRANCH_PICKER_ROLES.includes(role)
}

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

type LocationScopeValue = {
  locations: Location[]
  isLoading: boolean
  /** Selected branch, or null for "all branches". */
  selectedLocationId: string | null
  selectedLocation: Location | null
  setSelectedLocationId: (id: string | null) => void
  /** True while there is nothing to choose between. */
  isSingleLocation: boolean
  /** Whether this user may switch branches (admins only). */
  canSwitch: boolean
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
  const { data: locations, isLoading } = useLocations()
  const { user } = useAuth()
  const canSwitch = canPickBranch(user?.role)
  const [selectedLocationId, setSelectedLocationIdState] = useState<
    string | null
  >(null)
  const [hydrated, setHydrated] = useState(false)

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

  const list = useMemo(() => locations ?? [], [locations])

  // Drop a stale selection if that branch was deactivated or removed, so the
  // console can't stay pinned to a location that no longer exists.
  useEffect(() => {
    if (!hydrated || list.length === 0 || !selectedLocationId) return
    if (!list.some((l) => l._id === selectedLocationId)) {
      setSelectedLocationIdState(null)
      try {
        window.localStorage.removeItem(STORAGE_KEY)
      } catch {}
    }
  }, [hydrated, list, selectedLocationId])

  const setSelectedLocationId = (id: string | null) => {
    setSelectedLocationIdState(id)
    try {
      if (id) window.localStorage.setItem(STORAGE_KEY, id)
      else window.localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }

  const value = useMemo<LocationScopeValue>(() => {
    const isSingleLocation = list.length <= 1
    // A non-admin never carries a picked branch — not even one an admin left
    // in localStorage on a shared desk browser. The backend scopes them by
    // their own account instead.
    const picked = canSwitch ? selectedLocationId : null
    // With one branch the effective scope is that branch, selected or not.
    const effectiveId =
      picked ?? (list.length === 1 ? (list[0]?._id ?? null) : null)

    return {
      locations: list,
      isLoading,
      selectedLocationId: effectiveId,
      selectedLocation: list.find((l) => l._id === effectiveId) ?? null,
      setSelectedLocationId,
      isSingleLocation,
      canSwitch,
      scopedKey: (key) => [...key, effectiveId ?? 'all'] as const,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, isLoading, selectedLocationId, canSwitch])

  // Hand the pick to the API client before children render their queries,
  // so a request never goes out tagged with the previous branch.
  setActiveLocationId(canSwitch ? value.selectedLocationId : null)

  // Most caches aren't keyed by branch, so a switch refetches everything
  // rather than showing the last branch's rows under the new name.
  const queryClient = useQueryClient()
  const lastScope = useRef(value.selectedLocationId)
  useEffect(() => {
    if (lastScope.current === value.selectedLocationId) return
    lastScope.current = value.selectedLocationId
    queryClient.invalidateQueries()
  }, [queryClient, value.selectedLocationId])

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
