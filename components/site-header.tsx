import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 flex h-12 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 sm:h-14">
      <div className="flex w-full items-center gap-2 px-3 sm:gap-3 sm:px-4 lg:px-6">
        <SidebarTrigger className="-ml-2 sm:-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-1 h-4 sm:mx-2"
        />
        <h1 className="truncate text-sm font-semibold sm:text-base">Clinic Admin</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
            Help
          </Button>
        </div>
      </div>
    </header>
  )
}
