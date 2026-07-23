# API Reference

Base URL: `/api/v1` · All responses use the envelope:

```json
{ "success": true,  "data": {}, "meta": { "page": 1, "limit": 20, "total": 0, "totalPages": 1 } }
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "…", "details": {} } }
```

**Auth:** `Authorization: Bearer <accessToken>` on every endpoint unless marked *public*.
Web clients also receive the refresh token as an httpOnly cookie (`cf_refresh`, path `/api/v1/auth`).
**Amounts:** responses carry integer **paise**; request bodies accept **rupees**.
**Roles:** `SUPER_ADMIN` ⊃ `ADMIN` ⊃ `MEMBER`. All read endpoints are member-visible (transparency) unless noted.

## Auth

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/auth/login` | public (rate-limited) | `{ phone, password }` → user + access token + refresh cookie |
| POST | `/auth/refresh` | public | Rotates the refresh token; reuse of a rotated token revokes the session family |
| POST | `/auth/logout` | public | Revokes the current session family, clears the cookie |
| POST | `/auth/logout-all` | any | Revokes every session for the caller |
| GET | `/auth/me` | any | Current user profile |
| GET | `/auth/sessions` | any | Active sessions with device/browser/IP |
| DELETE | `/auth/sessions/:id` | any | Revoke one session |
| POST | `/auth/change-password` | any | `{ currentPassword, newPassword, confirmPassword }`; revokes all sessions |

## Members

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/members` | any | List; `search`, `status`, `role`, pagination |
| POST | `/members` | admin | Create member (`role: ADMIN` requires super admin); triggers split recalc |
| GET | `/members/:id` | any | Detail (Aadhaar always masked) |
| PATCH | `/members/:id` | admin | Update |
| DELETE | `/members/:id` | admin | Soft delete (payment history preserved); triggers split recalc |
| POST | `/members/:id/status` | admin | `{ status, reason }` — activate/deactivate/suspend; triggers split recalc |
| POST | `/members/:id/reset-password` | admin | `{ newPassword }`; member must change on next login |

## Payments & subscriptions

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/payments` | any | List; filter by `memberId`, `eventId`, `type`, `method`, `status`, `period`, dates |
| POST | `/payments` | admin | Record manual cash/UPI payment → PENDING (approval queue) |
| POST | `/payments/:id/review` | admin | `{ action: APPROVE\|REJECT, reason? }` — approval settles: income row, receipt PDF, split credit, notification |
| POST | `/payments/:id/refund` | super admin | `{ reason }` — Razorpay refund when applicable; reverses income + split |
| POST | `/subscriptions` | self/admin | `{ memberId }` → creates Razorpay plan+subscription, returns AutoPay authorization `shortUrl` |
| GET | `/subscriptions/:memberId` | self/admin | Live subscription or null |
| DELETE | `/subscriptions/:memberId` | self/admin | Cancel (`{ cancelAtCycleEnd, reason? }`) |
| POST | `/subscriptions/:memberId` | self/admin | Resume (creates a fresh subscription) |
| POST | `/webhooks/razorpay` | Razorpay (HMAC) | Idempotent processing of `subscription.charged`, `payment.failed`, `refund.processed`, status events |

## Events & budget splits

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/events` | any | List; `search`, `status`, `category`, `year`, `month` |
| POST | `/events` | admin | Create; budget cannot exceed balance unless super admin sets `budgetOverride`; splits calculated immediately |
| GET/PATCH/DELETE | `/events/:id` | any / admin / super admin | Detail, edit (budget change recalcs splits), delete (only if no expenses/collections) |
| POST | `/events/:id/status` | admin | Close requires all expenses reconciled |
| GET | `/events/:id/splits` | any | Per-member share, paid, pending |
| GET | `/events/:id/split-history` | any | Every recalculation with trigger + member count |

## Expenses, income, documents

| Method | Path | Access | Description |
|---|---|---|---|
| GET/POST | `/expenses` | any / admin | Every expense belongs to an event; bill mandatory ≥ configured threshold |
| PATCH/DELETE | `/expenses/:id` | admin | Approved expenses can't be edited (use adjustments); edits re-enter approval |
| POST | `/expenses/:id/review` | admin | Approve (updates budgets/balance immediately) or reject; no self-approval |
| GET/POST | `/income` | any / admin | Donations, sponsorships, temple, misc; subscription income is automatic |
| PATCH/DELETE | `/income/:id` | admin / super admin | Payment-linked income is immutable (refund instead) |
| GET/POST | `/documents` | any / admin | List / register after direct upload |
| DELETE | `/documents/:id` | admin | Also removes from Cloudinary |
| GET | `/documents/sign-upload?folder=bills` | admin | Signed params for direct browser→Cloudinary upload |

## Reports & analytics

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/dashboard` | any | Balance, trends (12 mo), comparisons, top categories, upcoming events; also lazily triggers daily housekeeping |
| GET | `/reports?period=MONTHLY&date=…` | any | DAILY/WEEKLY/MONTHLY/QUARTERLY/YEARLY; closed months serve the immutable snapshot |
| GET | `/reports/export?format=PDF\|EXCEL\|CSV` | any | Print-ready file download (audited) |
| GET/POST | `/reports/snapshots` | any / super admin | List snapshots / close a month (freezes figures permanently) |
| POST | `/reports/adjustments` | super admin | `{ entity: INCOME\|EXPENSE, amount(±), reason }` — the only way to correct closed periods |

## Notifications, search, settings

| Method | Path | Access | Description |
|---|---|---|---|
| GET/POST | `/notifications` | any / admin | List own / send announcement or emergency broadcast |
| POST | `/notifications/:id/read`, `/notifications/read-all` | any | Mark read |
| GET | `/notifications/unread-count` | any | Badge count |
| GET | `/search?q=…` | any | Global search: members, events, expenses, payments, documents |
| GET/PATCH | `/settings` | admin / super admin | Categories, bill threshold, notification prefs, theme, language |
| PUT | `/settings/razorpay` | super admin | Write-only encrypted credentials |
| GET/PUT | `/settings/fee-config` | any / super admin | Current fee + full history / new versioned fee |
| POST | `/realtime/auth` | any | Pusher private-channel auth (own community channel only) |

## Administration

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/audit-logs` | admin | Read-only; filter by action/entity/user/date. Append-only at the DB level |
| GET/POST | `/communities` | super admin | Cross-tenant community management + onboarding (community + bootstrap admin + defaults) |
| GET/POST | `/cron/run` | `Bearer CRON_SECRET` | Consolidated daily housekeeping: reminders, overdue+late fee, retry nudges, monthly close. Race-safe, once per day |

## Error codes

`VALIDATION_ERROR` 400 · `UNAUTHORIZED` 401 · `FORBIDDEN` 403 · `NOT_FOUND` 404 · `CONFLICT` 409 · `BUSINESS_RULE_VIOLATION` 422 · `RATE_LIMITED` 429 (`Retry-After` header) · `INTERNAL_ERROR` 500 · `EXTERNAL_SERVICE_ERROR` 502
