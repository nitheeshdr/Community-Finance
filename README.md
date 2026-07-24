<div align="center">

<img src="docs/logo.png" alt="Community Finance" width="120" height="120" />

# Community Finance

### Transparent, multi-tenant finance management for communities

Monthly subscriptions · Auto-split event budgets · Razorpay AutoPay · Full financial transparency

<p>
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white" />
  <img alt="Expo" src="https://img.shields.io/badge/Expo-SDK%2054-000020?logo=expo&logoColor=white" />
  <img alt="React Native" src="https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react&logoColor=black" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white" />
  <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white" />
  <img alt="Razorpay" src="https://img.shields.io/badge/Razorpay-Subscriptions-0C2451?logo=razorpay&logoColor=white" />
  <img alt="Turborepo" src="https://img.shields.io/badge/Turborepo-monorepo-EF4444?logo=turborepo&logoColor=white" />
</p>

</div>

---

A production-grade platform that runs a community's money in the open. It began for a single village of ~60 members and is built multi-tenant from day one, so the same deployment can serve **apartment associations, societies, clubs, temple committees, institutions, and trusts** — each with fully isolated data.

The core idea: **nothing about the community's finances is hidden.** Every member can see the balance, who has paid, every expense with its bill, event budgets, and donations — while personal member data stays private.

## Highlights

- **Multi-tenant** — every community's data is isolated *structurally* at the repository layer, not by per-endpoint discipline
- **Secure auth** — phone + password, 15-minute JWTs, rotating refresh tokens with theft detection, device tracking, account lockout
- **Payments, three ways** — Razorpay AutoPay subscriptions, one-time Razorpay pay links, and manual cash/UPI with an approval queue — automatic PDF receipts for all
- **Events with smart funding** — pick per event:
  - **From community balance** — funded from the shared balance
  - **Split among members** — a budget divided equally, auto-recalculated whenever membership changes
  - **Collect payment** — a fixed amount from each chosen member, each with a Pay button
- **Expenses & income** — approval workflow, mandatory bills above a threshold, live budget tracking, donations and sponsorships
- **Reports & analytics** — daily to yearly, immutable month-end snapshots, correction adjustments, and advanced exports (any dataset, custom range + filters) to PDF / Excel / CSV
- **Transparency & search** — global command-palette search; every financial record visible to members
- **Append-only audit log** — mutation is blocked at the schema level; records actor, before/after, IP, device
- **Realtime notifications** — Pusher channels and an in-app center; payment, event, budget, and announcement alerts
- **Zero-cron scheduling** — daily housekeeping (reminders, overdue marking, monthly close) self-triggers; no paid infrastructure

## The two applications

| Application | Audience | Stack |
|---|---|---|
| **Admin dashboard + REST API** | Super admins and admins | Next.js 15 (App Router), Tailwind v4, ShadCN-style UI, TanStack Query, Recharts |
| **Member app** (with admin tools) | Members, on their phones | Expo SDK 54 / React Native 0.81, expo-router, Material 3 (React Native Paper + NativeWind) |

Both are driven by **one type-safe contract** — the same Zod schemas, DTOs, enums, and money helpers — published from `packages/shared`.

---

## Architecture

The system is a **Turborepo monorepo** with two front-ends and one backend. The Next.js app is *both* the admin dashboard and the REST API; the Expo app is a pure client of that API. There is exactly one source of truth for every type, rule, and number.

