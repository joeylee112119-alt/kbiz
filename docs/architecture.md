# Architecture

```mermaid
flowchart LR
  Mobile["React Native iOS/Android"] --> API["NestJS API /v1"]
  Admin["Next.js Admin"] --> API
  API --> DB[(PostgreSQL)]
  API --> Redis[(Redis)]
  API --> S3["S3-compatible storage"]
  API --> OpenAI["OpenAI Realtime/Analysis"]
  Worker["BullMQ Worker"] --> Redis
  Worker --> DB
  Worker --> Push["APNs VoIP / FCM / Mock"]
  API --> WS["WebSocket Gateway"]
  WS --> Mobile
```

The API owns authoritative app, call, and lesson session state. The worker owns scheduled execution, push delivery, missed-call expiry, report jobs, and outbox dispatch. Shared contracts prevent mobile, API, worker, and admin from redefining state machines or event payloads.

Provider-specific code sits behind interfaces:

- Realtime: mock, OpenAI unified SDP, OpenAI ephemeral secret.
- Push: mock, APNs VoIP, FCM.
- Billing: mock, RevenueCat or StoreKit/Google Play adapter.
- Pronunciation: disabled, mock, Azure-compatible provider.
- Analytics and crash reporting: adapter-based Firebase/Sentry.

## Scheduled Call Sequence

```mermaid
sequenceDiagram
  participant W as Worker
  participant R as Redis Lock
  participant DB as PostgreSQL
  participant P as Push Provider
  participant M as Mobile
  W->>R: acquire schedule lock
  W->>DB: create CallAttempt
  W->>P: send reminder at T-10m
  W->>P: send incoming call at T
  P->>M: VoIP push or high-priority FCM
  M->>DB: accept or decline via API
  W->>DB: mark missed after 45s if unanswered
  W->>R: release lock
```

## Lesson Sequence

```mermaid
sequenceDiagram
  participant M as Mobile
  participant API as Backend
  participant L as Lesson Orchestrator
  participant OAI as OpenAI Realtime
  M->>API: accept call
  API->>L: create LessonSession
  M->>API: POST /realtime/sessions
  API->>OAI: client secret or SDP
  OAI-->>M: WebRTC audio/events
  M->>API: transcript/events
  API->>L: evaluate stage and tools
  L-->>M: stage/material/timer events
```
