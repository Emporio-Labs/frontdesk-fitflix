"use client"

import * as React from "react"
import {
  IconDashboard,
  IconListDetails,
  IconReport,
  IconSettings,
  IconUsers,
  IconHeartHandshake,
  IconCalendarEvent,
  IconCalendarStats,
  IconClock,
  IconDna,
  IconHistory,
  IconTarget,
  IconStethoscope,
  IconRun,
  IconCards,
  IconCreditCard,
} from "@tabler/icons-react"
import Image from 'next/image'

import { NavMain } from '@/components/nav-main'
import { NavUser } from '@/components/nav-user'
import { useAuth } from '@/hooks/use-auth'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

const navMain = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Users",
      url: "/admin/users",
      icon: IconUsers,
    },
    {
      title: "Doctors",
      url: "/admin/doctors",
      icon: IconStethoscope,
    },
    {
      title: "Trainers",
      url: "/admin/trainers",
      icon: IconRun,
    },
    {
      title: "Memberships",
      url: "/admin/memberships",
      icon: IconHeartHandshake,
    },
    {
      title: "Membership Plans",
      url: "/admin/membership-plans",
      icon: IconCards,
    },
    {
      title: "Credits",
      url: "/admin/credits",
      icon: IconCreditCard,
    },
    {
      title: "Services",
      url: "/admin/therapies",
      icon: IconListDetails,
    },
    {
      title: "Bookings",
      url: "/admin/bookings",
      icon: IconCalendarEvent,
    },
    {
      title: "Appointments",
      url: "/admin/appointments",
      icon: IconCalendarStats,
    },
    {
      title: "Slots",
      url: "/admin/slots",
      icon: IconClock,
    },
    {
      title: "DNA Testing",
      url: "/admin/dna",
      icon: IconDna,
    },
    {
      title: "Reports",
      url: "/admin/reports",
      icon: IconReport,
    },
    {
      title: "Leads",
      url: "/admin/leads",
      icon: IconTarget,
    },
    {
      title: "Audit Logs",
      url: "/admin/audit-logs",
      icon: IconHistory,
    },
    {
      title: "Settings",
      url: "/admin/settings",
      icon: IconSettings,
    },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth()

  const navUser = {
    name: user?.name ?? 'Admin',
    email: user?.email ?? '',
    avatar: '/placeholder-user.jpg',
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/dashboard" className="flex items-center gap-2">
                <Image
                  src="/fitflix_logo.png"
                  alt="Fitflix Logo"
                  width={28}
                  height={28}
                  className="!size-7 rounded object-contain"
                />
                <span className="text-base font-bold tracking-tight">Fitflix</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={navUser} />
      </SidebarFooter>
    </Sidebar>
  )
}
