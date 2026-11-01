# Deep Technical Research: Remaining Admin Modules & Trainer Dashboard Workflows

> **Audit Scope:**  
> 1. Remaining Admin Modules: Services & Therapies Catalog, Dashboard Overview/KPIs, Settings & Locations.  
> 2. Trainer Dashboard: Member Roster, PT Session & Set Logging, Plan Assignment & Scheduling.  
> **Environment:** Next.js 15 (`frontdesk-fitflix`) against Express 5 / Mongoose 9 (`FITFLIX_BACKEND`).  
> **Testing Strategy:** Vitest unit test runner with mocked API contracts executing in milliseconds.

---

## Part 1: Deep Contract Audits & Discovered Failure Points

### 1. Services & Therapies Catalog Management
* **Frontend Files:** `lib/services/service.service.ts`, `lib/services/therapy.service.ts`, `app/admin/services/page.tsx`, `app/admin/therapies/page.tsx`
* **Backend Files:** `src/controllers/service.controller.ts`, `src/routes/service.routes.ts`, `src/routes/therapy.routes.ts`, `src/models/Service.ts`
* **Identified Vulnerabilities:**
  1. **System-wide 403 Forbidden for Frontdesk Staff:**
     - In `service.routes.ts` line 17: `serviceRouter.get("/", authorize(["admin", "trainer", "user"]), getAllServices)`.
     - In `therapy.routes.ts` line 23: `therapyRouter.get("/", authorize(["admin", "trainer", "user"]), getAllTherapies)`.
     - `frontdesk` (or `staff`) is **completely missing** from the allowed roles.
     - Because Frontdesk pages (`/admin/bookings`, `/admin/slots`, `/admin/spot-booking`, `/admin/credits`) call `useServices()` and `useTherapies()`, receptionists encounter HTTP 403 Forbidden errors when loading service dropdowns.
  2. **Orphaned Bookings on Service Deletion:**
     - In `deleteServiceById` (`service.controller.ts`), `Service.findOneAndDelete` deletes the service immediately without checking the `Booking` collection.
     - Any active upcoming bookings retain a dangling ObjectId pointing to a non-existent document, causing `booking.service` to populate as `null` and breaking the member schedule view.

---

### 2. Dashboard Overview & Operational KPIs
* **Frontend Files:** `lib/services/dashboard.service.ts`, `app/admin/overview/page.tsx`, `components/operational-alerts-dialog.tsx`
* **Backend Files:** `src/controllers/dashboard.controller.ts`, `src/routes/dashboard.routes.ts`
* **Identified Vulnerabilities:**
  1. **Total Contract Shape Mismatch (Zero-Metric Anomaly):**
     - In `lib/services/dashboard.service.ts`, the frontend parser expects:
       `raw.paid`, `raw.revenue`, `raw.active`, `raw.recentInvoices`, `raw.recentLeads`.
     - But `FITFLIX_BACKEND/src/controllers/dashboard.controller.ts` returns:
       ```json
       {
         "leads": { "byStatus": { "New": 5, "Contacted": 2 }, "recentCount": 10 },
         "invoices": { "byStatus": { "PAID": 10 }, "totalsByStatus": { "PAID": 50000 } },
         "memberships": { "activeCount": 25 },
         "users": { "totalCount": 100 }
       }
       ```
     - The backend **never** returns `paid`, `revenue`, `recentInvoices`, or `recentLeads`.
     - Because the fields don't match, `normalizeInvoiceMetrics` defaults every single value to `0` and empty arrays. The Frontdesk Overview screen renders zero revenue and empty lists even with active club business.

---

### 3. Administrative Settings, Locations & Notifications
* **Frontend Files:** `lib/services/settings.service.ts`, `lib/services/location.service.ts`, `app/admin/settings/page.tsx`
* **Backend Files:** `src/controllers/settings.controller.ts`, `src/routes/settings.routes.ts`, `src/models/ConferenceSettings.ts`
* **Identified Vulnerabilities:**
  1. **Missing Role Authorization Guard on Global Settings:**
     - In `src/routes/settings.routes.ts` line 19–20:
       ```ts
       settingsRouter.get("/rooms", getConferenceSettings);
       settingsRouter.put("/rooms", updateConferenceSettings);
       ```
     - There is **no `authorize(...)` guard**. Any authenticated user (including regular gym members with role `"user"`) can send a `PUT` request to alter global video streaming resolutions, participant capacities, and room presets.
  2. **Alert Rules Modification Excludes Frontdesk Managers:**
     - While `GET /alert-rules` authorizes `["admin", "frontdesk"]`, `PUT /alert-rules/:alertType` only permits `["admin"]`. Frontdesk branch managers cannot adjust threshold warnings for their own club.

