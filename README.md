# AI 전화영어

AI 전화영어 is a pnpm/Turbo monorepo for a Korean-first mobile English learning product. The core loop is onboarding, tutor and schedule setup, a scheduled AI phone call, a 15-minute guided English lesson, a report, and spaced review.

This repository separates mock providers from production providers so the local flow can run without OpenAI, Apple, Google, Firebase, RevenueCat, or cloud credentials.

## Monorepo

- `apps/mobile`: React Native Community CLI bare mobile app with iOS Swift and Android Kotlin call bridge stubs.
- `apps/api`: NestJS API with `/v1` routes, mock auth, schedules, calls, Realtime negotiation, reports, review, and admin endpoints.
- `apps/worker`: Worker process for scheduled-call execution and mock push delivery.
- `apps/admin`: Next.js admin dashboard for operations, CMS, AI settings, monitoring, and audit views.
- `packages/contracts`: Shared API, WebSocket, lesson, report, enum, and validation contracts.
- `packages/database`: Prisma schema and seed entrypoint.
- `packages/lesson-engine`: Lesson Orchestrator, stage timing, interruption classifier, and backchannel controller.
- `packages/realtime-client`: Realtime connection state machine and OpenAI session defaults.
- `packages/notification`: Push provider interface and mock implementation.
- `infra`: Docker and Terraform starter assets.
- `docs`: Product, architecture, security, privacy, setup, and runbook docs.

## Requirements

- Node.js 24+
- Corepack
- pnpm 10.23.0
- Docker Desktop
- Xcode and CocoaPods for iOS
- Android Studio and JDK 17+ for Android

## Install

```bash
corepack enable
corepack prepare pnpm@10.23.0 --activate
pnpm install
```

## Local Services

```bash
cp .env.example .env
docker compose up --build
```

Ports:

- API: `http://localhost:4000/v1`
- API docs: `http://localhost:4000/docs`
- Worker health: `http://localhost:4001/health`
- Admin: `http://localhost:3000`
- MinIO: `http://localhost:9001`
- MailDev: `http://localhost:1080`

## Database

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

## Mobile

```bash
pnpm --filter @aiphone/mobile start
pnpm --filter @aiphone/mobile ios
pnpm --filter @aiphone/mobile android
```

The native modules are present as integration stubs. Apple PushKit/CallKit entitlements, APNs keys, Firebase configuration, Android Telecom policy validation, and store signing must be supplied before production builds.

## Mock Mode

`.env.example` defaults to:

```bash
MOCK_REALTIME=true
MOCK_PUSH=true
MOCK_BILLING=true
MOCK_PRONUNCIATION=true
LESSON_TIME_SCALE=0.02
```

Useful mock endpoints:

- `POST /v1/auth/guest`
- `GET /v1/onboarding/options`
- `POST /v1/calls/start-now`
- `POST /v1/calls/:id/accept`
- `POST /v1/realtime/sessions`
- `GET /v1/lesson-sessions/:id/report`

## OpenAI Production Mode

Set:

```bash
OPENAI_API_KEY=...
OPENAI_REALTIME_MODEL=gpt-realtime-2
OPENAI_REALTIME_VOICE=marin
OPENAI_ANALYSIS_MODEL=gpt-5.5-mini
MOCK_REALTIME=false
```

The backend must mint client secrets or proxy SDP to OpenAI. The mobile app must never receive the standard API key.

## Verification

```bash
node scripts/check-architecture.mjs
node scripts/smoke.ts
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The smoke script runs without external services and verifies the lesson state machine, interruption classifier, backchannel controller, Realtime state machine, report validation, and event envelope.

The Compose Postgres host port defaults to `55432` and Redis defaults to `56379` to avoid collisions with existing local services. Override with `POSTGRES_PORT=5432` or `REDIS_PORT=6379` only when those ports are free.

## Known Limits

This is a functional product foundation, not a store-ready release. Production-native phone flows require Apple and Google developer setup, real push credentials, app signing, Firebase project files, billing provider credentials, OpenAI production keys, and device-level QA.
