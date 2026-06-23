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
  Worker --> Push["FCM / APNs alert / Mock"]
  API --> WS["WebSocket Gateway"]
  WS --> Mobile
```

The API owns authoritative app, lesson schedule, lesson occurrence, notification delivery, and lesson session state. The worker owns scheduled occurrence materialization, push delivery, occurrence expiry, report jobs, review jobs, and outbox dispatch. Shared contracts prevent mobile, API, worker, and admin from redefining state machines or event payloads.

Provider-specific code sits behind interfaces:

- Realtime: mock, OpenAI unified SDP, OpenAI ephemeral secret.
- Push: mock, Firebase Cloud Messaging, APNs alert delivery through FCM on iOS.
- Billing: mock, RevenueCat or StoreKit/Google Play adapter.
- Pronunciation: disabled, mock, Azure-compatible provider.
- Analytics and crash reporting: adapter-based Firebase/Sentry.

## Scheduled Lesson Reminder Sequence

```mermaid
sequenceDiagram
  participant W as Worker
  participant R as Redis Lock
  participant DB as PostgreSQL
  participant P as Push Provider
  participant M as Mobile
  W->>R: acquire schedule lock
  W->>DB: create LessonOccurrence
  W->>P: send pre-reminder at T-10m
  W->>P: send lesson reminder at T
  P->>M: alert notification
  M->>API: open occurrence from notification
  M->>API: start lesson after learner taps start
  W->>DB: expire occurrence if not started
  W->>R: release lock
```

## Lesson Sequence

```mermaid
sequenceDiagram
  participant M as Mobile
  participant API as Backend
  participant L as Lesson Orchestrator
  participant OAI as OpenAI Realtime
  M->>API: POST /lesson-occurrences/:id/start
  API->>L: create LessonSession
  M->>API: POST /realtime/sessions
  API->>OAI: client secret or SDP
  OAI-->>M: WebRTC audio/events
  M->>API: transcript/events
  API->>L: evaluate stage and tools
  L-->>M: stage/material/timer events
```
