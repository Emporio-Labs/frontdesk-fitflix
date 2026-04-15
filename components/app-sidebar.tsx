"use client"

import * as React from "react"
import {
  IconCamera,
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFileAi,
  IconFileDescription,
  IconFileWord,
  IconFolder,
  IconHelp,
  IconInnerShadowTop,
  IconListDetails,
  IconReport,
  IconSearch,
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

import { NavDocuments } from '@/components/nav-documents'
import { NavMain } from '@/components/nav-main'
import { NavSecondary } from '@/components/nav-secondary'
import { NavUser } from '@/components/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

const data = {
  user: {
    name: "Admin User",
    email: "admin@hybridhuman.com",
    avatar: "/placeholder-user.jpg",
  },
  navMain: [
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
  ],
  navClouds: [
    {
      title: "Capture",
      icon: IconCamera,
      isActive: true,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Proposal",
      icon: IconFileDescription,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Prompts",
      icon: IconFileAi,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
    },
    {
      title: "Search",
      url: "#",
      icon: IconSearch,
    },
  ],
  documents: [
    {
      name: "Data Library",
      url: "#",
      icon: IconDatabase,
    },
    {
      name: "Reports",
      url: "#",
      icon: IconReport,
    },
    {
      name: "Word Assistant",
      url: "#",
      icon: IconFileWord,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">Acme Inc.</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
