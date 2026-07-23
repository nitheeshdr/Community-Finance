# Community Finance Management System

Enterprise-grade, multi-tenant finance management for villages, apartment associations, societies, clubs, temple committees, institutions, and trusts.

**Phase 1 (this repo):** Next.js 15 backend API + admin dashboard.
**Phase 2 (planned):** React Native mobile app for members, consuming the same API.

## Features

- **Multi-tenant** — every community's data is fully isolated, enforced structurally at the repository layer
- **Auth** — phone + password, JWT access tokens (15 min) + rotating refresh tokens with theft detection, device tracking, logout-everywhere, account lockout
- **Members** — CRUD, statuses (active/inactive/suspended), family details, encrypted Aadhaar, admin password resets
- **Monthly subscriptions** — configurable fee with versioned history, Razorpay AutoPay, manual cash/UPI with approval workflow, automatic PDF receipts
- **Events with auto budget splitting** — `perHead = ceil(budget / activeMembers)`, recalculates automatically on every membership change, full split history
- **Expenses** — always tied to an event, approval workflow, bill mandatory above a configurable threshold, budget tracking
- **Income** — subscriptions (automatic), donations, sponsorships, temple income, misc
- **Transparency** — every member can see all community finances (reports, bills, balances, who paid)
- **Reports** — daily/weekly/monthly/quarterly/yearly, immutable month-end snapshots, adjustment entries, PDF/Excel/CSV export
- **Audit log** — append-only (mutations blocked at the schema level), records actor, before/after, IP, device
- **Notifications** — in-app + Pusher realtime; payment reminders, failures, event and budget updates, announcements
- **Zero-cron scheduling** — daily housekeeping (reminders, overdue marking, monthly close) runs automatically via a lazy in-app trigger; no Vercel Cron or paid infrastructure required

## Stack

| Layer | Tech |
|---|---|
| Monorepo | Turborepo + npm workspaces |
| Web + API | Next.js 15 (App Router), TypeScript, Tailwind CSS v4, ShadCN-style UI |
| Data | MongoDB (Atlas), Mongoose 8 |
| State/data fetching | TanStack Query, React Hook Form, Zod (shared schemas in `packages/shared`) |
| Payments | Razorpay Subscriptions + webhooks |
| Files | Cloudinary (direct signed uploads) |
| Realtime | Pusher Channels |
| Exports | pdfkit, exceljs, CSV |
| Tests | Vitest + mongodb-memory-server |

## Repository layout

```
apps/web            Next.js app — admin dashboard + REST API (/api/v1)
  src/server        Backend core: models → repositories → services → controllers
  src/features      Per-module UI (hooks, forms, dialogs)
  src/app           Routes (App Router) — (auth), (dashboard), api/v1
  __tests__         Unit + integration tests (in-memory MongoDB)
packages/shared     Zod schemas, enums, DTO types, constants (shared with mobile in Phase 2)
packages/config     Shared tsconfig presets
```

Request flow: `route.ts → service → repository → model`. All amounts are stored as **integer paise**. Tenant scoping is injected by `BaseRepository` on every query.

## Getting started

```bash
# 1. Install
npm install

# 2. Configure
cp apps/web/.env.example apps/web/.env
#    - MONGODB_URI            (local MongoDB or Atlas)
#    - JWT secrets            (openssl rand -base64 48)
#    - FIELD_ENCRYPTION_KEY   (openssl rand -hex 32)
#    - SEED_* variables       (your community + super admin)

# 3. Bootstrap your community (no demo data — creates exactly what you configure)
npm run seed

# 4. Run
npm run dev            # http://localhost:3000
```

Log in with the super-admin phone number and password you set in `SEED_*`.

### Optional integrations

| Integration | Env vars | Needed for |
|---|---|---|
| Razorpay | `RAZORPAY_*` (or per-community in Settings → Razorpay) | AutoPay subscriptions, online payments, refunds |
| Cloudinary | `CLOUDINARY_*` | Bill/photo uploads, receipt PDF storage |
| Pusher | `PUSHER_*`, `NEXT_PUBLIC_PUSHER_*` | Realtime dashboard updates |

Everything else works without them.

### Razorpay webhooks

Point your Razorpay webhook to `POST /api/v1/webhooks/razorpay` with the same secret as `RAZORPAY_WEBHOOK_SECRET`. Locally, simulate one:

```bash
npm run simulate:webhook --workspace=@community-finance/web -- subscription.charged sub_XXXX 300
```

### Scheduled jobs (no cron required — works on the Vercel FREE plan)

All daily jobs (payment reminders, overdue marking, retry nudges, monthly close) are consolidated into a single race-safe routine that runs **at most once per day**, triggered automatically whenever anyone opens the dashboard. No Vercel Cron, no extra infrastructure.

Optionally, a free external scheduler (cron-job.org, GitHub Actions) can also hit
`GET /api/v1/cron/run` with `Authorization: Bearer $CRON_SECRET` to guarantee the run happens even on days nobody logs in.

## Testing & quality

```bash
npm run test          # 21 tests: budget split math, token rotation/theft detection,
                      # tenant isolation, audit immutability (in-memory MongoDB)
npm run typecheck     # strict TS across the monorepo
npm run build         # production build
```

## Deployment (Vercel)

1. Import the repo, set the root to the monorepo (Vercel auto-detects Turborepo; app dir `apps/web`)
2. Add all env vars from `.env.example`
3. Add the Razorpay webhook URL in the Razorpay dashboard
4. Done — daily housekeeping self-triggers from dashboard usage (free plan, no cron)

## API

Versioned REST under `/api/v1` with a uniform envelope `{ success, data, error, meta }`. See [docs/API.md](docs/API.md) for the full endpoint reference.

## Security notes

- Access tokens live in memory only; refresh tokens are httpOnly `SameSite=Strict` cookies scoped to `/api/v1/auth`
- Refresh tokens rotate on every use; reuse of a rotated token revokes the whole session family
- Aadhaar and Razorpay secrets are AES-256-GCM encrypted at rest; audit diffs and logs redact secrets
- Rate limiting (Mongo-backed fixed window) on auth and search; account lockout with backoff
- Webhooks are HMAC-verified (constant-time) and idempotent by event id
- Audit logs and closed-period snapshots are immutable at the schema level
