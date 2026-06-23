# Backend Architecture

The backend uses NestJS with strict TypeScript. Controllers stay thin and delegate business rules to domain services and providers. All APIs use the `/v1` prefix and return shared contract envelopes.

## Main Areas

- Auth: guest sessions, refresh rotation, logout, Apple/Google linking.
- Onboarding: options, learner profile, complete.
- Tutors: tutor and voice catalog.
- Devices: device records and push token hashing.
- Schedules: recurring schedule, pause, resume, next UTC run.
- Calls: lifecycle actions, idempotency, expiry.
- Realtime: OpenAI client secret or SDP negotiation.
- Lessons: start, orchestrate, end, report lookup.
- Review and progress.
- Admin: RBAC-protected content, prompt, user, monitor, audit APIs.

## Security Defaults

Helmet, CORS allowlist, validation pipes, rate limiting, request IDs, structured JSON logs, sensitive-field masking, webhook signature validation, and idempotency keys are required for production.
