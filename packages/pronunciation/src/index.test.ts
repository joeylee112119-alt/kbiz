import { describe, expect, it, vi } from "vitest";
import { AzurePronunciationProvider, DisabledPronunciationProvider, MockPronunciationProvider } from "./index.js";

const input = {
  audio: new ArrayBuffer(4),
  referenceText: "I'd like to check in.",
  locale: "en-US",
  userIdHash: "hash"
};

describe("pronunciation providers", () => {
  it("disabled provider returns null score fallback", async () => {
    const result = await new DisabledPronunciationProvider().assess(input);
    expect(result).toMatchObject({
      pronunciationStatus: "NOT_ASSESSED",
      pronunciationScore: null,
      provider: "disabled"
    });
  });

  it("mock provider returns deterministic scores", async () => {
    const result = await new MockPronunciationProvider().assess(input);
    expect(result).toMatchObject({
      pronunciationStatus: "ASSESSED",
      pronunciationScore: 82,
      provider: "mock"
    });
  });

  it("azure provider maps request headers and successful response", async () => {
    const originalFetch = globalThis.fetch;
    const calls: Array<{ url: RequestInfo | URL; init: RequestInit }> = [];
    globalThis.fetch = (async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url, init: init ?? {} });
      return Response.json(successPayload());
    }) as typeof fetch;

    try {
      const result = await new AzurePronunciationProvider({
        speechKey: "key",
        region: "koreacentral",
        endpoint: "https://azure.test/speech"
      }).assess(input);
      expect(result).toMatchObject({
        pronunciationStatus: "ASSESSED",
        pronunciationScore: 91,
        accuracyScore: 92,
        fluencyScore: 88,
        completenessScore: 95,
        prosodyScore: 77,
        confidence: 0.91
      });
      expect(result.words[0]).toMatchObject({
        word: "check",
        accuracyScore: 93,
        errorType: "None",
        phonemes: [{ phoneme: "ch", accuracyScore: 88 }]
      });
      expect(calls[0]?.url).toBe("https://azure.test/speech");
      expect(calls[0]?.init.headers).toMatchObject({
        "Ocp-Apim-Subscription-Key": "key",
        "X-User-Hash": "hash",
        Accept: "application/json"
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("azure provider returns null fallback when scores are missing", async () => {
    const provider = new AzurePronunciationProvider({ speechKey: "key", region: "koreacentral" });
    const result = provider.mapResponse({ NBest: [{ Words: [{ Word: "hello" }] }] });
    expect(result).toMatchObject({
      pronunciationStatus: "NOT_ASSESSED",
      pronunciationScore: null,
      provider: "azure"
    });
  });

  it("azure provider preserves partial word results", () => {
    const provider = new AzurePronunciationProvider({ speechKey: "key", region: "koreacentral" });
    const result = provider.mapResponse({
      NBest: [
        {
          PronunciationAssessment: { PronScore: 75 },
          Words: [
            { Word: "hello", PronunciationAssessment: { AccuracyScore: 70 } },
            { Word: "world", Phonemes: [{ Phoneme: "w" }] }
          ]
        }
      ]
    });
    expect(result.words).toEqual([
      { word: "hello", accuracyScore: 70, errorType: null, phonemes: [] },
      { word: "world", accuracyScore: null, errorType: null, phonemes: [{ phoneme: "w", accuracyScore: null }] }
    ]);
  });

  it("azure provider skips unsupported locales without calling Azure", async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    try {
      const result = await new AzurePronunciationProvider({ speechKey: "key", region: "koreacentral" }).assess({
        ...input,
        locale: "ko-KR"
      });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        pronunciationStatus: "UNSUPPORTED_LOCALE",
        pronunciationScore: null,
        errorType: "UNSUPPORTED_LOCALE"
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("azure provider maps authentication errors without inventing scores", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response("unauthorized", { status: 401, statusText: "Unauthorized" })) as typeof fetch;
    try {
      const result = await new AzurePronunciationProvider({ speechKey: "bad", region: "koreacentral" }).assess(input);
      expect(result).toMatchObject({
        pronunciationStatus: "FAILED",
        pronunciationScore: null,
        errorType: "AUTHENTICATION_ERROR"
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("azure provider maps timeout as failed null result", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      await new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      });
      return Response.json(successPayload());
    }) as typeof fetch;

    try {
      const result = await new AzurePronunciationProvider({ speechKey: "key", region: "koreacentral", timeoutMs: 1 }).assess(input);
      expect(result).toMatchObject({
        pronunciationStatus: "FAILED",
        pronunciationScore: null,
        errorType: "TIMEOUT"
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("azure provider maps malformed response as failed null result", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true,
      json: async () => {
        throw new Error("malformed");
      }
    })) as unknown as typeof fetch;

    try {
      const result = await new AzurePronunciationProvider({ speechKey: "key", region: "koreacentral" }).assess(input);
      expect(result).toMatchObject({
        pronunciationStatus: "FAILED",
        pronunciationScore: null,
        errorType: "MALFORMED_RESPONSE"
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("cleans up temporary audio after assessment", async () => {
    const cleanupAudio = vi.fn();
    const result = await new DisabledPronunciationProvider().assess({ ...input, cleanupAudio });
    expect(result.pronunciationScore).toBeNull();
    expect(cleanupAudio).toHaveBeenCalledTimes(1);
  });
});

function successPayload() {
  return {
    NBest: [
      {
        Confidence: 0.91,
        PronunciationAssessment: {
          PronScore: 91,
          AccuracyScore: 92,
          FluencyScore: 88,
          CompletenessScore: 95,
          ProsodyScore: 77
        },
        Words: [
          {
            Word: "check",
            PronunciationAssessment: { AccuracyScore: 93, ErrorType: "None" },
            Phonemes: [{ Phoneme: "ch", PronunciationAssessment: { AccuracyScore: 88 } }]
          }
        ]
      }
    ]
  };
}
