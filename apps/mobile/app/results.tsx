import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useI18n } from "@/i18n";
import { summarize } from "@/lib/flow";
import { SCHEMES } from "@/lib/schemes";
import { useScreening } from "@/state/screening";
import { Button } from "@/ui/Button";
import { Screen } from "@/ui/Screen";
import { TAP, colors } from "@/ui/theme";

export default function ResultsScreen() {
  const { t, lang } = useI18n();
  const { flow, retrySkipped, reset } = useScreening();
  const s = summarize(SCHEMES, flow.answers);
  return (
    <Screen>
      <Text accessibilityRole="header" style={styles.title}>
        {t("results.eligible", { count: s.eligible.length })}
      </Text>
      <Text style={styles.disclaimer}>{t("results.disclaimer")}</Text>
      {lang !== "en" && <Text style={styles.note}>{t("results.englishOnly")}</Text>}

      {s.eligible.length === 0 && <Text style={styles.note}>{t("results.none")}</Text>}
      {s.eligible.map(({ scheme }) => (
        <Pressable
          key={scheme.slug}
          accessibilityRole="button"
          accessibilityHint={t("results.details")}
          onPress={() => router.push({ pathname: "/scheme/[slug]", params: { slug: scheme.slug } })}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          <Text style={styles.cardTitle}>{scheme.text.en.title}</Text>
          <Text style={styles.cardBody}>{scheme.text.en.benefit}</Text>
          <Text style={styles.link}>{t("results.details")} ›</Text>
        </Pressable>
      ))}

      {s.needInfo.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("results.needInfo", { count: s.needInfo.length })}
          </Text>
          <Button
            variant="primary"
            label={t("results.answerMore")}
            onPress={() => {
              retrySkipped();
              router.push("/question");
            }}
          />
        </View>
      )}

      {s.notEligible.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("results.notEligible", { count: s.notEligible.length })}
          </Text>
          {s.notEligible.map(({ scheme, result }) => (
            <Text key={scheme.slug} style={styles.missed}>
              <Text style={styles.bold}>{scheme.text.en.title}</Text>
              {result.failed ? ` · ${t("results.missed")} ${result.failed.source_quote}` : ""}
            </Text>
          ))}
        </View>
      )}
      {s.otherStates > 0 && (
        <Text style={styles.note}>{t("results.otherStates", { count: s.otherStates })}</Text>
      )}

      <Button
        label={t("results.startAgain")}
        onPress={() => {
          reset();
          router.dismissAll();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: "700", color: colors.fg, marginTop: 8 },
  disclaimer: {
    fontSize: 15,
    color: colors.fg,
    backgroundColor: "#FBEFD9",
    padding: 12,
    borderRadius: 10,
  },
  note: { fontSize: 15, color: colors.muted },
  card: {
    minHeight: TAP,
    backgroundColor: colors.card,
    borderColor: colors.ok,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  pressed: { opacity: 0.75 },
  cardTitle: { fontSize: 18, fontWeight: "700", color: colors.fg },
  cardBody: { fontSize: 16, color: colors.fg },
  link: { fontSize: 16, fontWeight: "600", color: colors.ok },
  section: { gap: 10, marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.fg },
  missed: { fontSize: 15, color: colors.fg },
  bold: { fontWeight: "700" },
});
