# Smart Scheduler SaaS

Production-oriented smart scheduling SaaS with deterministic weekly planning, date-specific event exceptions, blocked periods, configurable goal constraints, schedule history, adherence tracking, and validated calendar editing.

## Tech Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS, React Router, TanStack Query, React Hook Form, Zod
- Backend: NestJS, TypeScript, Prisma ORM, PostgreSQL, JWT, bcrypt, class-validator
- Deployment: Vercel-compatible frontend and independently deployable backend

## Folder Structure

```text
/
  frontend/   React web app
  backend/    NestJS API and Prisma schema
```

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- npm

## Environment

Copy examples before running locally:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Backend variables:

```text
DATABASE_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
PORT=4000
```

Frontend variables:

```text
VITE_API_URL=http://localhost:4000
```

## Install

```bash
cd backend && npm install
cd ../frontend && npm install
```

## Database

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
```

Optional development seed:

```bash
npm run seed
```

## Local Development

Run the API:

```bash
cd backend
npm run start:dev
```

Run the web app:

```bash
cd frontend
npm run dev
```

## Production Build

```bash
cd backend && npm run build
cd ../frontend && npm run build
```

## Current Features

- Register, login, refresh token, logout, and current-user endpoints
- JWT protected API with per-user ownership checks
- Deterministic scheduling for daily, weekday, weekend, and weekly goals
- Subject revision generated from subject-linked lectures
- Travel/rest reservation after the final lecture of each day
- Wake, sleep, weekday cutoff, fixed event, manual block, and locked block constraints
- Split allocation with 30-minute minimum blocks and structured unscheduled-time warnings
- Fixed-event overlap detection with structured conflict responses
- Preview/commit workflow that preserves locked and manual blocks
- Target-week navigation, manual block management, and generated-block locking
- Real dashboard metrics calculated from persisted weekly data
- Full create/edit/delete flows for events, subjects, and goals
- One-time events plus cancelled and overridden weekly occurrences
- Full-day and partial-day blocked periods
- Preferred/allowed goal days, preferred windows, and hard time constraints
- Per-goal split rules and block-size limits
- Maximum daily flexible workload and deterministic break insertion
- Immutable schedule-version snapshots, comparison, restore, and undo
- Validated drag-and-drop calendar moves and completion tracking
- Real weekly free-time intervals and adherence dashboard metrics
- Multi-step onboarding that persists real data through the backend
- Responsive dashboard, weekly view, settings, dark/light theme, and authenticated app layout

## Schedule API

- `POST /schedule/generate-preview`
- `POST /schedule/commit`
- `GET /schedule/week?weekStart=YYYY-MM-DD`
- `POST /schedule/blocks`
- `PATCH /schedule/blocks/:id`
- `DELETE /schedule/blocks/:id`
- `PATCH /schedule/blocks/:id/lock`
- `PATCH /schedule/blocks/:id/completed`
- `POST /schedule/validate-move`
- `GET /schedule/versions?weekStart=YYYY-MM-DD`
- `GET /schedule/versions/:id`
- `POST /schedule/versions/:id/restore`
- `GET /availability/week?weekStart=YYYY-MM-DD`

Event occurrence and blocking endpoints:

- `GET /events/occurrences/week?weekStart=YYYY-MM-DD`
- `GET /events/:id/exceptions`
- `POST /events/:id/exceptions`
- `DELETE /events/:id/exceptions/:exceptionId`
- `GET /blocked-periods?weekStart=YYYY-MM-DD`
- `POST /blocked-periods`
- `PATCH /blocked-periods/:id`
- `DELETE /blocked-periods/:id`

`weekStart` must be a Monday. Preview generation never changes persisted blocks; only commit writes a proposal.

## Verification

```bash
cd backend
npm run test
npm run test:integration
npm run lint
npm run build

cd ../frontend
npm run lint
npm run build
npm run test:e2e
```

Integration tests require `TEST_DATABASE_URL` and refuse to run unless the database name clearly contains `test`. Browser tests require `E2E_BASE_URL` and an API connected to that dedicated test database.

## Scheduler Scoring

Every candidate is filtered through hard constraints first: ownership-scoped fixed occurrences, blocked periods, locked/manual blocks, waking hours, cutoff, allowed days, earliest/latest times, daily workload, and split limits. Remaining candidates are scored deterministically in this order: preferred day, preferred time window, contiguous completion, usable duration, earlier completion, and lower existing daily workload. Equal inputs always produce equal output.

Productive intervals are tracked independently from fixed events. Once contiguous generated work reaches `breakAfterContinuousMinutes`, the engine reserves `minimumBreakMinutes` before another generated block can use that time.

## Phase 4 Recommendations

- Add reliable block resizing and keyboard-accessible calendar movement
- Add richer recurrence rules, semester ranges, and bulk holiday imports
- Add optimistic concurrency tokens for schedule commits and restores
- Add Google or Outlook Calendar sync with conflict reconciliation
- Add background generation, notifications, and deeper adherence trends
- Add billing plan enforcement and subscription management
- Add production observability, audit logs, retention controls, and database backups

## Deployment Notes

- Deploy `frontend/` to Vercel with `VITE_API_URL` pointing at the backend.
- Deploy `backend/` independently with PostgreSQL and the backend environment variables.
- Run Prisma migrations during backend release.
