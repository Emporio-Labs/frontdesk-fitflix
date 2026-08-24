# Fitflix — Work Log

Full, file-by-file record of what changed in each of the three repos, **Aug 16 – Aug 24, 2026**.
This covers every non-merge commit in the window, plus everything currently sitting uncommitted.
Every line below comes straight from `git log --name-status` / `git diff` — nothing summarized away.

The three repos:
- **`frontdesk-fitflix`** — this repo, the front-desk/admin dashboard (Next.js).
- **`FITFLIX_BACKEND`** — the API server (Node/TypeScript).
- **`USER-APP-FITFLIX`** — the member-facing mobile app (Flutter).

## Snapshot

| Repo | Branch | Last commit | Date | Push state | Working tree |
|---|---|---|---|---|---|
| frontdesk-fitflix | development | `1e4b575` | 2026-08-19 | in sync with origin | 58 modified + 6 new, uncommitted |
| FITFLIX_BACKEND | development | `faef41d` | 2026-08-24 | **ahead 1 — not pushed** | clean |
| USER-APP-FITFLIX | development | `29e1e35` | 2026-08-17 | **behind 1 — needs `git pull`** | 5 modified + 2 new, uncommitted |

---

## 1. frontdesk-fitflix (admin dashboard)

### Uncommitted right now — every file

**PWA installability** (new files, Aug 19):

