# Apple Setup

Production iOS requires:

- Apple Developer Program membership.
- Bundle ID with Push Notifications, VoIP, Background Modes, and associated capabilities.
- APNs key or certificate.
- PushKit entitlement review where applicable.
- CallKit usage descriptions.
- Microphone usage string.
- Background audio mode.
- Physical device QA for locked screen, background, foreground, force quit, Bluetooth, and competing phone calls.

The Swift module currently exposes the required event bridge and mock token behavior.
