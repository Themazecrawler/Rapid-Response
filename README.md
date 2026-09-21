# Rapid Response

A campus emergency alert system. Students report an emergency from an Android app, and campus
security and admin staff are notified immediately.

- **Android app** (`app/`): Kotlin and Jetpack Compose. Sends alerts with location, works offline
  and delivers when the connection returns, and shows contacts, history, statistics and a map.
- **Backend** (`backend/`): Node.js, Express and PostgreSQL. Verifies Firebase sign-ins, stores
  alerts, and notifies staff by push notification and live feed. It can also text the reporter.

## Running it

Backend: `cd backend && npm install` (Node 22), copy `.env.example` to `.env` and fill it in, start
Postgres with `docker compose up -d db`, run `npm run db:migrate`, then `npm run dev`.

Android: copy `local.properties.example` to `local.properties` and
`app/google-services.json.example` to `app/google-services.json`, fill them in, then open the
project in Android Studio or run `./gradlew assembleDebug`.

## Testing

```bash
cd backend && npm test
./gradlew testDebugUnitTest
```

Backend CI also runs `npm run lint`, `npm run typecheck` and `npm run check:env`, which fails when
a variable read in `src/` is missing from `.env.example`.

## Deployment

The backend ships as the Docker image built from `backend/Dockerfile`, and `docker-compose.yml` is
for local development. There is no infrastructure-as-code in this repository because the hosting
target is not fixed.

More detail on design and operations is in [`docs/`](docs). Security reporting is in [`SECURITY.md`](SECURITY.md).
