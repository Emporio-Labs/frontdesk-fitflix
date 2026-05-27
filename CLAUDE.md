# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (http://localhost:3001 by default, backend expected at NEXT_PUBLIC_API_URL)
npm run build        # Next.js production build — does NOT fail on TypeScript errors (ignoreBuildErrors: true)
npx tsc --noEmit     # Real TypeScript typecheck — run this to verify type correctness
```

> There is no test runner. ESLint (`npm run lint`) requires a local ESLint install; `npx eslint` pulls the wrong version — skip it.

## Environment

Single `.env` file (not `.env.local`):

```
NEXT_PUBLIC_API_URL=http://localhost:3000   # Backend base URL
NEXT_PUBLIC_DEBUG_AUTH=1                   # Logs auth debug info to console
```

`API_BASE_URL` is normalised in `lib/api-client.ts`: bare hostnames get `https://` prepended, `localhost` gets `http://`.

---

## Architecture overview

### Route groups

| Prefix | Purpose |
|---|---|
| `/admin/*` | Front-desk operations dashboard (users, leads, bookings, slots, appointments, memberships, credits, therapies, services, doctors, trainers, reports, audit logs, settings) |
| `/dashboard/*` | Workout plan builder — **fully client-side / localStorage only, no backend integration yet** |
| `/login` | Public auth entry point |
| `/api/*` | Next.js route handlers (see below) |

`middleware.ts` guards `/admin` and `/dashboard` by checking for the `hh_authed` cookie. Unauthenticated requests are redirected to `/login?from=<path>`.

### Auth flow

Auth is a React Context (`app/context/auth-context.tsx`), **not Zustand**.

- `POST /auth/login` → returns `{ token, user }`.
- Token stored in `localStorage.hh_token`; user object in `localStorage.hh_user`.
- `document.cookie` `hh_authed=1` is the middleware-readable signal.
- On refresh, `AuthProvider` restores state from localStorage and reinstates the cookie.
- Logout: clears localStorage, clears cookie, hard-navigates to `/login`.

Roles defined in `lib/rbac.ts`: `super_admin | clinic_admin | staff | clinician | sales`. The dashboard targets `clinic_admin` / `super_admin`.

### API client

Single axios instance in `lib/api-client.ts` — **import as `{ apiClient }`**.

Request interceptor injects `Authorization: Bearer <hh_token>` on every request except `/auth/*`. Falls back to `Basic <hh_credentials>` if no Bearer token exists. `NEXT_PUBLIC_DEBUG_AUTH=1` logs all requests/responses to the console.

There is **no token-refresh logic** — token expiry results in 401 errors surfaced as toast messages.

### Service layer

`lib/services/*.service.ts` — one file per backend resource. Pattern:

```ts
import { apiClient } from '@/lib/api-client'

export interface SomeEntity { ... }

export const someService = {
  getAll: async () => { const { data } = await apiClient.get('/resource'); return data as { items: SomeEntity[] } },
  getById: async (id: string) => { ... },
  create: async (payload: CreatePayload) => { ... },
  // ...
}
```

**Exception:** `membership-plan.service.ts` uses a plain axios instance (no auth header) and hits **Next.js API routes** at `/api/membership-plans`, not the backend directly.

### React Query hooks

`hooks/use-*.ts` — one file per resource, wrapping service calls. Pattern:

```ts
export function useEntities() {
  return useQuery({ queryKey: queryKeys.entity.all(), queryFn: entityService.getAll, select: (d) => d.items })
}

export function useCreateEntity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => entityService.create(payload),
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: queryKeys.entity.all() }); toast.success(data.message) },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  })
}
```

All query keys are centralised in `lib/query-keys.ts`. Default query client config (`lib/query-client.ts`): `staleTime: 30s`, `retry: 1`, `refetchOnWindowFocus: false`.

### Next.js API routes (exceptions to direct-backend pattern)

| Route | Behaviour |
|---|---|
| `app/api/leads/*` | Generic reverse proxy to backend via `app/api/leads/proxy.ts`. Forwards auth/cookie/x-* headers, strips hop-by-hop headers. |
| `app/api/membership-plans/*` | **Local file-backed store** (`lib/server/membership-plans-store.ts` → `.data/membership-plans.json`). Not a backend proxy. |

