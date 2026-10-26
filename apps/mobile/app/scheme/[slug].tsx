import { Redirect, useLocalSearchParams } from "expo-router";
import { Linking, StyleSheet, Text, View } from "react-native";
import { useI18n } from "@/i18n";
import { summarize } from "@/lib/flow";
import { SCHEMES } from "@/lib/schemes";
import { useScreening } from "@/state/screening";
import { Button } from "@/ui/Button";
import { Screen } from "@/ui/Screen";
import { colors } from "@/ui/theme";

/** One eligible scheme: what you get, why you may qualify, what to confirm, how to apply. */
export default function SchemeScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t } = useI18n();
  const { flow } = useScreening();
  const match = summarize(SCHEMES, flow.answers).eligible.find((m) => m.scheme.slug === slug);
  if (!match) return <Redirect href="/results" />;
  const { scheme, result } = match;
  return (
    <Screen>
      <Text accessibilityRole="header" style={styles.title}>
        {scheme.text.en.title}
      </Text>
      <Text style={styles.body}>{scheme.text.en.benefit}</Text>
      <List title={t("results.why")} items={result.reasons} />
      <List title={t("results.alsoConfirm")} items={result.also_confirm} />
      <List title={t("results.otherWays")} items={result.other_ways} />
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("results.howToApply")}</Text>
        <Text style={styles.body}>{scheme.text.en.how_to_apply}</Text>
      </View>
      <Button
        variant="primary"
        label={t("results.official")}
        onPress={() => void Linking.openURL(scheme.official_url)}
      />
      <Text style={styles.disclaimer}>{t("results.disclaimer")}</Text>
    </Screen>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((i) => (
        <Text key={i} style={styles.body}>
          • {i}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: "700", color: colors.fg, marginTop: 8 },
  body: { fontSize: 17, color: colors.fg, lineHeight: 25 },
  section: { gap: 6 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.fg },
  disclaimer: { fontSize: 14, color: colors.muted },
});
