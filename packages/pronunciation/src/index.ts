export type PronunciationAssessmentInput = {
  audio: ArrayBuffer;
  referenceText: string;
  locale: string;
  userIdHash: string;
};

export type PronunciationAssessmentResult = {
  pronunciationScore: number | null;
  accuracyScore: number | null;
  fluencyScore: number | null;
  completenessScore: number | null;
  provider: "mock" | "azure" | "disabled";
  raw?: unknown;
};

export interface PronunciationProvider {
  assess(input: PronunciationAssessmentInput): Promise<PronunciationAssessmentResult>;
}

export class DisabledPronunciationProvider implements PronunciationProvider {
  async assess(_input: PronunciationAssessmentInput): Promise<PronunciationAssessmentResult> {
    return {
      pronunciationScore: null,
      accuracyScore: null,
      fluencyScore: null,
      completenessScore: null,
      provider: "disabled"
    };
  }
}

export class MockPronunciationProvider implements PronunciationProvider {
  async assess(_input: PronunciationAssessmentInput): Promise<PronunciationAssessmentResult> {
    return {
      pronunciationScore: 82,
      accuracyScore: 84,
      fluencyScore: 78,
      completenessScore: 88,
      provider: "mock"
    };
  }
}

export type AzurePronunciationConfig = {
  speechKey: string;
  region: string;
  endpoint?: string;
};

type AzurePronunciationJson = {
  NBest?: Array<{
    PronunciationAssessment?: {
      PronScore?: number;
      AccuracyScore?: number;
      FluencyScore?: number;
      CompletenessScore?: number;
    };
  }>;
};

export class AzurePronunciationProvider implements PronunciationProvider {
  private readonly config: AzurePronunciationConfig;

  constructor(config: AzurePronunciationConfig) {
    this.config = config;
  }

  async assess(input: PronunciationAssessmentInput): Promise<PronunciationAssessmentResult> {
    const assessment = Buffer.from(
      JSON.stringify({
        ReferenceText: input.referenceText,
        GradingSystem: "HundredMark",
        Granularity: "Phoneme",
        Dimension: "Comprehensive",
        EnableMiscue: true
      })
    ).toString("base64");

    const response = await fetch(this.endpoint(input.locale), {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": this.config.speechKey,
        "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
        "Pronunciation-Assessment": assessment,
        "X-User-Hash": input.userIdHash
      },
      body: input.audio
    });
    if (!response.ok) {
      throw new Error(`Azure pronunciation request failed: ${response.status}`);
    }
    const payload = (await response.json()) as AzurePronunciationJson;
    return this.mapResponse(payload);
  }

  mapResponse(payload: AzurePronunciationJson): PronunciationAssessmentResult {
    const scores = payload.NBest?.[0]?.PronunciationAssessment;
    if (!scores) {
      return {
        pronunciationScore: null,
        accuracyScore: null,
        fluencyScore: null,
        completenessScore: null,
        provider: "azure",
        raw: payload
      };
    }
    return {
      pronunciationScore: scores.PronScore ?? null,
      accuracyScore: scores.AccuracyScore ?? null,
      fluencyScore: scores.FluencyScore ?? null,
      completenessScore: scores.CompletenessScore ?? null,
      provider: "azure",
      raw: payload
    };
  }

  private endpoint(locale: string): string {
    return (
      this.config.endpoint ??
      `https://${this.config.region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${encodeURIComponent(locale)}`
    );
  }
}
