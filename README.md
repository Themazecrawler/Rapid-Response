# Rapid Response

A campus emergency alert system. Students report an emergency from an Android app, and campus
security and admin staff are notified immediately.

- **Android app** (`app/`): Kotlin and Jetpack Compose. Sends alerts with location, works offline
  and delivers when the connection returns, and shows contacts, history, statistics and a map.
- **Backend** (`backend/`): Node.js, Express and PostgreSQL. Verifies Firebase sign-ins, stores
  alerts, and notifies staff by push notification and live feed. It can also text the reporter.

## Architecture

```
Android app ──HTTPS /api/v1──> Express API ──> PostgreSQL
   │  Room + WorkManager          │  routes -> services -> repositories
   │  (offline queue, retry)      ├─ Firebase Admin: verifies ID tokens, sends push
   └── FCM push / SSE stream <────┴─ Twilio: SMS confirmation, delivery webhook
```

- Alerts are saved on the device first and delivered with retries, so a dropped connection never
  loses a report. Submission is idempotent on a client-generated id.
- New alerts reach staff in real time through server-sent events, with push notifications and a
  polling fallback. PostgreSQL `LISTEN/NOTIFY` fans events out across API instances.
- Design decisions are in [`docs/architecture-decisions.md`](docs/architecture-decisions.md) and
  production notes in [`docs/production-readiness.md`](docs/production-readiness.md).

## Running it

Backend: `cd backend && npm install` (Node 22), copy `.env.example` to `.env` and fill it in, start
Postgres with `docker compose up -d db`, run `npm run db:migrate`, then `npm run dev`. To run the
whole stack in containers, use `docker compose up --build`.

Android: copy `local.properties.example` to `local.properties` and
`app/google-services.json.example` to `app/google-services.json`, fill them in, then open the
project in Android Studio or run `./gradlew assembleDebug`. The emulator reaches a backend on your
machine at `http://10.0.2.2:5000/`.

## Configuration

Every backend setting is documented in [`backend/.env.example`](backend/.env.example). CI fails if
the code reads a variable that is missing from that file. The required ones are the database, the
Firebase service account and, in production, `CORS_ALLOWED_ORIGINS` and `METRICS_BEARER_TOKEN`.
Twilio, push, real-time delivery and caching are optional and can be switched off.

## API

All endpoints are under `/api/v1` and take a Firebase ID token as a bearer token.

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/sync` |
| Alerts | `POST /alerts`, `GET /alerts/recent`, `GET /alerts/stats`, `GET /alerts/stream`, `GET /alerts/poll` |
| Contacts | `GET /contacts`; staff only: `GET /contacts/all`, `POST /contacts`, `PATCH /contacts/:id/availability` |
| Users | `GET` and `PUT /users/profile`, `GET /users/alerts`, `POST /users/device-token` |
| Webhooks | `POST /webhooks/twilio/status` (signature-verified) |

Operational endpoints: `GET /health/live`, `GET /health/ready` and `GET /metrics`.

## Testing

```bash
cd backend && npm test             # unit and route tests; add RUN_DB_TESTS=true for integration tests
cd backend && npm run lint && npm run typecheck && npm run check:env
./gradlew testDebugUnitTest ktlintCheck
```

GitHub Actions runs all of this on every push and pull request, along with a dependency audit, secret
scanning and a container build. A weekly workflow reports outdated and vulnerable backend packages.

## Deployment

The backend ships as the Docker image built from `backend/Dockerfile`, and `docker-compose.yml` is
for local development. A tagged release builds the image and a signed Android build. There is no
infrastructure-as-code in this repository because the hosting target is not fixed.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Report security issues as described in
[`SECURITY.md`](SECURITY.md). Changes are listed in [`CHANGELOG.md`](CHANGELOG.md).
