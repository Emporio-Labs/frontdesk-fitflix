# FX-46 — What confuses each role in Frontdesk today

**Purpose:** give FX-47 a grounded, ranked list of where each staff role gets lost in Frontdesk today, so the redesign fixes real problems instead of guesses.

**Date:** 2026-10-09
**Author:** (drafted for review — see §5 sign-off)
**Status:** Draft — awaiting front-desk + trainer confirmation (FX-46.4)

---

## 1. Summary

### Method

Hybrid audit:

- **Backbone (reliable): code-grounded walkthrough.** For each role, the 5 most common daily tasks were traced through the real routes, sidebar config, RBAC permissions and page components. Every finding below cites a file/route so it can be verified and re-found.
- **Live pass (best-effort screenshots).** The frontend dev server runs ([localhost:3001](http://localhost:3001)) and the **login screen was captured live** (`docs/fx-46-screenshots/_shared/login.jpg`). Authenticated per-role screens could **not** be captured: the backend (`D:\FITFLIX_BACKEND`, Bun + MongoDB) has **no documented seeded logins for the 7 roles**, and its seed/`create:admin` scripts mutate a database whose state is unknown. Per-role screens are therefore marked **"code-only — live capture not possible"**. They are ready to capture in one pass if role credentials + a seeded DB are provided (see §6).

### Role mapping (7 ticket roles → 9 code roles)

The ticket's 7 roles map onto the 9 roles defined in `lib/rbac.ts`:

| Ticket role | Code role(s) | Sidebar shown | Route confinement |
|---|---|---|---|
| admin | `super_admin`, `clinic_admin` | full `navGroups` (~30 items) | none (intended) |
| manager | `manager` | `navManagerGroup` | allow-list (`lib/role-workspaces.ts`) |
| sales | `sales` | `navSalesGroup` (Leads, Memberships, Notifs) | allow-list |
| front desk | `staff` | **full `navGroups`** (fallback) | **none** |
| trainer | `trainer` | `navTrainerGroup` | own middleware block |
| nutritionist | `nutritionist` | `navNutritionistGroup` | own middleware block |
| sports scientist | `sports_scientist` | **full `navGroups`** (fallback) | **none** |

### Headline

The single biggest source of confusion is **navigation that isn't aware of permissions**. `components/nav-main.tsx` renders whatever menu it's handed with **no RBAC filtering**, and `components/app-sidebar.tsx` only gives a trimmed menu to `trainer`/`nutritionist`/`manager`/`sales`. Every other role — including **front desk (`staff`)** and **sports scientist** — gets the full ~30-item admin menu, while `middleware.ts` doesn't confine them. The result: two of the seven roles spend all day looking at menus that dead-end.

---

## 2. Per-role walkthroughs

> Screenshot status is noted per task. "Code-only" = the finding is confirmed from source; live capture is pending backend logins.

### 2.1 Admin — `super_admin` / `clinic_admin`

Lands on `/dashboard` (`lib/role-workspaces.ts:19-20`). Full sidebar.

| # | Daily task | Route(s) | Screenshot | Confusions |
|---|---|---|---|---|
| 1 | Daily operations overview | `/dashboard` | code-only | Booking chart uses numeric status codes via a **local** `StatusBadge` that differs from the app-wide `components/status-badge.tsx` → inconsistent status wording (**F15**). |
| 2 | Member lookup / add + onboarding | `/admin/users`, `/admin/users/[id]` | code-only | Onboarding state shown as "X/6" with no legend of what the 6 steps are at a glance (**F14** related). |
| 3 | Memberships & plans | `/admin/memberships`, `/admin/membership-plans`, `/admin/credits` | code-only | `membership-plans` is backed by a **local JSON file**, not the backend (per `CLAUDE.md`) — data lives in a different place than everything else. |
| 4 | Bookings / slots / spot booking | `/admin/bookings`, `/admin/slots`, `/admin/spot-booking` | code-only | Three overlapping ways to create a booking (Bookings, Spot Booking, Slots); which to use when isn't signposted. |
| 5 | Settings / reports / audit | `/admin/settings`, `/admin/reports`, `/admin/audit-logs` | code-only | Mostly fine for admin (this is their home surface). |

Admin is the **least** confused role — the app is built around it. Most problems appear when *other* roles inherit admin's surfaces.

### 2.2 Manager — `manager`

Lands on `/dashboard`; trimmed `navManagerGroup`; allow-list enforced.

| # | Daily task | Route(s) | Screenshot | Confusions |
|---|---|---|---|---|
| 1 | Operations overview | `/dashboard` | code-only | The shared dashboard's **Quick Actions** include "Add Trainer" (`/admin/trainers`) and "Create Slot" — but `/admin/trainers` is **not** in the manager allow-list (`lib/role-workspaces.ts:46-63`), so the button bounces back to the start page (**F2**). |
| 2 | Members + leads | `/admin/users`, `/admin/leads` | code-only | Works, but "Users" is labelled "Members" in this group vs "Users" in the admin group — same page, two names (**F2** related). |
| 3 | Bookings / slots / attendance | `/admin/bookings`, `/admin/slots`, `/admin/attendance` | code-only | OK. |
| 4 | Memberships / credits / invoices | `/admin/memberships`, `/admin/credits`, `/admin/invoices` | code-only | OK. |
| 5 | Alerts / reports / promotions | `/admin/alerts`, `/admin/reports`, `/admin/promotions` | code-only | OK. |

### 2.3 Sales — `sales`

Lands directly on `/admin/leads` (`lib/role-workspaces.ts:26` → sales start page). Sidebar: Leads, Memberships, Notifications only.

| # | Daily task | Route(s) | Screenshot | Confusions |
|---|---|---|---|---|
| 1 | Work the lead queue | `/admin/leads` | code-only | OK — this is the sales home. |
| 2 | Qualify / convert a lead | `/admin/leads` (detail + status) | code-only | After marking a lead "converted" there is **no next step in-app** — sales can't create a membership (**F11**). |
| 3 | Check a membership | `/admin/memberships` (read-only) | code-only | Can view but every action control is denied; read-only state isn't obvious up front (**F12**). |
| 4 | Notifications | `/admin/me/notifications` | code-only | OK. |
| 5 | Sell / onboard the converted member | — | code-only | **Dead end.** `sales` has `memberships:read` only (`lib/rbac.ts:151-156`) and no `users:create` — the person who closed the deal can't take the next action. **The gap itself is the confusion.** (**F11/F12**) |

### 2.4 Front desk — `staff`

Lands on `/dashboard`. **Gets the full ~30-item admin sidebar** (no custom group) but holds mostly read-only permissions (`lib/rbac.ts:121-135`).

| # | Daily task | Route(s) | Screenshot | Confusions |
|---|---|---|---|---|
| 1 | Check a member in / attendance | `/admin/attendance` | code-only | Check-in is blocked unless the member has an **active membership** *and* shows an "Onboarding X/6" gate; front desk gets a red "Cannot check in" with no clear "what do I do now" path (**F14**). Destructive "delete visit" uses a raw browser `confirm()` dialog, inconsistent with the app's own dialogs (**F13**). |
| 2 | Member lookup | `/admin/users` | code-only | OK (read). |
| 3 | View / mark bookings | `/admin/bookings` | code-only | OK (bookings:update allowed). |
| 4 | Spot booking / slots | `/admin/spot-booking`, `/admin/slots` | code-only | `slots` create isn't permitted for staff, but the menu/Quick Actions still offer it (**F1/F2**). |
| 5 | Everything else in the sidebar | Settings, Locations, Audit Logs, DNA, Promotions, Reports, Community… | code-only | **The core front-desk problem:** the sidebar shows ~30 items, most of which 403 or redirect for `staff`. There's no indication which menus actually work (**F1**). |

### 2.5 Trainer — `trainer`

Lands on `/admin/personal-training`; brand link → `/admin/personal-training/today`; trimmed `navTrainerGroup`.

| # | Daily task | Route(s) | Screenshot | Confusions |
|---|---|---|---|---|
| 1 | Today's sessions | `/admin/personal-training/today` | code-only | Trainer identity is matched by `id → email → name` against PT trainer records (`app/admin/personal-training/today/page.tsx:80-87`); if the signed-in trainer's id doesn't match, "Today" silently shows the wrong or empty roster (**F9**). |
| 2 | My members | `/dashboard/workouts/members` | code-only | Note the URL jumps from `/admin/...` (task 1) to `/dashboard/...` (task 2) within one sidebar — two namespaces for one job (**F10**). |
| 3 | Build / assign a workout plan | `/dashboard/workouts/plans` | code-only | **Workout plans are stored in `localStorage` only** (`stores/workout-store.ts`, zustand `persist`; confirmed in `CLAUDE.md`). Plans don't sync across devices and never reach the member — a trainer expecting the member to see the plan is confused when nothing arrives (**F8**). |
| 4 | Exercise library | `/dashboard/workouts/exercises` | code-only | Same local-only caveat. |
| 5 | Live sessions | `/dashboard/workouts/sessions` | code-only | OK structurally; depends on Zego video. |

### 2.6 Nutritionist — `nutritionist`

Lands on `/admin/nutrition` → middleware bounces to `/admin/nutrition/my-clients`; trimmed `navNutritionistGroup`.

| # | Daily task | Route(s) | Screenshot | Confusions |
|---|---|---|---|---|
| 1 | My clients | `/admin/nutrition/my-clients` | code-only | Client list uses a **fragile fallback**: when `/nutritionist/me/members` returns empty it matches members by nutritionist **name substring** (`app/admin/nutrition/my-clients/page.tsx:49-78`) — can show the wrong clients (**F7**). |
| 2 | Appointments | `/admin/nutrition?tab=appointments` | code-only | Lands via a query-param tab, not a dedicated route — deep-linking/back-button behaviour is fiddly. |
| 3 | Diet plans | `/admin/nutrition/diet-plans` | code-only | OK. |
| 4 | Food catalog | `/admin/nutrition/foods` **and** `/admin/nutrition?tab=food-catalog` | code-only | The sidebar has **two "Food Catalog" entries pointing to different URLs** (`components/app-sidebar.tsx:139,142`) — which one is "real"? (**F4**) |
| 5 | Availability | `/admin/nutritionist` | code-only | Landing is inconsistent: brand link → `/my-clients`, start page → `/admin/nutrition` (`lib/role-workspaces.ts:28`), and several overlapping nutrition routes exist (`/admin/nutrition`, `/admin/nutritionist`, `/admin/nutritionist-appointments`, `/admin/nutrition/members`, `/admin/appointments`) — easy to land on the wrong one (**F5/F6**). |

### 2.7 Sports scientist — `sports_scientist`

Lands on `/admin/sports-scientist` (a genuinely rich console: Overview / Bookings / Active Users / Availability tabs). **But has no custom sidebar group** → gets the full admin `navGroups`, and holds only `users:read` (`lib/rbac.ts:173-175`).

| # | Daily task | Route(s) | Screenshot | Confusions |
|---|---|---|---|---|
| 1 | Open the console | `/admin/sports-scientist` | code-only | The console is good — but **nothing in the sidebar links to it** for this role; they must rely on the post-login landing (**F3**). |
| 2 | Member lookup | `/admin/users` | code-only | Allowed (read). |
| 3–5 | Everything else | full admin sidebar | code-only | Like front desk, the sports scientist sees ~30 admin menu items, none of which they can use, and **no link back to their own console** once they navigate away (**F1/F3**). The role's usable surface is one page reachable only by URL/landing. |

---

## 3. Findings table

Severity: **blocks**=3, **slows**=2, **cosmetic**=1. Frequency: **daily**=3, **weekly**=2, **rare**=1. **Priority = Severity × Frequency.**

| ID | Role(s) | Where (route / component) | What confuses | Why | Freq | Sev | Priority |
|---|---|---|---|---|---|---|---|
| F1 | front desk, sports scientist | `components/app-sidebar.tsx:218-230`, `components/nav-main.tsx`, `middleware.ts` | Full ~30-item admin menu shown; most items dead-end | Sidebar group chosen by role equality only; NavMain does no RBAC filtering; middleware doesn't confine these roles | daily | blocks | **9** |
| F3 | sports scientist | `app/admin/sports-scientist/page.tsx`, `components/app-sidebar.tsx`, `lib/role-workspaces.ts:29` | Rich console exists but no sidebar link to it; no way back once you leave | No `navSportsScientistGroup`; role falls through to admin menu | daily | blocks | **9** |
| F8 | trainer | `stores/workout-store.ts`, `app/dashboard/workouts/*` | Workout plans don't persist across devices or reach members | Plans stored in `localStorage` (zustand `persist`); no backend integration | daily | blocks | **9** |
| F11 | sales | `lib/rbac.ts:151-156`, `lib/role-workspaces.ts:65` | After converting a lead there's no way to sell/onboard | `sales` has `memberships:read` only, no create; no `users:create` | daily | blocks | **9** |
| F2 | manager, front desk | `app/dashboard/page.tsx:162-182`, `components/nav-main.tsx` | Dashboard Quick Actions & menu offer actions the role can't do | Shared dashboard + unfiltered menu; "Add Trainer"/"Create Slot" bounce | daily | slows | **6** |
| F7 | nutritionist | `app/admin/nutrition/my-clients/page.tsx:49-78` | "My Clients" can show the wrong members | Fallback matches by nutritionist **name substring** when API returns empty | daily | slows | **6** |
| F9 | trainer | `app/admin/personal-training/today/page.tsx:80-87` | "Today" shows wrong/empty roster for some trainers | Trainer matched by id→email→name; mismatch yields silent wrong data | daily | slows | **6** |
| F10 | trainer | `components/app-sidebar.tsx:120-132` | One sidebar spans two URL namespaces (`/admin/...` + `/dashboard/...`) | Trainer tasks split across Personal Training and Workouts trees | daily | slows | **6** |
| F14 | front desk | `app/admin/attendance/page.tsx:557-591` | "Cannot check in" with no clear recovery path | Check-in gated on active membership + onboarding; no guided next step | daily | slows | **6** |
| F4 | nutritionist | `components/app-sidebar.tsx:139,142` | Two "Food Catalog" menu items, different URLs | Duplicate label pointing at `/foods` and `?tab=food-catalog` | weekly | slows | **4** |
| F6 | nutritionist | route tree + `CLAUDE.md` collision note | Overlapping nutrition surfaces; easy to land on the wrong one | `/admin/nutrition`, `/admin/nutritionist`, `/admin/nutritionist-appointments`, `/admin/nutrition/members`, `/admin/appointments` coexist | weekly | slows | **4** |
| F12 | sales | `components/app-sidebar.tsx:199-207` | Read-only membership view with all actions denied | Workspace is Leads + Memberships(read) + Notifs; no action affordances explained | weekly | slows | **4** |
| F13 | front desk | `app/admin/attendance/page.tsx:305-313,726-734` | Destructive "delete visit" uses raw browser `confirm()` | Native dialog, inconsistent with app dialogs; easy to misclick | weekly | slows | **4** |
| F5 | nutritionist | `components/app-sidebar.tsx:234`, `lib/role-workspaces.ts:28` | Inconsistent landing page after login | Brand link and start-page map disagree; middleware re-redirects | daily | cosmetic | **3** |
| F17 | trainer, nutritionist, sports scientist, sales | `app/login/page.tsx:148,161` | Non-admin roles sign into a screen titled "Sign in to **admin panel**" | Single login copy for all roles | daily | cosmetic | **3** |
| F15 | admin, all | `app/dashboard/page.tsx:215-228` vs `components/status-badge.tsx` | Status wording differs between dashboard and the rest of the app | Dashboard uses a local numeric-code badge, not the shared component | weekly | cosmetic | **2** |

**Security note (not a UX confusion, but worth flagging to FX-47):** the signed-in role is read from a **client-set `hh_role` cookie** (`middleware.ts:22`) — a UX gate, not a security boundary. The code already marks this as the seam to replace with a backend-signed session. Role confinement can currently be bypassed by editing a cookie; mentioned here so the FX-47 redesign doesn't assume the gate is secure.

---

## 4. Ranking → proposed FX-47 scope

Ordered by priority. The top cluster (priority ≥ 6) is the recommended scope for FX-47.

**Tier 1 — fix first (priority 9, all "blocks"):**
1. **F1 + F3 — permission-aware navigation.** Front desk and sports scientist (and any future role) should see only the menu items they can use, and every role should have a working way back to its home surface. One root cause: `nav-main.tsx` renders unfiltered menus and `app-sidebar.tsx` only trims four roles. *This single fix removes the largest daily confusion for two of the seven roles.*
2. **F11 — sales convert→sell path.** Give sales a way to complete the deal they closed (create/assign a membership, or hand off cleanly), so "converted" isn't a dead end.
3. **F8 — trainer workout plans need a backend.** Plans must persist and reach the member; `localStorage`-only is a correctness problem disguised as a UX one.

**Tier 2 — strong candidates (priority 6):**
4. **F2** — stop offering actions a role can't perform (dashboard Quick Actions + menu).
5. **F7 / F9** — fix fragile identity/assignment matching (nutritionist clients, trainer "Today") so roles see *their* data reliably.
6. **F10** — unify the trainer's two URL namespaces into one coherent workspace.
7. **F14** — give front desk a guided recovery when check-in is blocked.

**Tier 3 — cleanups to batch into the redesign (priority 2–4):** F4, F6, F12, F13, F5, F17, F15 — duplicate/overlapping nav, read-only affordances, native confirm dialogs, landing/login copy, and status-wording consistency.

Recommended FX-47 scope: **Tier 1 + Tier 2**, with Tier 3 folded in opportunistically since most are small and sit in the same files the redesign will already touch.

---

## 5. FX-46.4 — reviewer sign-off

This list was drafted from the running app + source. **FX-46.4 requires a real front-desk person and a real trainer to confirm it matches their day.** Please walk your own five daily tasks and initial each row.

### Front-desk reviewer

Name: ___________________  Date: ___________

| Task | Matches my experience? | Anything missing / wrong? |
|---|---|---|
| Check a member in / attendance (F13, F14) | ☐ yes ☐ no | |
| Member lookup | ☐ yes ☐ no | |
| View / mark bookings | ☐ yes ☐ no | |
| Spot booking / slots (F1/F2) | ☐ yes ☐ no | |
| Sidebar items that dead-end (F1) | ☐ yes ☐ no | |
| Other confusions not listed above: | | |

### Trainer reviewer

Name: ___________________  Date: ___________

| Task | Matches my experience? | Anything missing / wrong? |
|---|---|---|
| Today's sessions (F9) | ☐ yes ☐ no | |
| My members | ☐ yes ☐ no | |
| Build / assign a workout plan (F8) | ☐ yes ☐ no | |
| Exercise library | ☐ yes ☐ no | |
| Live sessions | ☐ yes ☐ no | |
| Two URL namespaces for one job (F10) | ☐ yes ☐ no | |
| Other confusions not listed above: | | |

---

## 6. Capturing the authenticated screenshots (optional follow-up)

The code-only findings above are ready to be turned into live screenshots in one pass once these are available:

1. Backend running: `D:\FITFLIX_BACKEND` (`bun run index.ts`) with a reachable MongoDB and the backend `.env` configured.
2. A seeded login for each of the 7 roles (admin, manager, sales, front desk/staff, trainer, nutritionist, sports scientist). The backend has `create:admin` and `seed:experts` scripts but no single documented credential set.

With those, each per-role task table can have its screenshot filled in under `docs/fx-46-screenshots/<role>/<task-n>.png`.

### Screenshots captured so far
- `docs/fx-46-screenshots/_shared/login.jpg` — the shared login screen (illustrates **F17**: every role signs into a screen titled "admin panel").
