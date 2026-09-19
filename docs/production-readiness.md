# Production readiness runbook

## Release and rollback

1. CI must pass backend tests/build/lint/format/audit, PostgreSQL migrations, the container build, and Android lint/tests/debug/release builds.
2. Take or verify a recent encrypted database backup, then run `npm run db:migrate:prod` as a one-off release job before starting new application instances.
3. Deploy the immutable container behind a managed HTTPS ingress. Wait for `/health/ready` before routing traffic; `/health/live` is only a process check.
4. Roll back by routing traffic to the previous immutable image. Migrations 005 to 008 are additive and remain compatible with the previous application. Do not drop new tables, indexes, triggers, or columns during an application rollback.
5. If the outbox worker must be disabled during an incident, set both notification feature flags to `false`; jobs remain durable and can be resumed later. Do not delete failed jobs until the incident is understood.

Use semantic versions for release tags. Patch releases contain compatible fixes, minor releases add compatible behavior or migrations, and major releases may remove old API aliases or require coordinated clients. Keep `/api` mounted until telemetry shows old Android versions no longer use it; then remove it only in a major release.

## Database backup and recovery

- Enable provider-managed encryption at rest, daily encrypted backups, point-in-time recovery, and at least 30 days of retention. Restrict backup/restore permissions to a dedicated operations role.
- Before migrations, create a provider snapshot or `pg_dump --format=custom --no-owner --file=<approved-path> "$DATABASE_URL"`. Never place dumps in the repository or application container.
- Quarterly, restore the newest backup into an isolated database, run `npm run db:migrate:prod`, verify row counts and foreign keys, and exercise `/health/ready` plus representative read/write requests.
- Record recovery time and recovery point achieved. Target RPO is 24 hours without PITR and 15 minutes with PITR; initial RTO target is 60 minutes.
- Restoration is an explicitly authorized operation. Stop writes or restore to a new database, validate it, then switch the application connection; never overwrite production in place as the first recovery step.

## Monitoring and alerting

Scrape `/metrics` with the configured bearer token over a private network. Preserve structured JSON logs by `requestId` and redact secrets at the log platform. Recommended initial alerts:

- readiness failing for 2 minutes;
- HTTP 5xx rate above 2% for 5 minutes;
- p95 request duration above 2 seconds for 10 minutes;
- PostgreSQL connection utilization above 80% or repeated query/lock timeouts;
- any outbox job reaching `failed_at`, or pending outbox age above 5 minutes;
- `rapid_response_realtime_connections` staying near `MAX_REALTIME_CONNECTIONS`, or `rapid_response_realtime_events_total` flat while alerts are being created (the `LISTEN` connection may be down; look for `realtime_listener_*` log events);
- `rapid_response_sms_status_total{status="failed"}` or `{status="undelivered"}` rising;
- a low `rapid_response_cache_requests_total{result="hit"}` ratio for statistics or contacts, which means the TTL or invalidation is misconfigured;
- no successful alert submissions during an expected active period, treated as a telemetry-gap warning rather than proof of an outage.

For an incident: declare an owner and severity, preserve request IDs and timestamps, disable only the affected feature flag when useful, prefer image rollback over live edits, and write a blameless follow-up containing impact, timeline, detection gap, cause, and corrective actions.

## Security and secrets

- Supply secrets through the hosting platform's secret manager and workload identity/IAM, not `.env` files in images or source control. Production startup fails when required values are missing.
- Rotate Firebase service credentials, the metrics token, database credentials, and Twilio credentials at least every 90 days and immediately after suspected exposure. Support overlap during rotation by updating the secret store before restarting instances.
- Grant the application database role only DML plus sequence access. Run migrations with a separate schema-owner role. Restrict staff/admin role changes to an audited administrative process.
- Terminate public TLS at the managed ingress with TLS 1.2 or newer. Use verified TLS from the service to PostgreSQL; provide `DB_SSL_CA` when the provider CA is not in the host trust store.
- Firebase owns OAuth and ID-token key rotation. The Android client refreshes a rejected token once; the backend validates every token and never accepts app-supplied roles.
- Android release builds block cleartext traffic and exclude Room databases, files, and shared preferences from cloud backup/device transfer. Device storage still relies on Android sandboxing and OS-level encryption.

## Real-time delivery, caching and webhooks

- Real-time delivery needs one long-lived PostgreSQL connection per API instance for `LISTEN` in addition to the pool. Count it when sizing `max_connections`. Managed poolers in transaction mode (for example PgBouncer) do not support `LISTEN`; point `DB_HOST` at a session-mode or direct endpoint.
- The ingress must not buffer or time out `text/event-stream` responses. Allow idle timeouts above 60s (heartbeats are sent every 25s) and disable response buffering for `/api/v1/alerts/stream`; the service already sends `X-Accel-Buffering: no` and `Cache-Control: no-cache, no-transform`.
- To roll real-time delivery back without a deploy, set `ENABLE_REALTIME=false`. Clients fall back to FCM plus polling. Set `ENABLE_CACHE=false` to bypass caching.
- Twilio delivery-status webhook: set `PUBLIC_BASE_URL` to the exact public HTTPS origin the ingress serves (signatures are computed over it), then Twilio sends status callbacks to `/api/v1/webhooks/twilio/status` automatically for messages this service creates. A wrong origin shows up as `403` responses to Twilio.
- Processed outbox rows older than `OUTBOX_RETENTION_DAYS` (default 30) are deleted hourly in batches of 1000. Failed rows are kept for investigation.

## Capacity and maintenance

- Start with one API instance pool capped at 20 PostgreSQL connections; ensure total replicas × pool maximum remains below the database connection limit with headroom for migrations and operations.
- Request bodies are limited to 64 KiB, list APIs are limited to 100 records, request queries have statement/lock deadlines, rate limiting protects the process, and outbox batches are capped at 50.
- Run `EXPLAIN (ANALYZE, BUFFERS)` against production-like data before changing indexes. Watch the user-history and recent-alert queries first.
- Dependabot proposes npm, Gradle, and Actions updates weekly. Review release notes, run all gates, and avoid unreviewed forced upgrades. Production npm audit blocks high/critical findings; moderate findings are triaged during weekly maintenance.

