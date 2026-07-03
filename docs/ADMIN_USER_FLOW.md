# Fitflix Front-Desk — Complete Admin User Flow

End-to-end operational flow of the Fitflix front-desk dashboard, compiled from every page in the app. Written for front-desk staff, clinic admins, and super admins.

---

## 1. Who uses this app

| Backend role | Mapped dashboard role | Access |
|---|---|---|
| `admin` | `clinic_admin` | Full dashboard |
| `super_admin` | `super_admin` | Full dashboard |
| `frontdesk`, `trainer`, `nutritionist` | `staff` | Read-heavy access (nutrition: read-only) |
| `doctor` | `clinician` | Read + update on nutrition |
| `user` | `sales` | Restricted |

Role mapping happens at login ([app/login/page.tsx](../app/login/page.tsx)); permissions are enforced in the UI via `lib/rbac.ts`.

---

## 2. Entry: Authentication flow

```
Visit any /admin or /dashboard URL
        │
        ▼
middleware.ts checks the hh_authed cookie
        │
   ┌────┴─────┐
 absent     present
   │            │
   ▼            ▼
Redirect to   Page loads
/login?from=<path>
```

**Login flow (`/login`):**
1. Admin enters **email + password** → `POST /auth/login`.
2. On success: JWT stored in `localStorage.hh_token`, refresh token in `hh_refresh_token`, user object in `hh_user`, and cookie `hh_authed=1` is set for the middleware.
3. Backend role is mapped to a dashboard role (table above).
4. Admin is redirected to the page they originally requested (`?from=`), or `/dashboard` by default.

**Session behavior:**
- Every API call carries `Authorization: Bearer <token>` automatically.
- There is **no token refresh** — when the token expires, API calls fail with 401 toasts and the admin must log in again.
- **Logout** (avatar menu in the sidebar footer): clears localStorage + cookie and hard-navigates to `/login`.

---

## 3. Home base: Dashboard (`/dashboard`)

The landing page after login. An operations overview showing:

- **Stat cards** (each clickable, deep-links to its module): Members, Doctors, Trainers, Bookings, Appointments, Open Slots (sum of remaining capacity).
- **Booking Status Breakdown** — live bar chart of bookings by status (Booked / Confirmed / Cancelled / Attended / Unattended).
- **Recent Bookings** and **Recent Appointments** — 5 most recent, with "View all →" links.
- **Quick Actions** — one-click jumps to: Add Member, New Booking, New Appointment, Create Slot, Add Doctor, Add Trainer.
- **Refresh** button to re-pull users + bookings.

The left sidebar (visible on all pages) is the primary navigation: Dashboard, Users, Doctors, Trainers, Sports Scientist, Nutrition, Workouts, Memberships, Membership Plans, Credits, Services, Bookings, Appointments, Slots, DNA Testing, Reports, Leads, Invoices, Audit Logs, Settings. `/admin` itself redirects to `/admin/users`.

---

## 4. The end-to-end member journey (big picture)

This is the spine of front-desk operations. Each numbered stage is detailed in the sections that follow.

```
(1) LEAD              (2) CONVERT            (3) MEMBER SETUP        (4) ONBOARDING
Walk-in/website  →   Lead → Member      →   Assign membership   →   Track 7-step
enquiry logged        (+ optional            plan → credits          onboarding, book
in Leads CRM          invoice)               granted                 experts via Cal.com
        │                                                                  │
        ▼                                                                  ▼
(7) BILLING & AUDIT   (6) ONGOING CARE                            (5) DAILY OPERATIONS
Invoices tracked, ←   Nutrition plans,   ◄──────────────────────  Book services/therapies
payments recorded,    adherence,                                   against slots, spend
audit trail           workouts                                     credits, mark attendance
```

---

## 5. Stage 1 — Leads (`/admin/leads`)

