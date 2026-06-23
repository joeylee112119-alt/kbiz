import { describe, expect, it } from "vitest";
import {
  MockRealtimeProvider,
  ProductionRealtimeProvider,
  RealtimeStateMachine,
  RealtimeWebRtcClient,
  buildRealtimeSessionUpdate
} from "./index.js";

describe("realtime client", () => {
  it("enforces connection state order", () => {
    const machine = new RealtimeStateMachine();
    expect(machine.transition("load_token")).toBe("TOKEN_LOADING");
    expect(machine.transition("create_peer")).toBe("PEER_CREATING");
    expect(machine.transition("offer_created")).toBe("OFFER_CREATED");
    expect(machine.transition("connect")).toBe("CONNECTING");
    expect(machine.transition("connected")).toBe("CONNECTED");
  });

  it("uses semantic vad without automatic response creation", () => {
    const update = buildRealtimeSessionUpdate("gpt-realtime-2", "marin");
    const session = update.session as Record<string, unknown>;
    const audio = session.audio as Record<string, unknown>;
    const input = audio.input as Record<string, unknown>;
    expect(input.turn_detection).toEqual({
      type: "semantic_vad",
      eagerness: "low",
      create_response: false,
      interrupt_response: false
    });
  });

  it("mock provider creates and cleans up sessions", async () => {
    const provider = new MockRealtimeProvider();
    const response = await provider.createSession(
      { lessonSessionId: "lesson-1", deviceId: "device-1", mode: "mock" },
      { realtimeModel: "gpt-realtime-2", realtimeVoice: "marin", safetyIdentifier: "safe-user" }
    );
    expect(response.mode).toBe("mock");
    expect(provider.hasSession("lesson-1")).toBe(true);
    await provider.cleanup("lesson-1");
    expect(provider.hasSession("lesson-1")).toBe(false);
  });

  it("production provider exchanges SDP through the OpenAI calls endpoint", async () => {
    const originalFetch = globalThis.fetch;
    const calls: Array<{ url: string; method: string | undefined }> = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), method: init?.method });
      return new Response("answer-sdp", { status: 200 });
    }) as typeof fetch;

    try {
      const provider = new ProductionRealtimeProvider();
      const response = await provider.createSession(
        { lessonSessionId: "lesson-1", deviceId: "device-1", mode: "openai_unified_sdp", localSdp: "offer-sdp" },
        {
          apiKey: "test-key",
          realtimeModel: "gpt-realtime-2",
          realtimeVoice: "marin",
          safetyIdentifier: "safe-user",
          baseUrl: "https://api.test"
        }
      );
      expect(response).toEqual({ mode: "openai_unified_sdp", sessionId: "lesson-1", sdpAnswer: "answer-sdp" });
      expect(calls[0]).toEqual({ url: "https://api.test/v1/realtime/calls", method: "POST" });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("webrtc client creates offer, attaches microphone and remote audio, sends session update and response controls", async () => {
    const sent: string[] = [];
    const states: string[] = [];
    const stopped: string[] = [];
    const dataChannel = {
      readyState: "open",
      send: (data: string) => {
        sent.push(data);
      },
      close: () => {
        sent.push("closed");
      },
      onopen: null,
      onmessage: null
    };
    const localStream = {
      getTracks: () => [
        {
          stop: () => {
            stopped.push("mic");
          }
        }
      ]
    };
    const peer = {
      createDataChannel: () => dataChannel,
      addTrack: (_track: unknown, _stream: typeof localStream) => undefined,
      createOffer: async () => ({ type: "offer" as const, sdp: "offer-sdp" }),
      setLocalDescription: async (_description: unknown) => undefined,
      setRemoteDescription: async (_description: unknown) => undefined,
      close: () => states.push("peer_closed"),
      ontrack: null as ((event: { streams: Array<typeof localStream> }) => void) | null,
      onconnectionstatechange: null,
      connectionState: "connected"
    };
    const remoteStreams: unknown[] = [];
    const client = new RealtimeWebRtcClient({
      createPeerConnection: () => peer,
      getUserMedia: async () => localStream,
      exchangeSdp: async (sdp) => {
        expect(sdp).toBe("offer-sdp");
        return "answer-sdp";
      },
      attachRemoteAudio: (stream) => remoteStreams.push(stream),
      onMessage: () => undefined,
      onStateChange: (state) => states.push(state)
    });

    await client.connect("gpt-realtime-2", "marin");
    peer.ontrack?.({ streams: [localStream] });
    client.createResponse();
    client.cancelResponse("response-1");
    client.cleanup();

    expect(states).toContain("CONNECTED");
    expect(remoteStreams).toHaveLength(1);
    expect(sent.some((data) => data.includes("session.update"))).toBe(true);
    expect(sent.some((data) => data.includes("response.create"))).toBe(true);
    expect(sent.some((data) => data.includes("response.cancel"))).toBe(true);
    expect(stopped).toEqual(["mic"]);
  });
});
