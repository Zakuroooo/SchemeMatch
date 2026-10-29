import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useI18n } from "@/i18n";
import { TAP, colors, typeFor } from "./theme";

type Variant = "primary" | "secondary" | "quiet";

/** Pill buttons. primary = charcoal, secondary = glass with a hairline, quiet = text only. */
export function Button({
  label,
  onPress,
  variant = "secondary",
  icon,
  flex = false,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: ReactNode;
  flex?: boolean;
}) {
  const { lang } = useI18n();
  const t = typeFor(lang);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        flex && styles.flex,
        pressed && styles.pressed,
      ]}
    >
      {icon}
      <Text
        style={[
          styles.label,
          { fontFamily: t.strong },
          variant === "primary" && styles.onDeep,
          variant === "quiet" && styles.quiet_label,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: TAP,
    borderRadius: 999,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  flex: { flex: 1 },
  primary: { backgroundColor: colors.deep },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  quiet: { backgroundColor: "transparent", minHeight: 44 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  label: { fontSize: 16, color: colors.ink },
  onDeep: { color: colors.onDeep },
  quiet_label: { fontSize: 15, color: colors.ink },
});
