import { NextRequest, NextResponse } from 'next/server'

// Routes that require authentication
const PROTECTED_PREFIXES = ['/dashboard', '/admin']
// Routes that should redirect to dashboard/start page if already authenticated
const AUTH_ROUTES = ['/login']

// Role start pages
const ROLE_START_PAGES: Record<string, string> = {
  trainer: '/admin/personal-training',
  nutritionist: '/admin/nutrition',
  sports_scientist: '/admin/sports-scientist',
}

// Allowed route prefixes for specific staff roles
const TRAINER_ALLOWED_ADMIN_ROUTES = [
  '/admin/personal-training',
  '/admin/live-session',
  '/admin/slots',
]

const NUTRITIONIST_ALLOWED_ADMIN_ROUTES = [
  '/admin/nutrition',
  '/admin/nutritionist',
  '/admin/nutritionist-appointments',
  '/admin/slots',
  '/admin/live-session',
]

const SPORTS_SCIENTIST_ALLOWED_ADMIN_ROUTES = [
  '/admin/sports-scientist',
  '/admin/slots',
  '/admin/live-session',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check for auth cookie (set on login, cleared on logout)
  const isAuthed = request.cookies.has('hh_authed')
  const role = request.cookies.get('hh_role')?.value

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route))

  // Not authed, trying to access protected route → redirect to login
  if (isProtected && !isAuthed) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Trainer role access: Trainers can access Personal Training hub and live session rooms
  const TRAINER_ALLOWED_ADMIN_ROUTES = [
    '/admin/personal-training',
    '/admin/live-session',
    '/admin/slots',
    '/admin/me/notifications',
  ]

  if (isAuthed && role === 'trainer') {
    const isAllowedAdmin = TRAINER_ALLOWED_ADMIN_ROUTES.some((route) => pathname.startsWith(route))
    if (pathname.startsWith('/admin') && !isAllowedAdmin) {
      return NextResponse.redirect(new URL('/dashboard/workouts/members', request.url))
    }
    if (pathname === '/dashboard') {
      return NextResponse.redirect(new URL('/admin/personal-training/today', request.url))
    }
  }

  // Nutritionist role access: nutritionists can only see their own client workspace.
  const NUTRITIONIST_ALLOWED_ADMIN_ROUTES = [
    '/admin/nutrition/my-clients',  // "My Clients" list + profile pages
    '/admin/nutrition/members',     // individual client profiles
    '/admin/nutritionist',          // availability editor
    '/admin/nutrition/diet-plans',  // diet-plan templates (read)
    '/admin/nutrition/foods',       // food catalog (read)
    '/admin/me/notifications',      // FX-25 push settings
  ]
  // Allow /admin/nutrition only when going to the appointments / food-catalog tabs;
  // block bare /admin/nutrition (would show full admin workspace).
  // We redirect bare /admin/nutrition to /admin/nutrition/my-clients.
  if (isAuthed && role === 'nutritionist') {
    const isAllowedAdmin = NUTRITIONIST_ALLOWED_ADMIN_ROUTES.some((route) =>
      pathname.startsWith(route)
    )
    if (pathname.startsWith('/admin') && !isAllowedAdmin) {
      return NextResponse.redirect(new URL('/admin/nutrition/my-clients', request.url))
    }
    if (pathname === '/dashboard') {
      return NextResponse.redirect(new URL('/admin/nutrition/my-clients', request.url))
    }
  }

  // Authed, trying to access login → redirect to their start page
  if (isAuthRoute && isAuthed) {
    const target = (role && ROLE_START_PAGES[role]) || '/dashboard'
    return NextResponse.redirect(new URL(target, request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Run middleware on all routes except static files, _next internals, and API routes
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|.*\\.png$|.*\\.svg$).*)'],
}
