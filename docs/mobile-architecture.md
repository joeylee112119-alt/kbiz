# Mobile Architecture

The mobile app is a React Native Community CLI bare project. It uses TypeScript, React Navigation, TanStack Query, Zustand, React Hook Form, Zod, secure storage, MMKV, and `react-native-webrtc`.

Native code owns phone surfaces:

- iOS Swift module: PushKit token registration, CallKit incoming call reporting, answer/decline/end, audio session activation, Bluetooth/speaker routing, event bridge.
- Android Kotlin module: FCM data message handling, Telecom/CallStyle integration, foreground service, audio focus, route changes, event bridge.

React Native owns product state and API calls. Native call events are converted into server calls before WebRTC starts.

## Native Events

iOS: `incomingCallReceived`, `callAnswered`, `callDeclined`, `callEnded`, `audioSessionActivated`, `audioSessionDeactivated`, `callTimedOut`, `nativeCallError`.

Android: `incomingCallReceived`, `callAnswered`, `callDeclined`, `callEnded`, `audioRouteChanged`, `telecomError`, `callTimedOut`.
