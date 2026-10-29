# Research: Testing Strategy — Backend CRUD to Frontdesk Reflection

> **Current Status & Findings:**
> - **Backend (`FITFLIX_BACKEND`):** Already has **30+ end-to-end integration test scripts** (`tests/new-sale.test.ts`, `tests/onboarding/full-onboarding-flow.test.ts`, `tests/feature-012-booking-rules-engine.test.ts`, etc.) testing full database CRUD operations, API routes, and token validation.
> - **Frontdesk Dashboard (`frontdesk-fitflix`):** Currently has **0 tests** (no test runner, no test scripts). Testing is currently 100% manual clicking in the browser.

---

## The Core Question: What Are We Actually Testing?

When you say **"backend has test scripts to CRUD operations and reflect in frontdesk"**, this bridges two different worlds: **Backend API** and **Frontend UI**.

Here are the questions to help uncover the problem space before planning:

### 1. The Nature of the Test: E2E vs. Unit
1. **Real Browser vs. Isolated Code:**  
   When a CRUD operation happens (e.g. a new booking or invoice is created), do you want:
   - A real automated browser (like Playwright) opening Frontdesk, logging in, clicking, and checking that the row appears on screen (**End-to-End / E2E test**)?
   - OR do you want Frontdesk components to be tested in isolation with simulated backend responses (**Frontend Unit test**)?
   - OR do you want backend test scripts to assert that the JSON structure they return matches what Frontdesk UI needs (**Contract test**)?

### 2. Live Backend vs. Mocked Backend
2. **Database Dependency:**  
   Backend test scripts (`tests/new-sale.test.ts`) require a local MongoDB instance to run CRUD operations. When running frontend tests:
   - Must a live backend + database be running simultaneously?
   - Or should frontend tests be runnable anywhere (even in 2 seconds on a laptop without MongoDB) using mock API responses?

### 3. Real-Time & Cache Invalidation
3. **How Does Frontdesk "Reflect" Backend Changes?**  
   Frontdesk uses React Query (`@tanstack/react-query`) with cache invalidation (`qc.invalidateQueries`) and 30-second stale times:
   - When a frontdesk operator performs an action (e.g. cancels a booking or changes a lead status), is the main concern testing that the **optimistic UI updates immediately**?
   - Or is the concern testing that **background polling / refetching** brings in updates created outside the dashboard (e.g. by the mobile user app)?

### 4. Critical CRUD Flows to Connect
4. **Which CRUD operations are highest priority to verify in Frontdesk?**  
   - **Sales & Invoicing:** Creating an invoice → paying it → membership created → appears in member list.
   - **Onboarding Pipeline:** Member submits forms on app → admin verifies status on Frontdesk timeline.
   - **Bookings & Slots:** Member books session → slot capacity decreases → frontdesk sees attended/cancelled status.
   - **Lead Management:** Public lead created → frontdesk updates lead stage (`New` → `Qualified` → `Converted`).

### 5. Failure Diagnosis & Developer Feedback
5. **When a test fails, what should it tell you?**  
   - If an API response changes shape and breaks the Frontdesk table, do you want the failure detected **in the backend repo** before deploying, or **in the frontend repo** during UI build?
   - How should auth tokens be handled across tests? Backend tests currently mint fake JWT tokens (`generateTestToken("frontdesk")`). Should frontend tests reuse this mechanism to bypass the login screen?
