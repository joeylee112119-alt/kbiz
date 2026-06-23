# Apple Setup

Production iOS requires:

- Apple Developer Program membership.
- Bundle ID with Push Notifications.
- APNs key or certificate.
- Microphone usage string.
- Physical device QA for locked screen, background, foreground, force quit, delayed push, and Bluetooth audio during an active foreground lesson.

The Swift module uses `UserNotifications`, APNs token registration, local debug lesson reminders, notification-open events, and a React Native bridge. It intentionally does not use PushKit, CallKit, VoIP pushes, or `reportNewIncomingCall`.
