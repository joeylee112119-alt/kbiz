import assert from "node:assert/strict";
import { BackchannelController, InterruptionClassifier, LessonOrchestrator } from "../packages/lesson-engine/src/index.ts";
import { createEvent, validateLessonReport } from "../packages/contracts/src/index.ts";
import { RealtimeStateMachine, buildRealtimeSessionUpdate } from "../packages/realtime-client/src/index.ts";

const orchestrator = new LessonOrchestrator({
  sessionId: "session-smoke",
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
      level: "A1",
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
});

orchestrator.recordUtterance({
  speaker: "USER",
  transcript: "I'd like to check in please",
  durationMs: 3200,
  at: new Date().toISOString()
});
assert.equal(orchestrator.getState().targetExpressions[0]?.used, true);

const firstDecision = orchestrator.tick(1);
assert.equal(firstDecision?.nextStage, "WARM_UP");

const classifier = new InterruptionClassifier();
assert.equal(
  classifier.classify({
    transcript: "yeah",
    utteranceDurationMs: 500,
    aiPlaybackPositionMs: 1000,
    aiRemainingMs: 3000,
    currentStage: "GUIDED_ROLEPLAY",
    confidence: 0.8
  }).kind,
  "BACKCHANNEL"
);
assert.equal(
  classifier.classify({
    transcript: "stop please",
    utteranceDurationMs: 700,
    aiPlaybackPositionMs: 1000,
    aiRemainingMs: 3000,
    currentStage: "GUIDED_ROLEPLAY",
    confidence: 0.8
  }).shouldCancelAi,
  true
);

const backchannel = new BackchannelController(["mm_hm_01"]);
assert.equal(
  backchannel.decide({
    userSpeaking: true,
    speechDurationMs: 2400,
    microPauseMs: 300,
    lastBackchannelAgoMs: 5000,
    backchannelCount: 0,
    likelyTurnEnd: false,
    noiseLevelHigh: false,
    currentLessonStage: "GUIDED_ROLEPLAY",
    playbackState: "IDLE",
    randomValue: 0.9
  }).allowed,
  true
);

const realtime = new RealtimeStateMachine();
assert.equal(realtime.transition("load_token"), "TOKEN_LOADING");
assert.equal(realtime.transition("create_peer"), "PEER_CREATING");
assert.equal(realtime.transition("offer_created"), "OFFER_CREATED");
assert.equal(realtime.transition("connect"), "CONNECTING");
assert.equal(realtime.transition("connected"), "CONNECTED");

const vadConfig = buildRealtimeSessionUpdate("gpt-realtime-2", "marin");
assert.deepEqual(
  (((vadConfig.session as Record<string, unknown>).audio as Record<string, unknown>).input as Record<string, unknown>).turn_detection,
  {
    type: "semantic_vad",
    eagerness: "low",
    create_response: false,
    interrupt_response: false
  }
);

validateLessonReport({
  summary: "완료",
  goalAchievementScore: 80,
  fluencyScore: 70,
  grammarScore: 70,
  vocabularyScore: 75,
  pronunciationScore: null,
  userSpeakingRatio: 0.63,
  targetExpressions: [],
  goodExpressions: [],
  corrections: [],
  newVocabulary: [],
  reviewItems: [],
  nextLessonRecommendation: { lessonTemplateSlug: "hotel-checkin-a1", reasonKo: "다음 연습" },
  confidence: { transcriptCoverage: 0.8 }
});

const event = createEvent({
  id: "event-1",
  sequence: 1,
  type: "lesson.stage.changed",
  sessionId: "session-smoke",
  payload: { stage: "WARM_UP" }
});
assert.equal(event.version, 1);

process.stdout.write("Smoke test passed: lesson, interruption, backchannel, realtime, report, and event contracts.\n");
