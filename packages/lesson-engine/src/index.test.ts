import { describe, expect, it } from "vitest";
import { BackchannelController, InterruptionClassifier, LessonOrchestrator, TurnController } from "./index.js";
import type { LessonEngineConfig } from "./index.js";

const baseConfig: LessonEngineConfig = {
  sessionId: "session-test",
  startedAt: new Date().toISOString(),
  timeScale: 0.02,
  objective: "호텔 체크인",
  targetExpressions: [
    {
      id: "expr-1",
      text: "I'd like to check in",
      meaningKo: "체크인하고 싶습니다",
      examples: ["I'd like to check in, please."],
      alternatives: [],
      level: "A1" as const,
      grammarTags: ["request"]
    }
  ],
  backchannelPolicy: {
    enabled: true,
    minSpeechMs: 1800,
    minGapMs: 4500,
    maxPerTurn: 2,
    disallowedStages: ["TARGET_PHRASES", "CORRECTION"]
  }
};

describe("lesson engine", () => {
  it("tracks target expression usage and advances by scaled time", () => {
    const engine = new LessonOrchestrator(baseConfig);
    engine.recordUtterance({
      speaker: "USER",
      transcript: "I'd like to check in please",
      durationMs: 2000,
      at: new Date().toISOString()
    });

    expect(engine.getState().targetExpressions[0]?.used).toBe(true);
    expect(engine.tick(1)?.nextStage).toBe("WARM_UP");
  });

  it("classifies backchannels and stop commands separately", () => {
    const classifier = new InterruptionClassifier();
    expect(
      classifier.classify({
        transcript: "yeah",
        utteranceDurationMs: 500,
        aiPlaybackPositionMs: 100,
        aiRemainingMs: 3000,
        currentStage: "GUIDED_ROLEPLAY",
        confidence: 0.8
      }).kind
    ).toBe("BACKCHANNEL");

    expect(
      classifier.classify({
        transcript: "wait",
        utteranceDurationMs: 500,
        aiPlaybackPositionMs: 100,
        aiRemainingMs: 3000,
        currentStage: "GUIDED_ROLEPLAY",
        confidence: 0.8
      }).shouldCancelAi
    ).toBe(true);
  });

  it("allows backchannel only in a valid micro-pause", () => {
    const controller = new BackchannelController(["mm_hm_01"]);
    expect(
      controller.decide({
        userSpeaking: true,
        speechDurationMs: 2400,
        microPauseMs: 300,
        lastBackchannelAgoMs: 5000,
        backchannelCount: 0,
        likelyTurnEnd: false,
        noiseLevelHigh: false,
        currentLessonStage: "GUIDED_ROLEPLAY",
        playbackState: "IDLE",
        randomValue: 0.8
      }).allowed
    ).toBe(true);
  });

  it("keeps AI speaking for user yeah during AI playback", () => {
    const turns = new TurnController();
    turns.setAiPlayback(true);
    const events = turns.handleUserDuringAi({
      transcript: "yeah",
      utteranceDurationMs: 500,
      aiPlaybackPositionMs: 1000,
      aiRemainingMs: 3000,
      currentStage: "GUIDED_ROLEPLAY",
      confidence: 0.8
    });

    expect(events).toEqual([{ type: "continue_ai" }]);
    expect(turns.getPlaybackState()).toBe("AI_PLAYING");
  });

  it("cancels AI immediately for stop and queues the user turn", () => {
    const turns = new TurnController();
    turns.setAiPlayback(true);
    const events = turns.handleUserDuringAi({
      transcript: "stop please",
      utteranceDurationMs: 900,
      aiPlaybackPositionMs: 1000,
      aiRemainingMs: 3000,
      currentStage: "GUIDED_ROLEPLAY",
      confidence: 0.8
    });

    expect(events[0]?.type).toBe("cancel_ai");
    expect(events[1]).toEqual({ type: "queue_user_turn", transcript: "stop please" });
    expect(turns.getPlaybackState()).toBe("IDLE");
  });

  it("does not backchannel for short user responses or pronunciation-like stages", () => {
    const controller = new BackchannelController(["mm_hm_01"]);
    expect(
      controller.decide({
        userSpeaking: true,
        speechDurationMs: 900,
        microPauseMs: 300,
        lastBackchannelAgoMs: 5000,
        backchannelCount: 0,
        likelyTurnEnd: false,
        noiseLevelHigh: false,
        currentLessonStage: "GUIDED_ROLEPLAY",
        playbackState: "IDLE",
        randomValue: 0.8
      }).allowed
    ).toBe(false);
    expect(
      controller.decide({
        userSpeaking: true,
        speechDurationMs: 2400,
        microPauseMs: 300,
        lastBackchannelAgoMs: 5000,
        backchannelCount: 0,
        likelyTurnEnd: false,
        noiseLevelHigh: false,
        currentLessonStage: "TARGET_PHRASES",
        playbackState: "IDLE",
        randomValue: 0.8
      }).allowed
    ).toBe(false);
  });

  it("caps backchannels at two per turn", () => {
    const controller = new BackchannelController(["mm_hm_01"]);
    expect(
      controller.decide({
        userSpeaking: true,
        speechDurationMs: 2600,
        microPauseMs: 300,
        lastBackchannelAgoMs: 5000,
        backchannelCount: 2,
        likelyTurnEnd: false,
        noiseLevelHigh: false,
        currentLessonStage: "GUIDED_ROLEPLAY",
        playbackState: "IDLE",
        randomValue: 0.8
      }).allowed
    ).toBe(false);
  });

  it("creates response after audio playback ends for pending user turn", () => {
    const turns = new TurnController();
    turns.setAiPlayback(true);
    turns.handleUserDuringAi({
      transcript: "Can you explain that?",
      utteranceDurationMs: 1800,
      aiPlaybackPositionMs: 1000,
      aiRemainingMs: 500,
      currentStage: "GUIDED_ROLEPLAY",
      confidence: 0.8
    });

    expect(turns.getPendingTurnCount()).toBe(1);
    expect(turns.handleAudioPlaybackEnded()).toEqual([{ type: "response_create", transcript: "Can you explain that?" }]);
  });
});
