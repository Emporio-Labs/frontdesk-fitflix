# 🏋️ FrontDesk FitFlix

> **The all-in-one front-desk operations dashboard for modern fitness & wellness clinics.**

FrontDesk FitFlix is a full-featured admin dashboard built with **Next.js 15** and **React 19**, designed to streamline everything a fitness clinic front-desk team needs — from member management and bookings to nutrition tracking and onboarding workflows.

---

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-38BDF8?style=for-the-badge&logo=tailwindcss)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
  - [Running the App](#running-the-app)
- [Project Structure](#-project-structure)
- [Usage](#-usage)
- [Authentication & Roles](#-authentication--roles)
- [API Integration](#-api-integration)
- [License](#-license)
- [Contact](#-contact)

---

## 🌟 Overview

FrontDesk FitFlix bridges the gap between fitness clinic operations and modern web technology. It gives clinic administrators and staff a single, intuitive interface to manage every aspect of their facility — without juggling multiple tools.

**Who is this for?**
- 🏢 Clinic administrators managing day-to-day operations
- 💼 Front-desk staff handling bookings and member queries
- 🩺 Clinicians tracking member health progress
- 📊 Sales teams converting leads into memberships

---

## ✨ Features

| Module | Description |
|---|---|
| 👥 **User Management** | Full member lifecycle — profiles, onboarding, membership, and credit tracking |
| 📅 **Bookings & Appointments** | Slot management, appointment scheduling, and status tracking |
| 🎯 **Lead Management** | Pipeline from `new → contacted → qualified → converted` |
| 💳 **Memberships & Credits** | Membership plans, credit balances, and renewal workflows |
| 🥗 **Nutrition Module** | Food catalog, meal templates, assigned nutrition plans, and adherence charts |
| 🏃 **Workout Planner** | Client-side drag-and-drop workout plan builder with local persistence |
| 🧬 **Onboarding Workflow** | 7-step onboarding tracker: health markers → goals → consent → reports → expert bookings |
| 🧑‍⚕️ **Doctors & Trainers** | Staff directory management |
| 💊 **Therapies & Services** | Clinic service catalog management |
| 📊 **Reports & Audit Logs** | Activity reports and full audit trail |
| ⚙️ **Settings** | Clinic-level configuration |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router) |
| **UI Library** | [React 19](https://react.dev/) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS 3](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/) |
| **Data Fetching** | [TanStack React Query 5](https://tanstack.com/query) |
| **Global State** | [Zustand 5](https://zustand-demo.pmnd.rs/) |
| **Forms** | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) |
| **Icons** | [@tabler/icons-react](https://tabler-icons.io/) |
| **Charts** | [Recharts](https://recharts.org/) |
| **Animations** | [Framer Motion](https://www.framer.com/motion/) |
| **HTTP Client** | [Axios](https://axios-http.com/) |
| **Deployment** | [Vercel](https://vercel.com/) |

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) **v18+**
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)
- A running instance of the **FitFlix backend API**

### Installation

```bash
# Clone the repository
git clone https://github.com/Emporio-Labs/frontdesk-fitflix.git
cd frontdesk-fitflix

# Install dependencies (npm)
npm install

# Or using pnpm
pnpm install
```

### Environment Setup

Create a `.env` file at the project root (not `.env.local`):

```env
NEXT_PUBLIC_API_URL=http://localhost:3000   # Backend base URL
NEXT_PUBLIC_DEBUG_AUTH=1                   # Optional: logs auth debug info to console
```

> **Note:** `localhost` URLs automatically use `http://`; all other hostnames use `https://`.

### Running the App

```bash
# Start the development server (available at http://localhost:3001)
npm run dev

# Type-check without building
npx tsc --noEmit

# Production build
npm run build
npm start
```

---

## 📁 Project Structure

```
frontdesk-fitflix/
├── app/
│   ├── admin/          # Front-desk operations (users, bookings, leads, nutrition, etc.)
│   ├── dashboard/      # Workout plan builder (client-side only)
│   ├── login/          # Public auth entry point
│   └── api/            # Next.js route handlers (leads proxy, membership plans)
├── components/         # Shared UI components (status-badge, skeleton-loader, etc.)
├── hooks/              # React Query hooks (use-users, use-bookings, use-nutrition, etc.)
├── lib/
│   ├── api-client.ts   # Axios instance with auth interceptor
│   ├── services/       # One service file per backend resource
│   ├── query-keys.ts   # Centralised React Query key factory
│   ├── rbac.ts         # Role-based access control definitions
│   └── types/          # Shared TypeScript interfaces
├── stores/             # Zustand stores (workout plan builder)
└── middleware.ts        # Auth guard for /admin and /dashboard routes
```

---

## 💻 Usage

### Accessing the Dashboard

1. Navigate to `http://localhost:3001/login`
2. Sign in with your clinic credentials
3. You'll be redirected to the **Admin Dashboard** (`/admin`)

### Key Workflows

**Adding a new member:**
```
Admin → Users → New User → Fill profile → Save
```

**Creating a booking:**
```
Admin → Bookings → New Booking → Select slot → Assign member → Confirm
```

**Tracking nutrition:**
```
Admin → Nutrition → Plans → Assign Plan → Select member + template
```

**Building a workout plan:**
```
Dashboard → Workouts → New Plan → Drag & drop exercises → Save locally
```

---

## 🔐 Authentication & Roles

Authentication uses a JWT token stored in `localStorage` (`hh_token`). The middleware guards `/admin` and `/dashboard` routes via the `hh_authed` cookie.

| Role | Access Level |
|---|---|
| `super_admin` | Full access to all modules |
| `clinic_admin` | Full admin access |
| `staff` | Read access to most modules |
| `clinician` | Read + update clinical data |
| `sales` | Lead management focus |

---

## 🔌 API Integration

All API calls go through a single Axios instance at `lib/api-client.ts`:

- **Auth header:** `Authorization: Bearer <token>` is injected automatically on every non-auth request.
- **Direct backend:** Most services call the backend API directly.
- **Next.js proxy:** `/api/leads/*` proxies to the backend; `/api/membership-plans/*` is backed by a local JSON file store.

Set `NEXT_PUBLIC_DEBUG_AUTH=1` in your `.env` to log all requests/responses to the browser console during development.

---

## 📄 License

This project is licensed under the **MIT License**.

```
MIT License © 2025 Emporio Labs
```

You are free to use, modify, and distribute this software with attribution.

---

## 📬 Contact

| | |
|---|---|
| **Organisation** | [Emporio Labs](https://github.com/Emporio-Labs) |
| **Repository** | [frontdesk-fitflix](https://github.com/Emporio-Labs/frontdesk-fitflix) |
| **Issues** | [Open an issue](https://github.com/Emporio-Labs/frontdesk-fitflix/issues) |

---

<p align="center">Made with ❤️ by the Emporio Labs team</p>
