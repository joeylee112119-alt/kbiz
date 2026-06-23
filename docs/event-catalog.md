# Event Catalog

Envelope:

```json
{
  "id": "uuid",
  "sequence": 1,
  "version": 1,
  "type": "lesson.stage.changed",
  "occurredAt": "ISO_DATE",
  "sessionId": "uuid",
  "payload": {}
}
```

Events:

- `call.created`, `call.ringing`, `call.accepted`, `call.declined`, `call.snoozed`, `call.missed`, `call.ended`
- `realtime.connecting`, `realtime.connected`, `realtime.reconnecting`, `realtime.failed`
- `lesson.started`, `lesson.stage.changed`, `lesson.material.show`, `lesson.correction.created`, `lesson.timer.synced`, `lesson.finishing`, `lesson.completed`
- `transcript.partial`, `transcript.final`
- `backchannel.played`
- `report.generating`, `report.ready`

Clients reconnect with their last seen sequence and replay missed events from server storage.
