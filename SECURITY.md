# Security policy

Do not open a public issue containing credentials, personal data, or an exploitable vulnerability. Report it privately to the repository owner with affected versions, reproduction steps, impact, and any suggested mitigation.

Never commit `.env`, `google-services.json`, private keys, database dumps, access tokens, or production logs. If a secret enters Git history, revoke and rotate it immediately; deleting the file in a later commit is not sufficient.
