# Backend Handoff: Cost, Credit Deduction, and Credit History Alignment

## 1. Purpose
This note captures frontend expectations and current API doc gaps related to:
- therapy/service cost
- credit deduction and refunds
- credit history ledger consistency
- daily slot capacity behavior tied to bookings/appointments

The goal is to align backend behavior and API docs so admin workflows stay predictable.

## 2. Frontend Contract Expectations

### 2.1 Service and Therapy Cost
Frontend now expects both services and therapies to carry a cost field used for credit deduction:
- field name: `creditCost`
- minimum valid value: `1`
- fallback if missing in API response: `1`

Where used:
- Therapy admin create/update payload now sends `creditCost`
- Booking and appointment selectors show cost for both Services and Therapies
- Deduction messaging assumes service/therapy cost controls consumed credits

### 2.2 Booking Create and Status Change
Create request:
- `POST /bookings`
- payload includes `bookingDate`, `slotId`, `serviceId`, optional `userId`, optional `reportId`, optional `bypassCredits`

Expected backend behavior:
- resolve `serviceId` whether it points to a Service or Therapy entity
- when `bypassCredits = false`, consume credits using `creditCost`
- create credit transaction for consumption (`sourceType = Booking`)
- atomically decrement slot `remainingCapacity`

Status change request:
- `PATCH /bookings/:id/status`

Expected backend behavior:
- if transitioned to Cancelled, refund consumed credits once
- add refund ledger transaction (`sourceType = Booking`)
- release slot capacity back by 1 (same resolved dated slot inventory)

### 2.3 Appointment Create and Status Change
Create request:
- `POST /appointments`
- payload includes `appointmentDate`, `userId`, `slotId`, `doctorId`, optional `serviceId`, optional `reportId`, optional `bypassCredits`

Expected backend behavior:
- if `serviceId` present, consume `service.creditCost`
- if `serviceId` absent, consume default `1`
- create credit transaction (`sourceType = Appointment`)
- atomically decrement slot `remainingCapacity`

Status change request:
- `PATCH /appointments/:id/status`

Expected backend behavior:
- if transitioned to Cancelled, refund once
- add refund ledger transaction (`sourceType = Appointment`)
- release slot capacity back by 1

### 2.4 Credit History and Balance Endpoints
Expected history shape:
- `GET /credits/me/history`
- `GET /credits/users/:userId/history`
- `transactions[]` items should include:
  - `id`
  - `membershipId`
  - `amount`
  - `type` in: `Consume | Refund | AdminTopUp | Void`
  - `sourceType` in: `Booking | Appointment | Admin`
  - `sourceId`
  - `reason`
  - `actorId`
  - `actorRole`
  - `createdAt`

Expected balance shape:
- `GET /credits/me/balance`
- `GET /credits/users/:userId/balance`
- returns `totalIncluded`, `totalRemaining`, and per-membership buckets

Top-up shape:
- `POST /credits/users/:userId/topup`
- response expected:
  - `message`
  - `membershipId`
  - `toppedUp`
  - `creditsRemaining`

## 3. Current Doc/Contract Gaps Requiring Backend + Doc Alignment

### Gap A: Therapy `creditCost`
Current API docs for `/therapies` create/update do not include `creditCost`, but docs also state therapy IDs are valid `serviceId` values for booking/appointment credit deduction.

Why this matters:
- without explicit therapy `creditCost`, deduction behavior is ambiguous and can drift from admin intent

Required action:
- support `creditCost` in Therapy create/update/read payloads, or clearly document inherited mapping from unified service model
- update therapy docs accordingly

### Gap B: Booking cancellation capacity release
Docs explicitly mention slot capacity release on appointment cancellation, but booking cancellation section mentions only credit refund.

Why this matters:
- bookings and appointments share slot capacity pool in docs
- without release on booking cancellation, slots can remain artificially full

Required action:
- enforce and document slot-capacity release for booking cancellation as well
- ensure this is idempotent (no double release)

### Gap C: Daily slot template to dated inventory behavior
Docs mention template resolution for daily slots during booking/appointment creation.

Required action:
- guarantee this resolution is atomic with credit deduction and capacity decrement
- include conflict-safe behavior for concurrent creates (409 when no capacity)

## 4. Backend Acceptance Checklist

1. Therapy endpoint supports `creditCost` (create, update, read).
2. Booking create consumes credits based on resolved service/therapy `creditCost`.
3. Appointment create consumes credits (`serviceId` cost, else default 1).
4. Booking and appointment create both decrement `remainingCapacity` atomically.
5. Booking and appointment cancellation both refund once and release capacity once.
6. Credit history records sourceType/type values in documented enum casing.
7. Credit top-up response fields match frontend expectations.
8. Daily slot template booking resolves to dated inventory safely under concurrency.

## 5. Suggested Contract Tests (Backend)

1. Therapy cost roundtrip:
- create therapy with `creditCost = 3`
- fetch therapy list/details and assert `creditCost = 3`

2. Booking deduction:
- create booking with therapy `serviceId`
- assert credits consumed equals therapy `creditCost`
- assert history includes `sourceType = Booking`, `type = Consume`

3. Appointment deduction default:
- create appointment without `serviceId`
- assert consumed credits = 1

4. Cancellation idempotency:
- cancel same booking/appointment twice
- assert only one refund transaction and one capacity release

5. Daily template capacity:
- create template slot daily 09:00-10:00 capacity 2
- issue 3 concurrent bookings for same date/window
- expect 2 success, 1 conflict (409)

6. History filters:
- verify `sourceType` filter returns only requested source
- verify `limit` is applied and bounded (1..200)

## 6. Notes for Rollout
- Keep compatibility for existing slots/services that may not yet have complete fields by applying backend defaults (`creditCost = 1`, non-negative capacities).
- Prefer explicit server-side validation and conflict errors over silent coercion so admin UI can display clear feedback.
