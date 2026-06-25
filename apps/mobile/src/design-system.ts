import { Platform, StatusBar, StyleSheet } from "react-native";

export const colors = {
  background: "#eef8fb",
  surface: "#ffffff",
  ink: "#070d1d",
  text: "#202633",
  muted: "#6b7280",
  soft: "#edf3f7",
  blue: "#2f63f4",
  blueDark: "#214ed9",
  blueSoft: "#dfe8ff",
  pink: "#f37ad7",
  gold: "#f3c94a",
  green: "#5ecf9b",
  line: "#dfe6ec",
  shadow: "#9fb3c3"
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 44
};

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0
  },
  onboardingContainer: {
    paddingBottom: spacing.lg
  },
  heroImage: {
    backgroundColor: "#d8d8d8",
    height: 320,
    width: "100%"
  },
  onboardingBody: {
    padding: spacing.lg,
    gap: spacing.xl
  },
  onboardingTitle: {
    color: colors.ink,
    fontSize: 36,
    fontWeight: "900",
    lineHeight: 46
  },
  optionList: {
    gap: spacing.md
  },
  optionCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "transparent",
    borderRadius: 20,
    borderWidth: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 84,
    paddingHorizontal: spacing.lg
  },
  optionCardSelected: {
    backgroundColor: colors.blue,
    borderColor: colors.blue
  },
  optionTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900"
  },
  optionTitleSelected: {
    color: colors.surface
  },
  optionCaption: {
    color: colors.muted,
    fontSize: 14,
    marginTop: spacing.xs
  },
  optionCaptionSelected: {
    color: "#dce7ff"
  },
  optionMark: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800"
  },
  optionMarkSelected: {
    color: colors.surface
  },
  fixedFooter: {
    backgroundColor: colors.background,
    padding: spacing.lg,
    paddingTop: spacing.sm
  },
  primaryPill: {
    alignItems: "center",
    backgroundColor: colors.blue,
    borderRadius: 32,
    justifyContent: "center",
    minHeight: 64
  },
  primaryPillText: {
    color: colors.surface,
    fontSize: 20,
    fontWeight: "900"
  },
  homeContainer: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: 112
  },
  productHeader: {
    gap: spacing.sm
  },
  productKicker: {
    color: colors.blue,
    fontSize: 15,
    fontWeight: "900"
  },
  productTitle: {
    color: colors.ink,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 42
  },
  productBody: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24
  },
  metricRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  metricChip: {
    alignItems: "center",
    backgroundColor: "#fff2df",
    borderRadius: 24,
    flex: 1,
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  metricChipPink: {
    alignItems: "center",
    backgroundColor: "#ffe7fb",
    borderRadius: 24,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  metricChipGold: {
    alignItems: "center",
    backgroundColor: "#fff8d9",
    borderRadius: 24,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  metricValue: {
    color: "#f29f38",
    fontSize: 18,
    fontWeight: "900"
  },
  metricValuePink: {
    color: colors.pink,
    fontSize: 18,
    fontWeight: "900"
  },
  metricValueGold: {
    color: colors.gold,
    fontSize: 18,
    fontWeight: "900"
  },
  dailyCard: {
    backgroundColor: colors.blue,
    borderRadius: 28,
    gap: spacing.lg,
    minHeight: 230,
    overflow: "hidden",
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 24
  },
  cardEyebrow: {
    color: "#dce8ff",
    fontSize: 16,
    fontWeight: "800"
  },
  cardTitle: {
    color: colors.surface,
    fontSize: 32,
    fontWeight: "900",
    marginTop: spacing.sm
  },
  cardBody: {
    color: "#eaf0ff",
    fontSize: 16,
    lineHeight: 24,
    marginTop: spacing.sm,
    maxWidth: 230
  },
  tutorBadge: {
    borderColor: "#dce8ff",
    borderRadius: 52,
    borderWidth: 4,
    height: 104,
    position: "absolute",
    right: spacing.lg,
    top: spacing.lg,
    width: 104
  },
  cardActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: "auto"
  },
  translucentButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 24,
    minHeight: 52,
    minWidth: 120,
    justifyContent: "center",
    paddingHorizontal: spacing.lg
  },
  translucentButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: "900"
  },
  moduleSection: {
    gap: spacing.md
  },
  sectionHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  sectionTitleDark: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900"
  },
  sectionLink: {
    color: colors.blue,
    fontSize: 14,
    fontWeight: "900"
  },
  moduleCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 24,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 112,
    padding: spacing.md,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 18
  },
  moduleIcon: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 22,
    height: 68,
    justifyContent: "center",
    width: 68
  },
  moduleIconText: {
    color: colors.blueDark,
    fontSize: 28,
    fontWeight: "900"
  },
  moduleCopy: {
    flex: 1,
    gap: spacing.xs
  },
  moduleEyebrow: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  moduleTitle: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: "900"
  },
  moduleBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20
  },
  feedbackCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    gap: spacing.md,
    padding: spacing.lg
  },
  feedbackTitle: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 34
  },
  feedbackGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  feedbackTool: {
    backgroundColor: colors.soft,
    borderRadius: 18,
    flexBasis: "48%",
    flexGrow: 1,
    gap: spacing.xs,
    minHeight: 78,
    padding: spacing.md
  },
  feedbackToolLabel: {
    color: colors.blue,
    fontSize: 13,
    fontWeight: "900"
  },
  feedbackToolValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 21
  },
  lessonReadyCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    gap: spacing.md,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20
  },
  sectionKicker: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "900"
  },
  lessonReadyTitle: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 34
  },
  lessonReadyBody: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24
  },
  row: {
    flexDirection: "row",
    gap: spacing.md
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.blue,
    borderRadius: 16,
    flex: 1,
    justifyContent: "center",
    minHeight: 56
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 17,
    fontWeight: "900"
  },
  outlineButton: {
    alignItems: "center",
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 56
  },
  outlineButtonText: {
    color: colors.blueDark,
    fontSize: 17,
    fontWeight: "900"
  },
  statusText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700"
  },
  practiceCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    gap: spacing.sm,
    padding: spacing.lg
  },
  practiceTitle: {
    color: colors.ink,
    fontSize: 30,
    fontWeight: "900"
  },
  practiceBody: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23
  },
  debugPanel: {
    backgroundColor: "#f7fbfd",
    borderColor: colors.line,
    borderRadius: 20,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md
  },
  debugTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900"
  },
  debugText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18
  },
  bottomTabs: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: "row",
    height: 76,
    justifyContent: "space-around",
    left: 0,
    position: "absolute",
    right: 0
  },
  bottomTab: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800"
  },
  bottomTabActive: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900"
  },
  lessonTopBar: {
    backgroundColor: colors.surface,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm
  },
  lessonTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900"
  },
  lessonProgressTrack: {
    backgroundColor: "#fff6d8",
    borderRadius: 10,
    height: 18,
    overflow: "hidden"
  },
  lessonProgressFill: {
    backgroundColor: colors.gold,
    borderRadius: 10,
    height: "100%",
    width: "58%"
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: "#eff1f4",
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    position: "absolute",
    right: spacing.lg,
    top: spacing.md,
    width: 56
  },
  closeButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "900"
  },
  lessonContainer: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: 132
  },
  floatingTutor: {
    borderRadius: 28,
    height: 172,
    left: spacing.lg,
    position: "absolute",
    top: spacing.lg,
    width: 128,
    zIndex: 2
  },
  aiBubble: {
    alignSelf: "flex-start",
    backgroundColor: colors.blue,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderTopRightRadius: 24,
    marginTop: spacing.xxl,
    maxWidth: "86%",
    padding: spacing.lg,
    paddingTop: spacing.lg
  },
  aiBubbleFirst: {
    paddingTop: 236
  },
  aiBubbleText: {
    color: colors.surface,
    fontSize: 25,
    lineHeight: 36
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: colors.surface,
    borderRadius: 24,
    maxWidth: "72%",
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12
  },
  userBubbleText: {
    color: colors.text,
    fontSize: 24,
    lineHeight: 34
  },
  highlightText: {
    backgroundColor: "#d6d1ff",
    borderRadius: 6
  },
  bubbleActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md
  },
  bubbleActionText: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 16,
    color: colors.surface,
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  lessonControlBar: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: "row",
    height: 92,
    justifyContent: "space-around",
    left: 0,
    position: "absolute",
    right: 0
  },
  controlIcon: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  micButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 42,
    borderWidth: 1,
    height: 84,
    justifyContent: "center",
    marginTop: -42,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 16,
    width: 84
  },
  micIcon: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900"
  },
  resultHero: {
    backgroundColor: colors.blue,
    borderRadius: 28,
    minHeight: 230,
    overflow: "hidden",
    padding: spacing.lg
  },
  resultKicker: {
    color: "#dce8ff",
    fontSize: 16,
    fontWeight: "800"
  },
  resultTitle: {
    color: colors.surface,
    fontSize: 32,
    fontWeight: "900",
    marginTop: spacing.sm
  },
  resultTutor: {
    borderColor: "#dce8ff",
    borderRadius: 52,
    borderWidth: 4,
    height: 104,
    position: "absolute",
    right: spacing.lg,
    top: spacing.lg,
    width: 104
  },
  practiceCardBlue: {
    backgroundColor: colors.blue,
    borderRadius: 28,
    gap: spacing.sm,
    padding: spacing.lg
  },
  blueCardKicker: {
    color: "#dce8ff",
    fontSize: 16,
    fontWeight: "800"
  },
  blueCardTitle: {
    color: colors.surface,
    fontSize: 34,
    fontWeight: "900"
  },
  blueCardBody: {
    color: "#eaf0ff",
    fontSize: 15,
    lineHeight: 23
  },
  reportCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    gap: spacing.md,
    padding: spacing.lg
  },
  scoreRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  scoreLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "900",
    width: 54
  },
  scoreTrack: {
    backgroundColor: colors.soft,
    borderRadius: 10,
    flex: 1,
    height: 16,
    overflow: "hidden"
  },
  scoreFill: {
    backgroundColor: colors.blue,
    borderRadius: 10,
    height: "100%"
  },
  scoreValue: {
    color: colors.blue,
    fontSize: 16,
    fontWeight: "900",
    width: 34
  },
  reviewPrompt: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 32
  },
  reviewBody: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24
  },
  correctionDivider: {
    backgroundColor: colors.line,
    height: 1
  },
  wordScoreGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  wordScorePill: {
    alignItems: "center",
    backgroundColor: colors.soft,
    borderRadius: 18,
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  wordScoreWord: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "900"
  },
  wordScoreValue: {
    color: colors.green,
    fontSize: 14,
    fontWeight: "900"
  }
});
