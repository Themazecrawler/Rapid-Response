# Rapid Response - Emergency Alert System

A native Android app (Kotlin + Jetpack Compose) for campus emergency alerting, backed by a
Node.js/Express + PostgreSQL API. Firebase owns identity, the app talks to its backend/Maps/etc.
directly over Retrofit, and everything is built with Compose + Hilt.

Previous React Native version has been moved to `legacy-react-native/` (kept for reference,
not deleted).

## Features

- **Emergency Alert System**: Real-time alerts with GPS location, building/floor, type and
  priority, submitted straight to the backend and visible to security staff.
- **Firebase Authentication**: Email/password sign-in and registration.
- **Emergency Contacts**: Campus security contact directory with one-tap calling.
- **My Location**: Live GPS position on a Google Map, with one-tap sharing.
- **Alert History**: Past alerts you've submitted, with status.

## Tech Stack

### App (`app/`)
- Kotlin + Jetpack Compose (Material3)
- Hilt for dependency injection
- Retrofit/OkHttp for the backend API, with a Firebase ID token attached to every request
- Firebase Authentication (email/password)
- Google Maps Compose + Fused Location for the location screen
- Navigation Compose

### Backend (`backend/`)
- Express.js + TypeScript
- PostgreSQL (via `pg`)
- Firebase Admin SDK verifies the ID token the app sends (no separate password/JWT system)
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

Create the database and run the migration:
```sql
CREATE DATABASE rapid_response_db;
```
```bash
psql -d rapid_response_db -f backend/migrations/001_initial_schema.sql
```

### 2. Android app

1. Copy `local.properties.example` to `local.properties` and fill in:
   - `MAPS_API_KEY` — a Google Maps SDK key (Google Cloud Console)
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
│       ├── model/             # DTOs shared with the backend API
│       ├── navigation/        # NavHost + screen routes
│       ├── network/           # Retrofit service + Firebase-token interceptor
│       ├── repository/        # Backend API repository
│       └── screens/           # auth, home, alert, contacts, location, history
├── backend/                   # Node.js/Express API
│   └── src/
│       ├── config/firebaseAdmin.ts
│       ├── middleware/         # Firebase token verification + user resolution
│       ├── routes/             # auth (sync), alerts, contacts, users
│       └── db/
└── legacy-react-native/        # Previous React Native implementation (kept for reference)
```

## API Endpoints

### Auth
- `POST /api/auth/sync` — creates/updates the Postgres profile row for the signed-in
  Firebase user (called once after register/login)

### Alerts
- `POST /api/alerts` — create new alert
- `GET /api/alerts/recent` — recent alerts (24h)

### Contacts
- `GET /api/contacts` — available emergency contacts
- `POST /api/contacts` — create new contact
- `PATCH /api/contacts/:id/availability` — update availability

### Users
- `GET /api/users/profile` / `PUT /api/users/profile`
- `GET /api/users/alerts` — the caller's alert history

All routes except `/api/auth/sync` require a Postgres profile to already exist (call sync
first) and a `Authorization: Bearer <Firebase ID token>` header.

## Known gaps

Crime/alert statistics & charts, prevention tips, SMS confirmation on submission, and PDF
export of reports aren't built here yet — planned as follow-up work.

## Testing

```bash
# Backend
cd backend && npm test

# Android
./gradlew test          # unit tests
./gradlew connectedCheck # instrumented tests (needs a device/emulator)
```