```
                            ┌──────────────────────────────────────────┐
                            │              packages/shared               │
                            │   Zod schemas · DTOs · enums · money       │
                            │   helpers  (imported by BOTH front-ends    │
                            │   and the API — one contract)              │
                            └──────────────────────────────────────────┘
                                 ▲                              ▲
              imports types &    │                              │   imports types &
              validation         │                              │   validation
                                 │                              │
   ┌─────────────────────────────┴────────┐        ┌────────────┴──────────────────────┐
   │        apps/mobile  (Expo)            │        │        apps/web  (Next.js 15)       │
   │  React Native · Material 3 · Paper    │        │  ┌───────────────────────────────┐  │
   │                                       │        │  │  Admin dashboard (React)       │  │
   │  Screens (member + admin tools)       │        │  │  TanStack Query · Recharts     │  │
   │        │                              │        │  └───────────────┬───────────────┘  │
   │  TanStack Query hooks                 │        │                  │ same-origin fetch │
   │        │                              │        │                  ▼                   │
   │  Axios client                         │        │  ┌───────────────────────────────┐  │
   │   • access token in memory            │        │  │  REST API  /api/v1  (routes)   │  │
   │   • refresh token in SecureStore      │        │  │        │                       │  │
   │        │                              │        │  │  withApi()  middleware:        │  │
   └────────┼──────────────────────────────┘        │  │   auth · RBAC · rate-limit ·   │  │
            │                                        │  │   Zod validate · audit ctx     │  │
            │   HTTPS  Bearer <accessToken>          │  │        │                       │  │
            └───────────────────────────────────────┼─▶│  Controller → Service →        │  │
                        REST /api/v1                 │  │  Repository → Mongoose model   │  │
                                                     │  └───────────────┬───────────────┘  │
   ┌───────────────────────┐   webhooks              │                  │                   │
   │  Razorpay             │──────────────────────────▶│  (payment settlement pipeline)   │
   │  subscriptions/links  │   payment_link.paid …    │                  ▼                   │
   └───────────────────────┘                          └──────────────────┼──────────────────┘
                                                                          │
        ┌───────────────┐      ┌───────────────┐      ┌──────────────────▼──────────────┐
        │  Pusher       │◀─────│  realtime      │      │  MongoDB Atlas                   │
        │  channels     │      │  fan-out       │      │  (tenant-scoped collections)     │
        └───────┬───────┘      └───────────────┘      └──────────────────────────────────┘
                │ private-community-{id}
                └──────────────▶ both front-ends subscribe for live updates

                Cloudinary  ◀──  signed direct uploads (bills, photos) + receipt PDFs
```

### Backend — layered, one direction of flow

Every request travels the same path; a layer never reaches around the one beneath it.

```
route.ts  →  service  →  repository  →  Mongoose model
```

- **`route.ts`** — thin. Wrapped by `withApi()`, which connects to Mongo, runs a fixed-window rate limiter, verifies the JWT, enforces role-based access, parses the body/query with a Zod schema, and seeds an `AsyncLocalStorage` request context (actor + device) for the audit trail. It then delegates and never touches a model directly.
- **Service layer** — all business rules: the budget-split engine, the payment settlement pipeline, approval workflows, report aggregation, adjustments. Services are assembled by a small **DI container** so tests inject mocks with no framework.
- **Repository layer** — data access. `BaseRepository` **injects `communityId` into every query and write**, so multi-tenant isolation is structural: a developer literally cannot forget it. Cross-tenant super-admin operations use dedicated repositories.
- **Models** — Mongoose schemas with compound `{ communityId, … }` indexes. Two collections (audit log, closed-period snapshots) block updates and deletes at the schema level — they are append-only by construction.

Cross-cutting guarantees: a uniform `{ success, data, error, meta }` envelope; a typed `AppError` hierarchy mapped to HTTP codes by one global handler; and **all money stored as integer paise** to eliminate floating-point drift.

### Web app — dashboard and API in one deployment

`apps/web` is a single Next.js 15 project. Route handlers under `app/api/v1/**` are the backend above; the React pages under `app/(dashboard)/**` are the admin UI that calls them same-origin. Server state is TanStack Query; forms are React Hook Form + the shared Zod schemas; charts are Recharts. The dashboard is fully responsive with a mobile drawer.

### Mobile app — a first-class API client

`apps/mobile` (Expo) renders the member experience and admin tools in Material 3. It holds no business logic — it calls the same `/api/v1`. Its Axios client keeps the **access token in memory** and the **refresh token in the device keychain** (expo-secure-store); a response interceptor transparently rotates on 401 and retries. Members log in with phone + password, see their dues and event shares, and pay via Razorpay links opened in the browser. Admins get an extra, role-gated tab for members, approvals, events, and collections.

### How the two apps interact

They never talk to each other — they converge on the API and the shared package.

