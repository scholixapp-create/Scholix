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

## Business Rules — Commission

### Tier progression (by tutor's total completed sessions)
| Tier | Sessions | Platform fee | Tutor keeps |
|------|----------|-------------|-------------|
| Starter | 0–9 | 30% | 70% |
| Growth | 10–24 | 25% | 75% |
| Established | 25–49 | 20% | 80% |
| Expert | 50+ | 15% | 85% |

### Special free-session rules (evaluated in priority order)
1. **First student — lifetime free**: Tutor's very first student (stored as `tutors.firstStudentId`) = 0% commission on ALL their sessions, forever.
2. **First session free**: Any new tutor-student pair → first completed session = 0% commission.
3. Otherwise: apply the tier rate above.
- `commissionTier` on invoices: `first_student_free` | `first_session_free` | `standard` | `growth` | `established` | `expert`
- `isCommissionFree` boolean on sessions table marks 0%-commission sessions

### Other rules
- Minimum tutor hourly rate: **$65/hr**
- Sessions must be paid via `POST /api/payments/simulate` before a tutor can mark them complete
- Completing a session auto-generates an invoice with the correct commission applied

## DB Schema Tables

`users`, `tutors`, `availability`, `students`, `sessions`, `payments`, `invoices`, `tutor_documents`, `student_progress`

### Email Notifications
- **Transport**: mock (console log) when `RESEND_API_KEY` is not set; real Resend when set.
- **Events**: booking confirmation (session_booked), 24h reminder (session_reminder), session completed (session_completed)
- **Toggle**: `users.emailNotificationsEnabled` boolean (default true); checked in `notify.ts` before sending any email
- **UI**: `/settings` page available to all roles from the sidebar

### Tutor Onboarding Requirements
- **ABN** (Australian Business Number) — required field, 11 digits, stored in `tutors.abn`; validated on submit; links to ABR lookup + application guidance
- WWCC number, expiry, document upload (required)
- Education / qualifications (optional)

### Tutor Verification Fields (tutors table)
- `verificationStatus`: `pending_verification` | `approved` | `rejected`
- `wwccNumber`: WWCC card number (text)
- `wwccExpiry`: expiry date (text, ISO date)
- `educationDetails`: free-text VCE/tertiary details

### Tutor Documents (tutor_documents table)
- Uploaded files stored in `artifacts/api-server/uploads/`
- `docType`: `wwcc` | `education`
- Served via `GET /api/admin/documents/:docId` (admin only)

## API Routes

- `POST /api/auth/login`, `POST /api/auth/signup`, `POST /api/auth/logout`
- `GET /api/tutors` (approved only), `GET /api/tutors/:id`, `PUT /api/tutors/:id/profile`
- `GET /api/tutors/me` — own profile with verification status (auth required)
- `PUT /api/tutors/me/details` — update WWCC + education info
- `POST /api/tutors/me/documents` — upload document (multer, multipart)
- `POST /api/tutors/me/submit-verification` — mark as submitted
- `GET /api/tutors/:id/availability`, `PUT /api/tutors/:id/availability`
- `GET /api/students`, `POST /api/students`, `GET /api/students/:id`
- `GET/POST /api/sessions`, `POST /api/sessions/:id/complete`, `POST /api/sessions/:id/cancel`
- `GET /api/sessions/summary`
- `POST /api/payments/simulate`, `GET /api/payments`
- `GET /api/invoices?parentId=X` — parent invoice history
- `GET /api/invoices/:id/pdf` — PDF download
- `POST /api/sessions/:id/progress` — tutor logs progress (score 1–10, notes)
- `GET /api/sessions/:id/progress` — get single progress entry
- `GET /api/students/:id/progress` — student progress timeline (parent view)
- `POST /api/students/:id/verify-identity` — self-declare identity (dateOfBirth, declaration)
- `GET /api/admin/commission-stats` — free session counts + tier breakdown
- `GET /api/settings` — get user's emailNotificationsEnabled flag
- `PUT /api/settings` — update emailNotificationsEnabled flag
- `GET /api/admin/users`, `POST /api/admin/tutors/:id/approve`, `GET /api/admin/stats`
- `GET /api/admin/tutors/all` — all tutors with verification status + docs
- `POST /api/admin/tutors/:id/verify` — `{ action: "approve" | "reject" }`
- `GET /api/admin/documents/:docId` — secure document download

## File Uploads

- multer v2 installed in `api-server`; marked as `external` in `build.mjs`
- Files stored in `artifacts/api-server/uploads/` (not committed)
- Max file size: 10 MB; allowed types: PDF, JPG, PNG, WebP

## Frontend Pages

| Path | Role | Description |
|------|------|-------------|
| `/` | Public | Landing page (redirects to dashboard if logged in) |
| `/tutors` | Public | Tutor directory — searchable, no login required |
| `/login` | Public | Login with demo account table |
| `/signup` | Public | Signup; tutors redirected to /tutor/onboarding |
| `/tutor/dashboard` | Tutor | Stats + verification banner; links to onboarding |
| `/tutor/onboarding` | Tutor | WWCC upload + education details verification form |
| `/tutor/sessions` | Tutor | All sessions with complete/cancel + invoice modal |
| `/tutor/students` | Tutor | Student list with session history |
| `/tutor/availability` | Tutor | Set weekly slots + hourly rate |
| `/parent/dashboard` | Parent | Stats, upcoming sessions, book CTA |
| `/parent/tutors` | Parent | Browse approved tutors with subjects/rate |
| `/parent/book/:id` | Parent | 3-step: details → simulated payment → confirmation |
| `/parent/invoices` | Parent | Invoice history with PDF re-download |
| `/student/dashboard` | Student | Upcoming sessions, coming-soon features |
| `/admin/dashboard` | Admin | Platform stats, revenue, session breakdown |
| `/admin/users` | Admin | All users by role |
| `/admin/tutors` | Admin | Tutor verification — view docs, approve/reject |
| `/admin/sessions` | Admin | All sessions with filter |

## Tutor Status Flow

New tutor signs up → `verificationStatus = pending_verification`, `isApproved = false`
→ Redirected to `/tutor/onboarding` to upload WWCC + education docs
→ Admin reviews at `/admin/tutors`, clicks Approve or Reject
→ `verificationStatus = approved`, `isApproved = true` → tutor appears in search + can accept bookings

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
