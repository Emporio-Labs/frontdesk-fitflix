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
    <SidebarProvider
      defaultOpen={false}
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <LocationScopeProvider>
        <SidebarRouteSync />
        <AppSidebar variant="inset" collapsible="icon" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col overflow-hidden">
            {children}
          </div>
        </SidebarInset>
      </LocationScopeProvider>
    </SidebarProvider>
  )
}
