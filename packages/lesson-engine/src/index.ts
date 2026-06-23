import type { BackchannelPolicy, Correction, LessonStage, TargetExpression } from "@aiphone/contracts";

export const defaultStageDurations: Record<Exclude<LessonStage, "COMPLETED">, number> = {
  CHECK_IN: 40,
  WARM_UP: 110,
  TARGET_PHRASES: 150,
  GUIDED_ROLEPLAY: 330,
  FREE_TALK: 150,
  CORRECTION: 90,
  WRAP_UP: 30
};

const orderedStages: Exclude<LessonStage, "COMPLETED">[] = [
  "CHECK_IN",
  "WARM_UP",
  "TARGET_PHRASES",
  "GUIDED_ROLEPLAY",
  "FREE_TALK",
  "CORRECTION",
  "WRAP_UP"
];

export type LessonEngineConfig = {
  sessionId: string;
  startedAt: string;
  timeScale: number;
  objective: string;
  targetExpressions: TargetExpression[];
  backchannelPolicy: BackchannelPolicy;
};

export type UtteranceInput = {
  speaker: "USER" | "AI";
  transcript: string;
  durationMs: number;
  at: string;
};

export type LessonEngineState = {
  sessionId: string;
  stage: LessonStage;
  elapsedSeconds: number;
  remainingSeconds: number;
  objective: string;
  targetExpressions: Array<TargetExpression & { used: boolean }>;
  userSpeakingRatio: number;
  correctionCount: number;
  materialCardId: string | null;
  shouldFinish: boolean;
};

export type StageDecision = {
  nextStage: LessonStage;
  forced: boolean;
  reason: string;
};

export class LessonOrchestrator {
  private readonly config: LessonEngineConfig;
  private currentStageIndex = 0;
  private elapsedSeconds = 0;
  private userSpeechMs = 0;
  private aiSpeechMs = 0;
  private correctionCandidates: Correction[] = [];
  private usedExpressionIds = new Set<string>();
  private materialCardId: string | null = null;

  constructor(config: LessonEngineConfig) {
    this.config = config;
    if (config.timeScale <= 0 || config.timeScale > 1) {
      throw new Error("timeScale must be > 0 and <= 1");
    }
  }

  get stage(): LessonStage {
    return orderedStages[this.currentStageIndex] ?? "COMPLETED";
  }

  get totalPlannedSeconds(): number {
    return Object.values(defaultStageDurations).reduce((total, seconds) => total + seconds, 0);
  }

  getState(): LessonEngineState {
    return {
      sessionId: this.config.sessionId,
      stage: this.stage,
      elapsedSeconds: Math.round(this.elapsedSeconds),
      remainingSeconds: Math.max(0, Math.round(this.totalPlannedSeconds - this.elapsedSeconds)),
      objective: this.config.objective,
      targetExpressions: this.config.targetExpressions.map((expression) => ({
        ...expression,
        used: this.usedExpressionIds.has(expression.id)
      })),
      userSpeakingRatio: this.computeUserSpeakingRatio(),
      correctionCount: this.correctionCandidates.length,
      materialCardId: this.materialCardId,
      shouldFinish: this.stage === "COMPLETED"
    };
  }

  tick(realSeconds: number): StageDecision | null {
    if (this.stage === "COMPLETED") {
      return null;
    }
    this.elapsedSeconds += realSeconds / this.config.timeScale;
    return this.evaluateTransition(false);
  }

  recordUtterance(input: UtteranceInput): LessonEngineState {
    if (input.speaker === "USER") {
      this.userSpeechMs += input.durationMs;
      this.trackTargetExpressions(input.transcript);
    } else {
      this.aiSpeechMs += input.durationMs;
    }
    return this.getState();
  }

  showMaterial(cardId: string): LessonEngineState {
    this.materialCardId = cardId;
    return this.getState();
  }

  recordCorrection(candidate: Correction): LessonEngineState {
    if (this.correctionCandidates.length < 12) {
      this.correctionCandidates.push(candidate);
    }
    return this.getState();
  }

  advanceStage(reason = "manual_or_tool_validated"): StageDecision {
    return this.moveToNextStage(true, reason);
  }

  finishLesson(reason = "finish_lesson_tool"): LessonDecisionWithState {
    this.currentStageIndex = orderedStages.length;
    this.elapsedSeconds = this.totalPlannedSeconds;
    return {
      decision: { nextStage: "COMPLETED", forced: true, reason },
      state: this.getState()
    };
  }