The sales CRM. Three tabs: **Board**, **Reminders**, **Analytics**, plus an overview strip (Daily Digest, today's signups, stage counts, funnel view).

### Capturing a lead
1. Click **Add Lead**.
2. Fill: name*, email*, phone (duplicate-phone detection warns if the number already exists on another lead), source (Website, etc.), status, notes, interested-in, follow-up date, assigned staff name.
3. Status automatically sets "temperature": `new→cold`, `contacted→warm`, `qualified→hot`, `converted→hot`, `lost→cold`.

### Working the pipeline (Board tab)
- Kanban board with columns for each stage: **new → contacted → qualified → converted / lost**.
- **Drag & drop** a lead card between columns to change its stage.
- Per-lead actions: edit, delete, log an interaction/contact attempt, **Convert**, **Convert & Invoice**.
- Search by name/email/phone; filter by status. "All Leads" table view below the board.

### Follow-up discipline (Reminders tab)
- **Daily Digest** summary.
- **Today's Follow Ups** — leads with a follow-up date of today.
- **Missed Follow-ups** — overdue follow-ups needing immediate attention.
- **Scheduled Calls** — future-dated follow-ups.

### Measuring (Analytics tab)
Pipeline Health Summary, Stage Drop-off, Avg Time Per Stage, Conversion Timeline, Lead Lifecycle Metrics (active, converted, avg contacts, avg lead age), and Lead Sources breakdown.

### Stage 2 — Converting a lead to a member
1. Click **Convert** on a qualified lead → "Convert Lead to Member" dialog.
2. Pre-filled with the lead's details; admin sets username, phone, age, gender, health goals, and a default password (`Lead@12345`).
3. If the phone matches an **existing user**, the dialog flags it to avoid duplicates.
4. Submit → a member account is created and the lead moves to `converted`.
5. Alternatively **Convert & Invoice** opens the Create Invoice sheet so payment is captured in the same motion (see §12).

---

## 6. Stage 3 — Members & staff (`/admin/users`)

Two tabs: **Members** and **Admins**.

### Members tab
- Search, paginated table (12/page). Columns include Joined date, **Onboarding** state (Completed / In Progress / Not Started — derived from the onboarding workflow), and Membership (matched from the memberships list).
- **Add Member**: username, email, phone, password, age, gender, health goals.
- **Edit / Delete** per row.
- Row links open the **member detail page**.

### Admins tab
- Manage staff admin accounts: create (admin name, email, phone, password), edit, delete.

### Member detail page (`/admin/users/[id]`)
The single-member command center:

| Card | Contents |
|---|---|
| **Profile** | Email, phone, gender, age, created/updated + Edit User |
| **Health Goals** | Goals submitted during onboarding |
| **Memberships** | Each plan: price, status, start/expiry, credits remaining/included, features |
| **Bookings** | Upcoming + Past tables (sports scientist, nutritionist, trainer, consultations) |
| **Health Insights** | Auto-calculated from submitted health markers |
| **Onboarding Progress** | See stage 4 below |

### Stage 4 — Onboarding tracking (on the member detail page)
The backend drives a 7-step onboarding workflow; admins **track** it (read-only) and can schedule the expert steps:

```
HEALTH_MARKERS → HEALTH_GOALS → CONSENT → REPORT_UPLOAD
   → SPORTS_SCIENTIST_BOOKING → NUTRITIONIST_BOOKING → COMPLETED
```

- Overall badge (completed / in progress / not started), current step, completed steps (n/7), and a visual step timeline.
- Per-step flags with **View Details** dialogs: Health Markers, Health Goals, Consent, Uploaded Reports.
- **Onboarding Appointments** rows for Sports Scientist and Nutritionist: status badge, date, meeting link.
- If an expert step is still pending, the **Schedule** button opens an embedded **Cal.com booking iframe** (`cal.com/fitflix/sports-scientist` or `/nutritionist`) pre-filled with the member's name/email — the admin books on the member's behalf.

Two roster pages support working these steps in bulk:
- **Sports Scientist** (`/admin/sports-scientist`): members segmented into Pending / Booked / All with counts and search — a worklist of who still needs their sports-scientist session.
- **Nutritionist** rosters live inside the Nutrition module (§11); `/admin/nutritionist` and `/admin/nutritionist-appointments` redirect there.

---

## 7. Stage 3 (continued) — Membership plans, memberships, credits

### 7a. Membership Plans (`/admin/membership-plans`) — the catalog
Reusable plan templates (stored via local Next.js API routes, not the backend):
1. **Create New Plan**: name, duration (1–12 months), total price, currency (INR/USD), status, feature list (add/remove chips), and benefits: **credits**, pause days, trainer sessions, transfer sessions, transfer window days.
2. Live **Plan Card Preview** while editing; view, edit, delete from the Plans List.

### 7b. Memberships (`/admin/memberships`) — assigning plans to members
1. Click **Add Membership** (or arrive via deep link `/admin/memberships?assignUserId=<id>` from other screens — the dialog opens pre-filled, and warns if the member already has a membership).
2. Select member + plan → **end date auto-computes** from the plan's duration; optionally apply a **discount %** (price recalculates live), set status (Active / …), notes.
3. Save. The membership's plan credits become the member's credit bucket.
4. Table view with search, status badges, details dialog (with plan card preview), edit (start date locks once in the past), delete.

### 7c. Credits (`/admin/credits`) — the credit ledger
Credits are the currency for bookings. This page is inspect + top-up:
1. **Target User** — pick a member.
2. **Summary** — total remaining credits.
3. **Membership Credit Buckets** — remaining/included per membership.
4. **Admin Top-Up** — amount, optional target membership bucket (including not-yet-active ones), reason → credits granted immediately.
5. **Credit History** — full transaction ledger, filterable by source, with booking IDs resolved to service names; paginated.

---

## 8. Operational setup — Services, therapies, slots, staff

These are the prerequisites that make booking possible.

### Services / Therapies (`/admin/therapies`)
The bookable catalog. For each therapy/service: name, description, duration, **credit cost**, and **linked slots** (which time windows it can be booked into). Add, edit, publish, delete. "Curate the therapy catalog, tune durations, and keep booking slots synchronized in one place."

### Slots (`/admin/slots`)
Daily recurring time windows:
1. **Create Slot**: start time, end time, capacity (validated: end after start, capacity ≥ 1). Slots are created as **daily recurring**.
2. The All Slots table shows schedule, time range, remaining/total capacity, **which services/therapies are linked** to each slot, and today's active bookings in that slot. Delete available.

### Doctors (`/admin/doctors`) and Trainers (`/admin/trainers`)
Staff registries. Create with name, email, phone, password, description, specialities (comma-separated); edit and delete. Doctors are required for appointments (§10).

---

## 9. Stage 5 — Bookings (`/admin/bookings`)

The heart of the front desk: a **spot-booking desk with credit-aware actions**.

### Creating a booking (date-first flow)
```
1. Date-First Panel     Pick a date on the calendar (defaults to today)
2. Scheduling Board     Pick the member, mode (All / Services / Therapies),
                        then the bookable item
3. Slot selection       Only slots linked to that item AND valid for that date
                        (daily or date-matching) are shown, sorted by start time;
                        full slots hidden by default (toggle "show full slots")
4. Credit Impact Drawer Live check of the member's balance:
                          current credits − item's credit cost = projected balance
```

**Credit gate:** if the member's balance can't cover the item's credit cost, the **Create Booking button is blocked** and the drawer shows the shortfall. The admin has two escape hatches:
- **Top up now** — inline top-up dialog (amount pre-filled with the shortfall, optional membership bucket, reason auto-set to "Spot booking top-up for <item>").
- **Bypass credits** — checkbox to book without deducting credits (e.g., comped session).

Other safeguards: slot-full check at submit time, date validation.

### Managing bookings
- **Today's Upcoming Bookings** — today's Booked/Confirmed bookings sorted by slot start time: the front-desk's live run sheet.
- **All Bookings** — searchable (ID / member / service), paginated table.
- Per booking: **change status** and **delete**.

**Booking status lifecycle:**

```
0 Booked → 1 Confirmed → 3 Attended
                └───────→ 4 Unattended
        └→ 2 Cancelled
```

Front desk marks **Attended/Unattended** after the session — this is the attendance workflow.

---

## 10. Stage 5 (continued) — Doctor appointments (`/admin/appointments`)

Doctor–patient appointments (distinct from service bookings):
1. **New Appointment**: pick date & time (datetime), member, **doctor** (required), optional service/therapy, slot (filtered to that date + item, only slots with remaining capacity), optional **bypass credits**.
2. Search appointments by ID / member / email.
3. Change status (same status set as bookings) or delete.

---

## 11. Stage 6 — Nutrition module (`/admin/nutrition`)

A full nutrition workspace in one tabbed page (old URLs like `/admin/nutritionist`, `/admin/nutrition/foods`, `/admin/nutrition/diet-plans` all redirect here). RBAC-gated: clinic/super admins get full CRUD; clinicians read/update; staff read-only.

| Tab | What the admin/nutritionist does |
|---|---|
| **Overview** | KPIs, today's nutritionist appointments, recent plan-assignment activity (click member → jumps to My Nutrition; click plan → plan detail) |
| **Bookings** | **Nutritionist Onboarding Roster** — every member bucketed Pending / Booked / Completed for the nutritionist onboarding step, with summary counts. **Review** a member (deep-linkable via `?review=<userId>`), then **accept** or **complete** their nutritionist booking, and assign a plan |
| **My Nutrition** | Per-member nutrition dashboard: pick a member and see their assigned plan, meals, adherence, progress |
| **Diet Plans** | List of assigned plans. **New Diet plan** → `/admin/nutrition/diet-plans/new?userId=<id>`: a clinical template builder that shows the member's clinical summary and **auto-computes nutrition targets** (calories, protein, carbs, fat, water) from their assessment — the nutritionist can override manually. Edit at `/admin/nutrition/diet-plans/[id]/edit`; delete gated by role |
| **Food Catalog** | Ingredient + recipe database used to compose plans: **Add Food** (macros per serving), recipe details dialog, edit/delete |
| **Nutritionist Appointments** | Appointment list for the nutritionist |
| **Active Users** | Members actively following plans |

Plan detail (`/admin/nutrition/plans/[id]`): today's meals, progress, macro summary, adherence; **Export PDF** button is present but disabled (coming soon).

---

## 12. Stage 7 — Invoices (`/admin/invoices`)

Payment tracking, tightly coupled to lead conversion:
- **Metric cards**: Total Invoices, Paid, Pending/Draft, Revenue Collected (₹, paid only).
- Searchable table (invoice number / member name / email). Statuses: DRAFT, PENDING, PAID.
- Click a row → **Invoice Detail Drawer**: line items, totals, **Record Payment** (mark-paid dialog), and **Download PDF**.
- Invoices are created from the **Leads** page via "Convert & Invoice" (Create Invoice sheet), linking the invoice to the lead/member and their membership activation.

---

## 13. Supporting modules

### Workouts (`/dashboard/workouts`) — prototype, local-only
Workout plan builder: Exercise Library, Templates, Plans (create at `/dashboard/workouts/create`), Assigned Members, Sessions and per-session pages. **Entirely client-side** — data persists in browser `localStorage` (Zustand store); nothing syncs to the backend yet. Treat as a preview feature.

### DNA Testing (`/admin/dna`) — local-only mock
Log DNA test requests per member (member ID, test date, notes) and advance status `not-started → in-progress → completed` with a one-click action; edit/delete. **State is in-memory only** — it resets on page reload (no backend).

### Reports (`/admin/reports`) — local-only mock
"Generate New Report" dialog (type: Membership / Therapy Progress / DNA Analysis / Financial; member; date range; format) produces an entry in the reports table with a download link. **Also in-memory only** — placeholder feature.

### Audit Logs (`/admin/audit-logs`) — read-only
A derived activity feed, **not a true backend audit trail**: it synthesizes "created/updated" entries from the current users, bookings, and appointments data. Filter by action/entity, search, click a row for a before/after change diff.

### Settings (`/admin/settings`)
Clinic Information, Notifications, Preferences, Account Security (Change Password, Sign Out of All Devices). Saves are local/toast-only in the current build.

### My Nutrition (member view, `/dashboard/nutrition`)
The member-facing mirror of the nutrition module: assigned plan, tap-to-complete meals (optimistic), hydration logging, progress, adherence.

---

## 14. A typical front-desk day (putting it together)

1. **Log in** → Dashboard: scan today's stats, recent bookings/appointments.
2. **Leads / Reminders tab**: work Missed and Today's follow-ups; log contact attempts; drag leads forward on the board.
3. Walk-in signs up → **Convert Lead to Member** (or Convert & Invoice to take payment immediately).
4. **Memberships**: assign a plan (auto end date, optional discount) → member receives plan credits.
5. **Bookings**: run the date-first flow for anyone booking sessions; resolve credit shortfalls via **Top up now** or bypass; keep an eye on **Today's Upcoming Bookings** and mark **Attended/Unattended** as members come and go.
6. **Appointments**: schedule doctor consultations against open slots.
7. **Member detail page**: check onboarding progress for new members; **Schedule** their Sports Scientist / Nutritionist sessions via the embedded Cal.com booker; the Sports Scientist and Nutrition→Bookings rosters show who's still pending.
8. Nutritionist works the **Nutrition** workspace: review booked members, complete their step, build/assign diet plans, maintain the food catalog.
9. **Invoices**: record payments, download PDFs; **Credits**: audit ledgers and perform corrective top-ups.
10. **Audit Logs** for a quick "what happened today" review; **log out**.

---

## 15. Reference — status vocabularies

| Domain | Statuses |
|---|---|
| Bookings / Appointments | `0 Booked · 1 Confirmed · 2 Cancelled · 3 Attended · 4 Unattended` |
| Leads | `new → contacted → qualified → converted / lost` (+ temperature: cold/warm/hot) |
| Memberships | `Active / Inactive / Pending / Expired / Paused` |
| Onboarding | `not_started / in_progress / completed` (7 backend steps) |
| Invoices | `DRAFT / PENDING / PAID` |
| Nutrition plans | `assigned / on_track / behind / off_track / Active …` |
| DNA tests | `not-started → in-progress → completed` |
