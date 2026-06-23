import type { RealtimeConnectionState } from "@aiphone/contracts";

export type RealtimeSessionMode = "mock" | "openai_unified_sdp" | "openai_ephemeral_secret";

export type RealtimeSessionRequest = {
  lessonSessionId: string;
  deviceId: string;
  mode: RealtimeSessionMode;
  localSdp?: string;
};

export type RealtimeSessionResponse =
  | {
      mode: "mock";
      sessionId: string;
      dataChannelName: "mock-oai-events";
    }
  | {
      mode: "openai_unified_sdp";
      sessionId: string;
      sdpAnswer: string;
    }
  | {
      mode: "openai_ephemeral_secret";
      sessionId: string;
      clientSecret: string;
      expiresAt: string;
    };

export class RealtimeStateMachine {
  private stateValue: RealtimeConnectionState = "IDLE";

  get state(): RealtimeConnectionState {
    return this.stateValue;
  }

  transition(event: "load_token" | "create_peer" | "offer_created" | "connect" | "connected" | "reconnect" | "disconnect" | "fail" | "close"): RealtimeConnectionState {
    const allowed: Record<typeof event, RealtimeConnectionState[]> = {
      load_token: ["IDLE", "DISCONNECTED"],
      create_peer: ["TOKEN_LOADING"],
      offer_created: ["PEER_CREATING"],
      connect: ["OFFER_CREATED", "RECONNECTING"],
      connected: ["CONNECTING", "RECONNECTING"],
      reconnect: ["DISCONNECTED", "FAILED", "CONNECTED"],
      disconnect: ["CONNECTED", "RECONNECTING"],
      fail: ["TOKEN_LOADING", "PEER_CREATING", "OFFER_CREATED", "CONNECTING", "RECONNECTING"],
      close: ["IDLE", "TOKEN_LOADING", "PEER_CREATING", "OFFER_CREATED", "CONNECTING", "CONNECTED", "RECONNECTING", "DISCONNECTED", "FAILED"]
    };
    if (!allowed[event].includes(this.stateValue)) {
      throw new Error(`Invalid realtime transition ${this.stateValue} -> ${event}`);
    }
    const next: Record<typeof event, RealtimeConnectionState> = {
      load_token: "TOKEN_LOADING",
      create_peer: "PEER_CREATING",
      offer_created: "OFFER_CREATED",
      connect: "CONNECTING",
      connected: "CONNECTED",
      reconnect: "RECONNECTING",
      disconnect: "DISCONNECTED",
      fail: "FAILED",
      close: "CLOSED"
    };
    this.stateValue = next[event];
    return this.stateValue;
  }
}

export function buildRealtimeSessionUpdate(model: string, voice: string): Record<string, unknown> {
  return {
    type: "session.update",
    session: {
      type: "realtime",
      model,
      audio: {
        output: { voice },
        input: {
          turn_detection: {
            type: "semantic_vad",
            eagerness: "low",
            create_response: false,
            interrupt_response: false
          }
        }
      }
    }
  };
}

export { MockRealtimeProvider } from "./providers/MockRealtimeProvider.js";
export { ProductionRealtimeProvider } from "./providers/ProductionRealtimeProvider.js";
export type { RealtimeProvider, RealtimeProviderContext } from "./providers/types.js";
export { RealtimeWebRtcClient } from "./webrtc/RealtimeWebRtcClient.js";
