# Fitflix Front Desk and Shared Onboarding Audit

**Author:** Manus AI  
**Audit date:** 25 August 2026  
**Repositories reviewed:** Frontdesk web, member mobile app, and backend API  
**Live environment reviewed:** `https://api.fitflix.in`

## Executive summary

Fitflix already has a functional front-desk dashboard, member directory, membership assignment flow, attendance check-in, nutritionist operations, and a member-app onboarding wizard. The principal product issue is not a lack of screens; it is a lack of one shared onboarding state model. The mobile app currently interprets onboarding as a strict five-page sequence, while the front desk sees a reduced legacy status and separate trainer/membership actions. This makes it difficult for staff to know, at the moment of arrival, whether a member has completed the required physical onboarding actions.

The recommended and implemented direction is a **single member-level onboarding record** with six independent membership steps. The app owns personal information and nutrition booking. The centre owns Active X, DNA sample, and VALD completion, while the existing trainer assignment action represents the plan/PT step. Sport scientist booking is supported as a member-app appointment record and returned to the web profile. The check-in flow now displays an onboarding count and an outstanding-step warning without blocking attendance.

> The six-step checklist is intentionally non-sequential. A member may complete the steps in any order, and an incomplete step is an operational flag rather than a reason to deny check-in.

## Current product and UI audit

### Login and application shell

The live login screen is visually clean and focused. It uses a dark navy background, centred Fitflix branding, a compact sign-in card, clear staff-only copy, and a full-width teal gradient action. The main weaknesses are operational rather than visual: there is no password visibility toggle, no password recovery path, no API/environment health cue, and no persistent inline error/loading region. The live browser console also reported an image aspect-ratio warning for the logo, which should be resolved to prevent layout drift.

The authenticated shell is capable but dense. Navigation is grouped across People, Programs, Scheduling, Commerce, Insights, Community, and Admin. This breadth reflects a mature operations product, but the density increases cognitive load for a front-desk operator who primarily needs member search, check-in, membership state, and onboarding readiness. A role-specific “Front Desk” navigation preset would improve task focus without removing access to the broader modules.

### Dashboard

The dashboard presents useful operational KPIs: members, trainers, bookings, open slots, and slot windows. It also includes booking breakdown, recent bookings, and quick actions for adding members, creating bookings and slots, and adding trainers. The hierarchy is credible for an admin dashboard, but the dashboard does not currently surface onboarding risk. There is no “members needing physical onboarding,” “today’s incomplete check-ins,” or “new membership → continue onboarding” action. This is the largest information-architecture gap for the requested use case.

### Members and member profile

The Members screen exposes the right high-level concepts—search, member/staff tabs, refresh, membership, onboarding, plans, dates, and actions—but the table is horizontally dense. A front-desk user must scan many columns to find the member’s operational status. A compact readiness column showing `X/6`, with amber/red treatment for outstanding steps, would be more useful than exposing every field at the same visual weight.

The member detail modal and profile provide identity, contact, health, membership, reports, appointments, and trainer context. However, the previous implementation separated these actions: membership assignment lived in one flow, trainer assignment lived elsewhere, and the legacy onboarding card displayed app-era fields. The previous card also showed an inconsistent count (`completedSteps.length / 7`) despite a six-entry visual timeline. The new card replaces that legacy presentation with a shared six-step status model and ownership language.

### Membership creation

Membership creation is clear and appropriately transactional: the selected member is identified, the plan and dates are editable, and status/discount/notes are available. The prior experience ended after the membership save and did not provide an operational next step. The updated flow redirects staff from successful membership creation to the member profile so the shared onboarding record is immediately available.

### Attendance and check-in

Attendance is the correct operational surface for the requested feature because it is where staff establish whether a member has arrived. The updated selection state shows `Onboarding X/6` beside membership and already-checked-in badges. If the member has an active membership and outstanding items, the screen displays an amber warning listing the missing steps and links to the member checklist. If all six are complete, it displays a green confirmation. The warning is deliberately non-blocking: staff can still check the member in.

