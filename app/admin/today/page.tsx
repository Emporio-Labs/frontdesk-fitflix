'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { getRoleStartPage } from '@/app/context/auth-context'
import { Skeleton } from '@/components/skeleton-loader'
import { FrontDeskToday } from '@/components/today/front-desk-today'
import { SalesToday } from '@/components/today/sales-today'
import { ManagerToday } from '@/components/today/manager-today'

/**
 * FX-47.2 — the role "Today" home. One route, role-branched: front desk, sales
 * and manager each get their own action list. Any other role that reaches this
 * URL (e.g. an admin) is sent to its own start page — the confined roles never
 * get here because `/admin/today` is outside their allow-list in
 * `lib/role-workspaces.ts`.
 */
export default function TodayPage() {
  const { user } = useAuth()
  const router = useRouter()
  const role = user?.role

  const isTodayRole = role === 'staff' || role === 'sales' || role === 'manager'

  useEffect(() => {
    // Wait until auth has hydrated a role, then bounce non-Today roles home.
    if (role && !isTodayRole) {
      router.replace(getRoleStartPage(role))
    }
  }, [role, isTodayRole, router])

  if (role === 'staff') return <FrontDeskToday />
  if (role === 'sales') return <SalesToday />
  if (role === 'manager') return <ManagerToday />

  // Loading, or redirecting a non-Today role away.
  return (
    <div className="flex-1 space-y-4 p-4 pt-4 sm:p-6 sm:pt-5 lg:p-8 lg:pt-6 max-w-7xl mx-auto">
      <Skeleton className="h-9 w-40" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
