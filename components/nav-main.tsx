"use client"

import * as React from "react"
import { type Icon } from "@tabler/icons-react"
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

export interface NavItem {
  title: string
  url: string
  icon?: Icon
}

export interface NavGroup {
  label?: string
  items: NavItem[]
}

export function NavMain({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname()
  const [currentSearch, setCurrentSearch] = React.useState('')

  React.useEffect(() => {
    const updateSearch = () => {
      if (typeof window !== 'undefined') {
        setCurrentSearch(window.location.search)
      }
    }
    updateSearch()
    window.addEventListener('popstate', updateSearch)
    return () => window.removeEventListener('popstate', updateSearch)
  }, [pathname])

  const currentParams = new URLSearchParams(currentSearch)
  const currentTab = currentParams.get('tab')

  return (
    <>
      {groups.map((group, index) => (
        <SidebarGroup key={group.label ?? index}>
          {group.label && (
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider">
              {group.label}
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => {
                const [itemPath, itemQuery] = item.url.split('?')
                const itemTab = itemQuery ? new URLSearchParams(itemQuery).get('tab') : null

                let isActive = false
                if (itemTab) {
                  isActive = pathname === itemPath && currentTab === itemTab
                } else if (itemQuery) {
                  isActive = pathname === itemPath && currentSearch.includes(itemQuery)
                } else {
                  isActive =
                    (pathname === itemPath && !currentTab) ||
                    (item.url !== '/dashboard' && pathname.startsWith(item.url + '/'))
                }

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      isActive={isActive}
                      className={cn(
                        "h-9 gap-3 [&>svg]:size-5 transition-all duration-200",
                        isActive
                          ? "bg-primary text-primary-foreground font-semibold hover:bg-primary hover:text-primary-foreground active:bg-primary active:text-primary-foreground"
                          : "font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Link href={item.url}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  )
}
