# Call Lifecycle

```mermaid
stateDiagram-v2
  [*] --> CREATED
  CREATED --> PUSH_SENT
  PUSH_SENT --> RINGING
  RINGING --> ACCEPTED
  ACCEPTED --> CONNECTING
  CONNECTING --> ACTIVE
  ACTIVE --> COMPLETED
  RINGING --> DECLINED
  RINGING --> SNOOZED
  RINGING --> MISSED
  CREATED --> CANCELLED
  PUSH_SENT --> FAILED
  RINGING --> EXPIRED
```

The worker creates one `CallAttempt` per due schedule, guarded by a Redis distributed lock. Calls expire after 45 seconds if unanswered. Snooze creates a new attempt for 10 minutes later. Mobile reconciles active and missed calls on app launch.