### Nutrition operations

The Nutrition workspace already demonstrates a strong appointment-operations pattern with pending, accepted, rejected, and all views, search, capacity summary, refresh, and slot management. The live audit found zero configured nutritionist slots and zero current bookings. This is an operational data/configuration issue rather than a visual defect. The same pattern can later be applied to sport scientist operations if a centre-side queue is required.

## Cross-product journey audit

| Journey stage | Current state | Risk | Target state |
|---|---|---|---|
| Member account/profile setup | Mobile app opens a one-shot profile sheet for missing name, age, sex, and phone. | Profile setup is not visibly connected to centre readiness. | App-owned profile completion is reflected in the shared member record. |
| App onboarding | Mobile app uses a strict five-page sequence: health markers, health goals, consent, reports, nutrition booking. | The backend’s `currentStep` is treated as the only source of progress, even though the requested centre work is unordered. | Preserve the app’s owned flow while exposing app setup completion separately from full centre onboarding. |
| Nutrition booking | Existing member-app nutrition booking posts to the nutritionist booking API and updates onboarding state. | Web and app status can drift because profile payloads previously reduced appointment/onboarding data. | App remains the booking owner; web reads the returned booking status. |
| Sport scientist appointment | Mobile repository already contained a latent method and endpoint constant, but the backend route was not mounted and the main model/UI lacked the state. | A member could not reliably create a shared record. | Backend now persists a sport scientist appointment and returns it through status/profile payloads. |
| Membership creation | Membership was a separate transaction with no continuation into onboarding. | Staff may not know what to do next. | Successful creation routes staff to the member’s shared onboarding profile. |
| Physical tests | No shared backend flags for Active X, DNA, or VALD. | Check-in cannot reveal what was missed. | Centre staff can independently mark Active X, DNA, or VALD complete through authenticated backend mutations. |
| Plan/PT assignment | Trainer assignment existed independently of onboarding. | The final onboarding condition was not expressed as shared state. | Trainer assignment marks the plan/PT shared step. |
| Check-in | Attendance does not previously show onboarding readiness. | Member may arrive with incomplete physical onboarding and staff discover it too late. | Attendance displays outstanding items and links to the checklist without blocking the visit. |
| Full completion | Existing completion was tied to the old app sequence. | A legacy client could finalize before physical actions were done. | Backend finalization requires all six shared steps. |

## Shared six-step onboarding contract

| Step | Backend key | Owner | Completion evidence | Front-desk behavior |
|---|---|---|---|---|
| Active X test | `ACTIVE_X_TEST` | Centre | Staff marks the physical test complete. | Button is available in the member checklist; status appears during check-in. |
| DNA sample | `DNA_SAMPLE` | Centre | Staff marks sample collection/registration complete. | Button is available in the member checklist; status appears during check-in. |
| VALD test | `VALD_TEST` | Centre | Staff marks the VALD assessment complete. | Button is available in the member checklist; status appears during check-in. |
| Nutrition appointment | `NUTRITION_APPOINTMENT` | Member app | Existing nutritionist booking exists and is not rejected. | Web displays appointment status/date and tells staff the member books in-app. |
| Sport scientist appointment | `SPORT_SCIENTIST_APPOINTMENT` | Member app/shared record | Member app creates the persisted appointment. | Web displays booking status/date; centre can see the requirement at check-in. |
| Plan and PT trainer assignment | `PLAN_TRAINER_ASSIGNMENT` | Centre | Active membership plus assigned trainer; backend flag is also set by trainer assignment. | Checklist links to the existing assignment flow. |

The backend keeps the legacy app wizard fields for compatibility. It additionally exposes `appOnboardingCompleted`, independent shared flags, `sharedCompletedSteps`, and an overall `onboardingCompleted` that requires the six shared steps. The mobile app can therefore finish its owned setup and enter the app while physical centre work remains outstanding.

