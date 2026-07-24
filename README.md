<div align="center">

# 💰 Community Finance

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
  <img alt="License" src="https://img.shields.io/badge/license-Proprietary-lightgrey" />
</p>

</div>

---

A production-grade platform that runs a community's money in the open. It began for a single village of ~60 members and is built multi-tenant from day one, so the same deployment can serve **apartment associations, societies, clubs, temple committees, institutions, and trusts** — each with fully isolated data.

The core idea: **nothing about the community's finances is hidden.** Every member can see the balance, who has paid, every expense with its bill, event budgets, and donations — while personal member data stays private.

## ✨ Highlights

- 🏘️ **Multi-tenant** — every community's data is isolated *structurally* at the repository layer, not by per-endpoint discipline
- 🔐 **Secure auth** — phone + password, 15-min JWTs, rotating refresh tokens with **theft detection**, device tracking, account lockout
- 💳 **Payments, three ways** — Razorpay **AutoPay** subscriptions, one-time Razorpay **Pay** links, and manual cash/UPI with an approval queue — automatic PDF receipts for all
- 🎉 **Events with smart funding** — pick per event:
  - **From community balance** — funded from the shared balance
  - **Split among members** — a budget divided equally, **auto-recalculated** whenever membership changes
  - **Collect payment** — a fixed amount from each chosen member, each with a Pay button
- 🧾 **Expenses & income** — approval workflow, mandatory bills above a threshold, live budget tracking, donations/sponsorships
- 📊 **Reports & analytics** — daily→yearly, immutable month-end snapshots, correction *adjustments*, and **advanced exports** (any dataset, custom range + filters) to **PDF / Excel / CSV**
- 🔎 **Transparency & search** — global ⌘K search; every financial record visible to members
- 🛡️ **Append-only audit log** — mutation is blocked at the schema level; records actor, before/after, IP, device
- 🔔 **Realtime notifications** — Pusher channels + in-app center; payment, event, budget, and announcement alerts
- 🆓 **Zero-cron scheduling** — daily housekeeping (reminders, overdue marking, monthly close) self-triggers; **no paid infrastructure**

## 🖥️ Two apps, one API

| App | Who | Stack |
|---|---|---|
| **Admin dashboard + REST API** | Super admins & admins | Next.js 15 (App Router), Tailwind v4, ShadCN-style UI, TanStack Query, Recharts |
| **Member app** (+ admin tools) | Members on their phones | Expo SDK 54 / React Native 0.81, expo-router, **Material 3** (React Native Paper + NativeWind) |

Both share one type-safe contract — the same **Zod schemas, DTOs, enums, and money helpers** — from `packages/shared`.

## 🏗️ Architecture

Clean, layered, and boringly predictable:

```
route.ts  →  service  →  repository  →  model
```

- **Repository pattern** — `BaseRepository` injects `communityId` into every query/write, so tenant isolation can't be forgotten
- **Service layer** — all business rules live here (budget splitting, settlement pipeline, approvals, reports)
- **DI container** — services receive collaborators via constructor; tests swap in mocks with no framework
- **Uniform envelope** — every response is `{ success, data, error, meta }`; a global handler maps a typed `AppError` hierarchy to HTTP codes
- **Money as integer paise** — no floating-point drift, ever

```
Finance App/
├── apps/
│   ├── web/            Next.js 15 — admin dashboard + /api/v1 REST API
│   │   └── src/server/ models · repositories · services · middleware · lib
│   └── mobile/         Expo member app (Material 3, light-mode)
├── packages/
│   ├── shared/         Zod schemas · DTOs · enums · money constants
│   └── config/         shared tsconfig presets
└── turbo.json          Turborepo + npm workspaces
```

## 🚀 Quick start

```bash
# 1. Install (Node ≥ 20)
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

## 📱 Building the mobile APK

```bash
cd apps/mobile
npx expo prebuild --platform android --clean
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties
cd android && ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

Or use EAS for cloud builds and store distribution: `npx eas-cli build --platform android --profile preview`.

## 🔌 API

Versioned REST under `/api/v1`. Highlights:

| Area | Endpoints |
|---|---|
| **Auth** | login · refresh (rotating) · logout(-all) · sessions · change-password |
| **Members** | CRUD · status · reset-password · **bulk CSV import** |
| **Payments** | list · manual entry · review · refund · **pay** (Razorpay link) · delete |
| **Subscriptions** | create/cancel/resume AutoPay · webhook (idempotent) |
| **Events** | CRUD · status · **splits** · split-history · pay |
| **Expenses / Income / Documents** | CRUD · approval · signed uploads |
| **Reports** | live · snapshots · adjustments · export · **advanced export** |
| **Admin** | audit-logs · communities · notifications · settings · search · cron |

Full reference: [`docs/API.md`](docs/API.md).

## 🧪 Quality

```bash
npm run test        # services + integration (mongodb-memory-server):
                    #   budget-split math · token rotation & theft detection
                    #   tenant isolation · audit immutability
npm run typecheck   # strict TypeScript across the monorepo
npm run build       # production build
```

## ☁️ Deployment

- **API + dashboard** → Vercel (import repo, root `apps/web`, add env vars). Housekeeping self-triggers — no cron config needed.
- **Database** → MongoDB Atlas (allow network access).
- **Mobile** → EAS build → Play Store / internal APK.

## 🔒 Security

- Access tokens in memory only; refresh tokens in httpOnly `SameSite=Strict` cookies (web) / secure storage (mobile), rotated every use
- Aadhaar & Razorpay secrets **AES-256-GCM encrypted** at rest; logs and audit diffs redact secrets
- HMAC-verified, idempotent webhooks · Mongo-backed rate limiting · account lockout
- Audit logs and closed-period snapshots are **immutable** at the schema level

---

<div align="center">
<sub>Built by <b>Setups Works</b> · One codebase, every community.</sub>
</div>
