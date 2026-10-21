# FX-27 — Branch Analytics in Frontdesk

> *As a club manager, I want the sign-up and booking funnels inside Frontdesk for
> the branch I pick, so that I don't need another tool or login to see them.*
>
> Quote clause: **US-AN-06**. Depends on **FX-17** (branch scoping / `X-Location-Id`)
> and **FX-22**. Replaces the quotation's embedded dashboards, which couldn't be
> limited to one branch per viewer. Work plan task **N7**.

## What shipped

An **Analytics** page at `/admin/analytics` showing the **sign-up funnel** and the
**booking funnel** for the branch the console currently has selected. It reuses the
existing branch switcher in the top bar — no second selector — so the numbers
follow whatever branch the rest of the console is scoped to.

The funnel numbers come from a separate **analytics service** authenticated with a
secret key. That key is held server-side and never reaches the browser.

## Acceptance criteria → where it lives

| AC | What | Where |
|---|---|---|
| **FX-27.1** | Analytics page shows both funnels for the selected branch | [app/admin/analytics/page.tsx](../app/admin/analytics/page.tsx), [components/analytics/funnel-card.tsx](../components/analytics/funnel-card.tsx) |
| **FX-27.2** | Switching branch changes the numbers; only a super admin sees all branches | Branch folds into the request + query key via `scopedKey` ([hooks/use-analytics.ts](../hooks/use-analytics.ts)); "All branches" stays super-admin-only in the existing [components/location-switcher.tsx](../components/location-switcher.tsx), and the analytics service is the authority that refuses cross-branch reads |
| **FX-27.3** | The analytics service's secret key never reaches the browser | [app/api/analytics/proxy.ts](../app/api/analytics/proxy.ts) reads `ANALYTICS_API_KEY` (server-only, **no** `NEXT_PUBLIC_` prefix) and attaches it upstream; the browser only ever calls the same-origin `/api/analytics/*` route |
| **FX-27.4** | Only admins see the page | `analytics:read` RBAC permission (super_admin / clinic_admin / manager) in [lib/rbac.ts](../lib/rbac.ts); sidebar entry only in the admin + manager menus; middleware allow-list in [lib/role-workspaces.ts](../lib/role-workspaces.ts); page-level `useCanAccess` lock state |

## Request path (how the secret stays server-side)

```
browser  ──GET /api/analytics/funnels?locationId&from&to──▶  Next.js route (server)
  │  Authorization: Bearer <user token>                        app/api/analytics/proxy.ts
  │  X-Location-Id: <branch>                                     │  adds X-Analytics-Key: <secret>
  │                                                              │  forwards Authorization + branch
  ◀────────────── funnel JSON (numbers only) ──────────────     ▼
                                                          analytics service
```

The secret is injected only inside the route handler (server). It is absent from
every client bundle — verified by grepping `.next/static` for the key value and
for `ANALYTICS_API_KEY` (both return nothing). The user's own bearer token is
forwarded so the analytics service can scope/refuse by the caller's branch access
(FX-27.2) — consistent with the repo convention that RBAC is resource/action only
and branch scope is enforced by the data source, not the UI.

## Environment

Server-only (no `NEXT_PUBLIC_` prefix), added to `.env` / `.env.example`:

```
ANALYTICS_API_URL=    # base URL of the analytics service
ANALYTICS_API_KEY=    # secret service-to-service key — never shipped to the client
```

Leave both empty to disable the feature: the proxy returns a valid empty payload
with `configured: false`, and the page shows an **"Analytics isn't connected yet"**
state instead of erroring — the same graceful-degradation pattern used elsewhere
in the console against missing backends.

## Backend (implemented in FITFLIX_BACKEND)

The analytics service is the FITFLIX backend's `/analytics` prefix. The endpoint
`GET /analytics/funnels` is implemented there (`src/routes/analytics.routes.ts`,
`src/controllers/analytics.controller.ts` → `getBranchFunnels`,
`src/services/branch-funnels.service.ts`). Wiring:

- **`ANALYTICS_API_URL`** → the backend's analytics prefix, e.g.
  `http://localhost:3000/analytics` (the proxy calls `${ANALYTICS_API_URL}/funnels`).
- **`ANALYTICS_API_KEY`** → must equal the backend's own `ANALYTICS_API_KEY`. The
  backend validates the forwarded `X-Analytics-Key` header and returns 403 on a
  mismatch; when the backend's var is unset the service gate is skipped (JWT +
  role + branch guards still apply).
- **Auth:** forwarded `Authorization` (user JWT) authorizes `admin`/`frontdesk`
  and drives branch scope; `X-Analytics-Key` is the service credential.
- **Response:** `{ branchId, range:{from,to}, funnels:[{ key, title, steps:[{ key, label, count }] }], generatedAt, configured }`
  — the client also accepts a keyed form `{ signup:{…}, booking:{…} }`.
- **Branch enforcement (FX-27.2):** `staffGuard` + `scopedLocationFilter` confine a
  branch-scoped manager to their own branches and make an out-of-scope `locationId`
  match nothing; a global/super admin may read across all branches. Active only
  when `STAFF_RBAC_ENFORCE=true` (the whole branch system's master switch); the UI
  only *offers* "All branches" to super admins regardless.

**Funnel sources (confirm the stage definitions with the product owner):**

- **Sign-up** ← `Lead` (`locationId`, `createdAt` in window): Leads → Contacted →
  Qualified → Converted, by status progression.
- **Booking** ← `Booking` (`locationId`, `createdAt` in window): Bookings created →
  Confirmed → Attended, robust to the mixed numeric/string legacy `status` values.

## How this was verified

Against the dev server with a throwaway mock analytics service:

1. **Both funnels render** for a signed-in `manager` (sign-up + booking, with
   per-step conversion and drop-off).
2. **Secret is server-side only** — the mock received `X-Analytics-Key` and the
   forwarded user `Authorization`; the key value appears in no client bundle.
3. **Branch re-scopes** — selecting a branch adds `locationId=<id>` to the request
   and re-keys the query.
4. **Non-admins blocked** — a `staff` session is redirected off `/admin/analytics`
   by middleware and has no sidebar entry.
