# Architecture decisions

## Data freshness and messaging

- HTTP responses use `Cache-Control: no-store`, so nothing is cached by clients or intermediaries. The server keeps a small in-process TTL cache (`services/cache.ts`) for two read-heavy, non-personal queries only: campus-wide alert statistics (30s) and the available-contacts list (60s). Personal data, alert lists, and anything authorization-dependent are never cached.
- Invalidation is event-driven: a new alert invalidates `alerts:*` on every instance through the Postgres notification below, and contact writes invalidate `contacts:*` on the instance that handled them. Instances that did not see a contact write serve the old list for at most the TTL. Loads are de-duplicated (one database query per key at a time) and an invalidation that races with an in-flight load discards that load's result so stale data is never stored. `ENABLE_CACHE=false` bypasses the cache.
- PostgreSQL is the source of truth. Alert submission is idempotent, queued locally with WorkManager, and retried with exponential backoff. Notification side effects use a transactional outbox with independent SMS/push jobs, bounded batches, row locking, retry backoff, and terminal failure state.
- Firebase Cloud Messaging is the app's publish/subscribe transport for background delivery. A push is a refresh signal; the app fetches authorized state from the API. Delivery is at least once, so consumers must tolerate duplicate notifications.
- Inside the platform, PostgreSQL is the event bus. Migration 007 adds a trigger that runs `pg_notify('alert_created', id)` when an alert commits. Each API instance holds one dedicated `LISTEN` connection (`services/realtime.ts`), re-reads the row, and fans it out to its connected clients. This is event-driven and cross-instance without a broker; the payload is only an id, the listener reconnects with exponential backoff, and subscribers receive a `resync` message after a reconnect because notifications sent while disconnected are lost. Move to a durable broker only if event volume or fan-out outgrows a single database.

## Network protocols

- The public contract is JSON over versioned HTTPS (`/api/v1`). A managed ingress/API gateway should own DNS, certificates, HTTP/2 or HTTP/3 negotiation, connection limits, WAF rules, and distributed rate limiting. The Express limiter is defense in depth, not a multi-region gateway.
- TCP/HTTP is appropriate for authenticated writes. UDP is not used directly; HTTP/3 may use QUIC at the ingress without changing the application contract.
- Foreground real-time updates use server-sent events: `GET /api/v1/alerts/stream` (security/admin only). SSE was chosen over WebSockets because the flow is server-to-client only, it reuses the existing bearer-token HTTP authorization and proxies, and the browser/OkHttp clients reconnect natively. Streams send a heartbeat every 25s, resume from `Last-Event-ID` (replaying up to 50 missed alerts without duplicates), are closed after 50 minutes so the client reconnects with a fresh Firebase token, and are dropped if a client cannot keep up (write buffer above 64 KiB). Open connections are capped (`MAX_REALTIME_CONNECTIONS`, default 200) and excess requests get `503` with `Retry-After`.
- `GET /api/v1/alerts/poll?after=<id>&timeout=<1-25s>` is the long-polling fallback for clients or networks that cannot hold an event stream open. It returns immediately if newer alerts exist, otherwise waits for the next event or the timeout, and returns a `cursor` for the next call. It shares the connection cap with the stream. `ENABLE_REALTIME=false` disables both.
- Android keeps three layers: the SSE stream while the feed is on screen, FCM pushes when the app is in the background, and a 60s poll as a last-resort fallback. The stream client backs off exponentially, and stops retrying when the server rejects the caller (4xx other than 408/429).
- WebSockets are not used; add them only if a client needs to send high-frequency messages to the server.
- gRPC is not used. The public API is consumed by one mobile client over infrequent JSON calls, where a second protocol, generated stubs, and gateway translation would add cost without a measurable benefit. Revisit for internal service-to-service traffic if the backend is ever split.
- Inbound webhooks use dedicated routes that verify a provider signature over the exact public URL and body before doing anything. `POST /api/v1/webhooks/twilio/status` records SMS delivery status from Twilio (requires `PUBLIC_BASE_URL` and `TWILIO_AUTH_TOKEN`; otherwise it returns `503`). It has an 8 KiB body limit, is unauthenticated apart from the signature, is idempotent because it only updates counters and logs, and never triggers side effects. Twilio signatures carry no timestamp, so replays are harmless by design rather than rejected.

## Concurrency and runtime safety

- Database uniqueness owns idempotency and race prevention. Outbox workers use `FOR UPDATE SKIP LOCKED`; query and lock deadlines bound deadlocks. Keep multi-row transactions short and acquire rows in stable ID order.
- Node runs application code on one event loop; request state is local, metrics labels use route templates, and timers are stopped/unreferenced to prevent unbounded retention. Android lifecycle scopes, Room, and unique WorkManager jobs own mobile concurrency.
- PostgreSQL pooling and bounded outbox work provide backpressure. If sustained load exceeds one process, scale behind the ingress and move rate limiting to a shared gateway store before increasing pool sizes.

## Application security

- SQL uses parameters; no user-controlled server-side URL fetch exists, so current SQL-injection and SSRF exposure is minimized. The native app renders Compose text rather than browser HTML, so XSS and cookie-based CSRF do not apply to current clients.
- CORS is deny-by-default for browser origins and allows only `CORS_ALLOWED_ORIGINS`. Authentication is a Firebase bearer token; authorization is resolved from PostgreSQL roles.
- Feature flags are operational environment switches for SMS and push only. They default on and are evaluated by the outbox worker, allowing reversible incident mitigation without changing alert persistence.

