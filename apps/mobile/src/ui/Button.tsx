import { Pressable, StyleSheet, Text } from "react-native";
import { TAP, colors } from "./theme";

type Variant = "primary" | "secondary" | "quiet";

export function Button({
  label,
  onPress,
  variant = "secondary",
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.label, variant === "quiet" && styles.quietLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: TAP,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border },
  quiet: { backgroundColor: "transparent" },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.5 },
  label: { fontSize: 18, fontWeight: "600", color: colors.fg, textAlign: "center" },
  quietLabel: { color: colors.muted, textDecorationLine: "underline" },
});
