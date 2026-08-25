# Audit notes

## Live environment
- Local Next.js dashboard runs at http://localhost:3001.
- `.env` configured with `NEXT_PUBLIC_API_URL=https://api.fitflix.in` and debug auth enabled.
- Authenticated successfully in the browser using the user-provided staff account; password is intentionally not recorded here.

## Login screen observations
- Dark navy full-screen background with centered Fitflix logo, name, and "Admin Panel" label.
- Single compact card: "Sign in to admin panel", "Authorized staff and administrators only", email, password, and full-width teal gradient submit.
- Visually clean and focused, but no password visibility toggle, recovery path, environment/API health cue, or explicit error/loading region beyond toast.
- Console warning: logo image has width/height aspect-ratio warning.

## Dashboard observations (live API)
- Authenticated user displayed as `frontdesk@fitflix.in`; location label `Fitflix Sainkipuri`.
- Sidebar has many modules grouped as People, Programs, Scheduling, Commerce, Insights, Community, Admin. Navigation is dense and appears icon-first/collapsed on desktop.
- KPI cards: 47 Members, 4 Trainers, 6 Bookings, 32 Open Slots across 35 slot windows.
- Main dashboard has Booking Status Breakdown chart, Recent Bookings list, and Quick Actions (Add Member, New Booking, Create Slot, Add Trainer).
- Dashboard content loaded successfully from live API; recent booking rows include EVENT, CRYOTHERAPY, COLD PLUNGE, and Free Session.
- No onboarding or membership-created next-step CTA visible on the dashboard.

## Existing product scope clues
- README says current onboarding is a 7-step tracker: health markers -> goals -> consent -> reports -> expert bookings.
- User requests replacing/reshaping this with six flexible steps: ActiveX test, DNA sample, VALD test, Nutrition appointment, Sport Scientist appointment, and plan/PT trainer assignment. Nutrition and sport scientist bookings must be in-app.

## Users and member detail observations
The Users screen exposes Members and Staff/Admins tabs, a search field, Refresh, and Add Member. The member table has many columns—username, email, age, gender, health goals, joined date, onboarding, membership, plan dates, and actions—which is information-rich but horizontally dense. On the live dataset, the newest members show `Not started` onboarding and `Not Assigned` membership, and their email fields may be blank.

A member name opens a modal detail view. The modal header shows avatar initials, name, gender/age, email/phone, and onboarding status. The body initially displayed skeleton-like blank regions while data loaded; there is no obvious prominent next action or six-step onboarding control in the first view. The workflow currently appears to require staff to use a separate Assign Membership action from the table.

## Membership assignment and appointment operations observations
The membership assignment route is opened via `/admin/memberships?assignUserId=<id>`. The Create New Membership modal pre-fills the selected username, displays optional email, plan selector, discount, status, start/end dates, notes, and Add Membership. The interface does not currently promise or trigger a post-membership onboarding flow; creation is a separate commerce action.

The Nutrition workspace includes an explicit `Nutritionist Appointments` tab with Pending, Accepted, Rejected, and All sub-tabs, search by username/email/phone, slot capacity summary, Refresh, and Manage Slots. The live environment currently reports zero configured nutritionist slots and zero bookings. This is a strong operational pattern for an in-app appointment queue, but it is nutritionist-specific and no sport scientist queue is present.

## Profile implementation evidence
The member profile currently renders legacy fields Health Markers, Health Goals, Consent, Reports Uploaded, and Onboarding Completed, while the type also includes Sports Scientist Booking and Nutritionist Booking. It displays `completedSteps.length / 7` even though the visual timeline component contains six displayed entries including Completed. Only Nutritionist is surfaced as a schedulable appointment, and scheduling uses a Nutritionist-only Cal.com iframe URL. The profile's trainer assignment is separate from the onboarding card.
