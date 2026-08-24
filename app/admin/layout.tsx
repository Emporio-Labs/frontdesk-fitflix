'use client'

import { AppSidebar } from '@/components/app-sidebar'
import { LocationScopeProvider } from '@/components/location-scope-provider'
import { SidebarRouteSync } from '@/components/sidebar-route-sync'
import { SiteHeader } from '@/components/site-header'
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider defaultOpen={false}>
      <LocationScopeProvider>
        <SidebarRouteSync />
        <AppSidebar variant="inset" collapsible="icon" />
        <SidebarInset>
          <SiteHeader />
          {/* min-w-0 lets this flex child shrink below its content width, so wide
              tables scroll inside their own container instead of being clipped. */}
          <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
            {children}
          </div>
        </SidebarInset>
      </LocationScopeProvider>
    </SidebarProvider>
  )
}
