import { NativeEventEmitter, NativeModules } from "react-native";

type NativeNotificationModule = {
  registerPushToken(): Promise<{ registrationRequested?: boolean; granted?: boolean } | string>;
  getFcmToken?: () => Promise<string>;
  hasNotificationPermission?: () => Promise<boolean>;
  presentDebugLessonReminder(payload: {
    occurrenceId: string;
    notificationDeliveryId: string;
    title: string;
    body: string;
  }): Promise<{ displayed: boolean; occurrenceId: string }>;
  markNotificationOpened(notificationDeliveryId: string): Promise<{ queued: boolean; notificationDeliveryId: string }>;
};

const module = NativeModules.NativeNotificationModule as NativeNotificationModule | undefined;

export const nativeNotificationEvents = module
  ? new NativeEventEmitter(NativeModules.NativeNotificationModule)
  : null;

export async function registerNativePushToken(): Promise<unknown> {
  if (!module) {
    throw new Error("NativeNotificationModule is unavailable; push token cannot be registered.");
  }
  if (module.getFcmToken) return module.getFcmToken();
  return module.registerPushToken();
}

export async function hasNativeNotificationPermission(): Promise<boolean> {
  if (!module?.hasNotificationPermission) return true;
  return module.hasNotificationPermission();
}

export async function presentDebugLessonReminder(payload: {
  occurrenceId: string;
  notificationDeliveryId: string;
  title: string;
  body: string;
}): Promise<void> {
  if (!module) throw new Error("NativeNotificationModule is unavailable; debug lesson reminder cannot be displayed.");
  await module.presentDebugLessonReminder(payload);
}

export async function markNativeNotificationOpened(notificationDeliveryId: string): Promise<void> {
  if (!module) throw new Error("NativeNotificationModule is unavailable; notification open cannot be recorded.");
  await module.markNotificationOpened(notificationDeliveryId);
}
