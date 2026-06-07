# Fitflix Local Development & Reference Guide

This document explains how to connect your local frontend (`frontdesk-fitflix`) to your local backend (`FITFLIX_BACKEND`) without modifying `.env.local`, and documents the backend changes made.

---

## 1. Running Frontend Locally (Pointing to localhost:3000)

Since `.env.local` is used for deployment configuration, do **not** edit it. Instead, override the API URL directly in your terminal when starting the Next.js development server.

### Using PowerShell:
```powershell
$env:NEXT_PUBLIC_API_URL="http://localhost:3000"; npm run dev
```

### Using Command Prompt (cmd):
```cmd
set NEXT_PUBLIC_API_URL=http://localhost:3000&& npm run dev
```

---

## 2. Reference of Backend Changes Made

The following modifications were made to the backend file `FITFLIX_BACKEND/src/controllers/user.controller.ts` inside the `getAllUsers` endpoint:

### A. Member "Joined" Date Fix
Added `createdAt` and `updatedAt` to the MongoDB aggregate pipeline `$project` block so that the member list API returns the registration dates:
```typescript
$project: {
    _id: 1,
    username: 1,
    email: 1,
    phone: 1,
    age: 1,
    gender: 1,
    createdAt: 1,   // <-- Added
    updatedAt: 1,   // <-- Added
    onboardingStatus: { ... }
}
```

### B. Member Onboarding Status Fix
Added all required step-completion boolean flags to the `onboardingStatus` projection block so the frontend `deriveOnboardingState` helper can calculate real onboarding status (e.g. "Completed" vs "In Progress" vs "Not Started"):
```typescript
onboardingStatus: {
    currentStep: "$onboardingStatus.currentStep",
    completedSteps: {
        $ifNull: ["$onboardingStatus.completedSteps", []],
    },
    healthMarkersCompleted: {
        $ifNull: ["$onboardingStatus.healthMarkersCompleted", false],
    },
    healthGoalsCompleted: {
        $ifNull: ["$onboardingStatus.healthGoalsCompleted", false],
    },
    consentCompleted: {
        $ifNull: ["$onboardingStatus.consentCompleted", false],
    },
    reportsUploaded: {
        $ifNull: ["$onboardingStatus.reportsUploaded", false],
    },
    sportsScientistBooked: {
        $ifNull: ["$onboardingStatus.sportsScientistBooked", false],
    },
    nutritionistBooked: {
        $ifNull: ["$onboardingStatus.nutritionistBooked", false],
    },
    onboardingCompleted: {
        $ifNull: ["$onboardingStatus.onboardingCompleted", false],
    },
}
```