| File | What it does |
|---|---|
| [app/manifest.ts](app/manifest.ts) | New Next.js manifest route — app name, icons, `standalone` display, `#0f172a` theme colour |
| [public/sw.js](public/sw.js) | New service worker. Caches only `/_next/static/*` and `/icons/*` — **never** HTML or `/api`, since these are shared front-desk tablets and caching a page could leak one staff member's data to the next |
| [components/pwa-register.tsx](components/pwa-register.tsx) | New — registers the service worker on `window.load`, mounted once in the root layout |
| `public/icons/apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `maskable-192.png`, `maskable-512.png` | New — full icon set for "Add to Home Screen" |
| [app/layout.tsx](app/layout.tsx) | Added `viewport` export (`viewportFit: 'cover'`, no forced max-zoom), `appleWebApp` + legacy `apple-mobile-web-app-capable` metadata, mounted `<PWARegister />`, icons point at the new `/icons/*` set instead of `fitflix_logo.png` |
| public/apple-icon.png, icon-dark-32x32.png, icon-light-32x32.png | Regenerated (binary) to match the new icon set |
| [public/icon.svg](public/icon.svg) | Replaced an opaque base64-encoded blob with the literal, readable SVG markup — same image, now diffable |

**Mobile/responsive pass** — same fix applied file by file: page padding shrinks below `lg` (`p-8 pt-6` → `p-4 pt-4 sm:p-6 lg:p-8`), header rows stack vertically instead of overflowing (`flex-col … sm:flex-row`), low-priority table columns hide below a breakpoint (`hidden md:table-cell` / `hidden lg:table-cell`) instead of squeezing the table:

`app/admin/attendance/page.tsx`, `app/admin/audit-logs/page.tsx`, `app/admin/bookings/page.tsx` (+ column hiding on the bookings table), `app/admin/community/page.tsx`, `app/admin/community/posts/[id]/page.tsx`, `app/admin/credits/page.tsx`, `app/admin/dna/page.tsx`, `app/admin/invoices/page.tsx`, `app/admin/leads/page.tsx`, `app/admin/locations/page.tsx`, `app/admin/membership-plans/page.tsx`, `app/admin/memberships/page.tsx`, `app/admin/nutrition/diet-plans/[id]/edit/page.tsx`, `app/admin/nutrition/diet-plans/new/page.tsx`, `app/admin/nutrition/page.tsx`, `app/admin/nutrition/plans/[id]/page.tsx`, `app/admin/personal-training/page.tsx`, `app/admin/reports/page.tsx`, `app/admin/settings/page.tsx`, `app/admin/slots/page.tsx`, `app/admin/therapies/group-class-bookings-panel.tsx`, `app/admin/therapies/page.tsx`, `app/admin/trainers/page.tsx`, `app/admin/users/[id]/page.tsx`, `app/admin/users/page.tsx` (+ column hiding: Age/Gender/Health Goals/Plan Start/Plan Expiry hidden below `lg`, Joined/Onboarding below `md`), `app/dashboard/activity/page.tsx`, `app/dashboard/page.tsx`, `app/dashboard/workouts/members/[userId]/live/page.tsx`, `app/dashboard/workouts/members/[userId]/page.tsx`, `app/dashboard/workouts/members/page.tsx`, `app/dashboard/workouts/page.tsx`, `app/dashboard/workouts/plans/page.tsx`, `app/dashboard/workouts/session/[id]/page.tsx`, `app/dashboard/workouts/sessions/page.tsx`, `app/dashboard/workouts/templates/page.tsx`.

Component-level pieces of the same pass: `components/nutrition/assessment-form.tsx`, `components/nutrition/food-form.tsx`, `components/nutrition/macro-summary.tsx` (3-column macro grids → `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`); `components/live-sessions/live-sessions-panel.tsx` (stat grid and tab list collapse on small screens); `components/workouts/assignment-calendar.tsx` (tighter gap between calendar cells on mobile).

Shell fixes that made the pass possible:

| File | Fix |
|---|---|
| [app/admin/layout.tsx](app/admin/layout.tsx) | Removed the inline `--sidebar-width`/`--header-height` CSS var override; wrapped children in `min-w-0 … overflow-x-hidden` so wide tables scroll inside their own container instead of clipping |
| [app/dashboard/layout.tsx](app/dashboard/layout.tsx) | Same fix, mirrored |
| [components/ui/sidebar.tsx](components/ui/sidebar.tsx) | Added `min-w-0` to `SidebarInset` — without it the flex child refused to shrink and wide tables pushed the whole page sideways |
| [components/app-sidebar.tsx](components/app-sidebar.tsx) | `collapsible="none"` → `"icon"` — `"none"` takes an early-return branch that skips the mobile Sheet entirely, so there was no way to open the sidebar on a phone |
| [components/site-header.tsx](components/site-header.tsx) | Added a `<SidebarTrigger>` button, `md:hidden` — the only way to open the sidebar below `md` |
| [components/ui/dialog.tsx](components/ui/dialog.tsx) | `w-full` → `w-[calc(100%-2rem)]` so dialogs keep a 1rem gutter on phones instead of running edge-to-edge; padding `p-6` → `p-4 sm:p-6` |
| [components/location-switcher.tsx](components/location-switcher.tsx) | Single-location branch name now stays visible (truncated, `max-w-[40vw]`) on mobile instead of being hidden outright; branch-select trigger narrows to `w-[132px]` below `sm` |

**Exercise demo images** (Aug 21 — frontend half of backend's `56a831a`):

| File | What changed |
|---|---|
| [components/workouts/exercise-animation.tsx](components/workouts/exercise-animation.tsx) | New — cycles through an exercise's frame URLs every 600ms, falls back to nothing on image load error |
| [components/workouts/exercise-details-dialog.tsx](components/workouts/exercise-details-dialog.tsx) | Embeds `<ExerciseAnimation>` at the top of the dialog when `imageUrls`/`imageUrl` is present |
| [components/workouts/exercise-library-sidebar.tsx](components/workouts/exercise-library-sidebar.tsx) | Small `imageUrl` thumbnail overlaid on each exercise row's icon |
| [app/dashboard/workouts/exercises/page.tsx](app/dashboard/workouts/exercises/page.tsx) | Added an `imageUrl` field (with live preview) to the exercise create/edit form; grid cards now show `<ExerciseAnimation>` |
| [types/workout.ts](types/workout.ts) | Added `imageUrls?: string[]` to the `Exercise` type |

**Other:**

| File | What changed |
|---|---|
| [app/page.tsx](app/page.tsx) | Login redirect is now role-aware — trainers land straight on `/dashboard/workouts/members` instead of `/dashboard` then getting bounced by middleware (a visible double-redirect on PWA cold start) |
| `.claude/settings.local.json` | Added `vercel --version` to the allowed Bash-command list (local tooling permission only) |

### Commits this sprint (17, Aug 16–19)

- **2026-08-19** `1e4b575` — fix(workouts): surface validation field names and drop legacy Published status
  - modified `components/workouts/plan-builder-layout.tsx`
  - modified `hooks/use-workout-plans.ts`
- **2026-08-19** `8ba2cfe` — fix(memberships): allow assigning a membership to a member with no email
  - modified `app/admin/memberships/page.tsx`
  - modified `app/admin/users/page.tsx`
- **2026-08-17** `25ffe74` — add the end session button at beside the host session button
  - modified `app/admin/therapies/page.tsx`
  - modified `components/live-sessions/live-sessions-panel.tsx`
  - modified `components/video-conference/video-conference-modal.tsx`
  - modified `components/video-conference/video-conference-provider.tsx`
- **2026-08-17** `ba2659f` — feat(video-conference): enhance session management with leave and end session functionality
  - modified `app/admin/therapies/page.tsx`
  - modified `components/video-conference/video-conference-modal.tsx`
- **2026-08-17** `0542338` — feat: add Concierge Alert Bell for high-ticket callbacks with 15-minute SLA
  - added `app/admin/alerts/page.tsx`
  - modified `app/admin/leads/page.tsx`
  - modified `components/app-sidebar.tsx`
  - added `components/concierge-alert-bell.tsx`
  - modified `components/site-header.tsx`
- **2026-08-17** `d407489` — feat(content): add visual component studio, component picker dropdown, and live mobile preview
  - modified `app/admin/content/page.tsx`
  - added `components/content/component-cards-view.tsx`
  - added `components/content/content-component-picker.tsx`
  - added `components/content/edit-override-dialog.tsx`
  - added `components/content/mobile-copy-preview.tsx`
  - added `lib/content-registry.ts`
- **2026-08-17** `c6f9bc8` — fix: standardize on pnpm to unblock Vercel deploys
  - modified `.gitignore`
  - deleted `package-lock.json`
  - modified `package.json`
  - modified `pnpm-lock.yaml`
  - modified `pnpm-workspace.yaml`
- **2026-08-17** `07f90f9` — feat(video-conference): add ZIM plugin support for live streaming and update dependencies
  - modified `components/video-conference/video-conference-modal.tsx`
  - modified `lib/services/live-session.service.ts`
  - modified `package-lock.json`
  - modified `package.json`
- **2026-08-17** `efe3ace` — feat: integrate video conferencing functionality across admin and nutritionist components
  - deleted `app/admin/live-session/[id]/page.tsx`
  - modified `app/admin/nutrition/page.tsx`
  - modified `app/admin/personal-training/page.tsx`
  - modified `components/live-sessions/live-sessions-panel.tsx`
  - modified `components/nutrition/nutritionist-appointments-tab.tsx`
  - deleted `components/nutrition/nutritionist-call-modal.tsx`
  - modified `components/video-conference/video-conference-modal.tsx`
  - modified `components/video-conference/video-conference-provider.tsx`
- **2026-08-17** `32e0ec9` — feat(video-conference): refactor video conference handling with provider and modal integration
  - modified `app/admin/therapies/group-class-bookings-panel.tsx`
  - modified `app/admin/therapies/page.tsx`
  - modified `app/layout.tsx`
  - modified `components/video-conference/video-conference-modal.tsx`
  - added `components/video-conference/video-conference-provider.tsx`
- **2026-08-16** `7ade513` — feat(admin): audience targeting, lead intelligence and editable app copy
  - added `app/admin/content/page.tsx`
  - modified `app/admin/leads/page.tsx`
  - modified `app/admin/promotions/page.tsx`
  - modified `app/admin/users/[id]/page.tsx`
  - modified `components/app-sidebar.tsx`
  - added `components/crm/interest-summary.tsx`
  - added `hooks/use-activity.ts`
  - added `hooks/use-content.ts`
  - modified `lib/query-keys.ts`
  - added `lib/services/activity.service.ts`
  - added `lib/services/content.service.ts`
  - modified `lib/services/lead.service.ts`
  - modified `lib/services/promotion.service.ts`
- **2026-08-16** `840867a` — feat(video-conference): implement portrait tile support for phone participants
  - modified `app/admin/live-session/[id]/page.tsx`
  - modified `app/globals.css`
  - added `components/video-conference/use-portrait-tiles.ts`
  - modified `components/video-conference/video-conference-modal.tsx`
  - modified `package.json`
- **2026-08-16** `88c5c9e` — fix: enhance MealSlotCard to update label and resolve recipe names correctly
  - modified `components/nutrition/clinical-template-form.tsx`
- **2026-08-16** `ab375e0` — fix(admin): pick a promotion target from the catalog, not a pasted id
  - modified `app/admin/promotions/page.tsx`
- **2026-08-16** `3b909f9` — feat(admin): promotions console and class event fields
  - added `app/admin/promotions/page.tsx`
  - modified `app/admin/therapies/page.tsx`
  - modified `components/app-sidebar.tsx`
  - added `hooks/use-promotions.ts`
  - modified `lib/query-keys.ts`
  - modified `lib/services/group-class.service.ts`
  - added `lib/services/promotion.service.ts`

---

## 2. FITFLIX_BACKEND (API server)

### Uncommitted right now
None — working tree is clean. Latest commit (`faef41d`) is sitting local-only, not yet pushed.

### Commits this sprint (27, Aug 16–24)

- **2026-08-24** `faef41d` — feat: implement timezone resolution and related utilities
  - modified `CLAUDE.md`
  - modified `index.ts`
  - modified `package-lock.json`
  - modified `src/controllers/class-schedule.controller.ts`
  - modified `src/services/session-access.service.ts`
  - modified `src/services/session-room-lifecycle.service.ts`
  - modified `src/utils/location.resolver.ts`
  - modified `src/utils/timezone.util.ts`
  - modified `src/utils/zego-room.ts`
  - added `tests/timezone-util.test.ts`
- **2026-08-21** `56a831a` — feat(exercises): seed 873-exercise library with S3-backed demo images
  - modified `package.json`
  - added `scripts/backfill-exercise-image-keys.ts`
  - added `scripts/seed-exercises-from-free-db.ts`
  - added `scripts/upload-exercise-images.ts`
  - modified `src/controllers/exercise.controller.ts`
  - modified `src/models/Exercise.ts`
- **2026-08-19** `97d9543` — fix(workout-plans): accept MuscleGain, Mobility, GeneralFitness, BroSplit
  - deleted `src/models/Enums.js`
  - modified `src/models/Enums.ts`
- **2026-08-17** `4014def` — chore(deploy): drop Vercel, EC2 is the only backend host
  - modified `.gitignore`
  - deleted `api/index.ts`
  - modified `package.json`
  - deleted `scripts/postbuild.js`
  - deleted `vercel.json`
- **2026-08-17** `0ca63a0` — perf: optimize group class loading performance and add compound indexes
  - modified `src/controllers/class-schedule.controller.ts`
  - modified `src/controllers/class.controller.ts`
  - modified `src/models/Class.ts`
  - modified `src/models/ScheduledSession.ts`
  - modified `src/routes/internal.routes.ts`
- **2026-08-17** `e094365` — feat(slot-reservation): implement shared slot reservation functions and improve booking logic
  - modified `src/controllers/booking.controller.ts`
  - modified `src/controllers/nutritionist-booking.controller.ts`
  - modified `src/controllers/slot.controller.ts`
  - modified `src/controllers/zego.controller.ts`
  - modified `src/services/nutritionist-expiry.service.ts`
  - added `src/services/slot-reservation.service.ts`
- **2026-08-17** `e2c1a67` — test(sessions): prove the DST paths that Asia/Kolkata never exercises
  - modified `package.json`
  - added `tests/session-window-dst.test.ts`
- **2026-08-17** `e14ba51` — fix(sessions): a booking that runs past midnight no longer ends before it starts
  - modified `package.json`
  - modified `src/controllers/booking.controller.ts`
  - modified `src/controllers/class-schedule.controller.ts`
  - modified `src/services/session-access.service.ts`
  - modified `src/utils/zego-room.ts`
  - added `tests/session-window.test.ts`
- **2026-08-16** `e0a96ef` — feat(consent): persist tracking consent, and let it be withdrawn
  - modified `src/controllers/activity.controller.ts`
  - modified `src/controllers/phone-auth.controller.ts`
  - modified `src/routes/activity.routes.ts`
  - modified `src/validators/activity.validator.ts`
  - modified `src/validators/auth.validator.ts`
- **2026-08-16** `f702f80` — feat(promotions): audience targeting and an editable CTA label
  - modified `src/controllers/promotion.controller.ts`
  - modified `src/models/Promotion.ts`
  - modified `src/utils/membership.guard.ts`
  - modified `src/utils/promotion-visibility.ts`
  - modified `src/validators/promotion.validator.ts`
  - modified `tests/promotion-visibility.test.ts`
- **2026-08-16** `3741469` — feat(activity): behaviour ingestion behind a consent gate
  - modified `package.json`
  - modified `src/app.ts`
  - added `src/controllers/activity.controller.ts`
  - added `src/models/BehaviourEvent.ts`
  - modified `src/models/User.ts`
  - added `src/routes/activity.routes.ts`
  - added `src/utils/activity-consent.ts`
  - added `src/validators/activity.validator.ts`
  - added `tests/activity-consent.test.ts`
- **2026-08-16** `c62a070` — feat(content): remote copy overrides so marketing copy ships without a release
  - modified `package.json`
  - modified `src/app.ts`
  - added `src/controllers/content.controller.ts`
  - added `src/models/ContentOverride.ts`
  - added `src/routes/content.routes.ts`
  - added `src/utils/content-resolution.ts`
  - added `src/validators/content.validator.ts`
  - added `tests/content-resolution.test.ts`
- **2026-08-16** `6e9a80c` — fix(leads): stop email signup filing itself as Converted
  - modified `src/controllers/auth.controller.ts`
- **2026-08-16** `4cc072c` — feat(nutrition): enhance meal log healing process and add recipe source field
  - modified `scripts/heal-recipe-names.ts`
  - modified `src/models/nutrition-meal-log.model.ts`
  - modified `src/services/nutrition/nutrition-meal-log.service.ts`
- **2026-08-16** `7db61dc` — fix: update session handling logic and improve comments for clarity
  - modified `package.json`
  - modified `src/controllers/class.controller.ts`
  - modified `src/models/ScheduledSession.ts`
  - modified `src/services/session-access.service.ts`
  - modified `src/utils/zego-room.ts`
- **2026-08-16** `9e4fcb6` — fix(workspace): ensure current directory is included in package builds
  - modified `pnpm-workspace.yaml`
- **2026-08-16** `ac15a57` — feat(nutrition): add recipe source to meal options and implement recipe healing script
  - added `scripts/heal-recipe-names.ts`
  - modified `src/services/nutrition/nutrition-snapshot.util.ts`
- **2026-08-16** `4f4610e` — feat(notification): add broadcastToTopic endpoint for FCM notifications
  - modified `src/controllers/notification.controller.ts`
  - modified `src/routes/notification.routes.ts`
  - modified `src/services/fcm.service.ts`
  - modified `src/services/notification.service.ts`
- **2026-08-16** `89df468` — fix(gitignore): add pnpm-lock.yaml to the ignore list
  - modified `.gitignore`
- **2026-08-16** `21f0fee` — fix(test): make the 48h booking-window case independent of the wall clock
  - modified `tests/feature-012-booking-rules-engine.test.ts`
- **2026-08-16** `4bfc738` — fix(booking): resolve a class to its next unstarted session
  - modified `src/services/registration-engine.service.ts`
- **2026-08-16** `870ade0` — fix(promotions): mount before the /api/v1 catch-all so /public is reachable
  - modified `src/app.ts`
- **2026-08-16** `b335a55` — feat(classes): extend Class into events with batch enrolment
  - modified `package.json`
  - modified `src/controllers/booking.controller.ts`
  - modified `src/controllers/class-schedule.controller.ts`
  - modified `src/controllers/class.controller.ts`
  - modified `src/models/Class.ts`
  - modified `src/services/booking-rules-engine.service.ts`
  - added `src/utils/class-enrollment.ts`
  - modified `src/validators/class.validator.ts`
  - added `tests/class-events.test.ts`
- **2026-08-16** `bdd4754` — fix(promotions): a class link target is a UUID, not an ObjectId
  - modified `src/models/Promotion.ts`
  - modified `src/validators/promotion.validator.ts`
  - modified `tests/promotion-visibility.test.ts`
- **2026-08-16** `0f1020c` — feat(promotions): add the Promotion model, API and visibility rules
  - modified `package.json`
  - modified `src/app.ts`
  - added `src/controllers/promotion.controller.ts`
  - added `src/models/Promotion.ts`
  - added `src/routes/promotion.routes.ts`
  - added `src/utils/promotion-visibility.ts`
  - added `src/validators/promotion.validator.ts`
  - added `tests/promotion-visibility.test.ts`

---

## 3. USER-APP-FITFLIX (member mobile app)

### Local branch is behind origin by 1 commit — `git pull` before making changes here.

### Uncommitted right now — every file (7)

**Firebase phone-auth / reCAPTCHA diagnostics**, added Aug 20. The problem: some users on store builds see a reCAPTCHA challenge during phone login instead of a silent verification, because background app attestation (Play Integrity on Android, a silent APNs push on iOS) fails — invisible on a developer's own local build, since it depends on facts specific to the *signed, distributed* binary. This makes those facts inspectable on-device:

| File | What it adds |
|---|---|
| [android/app/src/main/kotlin/com/fitflix/app/MainActivity.kt](android/app/src/main/kotlin/com/fitflix/app/MainActivity.kt) | New `com.fitflix/attestation` MethodChannel — returns the SHA-1/SHA-256 of the certificate that actually signed this install (Play App Signing re-signs the APK, so the developer's local upload-key fingerprint is not what Firebase attests against) |
| [ios/Runner/AppDelegate.swift](ios/Runner/AppDelegate.swift) | Same channel on iOS — reads `aps-environment` and team id out of `embedded.mobileprovision`, plus declared URL schemes |
| `lib/services/attestation_diagnostics.dart` | New — the check-runner: interprets the native values above into pass/warn/fail/skip results |
| `lib/screens/debug/attestation_debug_screen.dart` | New — UI for the checks, reachable at `/debug/attestation` |
| [lib/router/app_router.dart](lib/router/app_router.dart) | Registers the `/debug/attestation` route — deliberately unlinked from any menu, meant to be opened by a support engineer or read out over a call |
| [docs/FIREBASE_PHONE_AUTH_SETUP.md](docs/FIREBASE_PHONE_AUTH_SETUP.md) | New "users are seeing reCAPTCHA in production" section pointing at the debug screen; notes that `./gradlew signingReport` fingerprints are the *local* key, not what Play re-signs with |
| [pubspec.yaml](pubspec.yaml) | Version bumped `1.5.0+32` → `1.5.32+23` |

### Commits this sprint (53, Aug 16–17)

- **2026-08-17** `29e1e35` — Fixed the session not found bug for completed session details
  - modified `lib/screens/services/group_class_detail_screen.dart`
  - modified `lib/screens/wellness/wellness_item.dart`
  - modified `test/navigation/wellness_detail_route_test.dart`
- **2026-08-17** `91902fd` — group class revamp
  - modified `lib/models/group_class.dart`
  - modified `lib/providers/app_providers.dart`
  - modified `lib/router/app_router.dart`
  - added `lib/screens/services/group_class_ordering.dart`
  - modified `lib/screens/services/group_classes_screen.dart`
  - modified `lib/screens/wellness/wellness_screen.dart`
  - added `test/screens/group_class_ordering_test.dart`
- **2026-08-17** `5dccfdf` — stale 200 repeat calls
  - modified `android/app/src/main/AndroidManifest.xml`
  - modified `ios/Runner/Info.plist`
  - modified `lib/data/api/api_client.dart`
  - modified `lib/providers/app_providers.dart`
  - modified `pubspec.yaml`
- **2026-08-17** `6d66e0d` — updated the build number
  - modified `android/app/src/main/AndroidManifest.xml`
  - modified `ios/Runner.xcodeproj/project.pbxproj`
  - modified `ios/Runner.xcworkspace/xcshareddata/swiftpm/Package.resolved`
  - modified `lib/config/app_config.dart`
  - modified `pubspec.yaml`
- **2026-08-17** `e47d095` — feat(therapy): enhance therapy history entry with session details and improve routing logic
  - modified `lib/features/zego/zego_style_helpers.dart`
- **2026-08-17** `58d56a2` — fix(attendance): size the check-in QR to the space it actually has
  - modified `lib/screens/attendance/qr_checkin_screen.dart`
- **2026-08-17** `d3f106c` — fix(community): make S3 video upload failures diagnosable and prod-safe
  - modified `lib/features/community/data/community_repository.dart`
  - modified `lib/features/community/ui/post_composer_screen.dart`
- **2026-08-17** `f531138` — fix(zego): recover stale room joins, restore top-bar hit boxes, stop booking-CTA flicker
  - modified `lib/features/live_streaming/live_streaming_page.dart`
  - modified `lib/features/zego/zego_style_helpers.dart`
  - modified `lib/screens/services/group_class_detail_screen.dart`
- **2026-08-17** `25b01af` — feat(zego): add room presence attendance gating, rotation support & history route fixes
  - modified `lib/data/database/database.dart`
  - modified `lib/data/models.dart`
  - modified `lib/features/live_streaming/live_streaming_page.dart`
  - modified `lib/features/video_conference/video_conference_page.dart`
  - added `lib/features/zego/zego_room_presence.dart`
  - modified `lib/screens/sessions/session_detail_screen.dart`
  - modified `lib/screens/therapy/therapy_history_screen.dart`
  - modified `lib/screens/wellness/wellness_item.dart`
- **2026-08-17** `7e940d1` — feat: enhance live session support with orientation handling and improve error visibility in streaming UI
  - modified `android/app/src/main/AndroidManifest.xml`
  - modified `ios/Runner/Info.plist`
  - modified `lib/features/live_streaming/live_streaming_page.dart`
  - modified `lib/features/video_conference/video_conference_page.dart`
  - added `lib/features/zego/zego_rotation.dart`
  - modified `lib/features/zego/zego_style_helpers.dart`
  - modified `lib/main.dart`
  - modified `lib/router/app_router.dart`
- **2026-08-17** `da79350` — community and qr changes
  - modified `lib/features/community/data/community_repository.dart`
  - modified `lib/screens/attendance/qr_checkin_screen.dart`
- **2026-08-17** `83d47ad` — feat: implement session retrieval by id with fallback to class template id and add join window functionality
  - modified `lib/data/repository/group_class_repository.dart`
  - modified `lib/providers/app_providers.dart`
  - modified `lib/screens/services/group_class_detail_screen.dart`
  - modified `lib/screens/wellness/wellness_item.dart`
  - modified `lib/screens/wellness/wellness_widgets.dart`
  - added `test/navigation/wellness_detail_route_test.dart`
  - added `test/navigation/wellness_join_window_test.dart`
- **2026-08-17** `6c9ab30` — feat: add plan renewal screen tests and update version in pubspec.yaml
  - modified `lib/data/models.dart`
  - modified `lib/data/repository/group_class_repository.dart`
  - modified `lib/data/repository/plan_repository.dart`
  - modified `lib/screens/home/dashboard_screen.dart`
  - modified `lib/screens/membership/plan_renewal_screen.dart`
  - modified `pubspec.yaml`
  - added `test/screens/plan_renewal_screen_test.dart`
- **2026-08-17** `986c6ad` — fix(home): dynamically replace $name and {name} in remote visitor hero greeting
  - modified `lib/features/food_logging/ui/food_diary_screen.dart`
  - modified `lib/screens/home/shell_screen.dart`
  - modified `lib/screens/nutrition/nutrition_plan_screen.dart`
  - modified `lib/screens/workouts/exercise_tracking_screen.dart`
  - modified `lib/widgets/home/visitor_sections.dart`
  - added `test/navigation/shell_scroll_hide_test.dart`
- **2026-08-17** `a761573` — feat(nutrition): prefetch nutrition data, delta cache with lastUpdatedAt, and support planless consumed calorie display
  - modified `lib/data/repository/nutrition_repository.dart`
  - modified `lib/features/food_logging/data/food_logging_repository.dart`
  - modified `lib/features/food_logging/ui/food_diary_screen.dart`
  - modified `lib/screens/home/dashboard_screen.dart`
  - modified `lib/screens/nutrition/nutrition_plan_screen.dart`
  - added `test/data/nutrition_cache_test.dart`
- **2026-08-17** `f2b7ee6` — perf: optimize dashboard next-action reload and eliminate skeleton flicker
  - modified `lib/data/repository/group_class_repository.dart`
  - modified `lib/providers/next_action_provider.dart`
  - modified `lib/screens/home/dashboard_screen.dart`
- **2026-08-17** `b9b5f34` — feat(analytics): the lead panel can finally name what they looked at
  - modified `lib/screens/coaches/coach_profile_screen.dart`
  - modified `lib/screens/services/group_class_detail_screen.dart`
  - modified `lib/screens/therapy/therapy_detail_screen.dart`
  - modified `lib/services/analytics_service.dart`
  - added `lib/widgets/track_catalog_item_view.dart`
  - added `test/_helpers/offline_analytics.dart`
  - modified `test/services/group_class_detail_test.dart`
  - added `test/widgets/track_catalog_item_view_test.dart`
- **2026-08-17** `65c585c` — feat: add ZIM signaling plugin for co-host invitations and update live streaming configuration
  - modified `lib/features/live_streaming/live_streaming_page.dart`
  - modified `lib/features/zego/zego_session_credentials.dart`
  - modified `lib/features/zego/zego_style_helpers.dart`
  - modified `pubspec.yaml`
- **2026-08-17** `8f38bfc` — fix(classes): stop reading a club's wall clock on the device's clock
  - modified `lib/models/group_class.dart`
  - modified `test/models/group_class_scheduling_test.dart`
- **2026-08-17** `bb85ddf` — fix(classes): a class running past midnight reports its real length
  - modified `lib/models/group_class.dart`
  - added `test/models/group_class_duration_test.dart`
- **2026-08-17** `fba3803` — fix(nutritionist): a late appointment is no longer expired before it happens
  - modified `lib/features/nutritionist_booking/models.dart`
  - added `test/nutritionist_booking/midnight_window_test.dart`
- **2026-08-17** `5693c31` — feat: enhance remote camera state reconciliation and improve audio-video list handling
  - modified `lib/features/video_conference/video_conference_page.dart`
  - modified `lib/features/zego/remote_camera_state_reconciler.dart`
- **2026-08-16** `d1740b2` — fix(pt): a session running past midnight is no longer expired before it starts
  - modified `lib/features/personal_training/models/pt_models.dart`
  - added `test/models/pt_booking_midnight_test.dart`
- **2026-08-16** `1c1f66f` — feat(landing): lead with the free offer instead of the hardest ask
  - modified `lib/screens/public/landing/sections.dart`
  - modified `lib/screens/public/landing_screen.dart`
  - modified `test/_shots/landing_signin_reachable_test.dart`
- **2026-08-16** `96fe6de` — feat(consent): ask for tracking consent at signup, and let it be withdrawn
  - modified `lib/data/api/auth_service.dart`
  - modified `lib/data/api/endpoints.dart`
  - modified `lib/router/app_router.dart`
  - modified `lib/screens/auth/phone_register_screen.dart`
  - added `lib/screens/profile/privacy_screen.dart`
  - modified `lib/screens/profile/profile_screen.dart`
  - added `test/onboarding/signup_consent_test.dart`
- **2026-08-16** `1a72eef` — feat(analytics): record behaviour so sales can walk into a call informed
  - modified `lib/providers/app_providers.dart`
  - modified `lib/router/app_router.dart`
  - added `lib/services/analytics_service.dart`
  - modified `lib/widgets/home/visitor_sections.dart`
  - added `test/services/analytics_service_test.dart`
- **2026-08-16** `ecadec3` — feat(home): give the visitor branch the marketing layer it was missing
  - modified `lib/screens/home/dashboard_screen.dart`
  - modified `lib/widgets/home/visitor_sections.dart`
  - modified `screenshots/01_hero_recovery.png`
  - modified `screenshots/02_trainers_classes.png`
  - modified `screenshots/03_plans_closing.png`
  - modified `screenshots/12_home_offline.png`
- **2026-08-16** `145b7d3` — feat(classes): surface the event and livestream shapes the backend already sends
  - modified `lib/models/group_class.dart`
  - modified `lib/providers/app_providers.dart`
  - added `test/models/group_class_event_test.dart`
- **2026-08-16** `ce9bd48` — feat(content): resolve marketing copy remotely, without ever blocking paint
  - modified `lib/data/api/endpoints.dart`
  - added `lib/data/content/remote_content.dart`
  - modified `lib/providers/app_providers.dart`
  - added `test/data/remote_content_test.dart`
- **2026-08-16** `2e35b53` — feat: refactor therapy history screen to improve session handling and UI updates
  - modified `lib/screens/therapy/therapy_history_screen.dart`
- **2026-08-16** `80998c1` — feat: enhance meal entry validation, update group class access logic, and improve wellness screen tab handling
  - modified `lib/features/food_logging/ui/food_diary_screen.dart`
  - modified `lib/features/food_logging/ui/portion_picker_sheet.dart`
  - modified `lib/router/app_router.dart`
  - modified `lib/screens/services/group_class_detail_screen.dart`
  - modified `lib/screens/therapy/therapy_detail_screen.dart`
  - modified `lib/screens/wellness/wellness_screen.dart`
  - modified `test/navigation/wellness_tab_merge_test.dart`
- **2026-08-16** `40d4301` — feat: update routing logic for member access and enhance booking dialog for group classes
  - modified `lib/router/app_router.dart`
  - modified `lib/screens/home/shell_screen.dart`
  - modified `lib/screens/services/group_class_detail_screen.dart`
  - modified `test/navigation/wellness_tab_merge_test.dart`
- **2026-08-16** `e592073` — feat: refactor bottom navigation handling and improve UI interactions across multiple screens
  - modified `HANDOVER-explore-photo-mosaic.md`
  - modified `lib/features/community/ui/community_actions.dart`
  - modified `lib/features/food_logging/ui/food_search_screen.dart`
  - modified `lib/features/food_logging/ui/portion_picker_sheet.dart`
  - modified `lib/features/live_streaming/live_streaming_page.dart`
  - modified `lib/features/video_conference/video_conference_page.dart`
  - modified `lib/features/zego/remote_camera_state_reconciler.dart`
  - modified `lib/features/zego/zego_session_credentials.dart`
  - modified `lib/features/zego/zego_style_helpers.dart`
  - modified `lib/models/group_class.dart`
  - modified `lib/providers/app_providers.dart`
  - modified `pubspec.yaml`
- **2026-08-16** `37a8908` — feat(nutrition): enhance recipe name resolution and improve meal slot validation
  - modified `lib/models/nutrition_plan.dart`
- **2026-08-16** `03034e8` — feat(notifications): implement push notification handling and FCM token management
  - modified `android/app/build.gradle.kts`
  - modified `android/app/src/main/AndroidManifest.xml`
  - modified `ios/Runner/Info.plist`
  - modified `ios/Runner/Runner.entitlements`
  - modified `lib/data/api/endpoints.dart`
  - added `lib/features/notifications/data/push_token_cache.dart`
  - added `lib/features/notifications/data/push_token_repository.dart`
  - modified `lib/features/notifications/model/server_notification.dart`
  - modified `lib/features/notifications/providers/notification_providers.dart`
  - added `lib/features/notifications/services/push_background_handler.dart`
  - added `lib/features/notifications/services/push_messaging_service.dart`
  - added `lib/features/notifications/services/push_notification_router.dart`
  - modified `lib/main.dart`
  - modified `lib/providers/app_providers.dart`
  - modified `lib/services/deep_link_service.dart`
  - modified `pubspec.yaml`
  - added `test/notifications/push_notification_router_test.dart`
- **2026-08-16** `ab0931b` — feat(wellness): implement photo mosaic for Explore tab with dynamic imagery
  - added `HANDOVER-explore-photo-mosaic.md`
  - added `lib/data/wellness_imagery.dart`
  - modified `lib/models/group_class.dart`
  - modified `lib/screens/wellness/wellness_screen.dart`
  - modified `lib/screens/wellness/wellness_widgets.dart`
  - modified `pubspec.yaml`
  - modified `screenshots/22_wellness_explore.png`
  - modified `test/_shots/brand_fonts.dart`
- **2026-08-16** `1bffc7b` — fix(classes): stop offering a booking on a class with no session
  - modified `lib/models/group_class.dart`
  - modified `lib/screens/services/group_class_detail_screen.dart`
  - added `test/models/group_class_scheduling_test.dart`
- **2026-08-16** `74076c9` — feat(wellness): rebuild the tab as a hub for everything Fitflix runs
  - modified `lib/router/app_router.dart`
  - modified `lib/screens/home/shell_screen.dart`
  - deleted `lib/screens/sessions/sessions_screen.dart`
  - added `lib/screens/wellness/wellness_item.dart`
  - added `lib/screens/wellness/wellness_screen.dart`
  - added `lib/screens/wellness/wellness_widgets.dart`
  - added `screenshots/20_wellness_schedule.png`
  - deleted `screenshots/20_wellness_tab.png`
  - added `screenshots/21_wellness_schedule_full.png`
  - deleted `screenshots/21_wellness_tab_full.png`
  - added `screenshots/22_wellness_explore.png`
  - deleted `screenshots/22_wellness_tab_nonmember.png`
  - added `screenshots/25_wellness_empty.png`
  - modified `test/_shots/wellness_tab_shot_test.dart`
  - modified `test/navigation/wellness_tab_merge_test.dart`
- **2026-08-16** `67824ef` — feat(coaches): give every coach a page, and booking a screen of its own
  - modified `lib/features/personal_training/models/pt_models.dart`
  - modified `lib/features/personal_training/services/pt_service.dart`
  - modified `lib/router/app_router.dart`
  - added `lib/screens/coaches/book_session_sheet.dart`
  - added `lib/screens/coaches/coach_profile_screen.dart`
  - added `lib/screens/coaches/coach_providers.dart`
  - added `lib/screens/coaches/coach_widgets.dart`
  - added `lib/screens/coaches/coaches_screen.dart`
  - modified `lib/screens/services/personal_training_page.dart`
  - modified `lib/widgets/coach_strip.dart`
  - added `screenshots/40_coaches_roster.png`
  - added `screenshots/41_coach_profile.png`
  - added `screenshots/42_book_session_sheet.png`
  - added `screenshots/43_pt_hub.png`
  - added `test/_shots/coaches_shots_test.dart`
- **2026-08-16** `7847703` — docs: handover for the Phase C continuation
  - added `docs/HANDOVER-phase-c-promotions.md`
- **2026-08-16** `e5a32ec` — feat(home): show promotions to logged-out visitors, and refresh them
  - modified `lib/data/api/endpoints.dart`
  - modified `lib/data/repository/promotion_repository.dart`
  - modified `lib/providers/app_providers.dart`
  - modified `lib/screens/home/dashboard_screen.dart`
  - modified `lib/screens/public/landing_screen.dart`
  - modified `lib/widgets/promo_carousel.dart`
  - modified `test/widgets/promo_carousel_test.dart`
- **2026-08-16** `7312b86` — fix(home): make the next-action card readable on its dark surface
  - modified `lib/theme/app_colors.dart`
  - modified `lib/widgets/next_action_card.dart`
- **2026-08-16** `b90eaaa` — fix(home): bring the next-action card into the app palette
  - modified `lib/widgets/next_action_card.dart`
- **2026-08-16** `0d7884b` — feat(home): show promotions to visitors and lapsed members too
  - modified `lib/screens/home/dashboard_screen.dart`
  - modified `lib/widgets/promo_carousel.dart`
  - modified `test/widgets/promo_carousel_test.dart`
- **2026-08-16** `dd2690a` — feat(home): add the promotions carousel
  - modified `lib/data/api/endpoints.dart`
  - modified `lib/data/models.dart`
  - added `lib/data/repository/promotion_repository.dart`
  - modified `lib/providers/app_providers.dart`
  - modified `lib/screens/home/dashboard_screen.dart`
  - added `lib/widgets/promo_carousel.dart`
  - added `test/widgets/promo_carousel_test.dart`
- **2026-08-16** `4f94e80` — fix(test): stop three visitor goldens from being the same picture
  - renamed `screenshots/01_hero.png` → `screenshots/01_hero_recovery.png`
  - deleted `screenshots/02_recovery.png`
  - added `screenshots/02_trainers_classes.png`
  - renamed `screenshots/04_classes.png` → `screenshots/03_plans_closing.png`
  - deleted `screenshots/03_trainers.png`
  - deleted `screenshots/05_plans.png`
  - deleted `screenshots/06_closing.png`
  - modified `test/_shots/newuser_home_shots_test.dart`
- **2026-08-16** `ce3be67` — docs: rewrite the handover for a Phase C continuation
  - modified `docs/HANDOVER-home-screen-repositioning.md`

---

## Action items

1. **Push `faef41d`** from `FITFLIX_BACKEND` — it's a full commit sitting local-only.
2. **`git pull` in `USER-APP-FITFLIX`** before starting new work there — local is 1 commit behind origin.
3. **Split the frontdesk-fitflix uncommitted set into ~3 commits** rather than one giant one: the responsive/mobile pass, PWA installability, and exercise demo images are unrelated changes that happen to be sitting in the tree together.

---

## How this was produced

Read-only `git` commands, run in each repo:

```bash
git status -sb
git diff --stat
git diff -- <file>              # per-file detail for the uncommitted set
git log --since=2026-08-16T00:00 --no-merges \
  --date=format:'%Y-%m-%d' --pretty=format:'%h|%ad|%s' --name-status
```
