import { NativeEventEmitter, NativeModules } from "react-native";

type NativeCallModule = {
  registerPushToken(): Promise<string>;
  scheduleDebugIncomingCall(payload: {
    callAttemptId: string;
    tutorName: string;
    topicKo: string;
    expiresAt: string;
  }): Promise<{ scheduled: boolean; callAttemptId: string }>;
  answerCall(callAttemptId: string): Promise<void>;
  declineCall(callAttemptId: string): Promise<void>;
  endCall(callAttemptId: string): Promise<void>;
  setSpeakerEnabled(enabled: boolean): Promise<void>;
};

const module = NativeModules.NativeCallModule as NativeCallModule | undefined;

export const nativeCallEvents = new NativeEventEmitter(NativeModules.NativeCallModule);

export async function registerNativeCallToken(): Promise<string> {
  if (!module) {
    throw new Error("NativeCallModule is unavailable; native call token cannot be registered.");
  }
  return module.registerPushToken();
}

export async function scheduleDebugIncomingCall(payload: {
  callAttemptId: string;
  tutorName: string;
  topicKo: string;
  expiresAt: string;
}): Promise<void> {
  if (!module) throw new Error("NativeCallModule is unavailable; debug incoming call cannot be scheduled.");
  await module.scheduleDebugIncomingCall(payload);
}

export async function answerNativeCall(callAttemptId: string): Promise<void> {
  if (!module) return;
  await module.answerCall(callAttemptId);
}

export async function declineNativeCall(callAttemptId: string): Promise<void> {
  if (!module) return;
  await module.declineCall(callAttemptId);
}

export async function endNativeCall(callId: string): Promise<void> {
  if (!module) return;
  await module.endCall(callId);
}
