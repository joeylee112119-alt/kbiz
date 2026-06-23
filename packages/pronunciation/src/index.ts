export type PronunciationAssessmentInput = {
  audio: ArrayBuffer;
  referenceText: string;
  locale: string;
  userIdHash: string;
  cleanupAudio?: () => void | Promise<void>;
};

export type PronunciationStatus = "ASSESSED" | "NOT_ASSESSED" | "FAILED" | "UNSUPPORTED_LOCALE";

export type PronunciationWordResult = {
  word: string;
  accuracyScore: number | null;
  errorType: string | null;
  phonemes: Array<{
    phoneme: string;
    accuracyScore: number | null;
  }>;
};

export type PronunciationAssessmentResult = {
  pronunciationStatus: PronunciationStatus;
  pronunciationScore: number | null;
  accuracyScore: number | null;
  fluencyScore: number | null;
  completenessScore: number | null;
  prosodyScore: number | null;
  provider: "mock" | "azure" | "disabled";
  providerLocale: string | null;
  providerVersion: string | null;
  assessmentMode: "scripted";
  confidence: number | null;
  errorType: string | null;
  words: PronunciationWordResult[];
  raw?: unknown;
};

export interface PronunciationProvider {
  assess(input: PronunciationAssessmentInput): Promise<PronunciationAssessmentResult>;
}

export class DisabledPronunciationProvider implements PronunciationProvider {
  async assess(input: PronunciationAssessmentInput): Promise<PronunciationAssessmentResult> {
    try {
      return nullResult("disabled", "NOT_ASSESSED", input.locale);
    } finally {
      await input.cleanupAudio?.();
    }
  }
}

export class MockPronunciationProvider implements PronunciationProvider {
  async assess(input: PronunciationAssessmentInput): Promise<PronunciationAssessmentResult> {
    try {
      return {
        ...nullResult("mock", "ASSESSED", input.locale),
        pronunciationScore: 82,
        accuracyScore: 84,
        fluencyScore: 78,
        completenessScore: 88
      };
    } finally {
      await input.cleanupAudio?.();
    }
  }
}

export type AzurePronunciationConfig = {
  speechKey: string;
  region: string;
  endpoint?: string;
  timeoutMs?: number;
  supportedLocales?: string[];
};

type AzurePronunciationJson = {
  RecognitionStatus?: string;
  Duration?: number;
  NBest?: Array<{
    Confidence?: number;
    PronunciationAssessment?: {
      PronScore?: number;
      AccuracyScore?: number;
      FluencyScore?: number;
      CompletenessScore?: number;
      ProsodyScore?: number;
    };
    Words?: Array<{
      Word?: string;
      PronunciationAssessment?: {
        AccuracyScore?: number;
        ErrorType?: string;
      };
      Phonemes?: Array<{
        Phoneme?: string;
        PronunciationAssessment?: {
          AccuracyScore?: number;
        };
      }>;
    }>;
  }>;
};

const DEFAULT_SUPPORTED_LOCALES = ["en-US", "en-GB", "en-AU", "en-CA"];

export class AzurePronunciationProvider implements PronunciationProvider {
  private readonly config: Required<Pick<AzurePronunciationConfig, "timeoutMs" | "supportedLocales">> & AzurePronunciationConfig;

  constructor(config: AzurePronunciationConfig) {
    this.config = {
      timeoutMs: 10_000,
      supportedLocales: DEFAULT_SUPPORTED_LOCALES,
      ...config
    };
  }

  async assess(input: PronunciationAssessmentInput): Promise<PronunciationAssessmentResult> {
    try {
      if (!this.config.supportedLocales.includes(input.locale)) {
        return {
          ...nullResult("azure", "UNSUPPORTED_LOCALE", input.locale),
          errorType: "UNSUPPORTED_LOCALE"
        };
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
      try {
        const response = await fetch(this.endpoint(input.locale), {
          method: "POST",
          headers: {
            "Ocp-Apim-Subscription-Key": this.config.speechKey,
            "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
            "Pronunciation-Assessment": createAssessmentHeader(input.referenceText),
            "X-User-Hash": input.userIdHash,
            Accept: "application/json"
          },
          signal: controller.signal,
          body: input.audio
        });
        if (!response.ok) {
          return {
            ...nullResult("azure", "FAILED", input.locale),
            errorType: response.status === 401 || response.status === 403 ? "AUTHENTICATION_ERROR" : "HTTP_ERROR",
            raw: { status: response.status, statusText: response.statusText }
          };
        }

        const payload = (await response.json()) as AzurePronunciationJson;
        return this.mapResponse(payload, input.locale);
      } catch (error) {
        return {
          ...nullResult("azure", "FAILED", input.locale),
          errorType: error instanceof DOMException && error.name === "AbortError" ? "TIMEOUT" : "MALFORMED_RESPONSE",
          raw: error instanceof Error ? { message: error.message } : error
        };
      } finally {
        clearTimeout(timeout);
      }
    } finally {
      await input.cleanupAudio?.();
    }
  }

  mapResponse(payload: AzurePronunciationJson, locale = "en-US"): PronunciationAssessmentResult {
    const best = payload.NBest?.[0];
    const scores = best?.PronunciationAssessment;
    if (!scores) {
      return {
        ...nullResult("azure", "NOT_ASSESSED", locale),
        raw: payload
      };
    }
    return {
      pronunciationStatus: "ASSESSED",
      pronunciationScore: scores.PronScore ?? null,
      accuracyScore: scores.AccuracyScore ?? null,
      fluencyScore: scores.FluencyScore ?? null,
      completenessScore: scores.CompletenessScore ?? null,
      prosodyScore: scores.ProsodyScore ?? null,
      provider: "azure",
      providerLocale: locale,
      providerVersion: "azure-speech-pronunciation-assessment",
      assessmentMode: "scripted",
      confidence: best?.Confidence ?? null,
      errorType: null,
      words:
        best?.Words?.map((word) => ({
          word: word.Word ?? "",
          accuracyScore: word.PronunciationAssessment?.AccuracyScore ?? null,
          errorType: word.PronunciationAssessment?.ErrorType ?? null,
          phonemes:
            word.Phonemes?.map((phoneme) => ({
              phoneme: phoneme.Phoneme ?? "",
              accuracyScore: phoneme.PronunciationAssessment?.AccuracyScore ?? null
            })) ?? []
        })) ?? [],
      raw: payload
    };
  }

  private endpoint(locale: string): string {
    return (
      this.config.endpoint ??
      `https://${this.config.region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?format=detailed&language=${encodeURIComponent(locale)}`
    );
  }
}

function createAssessmentHeader(referenceText: string): string {
  return Buffer.from(
    JSON.stringify({
      ReferenceText: referenceText,
      GradingSystem: "HundredMark",
      Granularity: "Phoneme",
      Dimension: "Comprehensive",
      EnableMiscue: true
    })
  ).toString("base64");
}

function nullResult(
  provider: PronunciationAssessmentResult["provider"],
  pronunciationStatus: PronunciationStatus,
  providerLocale: string | null
): PronunciationAssessmentResult {
  return {
    pronunciationStatus,
    pronunciationScore: null,
    accuracyScore: null,
    fluencyScore: null,
    completenessScore: null,
    prosodyScore: null,
    provider,
    providerLocale,
    providerVersion: provider === "azure" ? "azure-speech-pronunciation-assessment" : null,
    assessmentMode: "scripted",
    confidence: null,
    errorType: null,
    words: []
  };
}
