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
  IconCalendarPlus,
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
  IconBell,
  IconStethoscope,
  IconApple,
} from "@tabler/icons-react"
import Image from 'next/image'

import { NavMain } from '@/components/nav-main'
import { NavUser } from '@/components/nav-user'
import { useAuth } from '@/hooks/use-auth'
import { getRoleStartPage } from '@/app/context/auth-context'
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
      { title: "Spot Booking", url: "/admin/spot-booking", icon: IconCalendarPlus },
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
      { title: "Announcements", url: "/admin/announcements", icon: IconBell },
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
      { title: "Today", url: "/admin/personal-training/today", icon: IconCalendarEvent },
      { title: "Personal Training", url: "/admin/personal-training", icon: IconDumbbell },
      { title: "My Members", url: "/dashboard/workouts/members", icon: IconUsers },
      { title: "Workout Plans", url: "/dashboard/workouts/plans", icon: IconBarbell },
      { title: "Exercise Library", url: "/dashboard/workouts/exercises", icon: IconActivity },
      { title: "Live Sessions", url: "/dashboard/workouts/sessions", icon: IconClock },
      { title: "Notifications", url: "/admin/me/notifications", icon: IconBellRinging },
    ],
  },
]

const navNutritionistGroup = [
  {
    items: [
      { title: "Nutrition", url: "/admin/nutrition", icon: IconSalad },
      { title: "Appointments", url: "/admin/nutrition?tab=appointments", icon: IconCalendarEvent },
      { title: "Diet Plans", url: "/admin/nutrition/diet-plans", icon: IconTemplate },
      { title: "Food Catalog", url: "/admin/nutrition/foods", icon: IconApple },
      { title: "Availability", url: "/admin/nutritionist", icon: IconClock },
      { title: "Notifications", url: "/admin/me/notifications", icon: IconBellRinging },
    ],
  },
]

// FX-31.1 — branch manager: branch-ops pages only (incl. Leads); no org-admin
// surfaces (settings, locations, app copy, DNA) or expert consoles.
// FX-45.3 — plus the audit trail, scoped by the backend to their own branch.
const navManagerGroup = [
  {
    items: [
      // FX-47.2 — land on "Today" (open alerts, staff on duty) rather than the
      // generic ops /dashboard whose Quick Actions offered forbidden actions (F2).
      { title: "Today", url: "/admin/today", icon: IconCalendarEvent },
    ],
  },
  {
    label: "People",
    items: [
      { title: "Members", url: "/admin/users", icon: IconUsers },
      { title: "Leads", url: "/admin/leads", icon: IconTarget },
    ],
  },
  {
    label: "Scheduling",
    items: [
      { title: "Services", url: "/admin/therapies", icon: IconListDetails },
      { title: "Bookings", url: "/admin/bookings", icon: IconCalendarEvent },
      { title: "Spot Booking", url: "/admin/spot-booking", icon: IconCalendarPlus },
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
      { title: "Promotions", url: "/admin/promotions", icon: IconSpeakerphone },
      { title: "Reports", url: "/admin/reports", icon: IconReport },
      { title: "Audit Logs", url: "/admin/audit-logs", icon: IconHistory },
    ],
  },
  {
    label: "Me",
    items: [
      { title: "Notifications", url: "/admin/me/notifications", icon: IconBellRinging },
    ],
  },
]

// FX-31.2 / FX-47.2 — sales: land on "Today" (claimable leads + callbacks due),
// then the lead queue and the memberships they can read.
const navSalesGroup = [
  {
    items: [
      { title: "Today", url: "/admin/today", icon: IconCalendarEvent },
      { title: "Leads", url: "/admin/leads", icon: IconTarget },
      { title: "Memberships", url: "/admin/memberships", icon: IconHeartHandshake },
      { title: "Notifications", url: "/admin/me/notifications", icon: IconBellRinging },
    ],
  },
]

// FX-47.1 — front desk (staff): land on "Today" (check-ins, payments due), then
// the pages the desk actually uses. Previously staff fell through to the full
// ~31-item admin menu (FX-46 F1). Order follows the daily flow: who's in → who to
// check in → look someone up → bookings → sell/renew.
const navStaffGroup = [
  {
    items: [
      { title: "Today", url: "/admin/today", icon: IconCalendarEvent },
      { title: "Attendance", url: "/admin/attendance", icon: IconCalendarStats },
      { title: "Members", url: "/admin/users", icon: IconUsers },
      { title: "Bookings", url: "/admin/bookings", icon: IconCalendarEvent },
      { title: "Spot Booking", url: "/admin/spot-booking", icon: IconCalendarPlus },
      { title: "Memberships", url: "/admin/memberships", icon: IconHeartHandshake },
      { title: "Notifications", url: "/admin/me/notifications", icon: IconBellRinging },
    ],
  },
]

// FX-47.1 — clinician: their appointments console + the clinical pages. Was
// falling through to the full admin menu.
const navClinicianGroup = [
  {
    items: [
      { title: "Appointments", url: "/admin/bookings", icon: IconCalendarEvent },
      { title: "Members", url: "/admin/users", icon: IconUsers },
      { title: "DNA Testing", url: "/admin/dna", icon: IconDna },
      { title: "Reports", url: "/admin/reports", icon: IconReport },
      { title: "Notifications", url: "/admin/me/notifications", icon: IconBellRinging },
    ],
  },
]

// FX-47.1 / FX-46 F3 — sports scientist: a direct link to their own console
// (previously unreachable from the sidebar) plus member lookup. Their console is
// their home surface.
const navSportsScientistGroup = [
  {
    items: [
      { title: "My Console", url: "/admin/sports-scientist", icon: IconStethoscope },
      { title: "Members", url: "/admin/users", icon: IconUsers },
      { title: "Notifications", url: "/admin/me/notifications", icon: IconBellRinging },
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

  const role = user?.role
  const groups =
    role === 'trainer'
      ? navTrainerGroup
      : role === 'nutritionist'
      ? navNutritionistGroup
      : role === 'manager'
      ? navManagerGroup
      : role === 'sales'
      ? navSalesGroup
      : role === 'staff'
      ? navStaffGroup
      : role === 'clinician'
      ? navClinicianGroup
      : role === 'sports_scientist'
      ? navSportsScientistGroup
      : navGroups
  // FX-47 / FX-46 F5 — the brand link lands on the same page as the role's
  // post-login start page, so clicking the logo never disagrees with where login
  // dropped them. Nutritionist keeps its my-clients landing (middleware bounces
  // bare /admin/nutrition there anyway).
  const brandHref =
    role === 'nutritionist' ? '/admin/nutrition/my-clients' : getRoleStartPage(role)

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
