# Community Finance — Member App (Expo)

React Native app for community members: dues, payments with receipts, event
budget shares, transparency stats, and notifications. Admins use the web
dashboard; this app is the member experience.

## Run it on your phone (no Android Studio / Xcode needed)

1. Install **Expo Go** from the Play Store / App Store
2. From the repo root:
   ```bash
   npm run start --workspace=@community-finance/mobile
   ```
3. Scan the QR code with Expo Go (Android) or the Camera app (iOS)
4. Log in with your member phone number + password

The app talks to the production API by default
(`https://finance-village-web.vercel.app`). To point it at a local dev server
instead, set the env var before starting (use your machine's LAN IP — your
phone can't reach `localhost`):

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.10:3001 npm run start --workspace=@community-finance/mobile
```

## Stack

- **Expo SDK 57** / React Native 0.86, TypeScript strict
- **expo-router** — file-based navigation (login gate → tabs)
- **NativeWind 4** (Tailwind class styling)
- **TanStack Query** — server state, pull-to-refresh everywhere
- **expo-secure-store** — refresh token in Keychain/Keystore; access token
  in memory only; rotation handled by the shared axios interceptor
- **@community-finance/shared** — same Zod schemas, DTOs, enums, and money
  helpers as the web app and API

## Screens

| Route | What it shows |
|---|---|
| `/login` | Phone + password sign-in |
| `/` (Home) | Community balance hero, my dues, transparency stats, upcoming events |
| `/payments` | AutoPay setup/status (Razorpay UPI mandate), payment history, receipt downloads |
| `/events` | All events with budget, per-head share, collection progress |
| `/events/[id]` | My contribution, budget summary, every member's paid status |
| `/more` | Notifications, change password, sign out (this device / everywhere) |

## Building for stores (later)

Use EAS: `npx eas build --platform android`. Requires an Expo account;
free tier is sufficient for internal distribution APKs.
