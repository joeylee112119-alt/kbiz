# ADR 0002: Push Notification Lesson Entry

## Status

Accepted

## Context

The product is pivoting from an incoming AI phone-call experience to a scheduled lesson reminder experience. Incoming-call UX requires PushKit, CallKit, Core-Telecom, VoIP push policy review, phone-style foreground services, and platform behavior that is disproportionate for a 15-minute language lesson reminder.

## Decision

Scheduled English lessons will be entered through standard push notifications. A user schedules lesson time, the server materializes lesson occurrences, a reminder notification is sent at the scheduled time, and tapping the notification opens a lesson ready screen for that occurrence.

The notification click must never auto-start microphone capture or an OpenAI Realtime session. The user must explicitly press the lesson start button on the ready screen before any microphone or Realtime WebRTC session is created.

The app will remove PushKit, CallKit, Core-Telecom, VoIP push, incoming call UI, and phone answer/decline/end native events. Firebase Cloud Messaging is the shared push delivery layer for Android and iOS through normal alert notifications. iOS receives FCM through APNs integration; Android receives FCM directly.

OpenAI Realtime WebRTC remains the voice lesson transport after explicit lesson start.

Mock notification and production notification providers are separated. Mock flow is for local development and automated vertical-slice tests. Production Firebase requires explicit credentials and must not use mock tokens as production tokens.

## Consequences

Push delivery can be delayed or missed, so the home screen must recover upcoming and ready lesson occurrences directly from the API. Users can start a valid ready lesson from home even if the notification was not received.

The backend records notification send/open/action state separately from lesson occurrence state. Provider delivery receipt is not assumed unless the provider actually supplies it.

Sensitive data such as access tokens, transcripts, OpenAI keys, raw audio, email, and phone numbers must not be included in push payloads.
