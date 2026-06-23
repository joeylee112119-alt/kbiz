import React, { useMemo, useState } from "react";
import { SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { appStates, type AppState } from "@aiphone/contracts";
import { BackchannelController, InterruptionClassifier } from "@aiphone/lesson-engine";
import { buildRealtimeSessionUpdate, RealtimeStateMachine } from "@aiphone/realtime-client";
import { colors, styles } from "./design-system";

const onboardingSteps = [
  "시작",
  "미국식·영국식 영어",
  "AI 튜터 선택",
  "음성 미리 듣기",
  "영어 수준",
  "학습 목적",
  "어려운 영역",
  "교정 방식",
  "관심사",
  "하루 학습 시간",
  "요일",
  "전화 시간",
  "알림 권한",
  "마이크 권한",
  "녹음·전사 동의",
  "학습 계획 생성",
  "무료 체험 전화",
  "체험 결과",
  "구독"
];

export default function App() {
  const [state, setState] = useState<AppState>("ONBOARDING");
  const [step, setStep] = useState(0);
  const realtime = useMemo(() => new RealtimeStateMachine(), []);
  const classifier = useMemo(() => new InterruptionClassifier(), []);
  const backchannel = useMemo(() => new BackchannelController(), []);
  const realtimeDefaults = buildRealtimeSessionUpdate("gpt-realtime-2", "marin");

  const interruption = classifier.classify({
    transcript: "yeah",
    utteranceDurationMs: 500,
    aiPlaybackPositionMs: 2400,
    aiRemainingMs: 3200,
    currentStage: "GUIDED_ROLEPLAY",
    confidence: 0.8
  });
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

  function advance() {
    if (state === "ONBOARDING" && step < onboardingSteps.length - 1) {
      setStep(step + 1);
      return;
    }
    const currentIndex = appStates.indexOf(state);
    setState(appStates[Math.min(currentIndex + 1, appStates.length - 1)] ?? "HOME");
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>AI 전화영어</Text>
          <Text style={styles.title}>{state === "ONBOARDING" ? onboardingSteps[step] : screenTitle(state)}</Text>
          <Text style={styles.subtitle}>오늘 오후 8:30 · Emma 선생님 · 호텔 체크인 · 15분</Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>다음 영어 전화</Text>
          <Text style={styles.large}>영어 전화가 왔어요</Text>
          <Text style={styles.body}>핵심 표현만 보면서 직접 말하는 수업 화면입니다. 전체 스크립트는 미리 보여주지 않습니다.</Text>
          <View style={styles.row}>
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent }]} onPress={advance} accessibilityRole="button">
              <Text style={styles.buttonText}>{state === "CALL_RINGING" ? "받기" : "다음"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setState("CALL_RINGING")} accessibilityRole="button">
              <Text style={styles.secondaryButtonText}>Mock 전화</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>수업 상태</Text>
          <Text style={styles.body}>Realtime: {realtime.state}</Text>
          <Text style={styles.body}>VAD: {JSON.stringify(realtimeDefaults)}</Text>
          <Text style={styles.body}>AI 발화 중 “yeah”: {interruption.kind}</Text>
          <Text style={styles.body}>사용자 발화 중 추임새: {backchannelDecision.allowed ? backchannelDecision.clipId : backchannelDecision.reason}</Text>
        </View>

        <View style={styles.tabbar}>
          {["홈", "연습", "기록", "프로필"].map((label) => (
            <Text key={label} style={styles.tab}>{label}</Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function screenTitle(state: AppState): string {
  const labels: Record<AppState, string> = {
    ONBOARDING: "온보딩",
    TRIAL_READY: "무료 체험 준비",
    TRIAL_CALL: "체험 전화",
    TRIAL_RESULT: "체험 결과",
    SUBSCRIPTION: "구독",
    HOME: "홈",
    CALL_SCHEDULED: "전화 예약됨",
    CALL_RINGING: "수신 전화",
    CALL_CONNECTING: "연결 중",
    LESSON_ACTIVE: "수업 중",
    LESSON_FINISHING: "수업 정리",
    RESULT_GENERATING: "결과 생성",
    RESULT: "수업 결과",
    REVIEW: "복습"
  };
  return labels[state];
}
