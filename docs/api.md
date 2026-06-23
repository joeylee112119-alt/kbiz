# API

All APIs are under `/v1`.

Implemented mock-safe routes include:

- Auth: `POST /auth/guest`, `POST /auth/refresh`, `POST /auth/logout`, Apple/Google link, `GET/PATCH/DELETE /me`.
- Onboarding: `GET /onboarding/options`, `PUT /me/learner-profile`, `POST /onboarding/complete`.
- Tutors: `GET /tutors`, `GET /tutors/:id`, `GET /tutors/:id/voices`.
- Devices: `POST /devices`, `PATCH /devices/:id`, push token create/delete.
- Schedules: CRUD, pause, resume.
- Calls: get, accept, decline, snooze, end, start-now.
- Realtime: sessions, events, reconnect, defaults.
- Lessons: today, session, start, end, report.
- Review: list, answer, save/unsave expression.
- Progress: current, weekly, monthly.
- Admin: dashboard, lesson templates, prompt versions, feature flags.

Error format:

```json
{
  "error": {
    "code": "CALL_ALREADY_ACCEPTED",
    "message": "이미 처리된 전화입니다.",
    "requestId": "uuid",
    "details": {}
  }
}
```
