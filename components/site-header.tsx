'use client'

import Link from 'next/link'
import { IconPlus } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { LocationSwitcher } from '@/components/location-switcher'
import { ConciergeAlertBell } from '@/components/concierge-alert-bell'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useAuth } from '@/hooks/use-auth'

export function SiteHeader() {
  const { user } = useAuth()
  const isExpertRole =
    user?.role === 'trainer' ||
    user?.role === 'nutritionist' ||
    user?.role === 'sports_scientist'

  return (
    <header className="sticky top-0 z-50 flex h-12 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear sm:h-14">
      <div className="flex w-full items-center gap-2 px-3 sm:gap-3 sm:px-4 lg:px-6">
        {/* Below md the sidebar is a Sheet with no other way to open it. */}
        <SidebarTrigger className="-ml-1 shrink-0 md:hidden" />
        <h1 className="truncate text-xl font-semibold sm:text-3xl">Fitflix</h1>
        <div className="ml-auto flex items-center gap-2">
          {!isExpertRole && <ConciergeAlertBell />}
          <LocationSwitcher />
          {!isExpertRole && (
            <Button asChild size="sm" className="shrink-0">
              <Link href="/admin/sales/new">
                <IconPlus className="size-4" />
                <span className="hidden sm:inline">New sale</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
