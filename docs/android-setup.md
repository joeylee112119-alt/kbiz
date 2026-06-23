# Android Setup

Production Android requires:

- Firebase project and `google-services.json`.
- FCM alert/data messages that open the lesson ready screen.
- Runtime permissions for microphone, notifications, and Bluetooth audio routing where supported.
- Doze, lock screen, background, process-death, delayed push, and home-screen recovery QA.

The Kotlin module uses `FirebaseMessagingService`, a lesson reminder notification channel, token upload, and a React Native notification bridge. It intentionally does not use Android Telecom, `CallStyle`, full-screen call intents, or `MANAGE_OWN_CALLS`.
