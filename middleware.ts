import { NextRequest, NextResponse } from 'next/server'
import {
  ROLE_ALLOWED_PREFIXES,
  getRoleStartPage,
  isPathAllowedForRole,
  PENDING_PATH,
} from '@/lib/role-workspaces'

// Routes that require authentication
const PROTECTED_PREFIXES = ['/dashboard', '/admin']
// Routes that should redirect to dashboard/start page if already authenticated
const AUTH_ROUTES = ['/login']

/**
 * FX-31.5 — resolve the signed-in role the server will trust. Today this reads
 * the `hh_role` cookie (set by the client), which is a UX gate, not a security
 * boundary. This is the single seam to switch to a backend-set, httpOnly, signed
 * session cookie (verified here) so the role can no longer be forged — see
 * BACKEND_REQUIREMENTS.txt. Keeping it in one place means middleware, sidebar and
 * post-login redirects all upgrade together.
 */
function resolveRole(request: NextRequest): string | undefined {
  return request.cookies.get('hh_role')?.value
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check for auth cookie (set on login, cleared on logout)
  const isAuthed = request.cookies.has('hh_authed')
  const role = resolveRole(request)

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route))
  const isPending =
    pathname === PENDING_PATH || pathname.startsWith(PENDING_PATH + '/')

  // Not authed, trying to access a protected route or the waiting page → login
  if ((isProtected || isPending) && !isAuthed) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // FX-31.4 — a staff account with no role yet is confined to the waiting page.
  if (isAuthed && role === 'unassigned') {
    if (!isPending) {
      return NextResponse.redirect(new URL(PENDING_PATH, request.url))
    }
    return NextResponse.next()
  }

  // Anyone else who lands on /pending belongs in their real workspace.
  if (isAuthed && isPending && role !== 'unassigned') {
    return NextResponse.redirect(new URL(getRoleStartPage(role), request.url))
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

  // FX-31.1/31.2/31.3 — shared allow-list gate for the confined front-desk roles
  // (manager, sales). A role with an allow-list that hits a protected page it may
  // not use is returned to its start page. Trainer/nutritionist are handled by
  // their own blocks above and are not listed in ROLE_ALLOWED_PREFIXES.
  if (
    isAuthed &&
    isProtected &&
    role &&
    ROLE_ALLOWED_PREFIXES[role as keyof typeof ROLE_ALLOWED_PREFIXES] &&
    !isPathAllowedForRole(role, pathname)
  ) {
    return NextResponse.redirect(new URL(getRoleStartPage(role), request.url))
  }

  // Authed, trying to access login → redirect to their start page
  if (isAuthRoute && isAuthed) {
    return NextResponse.redirect(new URL(getRoleStartPage(role), request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Run middleware on all routes except static files, _next internals, and API routes
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|.*\\.png$|.*\\.svg$).*)'],
}