  private evaluateTransition(forced: boolean): StageDecision | null {
    const currentStage = this.stage;
    if (currentStage === "COMPLETED") {
      return null;
    }

    const plannedEnd = this.plannedEndForStage(currentStage);
    const preserveWrapUp = this.totalPlannedSeconds - this.elapsedSeconds <= 30 && currentStage !== "WRAP_UP";
    const preserveCorrection = this.totalPlannedSeconds - this.elapsedSeconds <= 120 && !["CORRECTION", "WRAP_UP"].includes(currentStage);

    if (forced || this.elapsedSeconds >= plannedEnd || preserveWrapUp || preserveCorrection) {
      const reason = preserveWrapUp
        ? "preserve_wrap_up"
        : preserveCorrection
          ? "preserve_correction"
          : forced
            ? "forced"
            : "planned_duration_elapsed";
      return this.moveToNextStage(forced || preserveWrapUp || preserveCorrection, reason);
    }
    return null;
  }

  private moveToNextStage(forced: boolean, reason: string): StageDecision {
    this.currentStageIndex += 1;
    const nextStage = this.stage;
    return { nextStage, forced, reason };
  }

  private plannedEndForStage(stage: Exclude<LessonStage, "COMPLETED">): number {
    let end = 0;
    for (const item of orderedStages) {
      end += defaultStageDurations[item];
      if (item === stage) {
        return end;
      }
    }
    return this.totalPlannedSeconds;
  }

  private trackTargetExpressions(transcript: string): void {
    const normalized = transcript.toLowerCase();
    for (const expression of this.config.targetExpressions) {
      if (normalized.includes(expression.text.toLowerCase())) {
        this.usedExpressionIds.add(expression.id);
      }
    }
  }

  private computeUserSpeakingRatio(): number {
    const total = this.userSpeechMs + this.aiSpeechMs;
    if (total === 0) {
      return 0;
    }
    return Number((this.userSpeechMs / total).toFixed(2));
  }
}

export type LessonDecisionWithState = {
  decision: StageDecision;
  state: LessonEngineState;
};

export type InterruptionInput = {
  transcript: string;
  utteranceDurationMs: number;
  aiPlaybackPositionMs: number;
  aiRemainingMs: number;
  currentStage: LessonStage;
  confidence: number;
};

export type InterruptionKind = "BACKCHANNEL" | "MEANINGFUL_INTERJECTION" | "STOP_COMMAND";

export type InterruptionDecision = {
  kind: InterruptionKind;
  confidence: number;
  shouldCancelAi: boolean;
  shouldQueueUserTurn: boolean;
  reason: string;
};

const shortBackchannels = new Set(["yeah", "right", "okay", "ok", "mm-hm", "mhm", "uh-huh", "i see"]);
const stopPhrases = ["stop", "wait", "hold on", "잠깐", "그만"];

export class InterruptionClassifier {
  classify(input: InterruptionInput): InterruptionDecision {
    const text = input.transcript.trim().toLowerCase();
    const wordCount = text.length === 0 ? 0 : text.split(/\s+/).length;
    const hasStopPhrase = stopPhrases.some((phrase) => text.includes(phrase));

    if (hasStopPhrase) {
      return {
        kind: "STOP_COMMAND",
        confidence: Math.max(0.9, input.confidence),
        shouldCancelAi: true,
        shouldQueueUserTurn: true,
        reason: "explicit_stop_phrase"
      };
    }

    if (shortBackchannels.has(text) && input.utteranceDurationMs < 1200 && wordCount <= 2) {
      return {
        kind: "BACKCHANNEL",
        confidence: Math.min(0.95, Math.max(0.7, input.confidence)),
        shouldCancelAi: false,
        shouldQueueUserTurn: false,
        reason: "short_acknowledgement"
      };
    }

    const nearSentenceEnd = input.aiRemainingMs < 1200;
    return {
      kind: "MEANINGFUL_INTERJECTION",
      confidence: Math.max(0.65, input.confidence),
      shouldCancelAi: !nearSentenceEnd && input.utteranceDurationMs > 1600,
      shouldQueueUserTurn: true,
      reason: nearSentenceEnd ? "queue_until_sentence_end" : "substantive_user_turn"
    };
  }
}