---

### 4. Trainer Member Roster & Client Tracking
* **Frontend Files:** `lib/services/trainer-workout.service.ts`, `app/dashboard/workouts/members/page.tsx`, `hooks/use-member-workout.ts`
* **Backend Files:** `src/controllers/trainer.controller.ts`, `src/services/trainerRoster.service.ts`, `src/models/User.ts`
* **Identified Vulnerabilities:**
  1. **Lapsed Client Ghosting on Trainer Roster:**
     - In `trainerRoster.service.ts`:
       `Membership.distinct("userId", { assignedTrainer: trainerObjId })`
     - It does **not** check `status: MembershipStatus.Active` or expiry dates.
     - Members whose PT packages expired months or years ago remain on the trainer's active member list indefinitely.
  2. **Strict Roster Isolation Blocks Relief/Coverage Trainers:**
     - `assertTrainerOwnsMember` throws `NOT_YOUR_MEMBER` (403) whenever a trainer attempts to oversee or log a session for a colleague's client without an explicit admin reassignment.

---

### 5. Personal Training (PT) Session & Set Logging
* **Frontend Files:** `components/personal-training/log-workout-dialog.tsx`, `lib/services/trainer-workout.service.ts`, `hooks/use-member-workout.ts`
* **Backend Files:** `src/controllers/workout.controller.ts`, `src/routes/workout.routes.ts`, `src/models/SetLog.ts`
* **Identified Vulnerabilities:**
  1. **Rigid 409 Conflict Lockout on Completed Sessions:**
     - In `logSet` (`workout.controller.ts` line 874):
       `if (session.status !== WorkoutSessionStatus.Active) return res.status(409).json({ message: "Session is not active" });`
     - If a trainer accidentally taps "Complete Workout", they are permanently locked out from adding a missed set or correcting weight/reps.
  2. **Staff Actor Model Misattribution:**
     - In `actorModelForRole` (`src/utils/actor-model.ts`), if a frontdesk staff member assists in logging or updating a workout session, their role defaults to `"User"`. `SetLog.loggedByModel` records `"User"` instead of `"Admin"` or staff.

---

### 6. Workout Plan Assignment & Calendar Scheduling
* **Frontend Files:** `components/workouts/assign-plan-sheet.tsx`, `components/workouts/assignment-calendar.tsx`, `lib/services/workout-plan.service.ts`
* **Backend Files:** `src/controllers/workout-plan.controller.ts`, `src/routes/workout-plan.routes.ts`, `src/validators/workout-plan.validator.ts`
* **Identified Vulnerabilities:**
  1. **Frontdesk Staff Blocked on Plan Assignment:**
     - `workoutPlanRouter.post("/:id/assign", authorize(["admin", "trainer"]), assignUsers)`.
     - Frontdesk receptionists assisting a member at the front desk get HTTP 403 Forbidden when attempting to attach a workout template.
  2. **Multi-User Partial Failure Reporting:**
     - `assignUsers` uses `Promise.allSettled`. If assigning to 5 members where 1 has a clashing start date, the endpoint returns HTTP 200 with `{ created: [...], failed: [...] }`.
     - If the frontend toast only checks `onSuccess`, staff assumes all members were assigned, missing silent failures in the `failed` array.

---

## Part 2: Feature-by-Feature Execution & Planning Strategy

To test and verify each finding systematically without regressions:

| Sequence | Focus Area | Target Test File | Expected Edge Cases |
|---|---|---|:---:|
| **Step 10** | **Services & Therapies Catalog** | `__tests__/services-therapies.test.ts` | **EC-033 – EC-035** |
| **Step 11** | **Dashboard Overview & Alerts** | `__tests__/dashboard-overview.test.ts` | **EC-036 – EC-038** |
| **Step 12** | **Admin Settings & Permissions** | `__tests__/settings-permissions.test.ts` | **EC-039 – EC-041** |
| **Step 13** | **Trainer Roster & Membership Status** | `__tests__/trainer-roster.test.ts` | **EC-042 – EC-044** |
| **Step 14** | **PT Session & Set Logging** | `__tests__/pt-session-logging.test.ts` | **EC-045 – EC-047** |
| **Step 15** | **Workout Plan Assignment & Calendar** | `__tests__/plan-assignment.test.ts` | **EC-048 – EC-050** |
