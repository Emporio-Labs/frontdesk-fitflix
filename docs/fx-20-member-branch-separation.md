# FX-20 — Members see their home club's classes and offers

**Purpose:** give a member a single home club so the app shows them the in-person
classes, offers and club notifications they can actually use, while online classes
and livestreams stay visible to everyone. This is the **member side of branch
separation** (US-MB-09).

**Date:** 2026-10-12
**Depends on:** FX-01 (branches), FX-17 (`X-Location-Id` transport), FX-18/FX-19
(branch scoping + switcher)
**Status:** Staff-console side implemented. The member-facing rendering (home
screen, class feed, notification inbox) lives in the Release 2 member app; the
`/member-notifications` routes and the member `homeClubId` field are backend
dependencies noted in §4.

---

## 1. Summary

`frontdesk-fitflix` is the staff/admin console, not the member app, so FX-20 here
is the staff-console half: **author the data members will see, and carry the
fields the backend needs to scope by club.** Three things ship:

1. **Home club on the member** — a new `homeClubId` (a `Location._id`) on the
   member record, shown and edited from `/admin/users`.
2. **Club-wide member notifications** — a new `/admin/announcements` composer that
   sends a branch-scoped broadcast to a club's members.
3. **Offers & classes** — already branch-aware; verified and documented, no change.

Branch confinement is **not** re-implemented. It rides on the existing
location-scope infrastructure (`LocationScopeProvider` → `X-Location-Id` header →
`scopedKey`), exactly as [fx-45](fx-45-staff-audit-trail.md) states. Every
branch-dependent control is hidden when only one branch exists, so a single-branch
chain looks exactly as it does today (FX-20.4).

## 2. Acceptance criteria → where it lives

| Criterion | Implementation |
|---|---|
| **FX-20.1** home club shows in the member's profile | `homeClubId` + `homeClubName` on `User` (`lib/services/user.service.ts`). "Home Club" column in the Members table and a field on the member detail page, both resolving the id → `Location.name`. Editable via a "Home Club" `<Select>` in the Create/Edit Member dialog; sent in the create/update payloads. |
| **FX-20.2** in-person classes/offers from the home club; online/livestream visible to everyone | **Offers:** already built — `Promotion.locationId` (null = company-wide) + `mode` (online/offline) + server-resolved `audience` (`lib/services/promotion.service.ts`, `app/admin/promotions`). No change. **Classes:** already branch-aware on create (`CreateGroupClassPayload.locationId`) with `mode`/`sessionType`/`access`. The member-visibility rule itself is enforced backend-side; the console authors the data. |
| **FX-20.3** club-wide notifications reach only that club's members | New composer: `member-notification.service.ts` + `use-member-notifications.ts` + `app/admin/announcements/page.tsx`. `locationId: null` = company-wide; a concrete id = that club's members only. The backend resolves recipients from `locationId` + `X-Location-Id` + `audience`. |
| **FX-20.4** one branch ⇒ looks exactly as today | The Home Club column, the Home Club select, and the announcement club picker all render only when `locations.length > 1`. With one branch the sole location is applied silently (members default to it; a notification goes company-wide, which the backend resolves to that club). |

## 3. Files touched

**Changed:**
- `lib/services/user.service.ts` — `homeClubId?: string | null` + `homeClubName?`
  on `User`; `homeClubId?` on `CreateUserPayload` / `UpdateUserPayload`;
  `normalizeUser` reads a flat id (`homeClubId`/`locationId`) or a populated
  relation (`homeClub: { _id, name }`).
- `app/admin/users/page.tsx` — "Home Club" column (resolved via the existing
  `branchNameById` map, shown only when `>1` branch), a "Home Club" `<Select>` in
  the member dialog (modeled on the Gender select), `homeClubId` threaded through
  `MemberFormState` / `defaultMemberForm` / edit-populate / dirty-check / submit
  (defaults to the sole location on a single-branch chain). Empty-state `colSpan`
  made branch-aware.
- `app/admin/users/[id]/page.tsx` — "Home Club" field in the member header card,
  resolved via `useLocations()`, shown only when `>1` branch.
- `lib/query-keys.ts` — `memberNotifications` namespace (used through `scopedKey`).
- `lib/rbac.ts` — `member_notifications` resource (`create` + `read`) for
  `super_admin` and `clinic_admin`.
- `components/app-sidebar.tsx` — "Announcements" entry in the admin Insights nav
  (`IconBell`), visible to the full-admin roles.

**Added:**
- `lib/services/member-notification.service.ts` — `memberNotificationService`
  (`getAll` / `send`), `MemberNotification`, `SendMemberNotificationPayload`,
  `NotificationAudience` + `NOTIFICATION_AUDIENCES`. Endpoints carry an
  `ASSUMPTION`/UNVERIFIED note (parallel to `push.service.ts`).
- `hooks/use-member-notifications.ts` — `useMemberNotifications` (history, keyed
  through `scopedKey`) + `useSendMemberNotification` (invalidates all branches,
  toasts via the standard pattern).
- `app/admin/announcements/page.tsx` — the composer: title, message, club picker
  (hidden on a single branch), audience picker, a **send-confirmation dialog**
  (a broadcast can't be unsent), and a "Sent" history table. Gated by
  `useCanAccess('member_notifications', …)`.

`super_admin`/`clinic_admin` are unrestricted in `lib/role-workspaces.ts`, so the
new route needs no allow-list change.

## 4. Backend assumptions to verify

Each service is the single place to correct if the live API differs — the hooks
and pages stay stable.

- **Member home club:** `GET/POST/PATCH /users` read & persist `homeClubId`
  (a `Location._id`). If the field is named differently (`locationId`, a populated
  `homeClub`), fix only `normalizeUser` / the payloads in `user.service.ts`.
- **Member notifications:** `GET /member-notifications` → `{ items: [...] }` and
  `POST /member-notifications` → `{ message, notification }`, **branch-scoped** by
  `X-Location-Id` + the body `locationId`. These routes are **UNVERIFIED** (the
  member-facing delivery lives in the Release 2 app + backend), tracked as a
  backend dependency like FX-25's web-push routes.
- The backend is the authority on **who actually receives** a club notification
  and on the member class/offer visibility rule (in-person ⇒ home club;
  online/livestream ⇒ everyone). The console only authors the inputs.

## 5. Verification

- `npx tsc --noEmit` — clean (exit 0, no errors) across all touched files.
- Live pass (`npm run dev`, http://localhost:3001; viewed as `super_admin` via the
  localStorage/`hh_role` role-simulation): `/admin/announcements` and `/admin/users`
  both render with no runtime errors (only the expected `ERR_CONNECTION_REFUSED` to
  the absent backend and a pre-existing CSP block of the Vercel analytics script).
  The new "Announcements" sidebar entry appears under Insights. With the backend
  down, `useLocations()` is empty → single-branch path → the club picker and Home
  Club controls are correctly hidden, confirming FX-20.4.
- The **multi-branch** live pass (Home Club column/select populated, announcement
  club picker) requires the backend running with ≥2 Locations; the gating uses the
  same `locations.length > 1` pattern already proven in promotions and audit-logs.
