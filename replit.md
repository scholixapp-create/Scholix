# Scholix — Tutoring Platform

## Overview

Mobile-first tutoring platform web app with role-based dashboards. Full booking flow: tutor sets availability → parent books session → simulated payment → session completion → invoice with 70/30 split.

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS v4 (artifact: `scholix`, preview path `/`)
- **API framework**: Express 5 (artifact: `api-server`, path `/api`)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec → React Query hooks + Zod schemas)
- **Build**: esbuild (CJS bundle)

## Architecture

```
artifacts/
  scholix/          — React+Vite frontend (preview: /)
  api-server/       — Express 5 API (path: /api)
lib/
  api-spec/         — OpenAPI 3.0 spec + orval config + codegen script
  api-client-react/ — Generated React Query hooks (from orval)
  api-zod/          — Generated Zod schemas (from orval)
  db/               — Drizzle ORM schema + migrations + seed
```

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/db run seed` — re-seed the database

## Auth

- Token-based auth stored in `localStorage` (`scholix_token`, `scholix_user`)
- Token format: `base64(userId:timestamp)`
- Password hash: SHA256 with `scholix_salt`
- Auth header: `Authorization: Bearer <token>`

## Demo Credentials

| Role    | Email                    | Password   |
|---------|--------------------------|------------|
| Admin   | admin@scholix.com        | admin123   |
| Tutor   | tutor1@scholix.com       | tutor123   |
| Parent  | parent1@scholix.com      | parent123  |
| Student | student1@scholix.com     | student123 |

## Business Rules

- Platform commission: **30%** (tutor keeps 70%)
- Minimum tutor hourly rate: **$65/hr**
- Sessions must be paid via `POST /api/payments/simulate` before a tutor can mark them complete
- Completing a session auto-generates an invoice (70/30 split)

## DB Schema Tables

`users`, `tutors`, `availability`, `students`, `sessions`, `payments`, `invoices`

## API Routes

- `POST /api/auth/login`, `POST /api/auth/signup`, `POST /api/auth/logout`
- `GET/PUT /api/tutors`, `GET /api/tutors/:id`, `GET/PUT /api/tutors/:id/availability`
- `GET /api/students`, `POST /api/students`, `GET /api/students/:id`
- `GET/POST /api/sessions`, `POST /api/sessions/:id/complete`, `POST /api/sessions/:id/cancel`
- `GET /api/sessions/summary`
- `POST /api/payments/simulate`, `GET /api/payments`
- `GET /api/admin/users`, `PUT /api/admin/tutors/:id/approve`, `GET /api/admin/stats`

## Frontend Pages

| Path | Role | Description |
|------|------|-------------|
| `/` | Public | Landing page (redirects to dashboard if logged in) |
| `/login` | Public | Login with demo account table |
| `/signup` | Public | Signup with role selection |
| `/tutor/dashboard` | Tutor | Stats, upcoming sessions, quick actions |
| `/tutor/sessions` | Tutor | All sessions with complete/cancel + invoice modal |
| `/tutor/students` | Tutor | Student list with session history |
| `/tutor/availability` | Tutor | Set weekly slots + hourly rate |
| `/parent/dashboard` | Parent | Stats, upcoming sessions, book CTA |
| `/parent/tutors` | Parent | Browse tutors with subjects/rate |
| `/parent/book/:id` | Parent | 3-step: details → simulated payment → confirmation |
| `/student/dashboard` | Student | Upcoming sessions, coming-soon features |
| `/admin/dashboard` | Admin | Platform stats, revenue, session breakdown |
| `/admin/users` | Admin | All users by role |
| `/admin/tutors` | Admin | Approve/revoke tutor access |
| `/admin/sessions` | Admin | All sessions with filter |

## Codegen Notes

- `lib/api-spec/package.json` codegen script overwrites `lib/api-zod/src/index.ts` after orval to fix duplicate export issue
- `lib/api-spec/orval.config.ts` — `schemas` block removed to avoid duplicates
- Run codegen after any OpenAPI spec changes

## Email Notifications (Resend)

- Email sending is implemented in `artifacts/api-server/src/lib/email.ts` using the `resend` npm package
- Emails are sent on: session booked (→ tutor) and payment confirmed (→ parent)
- The server gracefully skips email if `RESEND_API_KEY` is not set — in-app notifications still work
- **TODO**: `RESEND_API_KEY` secret has not been configured yet. The Replit Resend integration was dismissed.
  - Option A: Re-connect via the Replit Resend integration panel
  - Option B: User provides API key manually → store as `RESEND_API_KEY` secret via environment-secrets skill
- Do NOT attempt to use the Resend integration without user completing the auth flow first

## Color Theme (Tailwind)

Navy sidebar + blue primary + emerald accent. Academic palette.
- Primary: hsl(222, 83%, 53%) — strong blue
- Accent: hsl(158, 64%, 42%) — emerald green
- Sidebar: hsl(222, 47%, 11%) — deep navy
