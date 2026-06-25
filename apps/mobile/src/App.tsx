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
  { label: "미국식 영어", caption: "Emma와 자연스러운 일상 대화" },
  { label: "영국식 영어", caption: "차분한 억양과 표현 연습" }
];

const lessonMessages = [
  {
    role: "ai",
    text: "Nice to meet you, Joey! I'm Emma, your personal AI English tutor. Tell me, where are you from?"
  },
  {
    role: "user",
    text: "I'm from Korea.",
    highlight: "I'm from"
  },
  {
    role: "ai",
    text: "Nice to meet you! Korea is a beautiful country. What is your favorite food from Korea?"
  },
  {
    role: "user",
    text: "Yes, I like eating kimchi.",
    highlight: "like"
  }
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
            <Text style={styles.onboardingTitle}>어떤 영어를 배우고 싶으신가요?</Text>
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
        <View style={styles.metricRow}>
          <View style={styles.metricChip}>
            <Text style={styles.metricLabel}>연속</Text>
            <Text style={styles.metricValue}>1</Text>
          </View>
          <View style={styles.metricChipPink}>
            <Text style={styles.metricLabel}>보석</Text>
            <Text style={styles.metricValuePink}>10</Text>
          </View>
          <View style={styles.metricChipGold}>
            <Text style={styles.metricLabel}>별</Text>
            <Text style={styles.metricValueGold}>14</Text>
          </View>
        </View>

        <View style={styles.dailyCard}>
          <View>
            <Text style={styles.cardEyebrow}>오늘의 일일 레슨</Text>
            <Text style={styles.cardTitle}>호텔 체크인</Text>
            <Text style={styles.cardBody}>Emma와 15분 동안 예약 수업을 연습해요.</Text>
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
          <Text style={styles.sectionKicker}>발음 핵심 정리</Text>
          <Text style={styles.practiceTitle}>/b/ vs /v/</Text>
          <Text style={styles.practiceBody}>수업 후 리포트에서 발음, 유창성, 문법을 함께 확인합니다.</Text>
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
          {[
            ["발음", 86],
            ["유창성", 72],
            ["문법", 78]
          ].map(([label, score]) => (
            <View key={label} style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>{label}</Text>
              <View style={styles.scoreTrack}>
                <View style={[styles.scoreFill, { width: `${score}%` as DimensionValue }]} />
              </View>
              <Text style={styles.scoreValue}>{score}</Text>
            </View>
          ))}
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
