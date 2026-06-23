import type { RealtimeProvider, RealtimeProviderContext } from "./types.js";
import type { RealtimeSessionRequest, RealtimeSessionResponse } from "../index.js";

export class MockRealtimeProvider implements RealtimeProvider {
  readonly name = "mock" as const;
  private readonly sessions = new Set<string>();

  async createSession(request: RealtimeSessionRequest, _context: RealtimeProviderContext): Promise<RealtimeSessionResponse> {
    this.sessions.add(request.lessonSessionId);
    return {
      mode: "mock",
      sessionId: request.lessonSessionId,
      dataChannelName: "mock-oai-events"
    };
  }

  async cancelResponse(_sessionId: string, _responseId: string): Promise<void> {
    return;
  }

  async cleanup(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }
}
