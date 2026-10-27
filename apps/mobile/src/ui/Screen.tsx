import type { ReactNode } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "./theme";

/** A scrolling page with safe margins; large text settings can grow it without clipping. */
export function Screen({ children, padded = true }: { children: ReactNode; padded?: boolean }) {
  return (
    <SafeAreaView style={styles.safe} edges={padded ? undefined : ["bottom", "left", "right"]}>
      <ScrollView
        contentContainerStyle={padded ? styles.content : styles.bare}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, gap: 14, flexGrow: 1 },
  bare: { flexGrow: 1 },
});
