import React, { useMemo, useState } from "react";
import {
  type DimensionValue,
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import type { AppState } from "@aiphone/contracts";
import { BackchannelController, InterruptionClassifier } from "@aiphone/lesson-engine";
import { buildRealtimeSessionUpdate, RealtimeStateMachine } from "@aiphone/realtime-client";
import tutorImage from "./assets/tutor-emma.jpeg";
import { styles } from "./design-system";
import { presentDebugLessonReminder, registerNativePushToken } from "./native/NativeNotificationBridge";

const options = [
  { label: "일상 회화", caption: "언제든 말문을 트는 개인 AI 튜터" },
  { label: "비즈니스 영어", caption: "회의, 인터뷰, 발표를 실전처럼 연습" },
  { label: "시험·고급 표현", caption: "긴 답변과 자연스러운 재표현 훈련" }
];

const lessonMessages = [
  {
    role: "ai",
    text: "Hi Joey, I'm Emma. Let's practice checking in at a hotel. Could you tell me what kind of room you booked?"
  },
  {
    role: "user",
    text: "I booked a single room for two nights.",
    highlight: "single room"
  },
  {
    role: "ai",
    text: "Great. You can also say, I have a reservation for a single room for two nights. Would you like to try that?"
  },
  {
    role: "user",
    text: "I have a reservation for a single room for two nights.",
    highlight: "reservation"
  }
];

const lessonModules = [
  {
    eyebrow: "Role-play",
    title: "Job interview",
    body: "예상 질문에 바로 답하고 꼬리질문까지 연습"
  },
  {
    eyebrow: "Daily lesson",
    title: "Hotel check-in",
    body: "오늘 예약된 15분 실전 대화"
  },
  {
    eyebrow: "Read & talk",
    title: "AI at work",
    body: "짧은 글을 읽고 내 의견 말하기"
  }
];

const feedbackTools = [
  { label: "Grammar", value: "문법 교정" },
  { label: "Pronunciation", value: "발음 점수" },
  { label: "Rephrase", value: "자연스러운 표현" },
  { label: "Accent", value: "억양 코칭" }
];

const scoreRows = [
  { label: "발음", score: 86 },
  { label: "유창성", score: 72 },
  { label: "문법", score: 78 }
];

const pronunciationItems = [
  { word: "reservation", score: 87 },
  { word: "available", score: 74 },
  { word: "quiet", score: 91 }
];

export default function App() {
  const [state, setState] = useState<AppState>("ONBOARDING");
  const [selectedVariant, setSelectedVariant] = useState(options[0]?.label ?? "미국식 영어");
  const realtime = useMemo(() => new RealtimeStateMachine(), []);
  const classifier = useMemo(() => new InterruptionClassifier(), []);
  const backchannel = useMemo(() => new BackchannelController(), []);
  const realtimeDefaults = buildRealtimeSessionUpdate("gpt-realtime-2", "marin");
  const [nativeStatus, setNativeStatus] = useState("알림 토큰 미등록");

  const interruption = classifier.classify({
    transcript: "yeah",
    utteranceDurationMs: 500,
    aiPlaybackPositionMs: 2400,
    aiRemainingMs: 3200,
    currentStage: "GUIDED_ROLEPLAY",
    confidence: 0.8
  });
  const vadSettings = (realtimeDefaults as {
    session?: { audio?: { input?: { turn_detection?: unknown } } };
  }).session?.audio?.input?.turn_detection;
  const backchannelDecision = backchannel.decide({
    userSpeaking: true,
    speechDurationMs: 2800,
    microPauseMs: 300,
    lastBackchannelAgoMs: 6000,
    backchannelCount: 0,
    likelyTurnEnd: false,
    noiseLevelHigh: false,
    currentLessonStage: "GUIDED_ROLEPLAY",
    playbackState: "IDLE",
    randomValue: 0.8
  });

  async function registerPush() {
    try {
      const result = await registerNativePushToken();
      setNativeStatus(`알림 등록 요청 완료: ${typeof result === "string" ? result.slice(-4) : "requested"}`);
    } catch (error) {
      setNativeStatus(error instanceof Error ? error.message : "알림 등록 실패");
    }
  }

  async function showDebugReminder() {
    try {
      await presentDebugLessonReminder({
        occurrenceId: "debug-occurrence",
        notificationDeliveryId: "debug-delivery",
        title: "AI 영어 수업을 시작할 시간이에요",
        body: "Emma와 호텔 체크인 연습을 준비했어요."
      });
      setState("LESSON_READY");
      setNativeStatus("디버그 수업 알림 표시됨");
    } catch (error) {
      setNativeStatus(error instanceof Error ? error.message : "디버그 알림 실패");
    }
  }

  if (state === "ONBOARDING") {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.onboardingContainer}>
          <Image source={tutorImage} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.onboardingBody}>
            <Text style={styles.onboardingTitle}>어떤 영어 상황을 가장 먼저 연습할까요?</Text>
            <View style={styles.optionList}>
              {options.map((option) => {
                const selected = selectedVariant === option.label;
                return (
                  <TouchableOpacity
                    key={option.label}
                    style={[styles.optionCard, selected && styles.optionCardSelected]}
                    onPress={() => setSelectedVariant(option.label)}
                    accessibilityRole="button"
                  >
                    <View>
                      <Text style={[styles.optionTitle, selected && styles.optionTitleSelected]}>{option.label}</Text>
                      <Text style={[styles.optionCaption, selected && styles.optionCaptionSelected]}>{option.caption}</Text>
                    </View>
                    <Text style={[styles.optionMark, selected && styles.optionMarkSelected]}>{selected ? "선택됨" : "선택"}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>
        <View style={styles.fixedFooter}>
          <TouchableOpacity style={styles.primaryPill} onPress={() => setState("HOME")} accessibilityRole="button">
            <Text style={styles.primaryPillText}>계속</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (state === "LESSON_ACTIVE") {
    return <LessonScreen onFinish={() => setState("RESULT")} />;
  }

  if (state === "RESULT" || state === "REVIEW") {
    return (
      <ResultScreen
        showReview={state === "REVIEW"}
        onHome={() => setState("HOME")}
        onReview={() => setState("REVIEW")}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.homeContainer}>
        <View style={styles.productHeader}>
          <Text style={styles.productKicker}>AI 영어 튜터</Text>
          <Text style={styles.productTitle}>언제든 말할 수 있는 Emma</Text>
          <Text style={styles.productBody}>예약 알림으로 시작하고, 수업 중에는 실시간 대화와 피드백을 받아요.</Text>
        </View>

        <View style={styles.metricRow}>
          {[
            ["15분", "오늘 수업"],
            ["24/7", "연습 가능"],
            ["4개", "피드백"]
          ].map(([value, label]) => (
            <View key={label} style={styles.metricChip}>
              <Text style={styles.metricValue}>{value}</Text>
              <Text style={styles.metricLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.dailyCard}>
          <View>
            <Text style={styles.cardEyebrow}>Your personal AI tutor</Text>
            <Text style={styles.cardTitle}>오늘의 대화</Text>
            <Text style={styles.cardBody}>호텔 체크인 상황에서 자연스럽게 요청하고 답하는 법을 연습해요.</Text>
          </View>
          <Image source={tutorImage} style={styles.tutorBadge} resizeMode="cover" />
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.translucentButton} onPress={() => setState("LESSON_READY")} accessibilityRole="button">
              <Text style={styles.translucentButtonText}>준비 화면</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.translucentButton} onPress={showDebugReminder} accessibilityRole="button">
              <Text style={styles.translucentButtonText}>Mock 알림</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.moduleSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitleDark}>Lessons</Text>
            <Text style={styles.sectionLink}>전체 보기</Text>
          </View>
          {lessonModules.map((module) => (
            <TouchableOpacity
              key={module.title}
              style={styles.moduleCard}
              onPress={() => setState(module.title === "Hotel check-in" ? "LESSON_READY" : "LESSON_ACTIVE")}
              accessibilityRole="button"
            >
              <View style={styles.moduleIcon}>
                <Text style={styles.moduleIconText}>{module.title.slice(0, 1)}</Text>
              </View>
              <View style={styles.moduleCopy}>
                <Text style={styles.moduleEyebrow}>{module.eyebrow}</Text>
                <Text style={styles.moduleTitle}>{module.title}</Text>
                <Text style={styles.moduleBody}>{module.body}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.feedbackCard}>
          <Text style={styles.sectionKicker}>Instant feedback</Text>
          <Text style={styles.feedbackTitle}>말하면 바로 고쳐줘요</Text>
          <View style={styles.feedbackGrid}>
            {feedbackTools.map((tool) => (
              <View key={tool.label} style={styles.feedbackTool}>
                <Text style={styles.feedbackToolLabel}>{tool.label}</Text>
                <Text style={styles.feedbackToolValue}>{tool.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.lessonReadyCard}>
          <Text style={styles.sectionKicker}>수업 준비</Text>
          <Text style={styles.lessonReadyTitle}>
            {state === "LESSON_READY" ? "수업 준비가 끝났어요" : "알림을 받으면 준비 화면으로 이동해요"}
          </Text>
          <Text style={styles.lessonReadyBody}>
            마이크와 OpenAI Realtime 연결은 사용자가 수업 시작을 누른 뒤에만 시작됩니다.
          </Text>
          <View style={styles.row}>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setState("LESSON_ACTIVE")} accessibilityRole="button">
              <Text style={styles.primaryButtonText}>수업 시작</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.outlineButton} onPress={registerPush} accessibilityRole="button">
              <Text style={styles.outlineButtonText}>알림 등록</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.statusText}>{nativeStatus}</Text>
        </View>

        <View style={styles.practiceCard}>
          <Text style={styles.sectionKicker}>Talk about anything</Text>
          <Text style={styles.practiceTitle}>내 주제로 바로 대화</Text>
          <Text style={styles.practiceBody}>스포츠, 여행, 업무, 책, 영화처럼 원하는 주제로 말하기 연습을 시작할 수 있어요.</Text>
        </View>

        <View style={styles.debugPanel}>
          <Text style={styles.debugTitle}>기능 확인</Text>
          <Text style={styles.debugText}>Realtime: {realtime.state}</Text>
          <Text style={styles.debugText}>VAD: {JSON.stringify(vadSettings)}</Text>
          <Text style={styles.debugText}>AI 발화 중 “yeah”: {interruption.kind}</Text>
          <Text style={styles.debugText}>
            사용자 발화 중 추임새: {backchannelDecision.allowed ? backchannelDecision.clipId : backchannelDecision.reason}
          </Text>
        </View>
      </ScrollView>
      <BottomTabs active="홈" />
    </SafeAreaView>
  );
}

function LessonScreen({ onFinish }: { onFinish: () => void }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.lessonTopBar}>
        <Text style={styles.lessonTitle}>일일 레슨</Text>
        <View style={styles.lessonProgressTrack}>
          <View style={styles.lessonProgressFill} />
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={onFinish} accessibilityRole="button">
          <Text style={styles.closeButtonText}>끝</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.lessonContainer}>
        <Image source={tutorImage} style={styles.floatingTutor} resizeMode="cover" />
        {lessonMessages.map((message, index) => (
          <View
            key={`${message.role}-${index}`}
            style={message.role === "ai" ? [styles.aiBubble, index === 0 && styles.aiBubbleFirst] : styles.userBubble}
          >
            <Text style={message.role === "ai" ? styles.aiBubbleText : styles.userBubbleText}>
              {message.highlight ? highlightText(message.text, message.highlight) : message.text}
            </Text>
            <View style={styles.bubbleActions}>
              <Text style={styles.bubbleActionText}>번역</Text>
              <Text style={styles.bubbleActionText}>{message.role === "ai" ? "다시" : "재생"}</Text>
              <Text style={styles.bubbleActionText}>목표</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.lessonControlBar}>
        <Text style={styles.controlIcon}>도움</Text>
        <Text style={styles.controlIcon}>문장</Text>
        <TouchableOpacity style={styles.micButton} onPress={onFinish} accessibilityRole="button">
          <Text style={styles.micIcon}>마이크</Text>
        </TouchableOpacity>
        <Text style={styles.controlIcon}>손들기</Text>
        <Text style={styles.controlIcon}>키보드</Text>
      </View>
    </SafeAreaView>
  );
}

function ResultScreen({
  showReview,
  onHome,
  onReview
}: {
  showReview: boolean;
  onHome: () => void;
  onReview: () => void;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.homeContainer}>
        <View style={styles.resultHero}>
          <Text style={styles.resultKicker}>강의 핵심 정리 완료</Text>
          <Text style={styles.resultTitle}>첫 번째 레슨</Text>
          <Image source={tutorImage} style={styles.resultTutor} resizeMode="cover" />
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.translucentButton} onPress={onHome} accessibilityRole="button">
              <Text style={styles.translucentButtonText}>홈</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.translucentButton} onPress={onReview} accessibilityRole="button">
              <Text style={styles.translucentButtonText}>검토</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.practiceCardBlue}>
          <Text style={styles.blueCardKicker}>발음 핵심 정리</Text>
          <Text style={styles.blueCardTitle}>/b/ vs /v/</Text>
          <Text style={styles.blueCardBody}>hotel lobby, reservation, available 표현을 다시 연습하세요.</Text>
        </View>

        <View style={styles.reportCard}>
          <Text style={styles.sectionKicker}>내 대화 기술</Text>
          {scoreRows.map(({ label, score }) => (
            <View key={label} style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>{label}</Text>
              <View style={styles.scoreTrack}>
                <View style={[styles.scoreFill, { width: `${score}%` as DimensionValue }]} />
              </View>
              <Text style={styles.scoreValue}>{score}</Text>
            </View>
          ))}
        </View>

        <View style={styles.reportCard}>
          <Text style={styles.sectionKicker}>Grammar</Text>
          <Text style={styles.reviewBody}>I want room quiet.</Text>
          <View style={styles.correctionDivider} />
          <Text style={styles.reviewPrompt}>I’d like a quiet room, please.</Text>
          <Text style={styles.reviewBody}>더 정중하고 자연스러운 요청 표현입니다.</Text>
        </View>

        <View style={styles.reportCard}>
          <Text style={styles.sectionKicker}>Pronunciation</Text>
          <View style={styles.wordScoreGrid}>
            {pronunciationItems.map((item) => (
              <View key={item.word} style={styles.wordScorePill}>
                <Text style={styles.wordScoreWord}>{item.word}</Text>
                <Text style={styles.wordScoreValue}>{item.score}%</Text>
              </View>
            ))}
          </View>
        </View>

        {showReview ? (
          <View style={styles.reportCard}>
            <Text style={styles.sectionKicker}>복습 아이템</Text>
            <Text style={styles.reviewPrompt}>Could I get a quiet room?</Text>
            <Text style={styles.reviewBody}>예약 상황에서 정중하게 요청하는 문장입니다.</Text>
          </View>
        ) : null}
      </ScrollView>
      <BottomTabs active={showReview ? "연습" : "홈"} />
    </SafeAreaView>
  );
}

function BottomTabs({ active }: { active: string }) {
  return (
    <View style={styles.bottomTabs}>
      {["홈", "연습", "리그", "Joey"].map((label) => (
        <Text key={label} style={label === active ? styles.bottomTabActive : styles.bottomTab}>
          {label}
        </Text>
      ))}
    </View>
  );
}

function highlightText(text: string, target: string) {
  const [before, after] = text.split(target);
  if (after === undefined) return text;
  return (
    <>
      {before}
      <Text style={styles.highlightText}>{target}</Text>
      {after}
    </>
  );
}
