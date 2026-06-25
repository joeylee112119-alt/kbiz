# Mobile Architecture

The mobile app is a React Native Community CLI bare project. It uses TypeScript, React Navigation, TanStack Query, Zustand, React Hook Form, Zod, secure storage, MMKV, and `react-native-webrtc`.

Native code owns notification and permission surfaces:

- iOS Swift module: APNs registration, `UserNotifications` display/open events, debug lesson reminder, event bridge.
- Android Kotlin module: FCM message handling, notification channel/display, FCM token upload, event bridge.

React Native owns product state and API calls. Notification open events only navigate to the lesson ready screen; WebRTC and microphone capture start after the learner taps the lesson start action.

## Native Events

iOS: `pushTokenRegistered`, `pushTokenRegistrationFailed`, `notificationPermissionChanged`, `lessonReminderDisplayed`, `notificationOpened`, `notificationError`.

Android: `pushTokenRefreshed`, `lessonReminderDisplayed`, `notificationOpened`, `notificationSyncFailed`, `notificationPayloadInvalid`.
