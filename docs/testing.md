# Testing

Required suites:

- Backend: unit, API e2e, scheduler timezone, idempotency, outbox, integration with Postgres/Redis.
- Mobile: React Native Testing Library, native module mocks, Detox or Maestro for iOS and Android.
- Admin: component tests and Playwright e2e.
- Contracts: API schemas, WebSocket event schemas, lesson schema, report schema.
- Load: k6 scheduled-call burst and concurrent lesson scenarios.

Current local no-dependency checks:

```bash
node scripts/check-architecture.mjs
node scripts/smoke.ts
```

The smoke test covers lesson state, interruption behavior, backchannel rules, Realtime transitions, report validation, and event envelopes.