## Implemented changes

### Front-desk web

The front desk now has a reusable member onboarding card that renders the six shared steps, separates app-owned appointment states from centre-owned physical actions, displays appointment details when available, and connects membership creation to the member profile. Attendance search results calculate the same readiness state and show an `Onboarding X/6` badge plus an amber outstanding-step warning or green completion confirmation.

The front-desk API client now calls `PATCH /onboarding/steps/:userId/:step` for centre-owned Active X, DNA, and VALD updates. React Query invalidates onboarding and member caches after a successful update so the profile and attendance surfaces converge on server state rather than browser-local state.

### Backend API

The user schema now stores independent shared flags for Active X, DNA, VALD, sport scientist booking, plan/PT assignment, nutrition booking, app completion, and overall completion. New members receive these fields in their initialized onboarding subdocument.

The onboarding status service now returns both app-owned and shared completion information and no longer relies on the legacy sequential pointer to determine overall membership onboarding completion. A front-desk mutation endpoint updates only centre-owned physical steps. A member-only `POST /onboarding/sports-scientist` endpoint persists the latent mobile booking action in a dedicated appointment model. The onboarding profile and user-list responses now expose the expanded status and appointment data.

The existing trainer assignment endpoint marks the plan/PT shared step. The full completion endpoint has been hardened so it cannot mark a member fully onboarded until all six shared steps are present.

### Member mobile app

The mobile status model now parses the shared flags and distinguishes `appOnboardingCompleted` from full `onboardingCompleted`. The existing app-owned flow remains in place for profile setup, health information, consent, reports, and nutrition booking. After app-owned setup is complete, the router allows the member into the app even when centre-owned physical steps remain outstanding. This prevents the app from incorrectly forcing a member through physical centre steps or calling full completion too early.

The existing repository method for sport scientist booking now has a mounted backend target and writes to the shared appointment record.

## Design recommendations beyond this implementation

The next UX improvement should be a dedicated “Front Desk Today” view with members arriving today, active membership status, onboarding count, and the top outstanding action. This would eliminate repeated navigation through the full admin IA. The check-in warning should eventually support a one-tap “Start/record step” affordance for each physical test, but the current linked checklist is safer until test-specific capture fields are defined.

The physical-test steps also need domain-specific evidence fields before production rollout. For example, Active X and VALD may require test date, protocol, result summary, staff member, and optional attachment; DNA may require sample ID, collection date, and chain-of-custody status. The current implementation intentionally records completion only because the requested requirements did not define those payloads.

The sport scientist booking should receive the same availability, confirmation, reschedule, cancellation, and staff queue treatment already present for nutritionist bookings. The current shared appointment record establishes the state contract but does not yet implement a full sport scientist slot-capacity subsystem.

## Verification

The front-desk production build reached the Next.js compilation stage successfully. The subsequent type-validation stage was terminated by the sandbox’s memory limit, so a clean full-project typecheck could not be completed in this environment. Lightweight formatting/parse checks passed for the newly created backend model and the changed-file whitespace checks were clean. The mobile repository could not be run through Dart analysis because the sandbox does not have the Dart or Flutter SDK installed.

The live browser audit authenticated successfully against the configured Fitflix backend and reviewed the login, dashboard, users, member profile, membership assignment, nutrition appointments, and attendance surfaces. The password supplied for the audit was not stored in the repository, report, or work log.

## References

[1]: https://github.com/Emporio-Labs/frontdesk-fitflix "Emporio-Labs/frontdesk-fitflix — Front Desk Web"

[2]: https://github.com/Emporio-Labs/USER-APP-FITFLIX "Emporio-Labs/USER-APP-FITFLIX — Member Mobile App"

[3]: https://github.com/Emporio-Labs/FITFLIX_BACKEND "Emporio-Labs/FITFLIX_BACKEND — Backend API"

[4]: https://api.fitflix.in "Fitflix live API"
