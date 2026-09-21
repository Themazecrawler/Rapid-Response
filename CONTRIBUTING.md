# Contributing

- Keep each change small and focused, and include the tests that prove it in the same commit.
- Backend: `cd backend && npm ci`, then `npm run lint`, `npm run format:check`, `npm run typecheck`
  and `npm test` must pass. Integration tests need Postgres; see `docker-compose.yml`.
- Android: `./gradlew ktlintCheck lintDebug testDebugUnitTest assembleDebug` must pass.
- Add every new environment variable to `backend/.env.example`; CI fails otherwise.
- Do not commit secrets. `local.properties`, `app/google-services.json` and `.env` are gitignored.
- Write commit messages as a short imperative sentence.
- Report security issues as described in [`SECURITY.md`](SECURITY.md).
