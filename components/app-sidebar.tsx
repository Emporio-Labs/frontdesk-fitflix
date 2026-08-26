"use client"

import * as React from "react"
import {
  IconDashboard,
  IconListDetails,
  IconArticle,
  IconSpeakerphone,
  IconReport,
  IconSettings,
  IconBuildingStore,
  IconUsers,
  IconHeartHandshake,
  IconCalendarEvent,
  IconCalendarStats,
  IconClock,
  IconDna,
  IconHistory,
  IconTarget,
  IconRun,
  IconCards,
  IconCreditCard,
  IconBarbell,
  IconActivity,
  IconSalad,
  IconFileInvoice,
  IconTemplate,
  IconMessage2,
  IconDumbbell,
  IconBellRinging,
  IconStethoscope,
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
      { title: "Trainers", url: "/admin/trainers", icon: IconRun },
    ],
  },
  {
    label: "Programs",
    items: [
      { title: "Personal Training", url: "/admin/personal-training", icon: IconDumbbell },
      { title: "Nutrition", url: "/admin/nutrition", icon: IconSalad },
      { title: "Sports Scientist", url: "/admin/sports-scientist", icon: IconStethoscope },
      { title: "Workouts", url: "/dashboard/workouts", icon: IconBarbell },
      { title: "Workout Templates", url: "/dashboard/workouts/templates", icon: IconTemplate },
    ],
  },
  {
    label: "Scheduling",
    items: [
      { title: "Services", url: "/admin/therapies", icon: IconListDetails },
      { title: "Bookings", url: "/admin/bookings", icon: IconCalendarEvent },
      { title: "Slots", url: "/admin/slots", icon: IconClock },
      { title: "Attendance", url: "/admin/attendance", icon: IconCalendarStats },
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
      { title: "Concierge Alerts", url: "/admin/alerts", icon: IconBellRinging },
      { title: "Leads", url: "/admin/leads", icon: IconTarget },
      { title: "Promotions", url: "/admin/promotions", icon: IconSpeakerphone },
      { title: "App Copy", url: "/admin/content", icon: IconArticle },
      { title: "DNA Testing", url: "/admin/dna", icon: IconDna },
      { title: "Reports", url: "/admin/reports", icon: IconReport },
      { title: "Audit Logs", url: "/admin/audit-logs", icon: IconHistory },
    ],
  },
  {
    label: "Community",
    items: [
      { title: "Community", url: "/admin/community", icon: IconMessage2 },
    ],
  },
  {
    label: "Admin",
    items: [
      { title: "Locations", url: "/admin/locations", icon: IconBuildingStore },
      { title: "Settings", url: "/admin/settings", icon: IconSettings },
    ],
  },
]

const navTrainerGroup = [
  {
    items: [
      { title: "Personal Training", url: "/admin/personal-training", icon: IconDumbbell },
      { title: "My Members", url: "/dashboard/workouts/members", icon: IconUsers },
      { title: "Workout Plans", url: "/dashboard/workouts/plans", icon: IconBarbell },
      { title: "Exercise Library", url: "/dashboard/workouts/exercises", icon: IconActivity },
      { title: "Live Sessions", url: "/dashboard/workouts/sessions", icon: IconClock },
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

  const isTrainer = user?.role === 'trainer'
  const groups = isTrainer ? navTrainerGroup : navGroups
  const brandHref = isTrainer ? '/dashboard/workouts/members' : '/dashboard'

  return (
    // "icon" (not "none") so callers that omit the prop still get the mobile Sheet;
    // collapsible="none" takes an early-return branch that skips it entirely.
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1 !h-auto"
            >
              <a href={brandHref} className="flex items-center gap-2">
                <Image
                  src="/fitflix_logo.png"
                  alt="Fitflix Logo"
                  width={40}
                  height={40}
                  className="object-contain flex-shrink-0"
                />
                <span className="text-base font-bold tracking-tight">Fitflix</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain groups={groups} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={navUser} />
      </SidebarFooter>
    </Sidebar>
  )
}
