import { NativeEventEmitter, NativeModules } from "react-native";

type NativeCallModule = {
  registerPushToken(): Promise<string>;
  endCall(callId: string): Promise<void>;
  setSpeakerEnabled(enabled: boolean): Promise<void>;
};

const module = NativeModules.NativeCallModule as NativeCallModule | undefined;

export const nativeCallEvents = new NativeEventEmitter(NativeModules.NativeCallModule);

export async function registerNativeCallToken(): Promise<string> {
  if (!module) {
    return "mock-native-token";
  }
  return module.registerPushToken();
}

export async function endNativeCall(callId: string): Promise<void> {
  if (!module) return;
  await module.endCall(callId);
}
