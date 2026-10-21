# FX-45 — Every staff change is recorded and searchable

**Purpose:** give the club owner a searchable record of every change staff make — who, when, which branch, and what changed — so "who did this?" is answered from the record, not by asking around.

**Date:** 2026-10-09
**Depends on:** FX-16 (audit trail), FX-18/FX-19 (branch scoping), FX-31 (role workspaces)
**Status:** Frontend implemented against the assumed `GET /audit-logs` contract; backend coverage gap noted in §4.

---

## 1. Summary

Extends the existing `/admin/audit-logs` page — which today only surfaces booking rows — into a full staff-change record with branch and date search, a distinct "cancelled" kind of change, and branch-scoped access for managers. The page stays strictly read-only.

Branch confinement is **not** re-implemented here. It rides on the existing location-scope infrastructure: the branch switcher only offers a user the branches they're allowed to see, every request carries `X-Location-Id`, and the backend scopes the response. A manager therefore only ever *receives* their own branch's rows.

## 2. Acceptance criteria → where it lives

| Criterion | Implementation |
|---|---|
| **FX-45.1** — every create/edit/cancel/delete recorded with who, when, branch, what changed | `AuditLog` carries `actor` (who), `timestamp` (when), `branch` (where), `changes` (what). `cancelled` added as a distinct action alongside created/updated/deleted. Branch shown as a table column + in the detail dialog. |
| **FX-45.2** — admin can search by person, branch, date, kind of change | Page filters: search box (person / branch / log ID / entity), branch `<select>`, From/To date range, action `<select>`. |
| **FX-45.3** — manager searches their own branch only | `manager` granted `audit_logs:read` (`lib/rbac.ts`), `/admin/audit-logs` added to the manager allow-list (`lib/role-workspaces.ts`) + sidebar (`components/app-sidebar.tsx`). Branch confinement enforced by the backend via `X-Location-Id`; the in-page branch filter is hidden when only one branch is visible. |
| **FX-45.4** — records can't be edited or deleted from Frontdesk | Page is read-only — no mutation hooks, no edit/delete controls. The service exposes only `getAll`. |

## 3. Files touched

**Changed:**
- `lib/services/audit.service.ts` — `branch: AuditBranch | null` on `AuditLog` + defensive `normalizeBranch`; `branchId`/`from`/`to` added to `AuditLogFilters`.
- `hooks/use-audit-logs.ts` — folded the active branch into the query key via `scopedKey` (pattern from `use-bookings`) so switching branch refetches and never serves a cached other-branch result.
- `app/admin/audit-logs/page.tsx` — branch column + detail field, branch filter (shown only when >1 branch), From/To date range, `cancelled` action (filter option, amber badge, stat card), branch added to free-text search, read-only info card copy.
- `lib/rbac.ts` — `manager` → `audit_logs:read`.
- `lib/role-workspaces.ts` — `/admin/audit-logs` in the manager allow-list.
- `components/app-sidebar.tsx` — "Audit Logs" entry in the manager Insights nav.

## 4. Backend assumptions to verify

The service is the single place to correct if the live API differs — the hook and page stay stable (`ASSUMPTION` comment in `audit.service.ts`).

- `GET /audit-logs` returns `{ items: AuditLog[] }` with a resolved `actor` **and a `branch`** per row.
- Rows are emitted for **every entity type**, not only bookings (today's gap — a backend concern, not frontend).
- A cancellation is recorded with `action: "cancelled"` (distinct from a hard `deleted`).
- The response is branch-scoped by the `X-Location-Id` header, so a manager cannot receive other branches' rows regardless of what the UI sends.
- The audit log's `branch.id` matches `Location._id` (so the branch column/filter resolve names correctly).

## 5. Verification

- `npx tsc --noEmit` — clean across all touched files (pre-existing errors in bookings/leads/workouts unchanged).
- Live browser pass not run: the route is auth-gated and the `/audit-logs` endpoint does not exist on the backend yet, so a live page would only render the empty/error state.
