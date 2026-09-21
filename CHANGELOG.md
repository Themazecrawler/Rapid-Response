# Changelog

## Unreleased

- Android: fixed a crash when opening Alert History, Emergency Contacts and Statistics.
- Android: upgraded to Gradle 8.14, AGP 8.10, Kotlin 2.0 and Compose BOM 2025.02; targets Android 15.
- Android: added Firebase Crashlytics and R8 release shrinking.
- Backend: added real-time alert streaming, Twilio delivery webhook, caching, per-client rate limiting
  and SMS caps.
- Backend: added structured logging, health endpoints, a repository layer and a coverage threshold.
- CI: secret scanning, pinned actions, typecheck, `.env.example` coverage check, a weekly dependency
  report and a tagged release workflow.
