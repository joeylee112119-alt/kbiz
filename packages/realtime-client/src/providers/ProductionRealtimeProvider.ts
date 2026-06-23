import { z } from "zod";
import { buildRealtimeSessionUpdate, type RealtimeSessionRequest, type RealtimeSessionResponse } from "../index.js";
import type { RealtimeProvider, RealtimeProviderContext } from "./types.js";

const clientSecretResponseSchema = z.object({
  id: z.string().optional(),
  client_secret: z
    .object({
      value: z.string(),
      expires_at: z.number().optional()
    })
    .or(z.string())
});

export class ProductionRealtimeProvider implements RealtimeProvider {
  readonly name = "openai" as const;

  async createSession(request: RealtimeSessionRequest, context: RealtimeProviderContext): Promise<RealtimeSessionResponse> {
    this.assertApiKey(context);
    if (request.localSdp) {
      return this.exchangeSdp(request, context);
    }
    return this.createClientSecret(request, context);
  }

  async createClientSecret(request: RealtimeSessionRequest, context: RealtimeProviderContext): Promise<RealtimeSessionResponse> {
    this.assertApiKey(context);
    const response = await fetch(`${this.baseUrl(context)}/v1/realtime/client_secrets`, {
      method: "POST",
      headers: this.jsonHeaders(context),
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: context.realtimeModel,
          audio: {
            output: { voice: context.realtimeVoice },
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
      })
    });
    if (!response.ok) {
      throw new Error(`OpenAI client secret failed: ${response.status}`);
    }
    const parsed = clientSecretResponseSchema.parse(await response.json());
    const secret = typeof parsed.client_secret === "string" ? parsed.client_secret : parsed.client_secret.value;
    const expiresAt =
      typeof parsed.client_secret === "string" || !parsed.client_secret.expires_at
        ? new Date(Date.now() + 60_000).toISOString()
        : new Date(parsed.client_secret.expires_at * 1000).toISOString();
    return {
      mode: "openai_ephemeral_secret",
      sessionId: request.lessonSessionId,
      clientSecret: secret,
      expiresAt
    };
  }

  async exchangeSdp(request: RealtimeSessionRequest, context: RealtimeProviderContext): Promise<RealtimeSessionResponse> {
    this.assertApiKey(context);
    if (!request.localSdp) {
      throw new Error("localSdp is required for SDP exchange");
    }
    const form = new FormData();
    form.set("sdp", new Blob([request.localSdp], { type: "application/sdp" }), "offer.sdp");
    form.set(
      "session",
      new Blob([JSON.stringify((buildRealtimeSessionUpdate(context.realtimeModel, context.realtimeVoice) as { session: unknown }).session)], {
        type: "application/json"
      }),
      "session.json"
    );
    const response = await fetch(`${this.baseUrl(context)}/v1/realtime/calls`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${context.apiKey}`,
        "OpenAI-Safety-Identifier": context.safetyIdentifier
      },
      body: form
    });
    if (!response.ok) {
      throw new Error(`OpenAI SDP exchange failed: ${response.status}`);
    }
    return {
      mode: "openai_unified_sdp",
      sessionId: request.lessonSessionId,
      sdpAnswer: await response.text()
    };
  }

  async cancelResponse(sessionId: string, responseId: string, context: RealtimeProviderContext): Promise<void> {
    this.assertApiKey(context);
    const response = await fetch(`${this.baseUrl(context)}/v1/realtime/sessions/${sessionId}/events`, {
      method: "POST",
      headers: this.jsonHeaders(context),
      body: JSON.stringify({
        type: "response.cancel",
        response_id: responseId
      })
    });
    if (!response.ok) {
      throw new Error(`OpenAI response cancel failed: ${response.status}`);
    }
  }

  async cleanup(_sessionId: string): Promise<void> {
    return;
  }

  private jsonHeaders(context: RealtimeProviderContext): HeadersInit {
    return {
      Authorization: `Bearer ${context.apiKey}`,
      "Content-Type": "application/json",
      "OpenAI-Safety-Identifier": context.safetyIdentifier
    };
  }

  private baseUrl(context: RealtimeProviderContext): string {
    return context.baseUrl ?? "https://api.openai.com";
  }

  private assertApiKey(context: RealtimeProviderContext): void {
    if (!context.apiKey) {
      throw new Error("OPENAI_API_KEY is required for ProductionRealtimeProvider");
    }
  }
}
