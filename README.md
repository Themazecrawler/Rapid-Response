# Rapid Response - Emergency Alert System

A native Android app (Kotlin + Jetpack Compose) for campus emergency alerting, backed by a
Node.js/Express + PostgreSQL API. Firebase owns identity, the app talks to its backend/Maps/etc.
directly over Retrofit, and everything is built with Compose + Hilt.

Previous React Native version has been moved to `legacy-react-native/` (kept for reference,
not deleted).

## Features

- **Emergency Alert System**: Real-time alerts with GPS location, building/floor, type and
  priority. Submission is offline-resilient (see "Offline-resilient alert delivery" below).
- **Firebase Authentication**: Email/password sign-in and registration.
- **Emergency Contacts**: Campus security contact directory with one-tap calling.
- **My Location**: Live GPS position on a Google Map, with one-tap sharing and a list of
  nearby police stations (Google Places) with distance and directions.
- **Alert History**: Past alerts you've submitted, with status.
- **Alert Statistics**: Campus-wide charts: alerts by type, priority, and day of week.
- **SMS Confirmation**: If you leave a phone number on an alert, the backend sends a Twilio
  SMS confirming it was received. Twilio credentials live server-side only and are never
  shipped inside the APK.
- **Push Notifications**: security/admin staff get an immediate push notification when a new
  alert comes in, and tapping it opens a campus-wide "Incoming Alerts" feed (see "Push
  notifications for staff" below).

## Tech Stack

### App (`app/`)
- Kotlin + Jetpack Compose (Material3)
- Hilt for dependency injection
- Retrofit/OkHttp for the backend API, with a Firebase ID token attached to every request
- Firebase Authentication (email/password)
- Google Maps Compose + Fused Location + Places SDK for the location screen
- Navigation Compose
- Vico (`compose-m3`) for the statistics charts
- Room + WorkManager for the offline alert queue (see below)
- Firebase Cloud Messaging for staff push notifications

### Backend (`backend/`)
- Express.js + TypeScript
- PostgreSQL (via `pg`)
- Firebase Admin SDK verifies the ID token the app sends (no separate password/JWT system)
- Twilio for SMS confirmations (optional, no-ops if unconfigured)
- Helmet, CORS, rate limiting

## Setup

### 1. Backend

```bash
cd backend
npm install
cp env.example .env   # fill in DB credentials + Firebase service account
npm run dev
```

The backend needs a Firebase service account (Firebase Console → Project Settings → Service
Accounts → Generate new private key) so it can verify ID tokens from the app. See
`backend/env.example` for the exact fields.

Create the database and run the migrations, in order:
```sql
CREATE DATABASE rapid_response_db;
```
```bash
psql -d rapid_response_db -f backend/migrations/001_initial_schema.sql
psql -d rapid_response_db -f backend/migrations/002_add_reporter_phone.sql
psql -d rapid_response_db -f backend/migrations/003_add_client_alert_id.sql
psql -d rapid_response_db -f backend/migrations/004_add_device_tokens.sql
```

To actually see the "Incoming Alerts" screen and receive pushes, a user's `role` needs to be
`security` or `admin` (registration always sets `student` — update it directly in the
database for now, e.g. `UPDATE users SET role = 'security' WHERE email = '...'`; there's no
admin UI for role management yet).

### 2. Android app

1. Copy `local.properties.example` to `local.properties` and fill in:
   - `MAPS_API_KEY` — a Google Maps key with both the **Maps SDK for Android** and
     **Places API** enabled (Google Cloud Console) — the Location screen uses both
   - `API_BASE_URL` — where your backend is reachable from the device/emulator
     (`http://10.0.2.2:5000/` reaches your host machine's localhost from the emulator)
2. `app/google-services.json` is already wired to the `ai-rapid-response` Firebase project.
   If you're pointing at your own Firebase project, replace it and enable
   Email/Password sign-in under Authentication.
3. Open the project root in Android Studio, or build from the CLI:
   ```bash
   ./gradlew assembleDebug
   ```

## Project Structure

```
Rapid-Response/
├── app/                      # Native Android app (Kotlin/Compose)
│   └── src/main/java/com/example/rapidresponse/
│       ├── auth/             # Firebase-backed AuthViewModel
│       ├── data/             # Static UI data (nav drawer items)
│       ├── di/                # Hilt modules
│       ├── local/              # Room: PendingAlertEntity/Dao/AppDatabase (offline queue)
│       ├── model/             # DTOs shared with the backend API
│       ├── navigation/        # NavHost + screen routes
│       ├── network/           # Retrofit service + Firebase-token interceptor
│       ├── notifications/      # FCM service, notification channel, tap-to-navigate bridge
│       ├── queue/              # AlertQueueManager + AlertSyncWorker (offline delivery)
│       ├── repository/        # Backend API repository
│       └── screens/           # auth, home, alert, contacts, location, history, statistics,
│                                # incoming (staff-only campus-wide feed)
├── backend/                   # Node.js/Express API
│   └── src/
│       ├── config/            # firebaseAdmin.ts, twilio.ts
│       ├── middleware/         # Firebase token verification + user resolution + requireRole
│       ├── routes/             # auth (sync), alerts, contacts, users
│       ├── services/           # sms.ts (Twilio), push.ts (FCM to staff)
│       ├── utils/serializers.ts # snake_case DB rows -> camelCase API responses
│       └── db/
└── legacy-react-native/        # Previous React Native implementation (kept for reference)
```

## API Endpoints

### Auth
- `POST /api/auth/sync` — creates/updates the Postgres profile row for the signed-in
  Firebase user (called once after register/login)

### Alerts
- `POST /api/alerts` — create new alert. Requires `clientAlertId` (a client-generated UUID);
  retrying the same `clientAlertId` returns the original alert instead of creating a
  duplicate (see "Offline-resilient alert delivery" below). If `reporterPhone` is included,
  a Twilio SMS confirmation is sent on first creation only (fire-and-forget; failures don't
  fail the request)
- `GET /api/alerts/recent` — recent alerts (24h), campus-wide (not scoped to the caller).
  **Restricted to `security`/`admin`** — this is what push notifications link to
- `GET /api/alerts/stats` — aggregate counts by type/priority/status/day-of-week, for the Statistics screen

### Contacts
- `GET /api/contacts` — available emergency contacts
- `POST /api/contacts` — create new contact
- `PATCH /api/contacts/:id/availability` — update availability

### Users
- `GET /api/users/profile` / `PUT /api/users/profile`
- `GET /api/users/alerts` — the caller's alert history
- `POST /api/users/device-token` — registers/reassigns an FCM token for push notifications.
  Called by every signed-in device; only `security`/`admin` devices actually get pushed to

All routes except `/api/auth/sync` require a Postgres profile to already exist (call sync
first) and a `Authorization: Bearer <Firebase ID token>` header.

## Offline-resilient alert delivery

Submitting an alert (`AlertViewModel.submitAlert`) doesn't make a network call directly. It
writes the alert to a local Room table (`pending_alerts`) with a client-generated UUID
(`clientAlertId`) and returns immediately — the UI shows "saved" and navigates back based on
that local write succeeding, not on any network response. A WorkManager job
(`AlertSyncWorker`) then delivers it in the background:

- Runs only when the device has network connectivity, with exponential backoff between
  attempts, and survives process death/app restarts.
- After 8 failed attempts it stops retrying automatically and marks the alert `failed` —
  visible on the Home screen (a banner) and the Alert History screen (with **Retry now** /
  **Discard** actions), so a failure is never silent.
- On successful delivery the local row is deleted; the alert then shows up through the normal
  `/api/users/alerts` history like any other.
- `clientAlertId` makes retries safe: if an earlier attempt actually reached the server but
  the response was lost (timeout, connection drop mid-response), the backend's
  `ON CONFLICT (client_alert_id) DO NOTHING` returns the original alert instead of creating a
  second one — and the SMS confirmation only fires on the actual first insert.
- `RapidResponseApplication.onCreate` also re-arms delivery for anything still `pending` at
  cold start, as a safety net on top of WorkManager's own persistence.

## Push notifications for staff

Before this, the only way to learn about a new alert was to manually open the app and pull to
refresh - nothing pushed a notification to anyone. Now:

- Every signed-in device registers its FCM token (`POST /api/users/device-token`) on sign-in
  and whenever the token rotates (`FirebaseMessagingService.onNewToken`). Registration
  happens regardless of role - it's cheap, and it means a student later promoted to
  `security` starts getting notified without reinstalling or re-registering anything.
- When a *new* alert is created (not a retried duplicate - see `isNewAlert` in
  `routes/alerts.ts`), the backend looks up device tokens belonging to `security`/`admin`
  users (excluding the reporter's own devices) and sends a data-only FCM message
  (`services/push.ts`). Stale tokens (uninstalled app, etc.) are pruned automatically based on
  FCM's per-token error codes.
- The client (`RapidResponseFirebaseMessagingService`) builds the notification itself from
  that data payload - this is deliberate: a data-only message (no `notification` payload)
  guarantees consistent handling across foreground/background instead of relying on the
  system tray's automatic display, which only happens when the app isn't in the foreground.
- Tapping the notification opens `IncomingAlertsScreen` - a campus-wide feed of everything
  reported in the last 24h (`GET /api/alerts/recent`, which existed as an endpoint before but
  had no screen calling it). This is also the first place `role` is actually enforced
  anywhere in the app: the route requires `security`/`admin` server-side
  (`requireRole` middleware), and the drawer entry only appears client-side for those roles.


## Testing

```bash
# Backend
cd backend && npm test

# Android
./gradlew test          # unit tests
./gradlew connectedCheck # instrumented tests (needs a device/emulator)
```
