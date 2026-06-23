import type { RealtimeSessionRequest, RealtimeSessionResponse } from "../index.js";

export type RealtimeProviderName = "mock" | "openai";

export type RealtimeProviderContext = {
  apiKey?: string;
  realtimeModel: string;
  realtimeVoice: string;
  safetyIdentifier: string;
  baseUrl?: string;
};

export interface RealtimeProvider {
  readonly name: RealtimeProviderName;
  createSession(request: RealtimeSessionRequest, context: RealtimeProviderContext): Promise<RealtimeSessionResponse>;
  cancelResponse(sessionId: string, responseId: string, context: RealtimeProviderContext): Promise<void>;
  cleanup(sessionId: string): Promise<void>;
}

export type SdpExchangeRequest = {
  lessonSessionId: string;
  deviceId: string;
  localSdp: string;
};

export type ClientSecretRequest = {
  lessonSessionId: string;
  deviceId: string;
};
