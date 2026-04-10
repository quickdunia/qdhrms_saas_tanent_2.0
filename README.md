# QD HRMS Cloud

Enterprise-style multi-tenant HRMS SaaS built with Next.js 14 App Router, TypeScript, Prisma 5, MySQL, Tailwind CSS, Zod, and server actions.

## Highlights

- Multi-tenant super-admin + tenant workspaces with strict `tenantId` isolation
- Role-aware dashboards for Super Admin, Tenant Admin, HR, payroll roles, and employees
- Core HR modules for users, roles, attendance, leave, payroll, approvals, announcements, notifications, and imports
- Extended operational modules for recruitment, onboarding, offboarding, helpdesk, assets, performance, training, workflows, integrations, document vault, and analytics
- Secure login, password hashing, OTP-based password setup/reset, session tracking, audit logs, and route protection
- Safe file handling for tenant logos, employee photos, employee documents, tickets, dynamic forms, notices, and vault records
- CSV, Excel, print-friendly export flows and printable payroll payslips
- Responsive SaaS UI with premium cards, filters, tables, workspace forms, and empty/loading/error states

## Tech Stack

- Next.js 14
- React 18
- TypeScript
- Prisma 5
- MySQL
- Tailwind CSS
- Zod
- JWT-backed session cookies + persisted auth sessions
- Nodemailer SMTP integration

## Workspace Structure

- `src/app/super-admin/*`: SaaS control center, tenants, security, and platform settings
- `src/app/t/[tenantSlug]/*`: tenant dashboards, settings, security, org structure, and protected module routes
- `src/app/t/[tenantSlug]/[moduleSlug]/*`: shared core + phase-two module workspaces and exports
- `src/actions/*`: guarded server actions for auth, org setup, employee lifecycle, operations, and module workflows
- `src/lib/auth/*`: session handling, OTP flows, permissions, route guards, and password utilities
- `src/lib/data/*`: dashboard queries, workspace datasets, exports, and pagination
- `src/components/*`: reusable UI primitives, forms, layout shell, responsive tables, and module workspaces
- `prisma/schema.prisma`: Prisma 5 schema for tenancy, auth, HR operations, payroll, files, approvals, and analytics
- `prisma/seed.ts`: seed plans and bootstrap super-admin data

## Environment

Copy `.env.example` to `.env` and set the required values:

```bash
DATABASE_URL="mysql://root:password@localhost:3306/qdhrms_saas"
APP_URL="http://localhost:3000"
AUTH_SECRET="replace-with-a-long-random-secret-at-least-32-characters"
OTP_SECRET="replace-with-a-second-long-random-secret-at-least-32-characters"

SUPER_ADMIN_EMAIL="owner@example.com"
SUPER_ADMIN_NAME="Platform Owner"

SMTP_HOST=""
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="QD HRMS <no-reply@example.com>"

SESSION_MAX_AGE_DAYS="7"
OTP_EXPIRY_MINUTES="10"
MAX_FAILED_LOGINS="5"
ACCOUNT_LOCK_MINUTES="15"

MAX_UPLOAD_SIZE_MB="8"
ALLOWED_IMAGE_MIME_TYPES="image/jpeg,image/png,image/webp"
ALLOWED_DOCUMENT_MIME_TYPES="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
```

Notes:

- `AUTH_SECRET` and `OTP_SECRET` should be different high-entropy secrets in production.
- If SMTP is not configured, OTP delivery falls back to local/server logging for development.
- Super admin bootstrap uses `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_NAME`.

## Local Setup

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

## Useful Scripts

- `npm run dev`: start local development server
- `npm run build`: Prisma generate + production build
- `npm run start`: run production server
- `npm run lint`: run Next.js linting
- `npm run typecheck`: run TypeScript checks
- `npm run verify`: run lint + typecheck
- `npm run db:generate`: regenerate Prisma client
- `npm run db:push`: push schema to the configured database
- `npm run db:migrate`: local development migration flow
- `npm run db:seed`: seed plans and bootstrap records

## Security and Production Readiness

- Password hashing with `bcryptjs`
- OTP-backed create-password and forgot-password flows
- JWT session cookies plus database-backed session revocation
- Role-based route and module protection
- Tenant-aware permission resolution with module overrides
- Input validation through Zod-backed server actions
- Audit logging for sensitive tenant and operational actions
- Upload MIME-type restrictions, size limits, isolated tenant folder structure, and hardened upload headers
- Prisma 5 compatible schema and scripts suitable for standard Node hosting

## File Storage

Uploads are written beneath `public/uploads` with separated buckets:

- `uploads/images/*`
- `uploads/documents/*`
- `uploads/mixed/*`

The app currently supports:

- Tenant logos
- Employee profile photos
- Employee supporting documents
- Candidate resumes
- Helpdesk attachments
- Dynamic form attachments
- Leave and attendance attachments
- Notice attachments
- Vault documents

## Exports and Reporting

- Shared module exports support CSV, Excel, and print-friendly output where applicable
- Payroll includes printable payslips
- Workspace tables are paginated and export-ready
- Analytics and operational workspaces expose reporting-friendly datasets through server routes

## Deployment Notes

- Use Node 18+ and a MySQL-compatible database
- Run `npm install`, `npm run db:generate`, and `npm run build` during deployment
- Run `npm run db:push` against the target environment before first use
- Seed only where appropriate for the target environment
- Persist the `public/uploads` directory or move the upload adapter to cloud storage for multi-instance production hosting
- Set `APP_URL` to the final public origin so OTP and email flows generate correct links

## Default Entry Points

- `/auth/login`
- `/auth/create-password`
- `/auth/forgot-password`
- `/super-admin`
- `/super-admin/tenants`
- `/super-admin/security`
- `/t/[tenantSlug]`
- `/t/[tenantSlug]/settings`
- `/t/[tenantSlug]/security`
- `/t/[tenantSlug]/[moduleSlug]`

## Verification

Recommended final checks:

```bash
npm run verify
npm run build
```