export type BackchannelInput = {
  userSpeaking: boolean;
  speechDurationMs: number;
  microPauseMs: number;
  lastBackchannelAgoMs: number;
  backchannelCount: number;
  likelyTurnEnd: boolean;
  noiseLevelHigh: boolean;
  currentLessonStage: LessonStage;
  playbackState: "IDLE" | "AI_PLAYING" | "BACKCHANNEL_PLAYING";
  randomValue?: number;
};

export type BackchannelDecision = {
  allowed: boolean;
  clipId: string | null;
  reason: string;
};

const defaultBackchannelClips = ["mm_hm_01", "mm_hm_02", "uh_huh_01", "uh_huh_02", "i_see_01", "right_01", "okay_01"];

export class BackchannelController {
  private readonly clips: string[];
  private recentClipIds: string[] = [];

  constructor(clips = defaultBackchannelClips) {
    this.clips = clips;
  }

  decide(input: BackchannelInput): BackchannelDecision {
    if (!input.userSpeaking) return { allowed: false, clipId: null, reason: "user_not_speaking" };
    if (input.speechDurationMs < 1800) return { allowed: false, clipId: null, reason: "speech_too_short" };
    if (input.lastBackchannelAgoMs < 4500) return { allowed: false, clipId: null, reason: "min_gap" };
    if (input.backchannelCount >= 2) return { allowed: false, clipId: null, reason: "turn_limit" };
    if (input.microPauseMs < 220) return { allowed: false, clipId: null, reason: "micro_pause_too_short" };
    if (input.microPauseMs > 500) return { allowed: false, clipId: null, reason: "likely_turn_end_pause" };
    if (input.likelyTurnEnd) return { allowed: false, clipId: null, reason: "likely_turn_end" };
    if (input.noiseLevelHigh) return { allowed: false, clipId: null, reason: "noise_high" };
    if (["TARGET_PHRASES", "CORRECTION"].includes(input.currentLessonStage)) {
      return { allowed: false, clipId: null, reason: "stage_disallows_backchannel" };
    }
    if ((input.randomValue ?? 0.5) < 0.25) return { allowed: false, clipId: null, reason: "probability_skip" };

    const clipId = this.pickClip();
    this.recentClipIds.push(clipId);
    this.recentClipIds = this.recentClipIds.slice(-3);
    return { allowed: true, clipId, reason: "micro_pause" };
  }

  private pickClip(): string {
    const available = this.clips.filter((clip) => !this.recentClipIds.includes(clip));
    return available[0] ?? this.clips[0] ?? "mm_hm_01";
  }
}

export type PlaybackState = "IDLE" | "AI_PLAYING" | "BACKCHANNEL_PLAYING";

export type TurnControllerEvent =
  | { type: "continue_ai" }
  | { type: "cancel_ai"; reason: string }
  | { type: "queue_user_turn"; transcript: string }
  | { type: "response_create"; transcript: string };

export class TurnController {
  private readonly classifier: InterruptionClassifier;
  private playbackState: PlaybackState = "IDLE";
  private pendingUserTurns: string[] = [];

  constructor(classifier = new InterruptionClassifier()) {
    this.classifier = classifier;
  }

  setAiPlayback(active: boolean): void {
    this.playbackState = active ? "AI_PLAYING" : "IDLE";
  }

  handleUserDuringAi(input: InterruptionInput): TurnControllerEvent[] {
    const decision = this.classifier.classify(input);
    if (decision.kind === "BACKCHANNEL") {
      return [{ type: "continue_ai" }];
    }
    if (decision.kind === "STOP_COMMAND") {
      this.pendingUserTurns.push(input.transcript);
      this.playbackState = "IDLE";
      return [
        { type: "cancel_ai", reason: decision.reason },
        { type: "queue_user_turn", transcript: input.transcript }
      ];
    }
    this.pendingUserTurns.push(input.transcript);
    return decision.shouldCancelAi
      ? [
          { type: "cancel_ai", reason: decision.reason },
          { type: "queue_user_turn", transcript: input.transcript }
        ]
      : [{ type: "queue_user_turn", transcript: input.transcript }];
  }

  handleAudioPlaybackEnded(): TurnControllerEvent[] {
    this.playbackState = "IDLE";
    const [nextTurn] = this.pendingUserTurns.splice(0, 1);
    if (!nextTurn) {
      return [];
    }
    return [{ type: "response_create", transcript: nextTurn }];
  }

  getPendingTurnCount(): number {
    return this.pendingUserTurns.length;
  }

  getPlaybackState(): PlaybackState {
    return this.playbackState;
  }
}
