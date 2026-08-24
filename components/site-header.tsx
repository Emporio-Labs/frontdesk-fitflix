import { LocationSwitcher } from '@/components/location-switcher'
import { ConciergeAlertBell } from '@/components/concierge-alert-bell'
import { SidebarTrigger } from '@/components/ui/sidebar'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 flex h-12 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear sm:h-14">
      <div className="flex w-full items-center gap-2 px-3 sm:gap-3 sm:px-4 lg:px-6">
        {/* Below md the sidebar is a Sheet with no other way to open it. */}
        <SidebarTrigger className="-ml-1 shrink-0 md:hidden" />
        <h1 className="truncate text-xl font-semibold sm:text-3xl">Fitflix</h1>
        <div className="ml-auto flex items-center gap-2">
          <ConciergeAlertBell />
          <LocationSwitcher />
        </div>
      </div>
    </header>
  )
}
