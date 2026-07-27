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
  IconBarbell,
  IconActivity,
  IconSalad,
  IconFileInvoice,
  IconTemplate,
  IconMessages,
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

const navGroups = [
  {
    items: [
      { title: "Dashboard", url: "/dashboard", icon: IconDashboard },
    ],
  },
  {
    label: "People",
    items: [
      { title: "Users", url: "/admin/users", icon: IconUsers },
      { title: "Doctors", url: "/admin/doctors", icon: IconStethoscope },
      { title: "Trainers", url: "/admin/trainers", icon: IconRun },
      { title: "Sports Scientist", url: "/admin/sports-scientist", icon: IconActivity },
    ],
  },
  {
    label: "Programs",
    items: [
      { title: "Nutrition", url: "/admin/nutrition", icon: IconSalad },
      { title: "Workouts", url: "/dashboard/workouts", icon: IconBarbell },
      { title: "Workout Templates", url: "/dashboard/workouts/templates", icon: IconTemplate },
    ],
  },
  {
    label: "Scheduling",
    items: [
      { title: "Services", url: "/admin/therapies", icon: IconListDetails },
      { title: "Bookings", url: "/admin/bookings", icon: IconCalendarEvent },
      { title: "Appointments", url: "/admin/appointments", icon: IconCalendarStats },
      { title: "Slots", url: "/admin/slots", icon: IconClock },
    ],
  },
  {
    label: "Commerce",
    items: [
      { title: "Memberships", url: "/admin/memberships", icon: IconHeartHandshake },
      { title: "Membership Plans", url: "/admin/membership-plans", icon: IconCards },
      { title: "Credits", url: "/admin/credits", icon: IconCreditCard },
      { title: "Invoices", url: "/admin/invoices", icon: IconFileInvoice },
    ],
  },
  {
    label: "Insights",
    items: [
      { title: "Leads", url: "/admin/leads", icon: IconTarget },
      { title: "DNA Testing", url: "/admin/dna", icon: IconDna },
      { title: "Community", url: "/admin/community", icon: IconMessages },
      { title: "Reports", url: "/admin/reports", icon: IconReport },
      { title: "Audit Logs", url: "/admin/audit-logs", icon: IconHistory },
    ],
  },
  {
    label: "Admin",
    items: [
      { title: "Settings", url: "/admin/settings", icon: IconSettings },
    ],
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
    <Sidebar collapsible="none" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1 !h-auto"
            >
              <a href="/dashboard" className="flex items-center gap-2">
                <Image
                  src="/fitflix_logo.png"
                  alt="Fitflix Logo"
                  width={40}
                  height={40}
                  className="object-contain flex-shrink-0"
                />
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain groups={navGroups} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={navUser} />
      </SidebarFooter>
    </Sidebar>
  )
}