### State management

- **React Query** — all server state.
- **Zustand** — one store only: `stores/workout-store.ts` (workout plan builder draft + persisted plan list via `localStorage` key `fitflix-workout-plans`). Workout plans have **no backend integration**.
- **React Context** — auth state only (`app/context/auth-context.tsx`).

---

## Key conventions

### Icons

Use `@tabler/icons-react` (`IconCheck`, `IconX`, `IconEdit`, etc.). Lucide is in `package.json` but Tabler is used everywhere in the codebase — do not mix.

### Error toasts

```ts
onError: (err: any) => toast.error(err?.response?.data?.message || 'Fallback message')
```

`sonner` is the toast library. `<Toaster richColors position="top-right" />` is mounted in the root layout.

### Status display

`components/status-badge.tsx` maps lowercase status strings to Tailwind colour classes. Existing mappings include: `active`, `inactive`, `pending`, `expired`, `paused`, `confirmed`, `completed`, `cancelled`, `not_started`, `in_progress`, `new`, `contacted`, `qualified`, `converted`, `lost`. Pass status strings in lowercase; the component auto-capitalises display text.

### Empty / loading states

- Empty: `<EmptyState>` from `components/empty-state.tsx` (accepts `icon`, `title`, `description`, `action`).
- Loading skeletons: `<Skeleton>`, `<SkeletonTable>`, `<SkeletonCard>` from `components/skeleton-loader.tsx`.

### TypeScript

`strict: true` in `tsconfig.json`, but `next.config.mjs` sets `typescript.ignoreBuildErrors: true` so `npm run build` will not surface errors. Always run `npx tsc --noEmit` to check types. Pre-existing errors exist in `app/admin/bookings/page.tsx`, `app/admin/leads/page.tsx`, `app/dashboard/workouts/*`, `components/workouts/*`, and `stores/workout-store.ts` — do not treat these as regressions.

### Path aliases

`@/*` maps to the repo root (e.g. `@/lib/api-client`, `@/hooks/use-users`).

---

## Onboarding integration (added)

The backend onboarding workflow engine is integrated into the admin dashboard as **read-only visibility** — admins can track but not drive progression from the UI.

**Files added:**
- `lib/services/onboarding.service.ts` — `onboardingService.getStatus(userId)` plus typed-only POST methods (`submitHealthMarkers`, `submitHealthGoals`, `submitConsent`, `submitReport`, `submitAppointment`, `complete`).
- `hooks/use-onboarding.ts` — `useOnboardingStatus(userId)` query + six mutation hooks. Mutations invalidate `onboarding.byUser`, `onboarding.all`, `users.detail`, and `users.all`.
- `components/onboarding-timeline.tsx` — presentational 7-step pill tracker. Step order is driven by the exported `ONBOARDING_STEP_ORDER` constant (never derived from `completedSteps`).

**Files extended:**
- `lib/services/user.service.ts` — added `OnboardingStep` union type, `UserOnboardingSummary` interface, and optional `onboarded?: boolean` / `onboardingStatus?: UserOnboardingSummary` fields on `User`.
- `lib/query-keys.ts` — added `onboarding.all()` and `onboarding.byUser(userId)`.
- `app/admin/users/page.tsx` — `deriveOnboardingState(user)` helper + "Onboarding" column in the Members table (between Joined and Membership).
- `app/admin/users/[id]/page.tsx` — three new cards appended after the Bookings card: **Onboarding Progress** (step flags + embedded timeline), **Onboarding Reports** (table of name/type/uploadedAt from `GET /onboarding/status`), **Onboarding Appointments** (Sports Scientist + Nutritionist rows with status badge and date).

**Onboarding step order** (enforced by backend):
`HEALTH_MARKERS → HEALTH_GOALS → CONSENT → REPORT_UPLOAD → SPORTS_SCIENTIST_BOOKING → NUTRITIONIST_BOOKING → COMPLETED`

