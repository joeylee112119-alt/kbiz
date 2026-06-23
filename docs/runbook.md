# Runbook

## Local Bring-up

1. `corepack enable`
2. `corepack prepare pnpm@10.23.0 --activate`
3. `pnpm install`
4. `cp .env.example .env`
5. `docker compose up --build`
6. `pnpm db:migrate`
7. `pnpm db:seed`

## Common Incidents

Missed call spike:

- Check worker logs and Redis lock contention.
- Check push provider errors.
- Verify schedule timezone conversion and `nextRunAt`.

Realtime failure:

- Verify `OPENAI_API_KEY`.
- Check client secret or SDP endpoint mode.
- Inspect `realtime.failed` events and reconnection attempts.

Report delays:

- Check report queue depth.
- Validate transcript availability.
- Retry failed outbox events.
