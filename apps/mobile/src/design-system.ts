import { StyleSheet } from "react-native";

export const colors = {
  background: "#f7f8fa",
  panel: "#ffffff",
  text: "#1e2930",
  muted: "#5e6b75",
  accent: "#1f7a6d",
  action: "#315c91",
  line: "#d8e0e6"
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32
};

export const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background
  },
  container: {
    padding: spacing.lg,
    gap: spacing.md
  },
  header: {
    gap: spacing.sm
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "700"
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "800"
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15
  },
  panel: {
    backgroundColor: colors.panel,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md
  },
  sectionTitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700"
  },
  large: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800"
  },
  body: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm
  },
  button: {
    alignItems: "center",
    borderRadius: 8,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.lg
  },
  buttonText: {
    color: "white",
    fontWeight: "700"
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.lg
  },
  secondaryButtonText: {
    color: colors.action,
    fontWeight: "700"
  },
  tabbar: {
    borderColor: colors.line,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: spacing.md
  },
  tab: {
    color: colors.muted,
    fontWeight: "700"
  }
});