1. **One contract.** `packages/shared` exports every Zod schema, DTO type, enum, and money helper. The API validates requests with a schema; the web and mobile clients build requests against the *same* schema and render the *same* DTO types. A change to a rule or field is a single edit that both front-ends and the server pick up.
2. **One API, two auth transports.** The `/auth/*` endpoints issue an access token plus a rotating refresh token. Web stores the refresh token in an httpOnly `SameSite=Strict` cookie; mobile stores it in secure storage and sends it in the request body. The same rotation-with-theft-detection logic serves both.
3. **One realtime channel.** After a payment settles or a budget recalculates, the server persists the change and fans out on the community's private Pusher channel. Both the dashboard and the mobile app subscribe and update live.
4. **Shared side effects.** Whether a payment arrives from an admin's manual approval on the web, a member's Razorpay pay link on mobile, or an AutoPay webhook, it runs the *same* settlement pipeline — income row, receipt PDF, event-split credit, notification, audit entry — so the two apps always agree on the numbers.

```
Finance App/
├── apps/
│   ├── web/            Next.js 15 — admin dashboard + /api/v1 REST API
│   │   └── src/server/ models · repositories · services · middleware · lib
│   └── mobile/         Expo member app (Material 3, light mode)
├── packages/
│   ├── shared/         Zod schemas · DTOs · enums · money constants
│   └── config/         shared tsconfig presets
└── turbo.json          Turborepo + npm workspaces
```

---

## Quick start

```bash
# 1. Install (Node >= 20)
npm install

# 2. Configure the API + dashboard
cp apps/web/.env.example apps/web/.env
#    MONGODB_URI, JWT secrets (openssl rand -base64 48),
#    FIELD_ENCRYPTION_KEY (openssl rand -hex 32), SEED_* values

# 3. Bootstrap your community + super admin (no demo data)
npm run seed

# 4. Run the dashboard
npm run dev            # http://localhost:3000

# 5. Run the member app on your phone (Expo Go)
npm run mobile         # scan the QR code
```

### Optional integrations

| Integration | Enables | Env |
|---|---|---|
| **Razorpay** | AutoPay, online payments, refunds | `RAZORPAY_*` (or per-community in Settings) |
| **Cloudinary** | Bill/photo uploads, receipt PDFs | `CLOUDINARY_*` |
| **Pusher** | Realtime dashboard + notifications | `PUSHER_*`, `NEXT_PUBLIC_PUSHER_*` |

Everything else runs without them.

## Building the mobile APK

```bash
cd apps/mobile
npx expo prebuild --platform android --clean
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties
cd android && ./gradlew assembleRelease
# -> android/app/build/outputs/apk/release/app-release.apk
```

Or use EAS for cloud builds and store distribution: `npx eas-cli build --platform android --profile preview`.

## API

Versioned REST under `/api/v1`.

| Area | Endpoints |
|---|---|
| **Auth** | login · refresh (rotating) · logout(-all) · sessions · change-password |
| **Members** | CRUD · status · reset-password · bulk CSV import |
| **Payments** | list · manual entry · review · refund · pay (Razorpay link) · delete |
| **Subscriptions** | create/cancel/resume AutoPay · webhook (idempotent) |
| **Events** | CRUD · status · splits · split-history · pay |
| **Expenses / Income / Documents** | CRUD · approval · signed uploads |
| **Reports** | live · snapshots · adjustments · export · advanced export |
| **Admin** | audit-logs · communities · notifications · settings · search · cron |

Full reference: [`docs/API.md`](docs/API.md).

## Quality

```bash
npm run test        # services + integration (mongodb-memory-server):
                    #   budget-split math · token rotation & theft detection
                    #   tenant isolation · audit immutability
npm run typecheck   # strict TypeScript across the monorepo
npm run build       # production build
```

## Deployment

- **API + dashboard** — Vercel (import repo, root `apps/web`, add env vars). Housekeeping self-triggers, so no cron configuration is needed.
- **Database** — MongoDB Atlas (allow network access).
- **Mobile** — EAS build, then Play Store or internal APK.

## Security

- Access tokens live in memory only; refresh tokens in httpOnly `SameSite=Strict` cookies (web) or secure storage (mobile), rotated every use
- Aadhaar and Razorpay secrets are AES-256-GCM encrypted at rest; logs and audit diffs redact secrets
- HMAC-verified, idempotent webhooks · Mongo-backed rate limiting · account lockout
- Audit logs and closed-period snapshots are immutable at the schema level

---

<div align="center">

<a href="https://setups.works"><img src="docs/setups-works.png" alt="Setups Works" width="220" /></a>

Built by **Nitheesh Rajendran** — Founder, Setups Works

Website: [https://setups.works](https://setups.works) · Email: [info@setups.works](mailto:info@setups.works)

</div>