**Data sources:**
- Table column: derived from `user.onboarded` / `user.onboardingStatus` (already in `GET /users` response).
- Detail-page progress summary: same `user.onboardingStatus` fields (from `useUser`), with fallback to `onboarding.status` from `useOnboardingStatus`.
- Reports list and Appointments list: `GET /onboarding/status?userId=<id>` (via `useOnboardingStatus`).

> **Assumption to verify:** `GET /onboarding/status` accepts `userId` as a query param. If the backend uses a path segment (`/onboarding/status/:userId`), update `onboardingService.getStatus` in `lib/services/onboarding.service.ts`. Similarly, `MedicalReport` and `ExpertAppointment` field names should be confirmed against live API responses.

---

## Nutrition module (added)

Full nutrition feature: admin/nutritionist management + member self-service. Uses the
standard service → hook → page conventions. **Forms use react-hook-form + zod** (via
`components/ui/form.tsx` + `@hookform/resolvers/zod`) — the first RHF usage in app code;
the manual-useState dialogs elsewhere are unchanged.

**Files added:**
- `lib/types/nutrition.ts` — all interfaces, enums (`MEAL_SLOTS`, `NUTRITION_GOALS`), and zod form schemas (`foodSchema`, `templateSchema`, `assignPlanSchema`, `progressSchema`).
- `lib/services/nutrition.service.ts` — single `nutritionService` object covering foods, templates, plans, meal logs, hydration, adherence, progress, PDF-url seam.
- `hooks/use-nutrition.ts` — all RQ query/mutation hooks. `invalidateNutrition(qc)` invalidates `queryKeys.nutrition.all()`. `useLogMeal(planId, date)` does an **optimistic** meal-completion toggle (`onMutate`/`setQueryData`/`ctx.prev` rollback, pattern from `hooks/use-leads.ts`).
- `components/nutrition/*` — `food-form`, `template-form` (nested `useFieldArray` meals→items, auto-scales macros from the food catalog), `assign-plan-form`, `progress-form` (RHF dialogs); `macro-summary`, `adherence-bar`, `adherence-chart` (recharts), `hydration-widget`, `meal-log-row`, `nutrition-status-cell` (presentational).
- `app/admin/nutrition/{page,foods,templates,templates/create,templates/[id],plans,plans/[id],adherence}` — admin/nutritionist pages.
- `app/dashboard/nutrition/page.tsx` — member view: assigned plan, optimistic meal completion, hydration logging, progress, adherence read-out, disabled PDF button.

**Files extended:**
- `lib/query-keys.ts` — `nutrition` namespace (foods/templates/plans/mealLogs/hydration/adherence/progress).
- `lib/rbac.ts` — single `nutrition` resource. `super_admin`/`clinic_admin` = CRUD, `clinician` = read/update, `staff` = read, `sales` = none. **No `nutritionist` role added to the `UserRole` union** — UI gates via `useCanAccess('nutrition', action)`.
- `components/status-badge.tsx` — added `assigned`, `on_track`, `behind`, `off_track`.
- `components/app-sidebar.tsx` — "Nutrition" (`/admin/nutrition`) and "My Nutrition" (`/dashboard/nutrition`) nav entries (reuse `IconSalad`).

**Collision note:** `app/admin/nutritionist/` (pre-existing read-only member-segmentation
view) is unrelated and untouched. This module is `app/admin/nutrition/`.

> **Assumptions to verify (correct `nutrition.service.ts` + `lib/types/nutrition.ts` only — hooks/pages stay stable):** All `/nutrition/*` paths and response/field shapes are inferred from the backend domain models (the module is not yet in `api_docs.md`). Each block in `nutrition.service.ts` carries an `ASSUMPTION` comment. List endpoints assumed to return `{ items: [...] }`; mutations `{ message, <entity> }`. `GET /nutrition/me/plan` assumed for the member's active plan; `userId` passed as a query param for plans/hydration/adherence/progress. PDF (`GET /nutrition/plans/:id/pdf`) is a **deferred** seam — UI renders a disabled "Export PDF" button.
