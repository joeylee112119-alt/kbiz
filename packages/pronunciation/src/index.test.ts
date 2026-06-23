import { describe, expect, it } from "vitest";
import { AzurePronunciationProvider, DisabledPronunciationProvider, MockPronunciationProvider } from "./index.js";

describe("pronunciation providers", () => {
  it("disabled provider returns null score fallback", async () => {
    const result = await new DisabledPronunciationProvider().assess({
      audio: new ArrayBuffer(0),
      referenceText: "hello",
      locale: "en-US",
      userIdHash: "user-hash"
    });
    expect(result.pronunciationScore).toBeNull();
  });

  it("mock provider returns deterministic scores", async () => {
    const result = await new MockPronunciationProvider().assess({
      audio: new ArrayBuffer(0),
      referenceText: "hello",
      locale: "en-US",
      userIdHash: "user-hash"
    });
    expect(result.pronunciationScore).toBe(82);
  });

  it("azure provider maps request and response", async () => {
    const originalFetch = globalThis.fetch;
    const calls: RequestInit[] = [];
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(init ?? {});
      return Response.json({
        NBest: [
          {
            PronunciationAssessment: {
              PronScore: 91,
              AccuracyScore: 92,
              FluencyScore: 88,
              CompletenessScore: 95
            }
          }
        ]
      });
    }) as typeof fetch;

    try {
      const result = await new AzurePronunciationProvider({
        speechKey: "key",
        region: "koreacentral",
        endpoint: "https://azure.test/speech"
      }).assess({
        audio: new ArrayBuffer(4),
        referenceText: "I'd like to check in.",
        locale: "en-US",
        userIdHash: "hash"
      });
      expect(result.pronunciationScore).toBe(91);
      expect(calls[0]?.headers).toMatchObject({
        "Ocp-Apim-Subscription-Key": "key",
        "X-User-Hash": "hash"
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
