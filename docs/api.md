# API

All APIs are under `/v1`.

Implemented mock-safe routes include:

- Auth: `POST /auth/guest`, `POST /auth/refresh`, `POST /auth/logout`, Apple/Google link, `GET/PATCH/DELETE /me`.
- Onboarding: `GET /onboarding/options`, `PUT /me/learner-profile`, `POST /onboarding/complete`.
- Tutors: `GET /tutors`, `GET /tutors/:id`, `GET /tutors/:id/voices`.
- Devices: `POST /devices`, `PATCH /devices/:id`, push token create/delete.
- Lesson schedules: CRUD, pause, resume.
- Lesson occurrences: list, get, open ready screen, start, snooze, skip, dismiss, start-now.
- Notifications: delivery list, delivery open, test notification.
- Realtime: sessions, events, reconnect, defaults.
- Lessons: today, session, start, end, report.
- Review: list, answer, save/unsave expression.
- Progress: current, weekly, monthly.
- Admin: dashboard, lesson templates, prompt versions, feature flags.

Error format:

```json
{
  "error": {
    "code": "OCCURRENCE_EXPIRED",
    "message": "수업 시작 가능 시간이 지났습니다.",
    "requestId": "uuid",
    "details": {}
  }
}
```
