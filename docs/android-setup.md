# Android Setup

Production Android requires:

- Firebase project and `google-services.json`.
- FCM high-priority data messages.
- Android Telecom or CallStyle notification policy review.
- Runtime permissions for microphone, notifications, Bluetooth, foreground service, and `MANAGE_OWN_CALLS`.
- Full-screen intent compliance where used.
- Doze, lock screen, background, process-death, and fallback notification QA.

The Kotlin module currently exposes token, end-call, speaker, and route event stubs.
