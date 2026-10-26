import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { LANGUAGES, translate, useI18n } from "@/i18n";
import { useScreening } from "@/state/screening";
import { Button } from "@/ui/Button";
import { Screen } from "@/ui/Screen";
import { colors } from "@/ui/theme";

/** First screen: pick a language. The title is shown in every language, since we don't know hers yet. */
export default function LanguageScreen() {
  const { setLang, t } = useI18n();
  const { reset } = useScreening();
  return (
    <Screen>
      <View style={styles.head}>
        <Text style={styles.brand}>{t("app.title")}</Text>
        {LANGUAGES.map((l) => (
          <Text key={l} accessibilityRole="header" style={styles.title}>
            {translate(l, "language.title")}
          </Text>
        ))}
      </View>
      {LANGUAGES.map((l) => (
        <Button
          key={l}
          variant="primary"
          label={translate(l, `language.${l}`)}
          onPress={() => {
            setLang(l);
            reset();
            router.push("/question");
          }}
        />
      ))}
      <Text style={styles.note}>{t("app.offline")}</Text>
      <Text style={styles.note}>{t("app.testing")}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: 6, marginTop: 24, marginBottom: 8 },
  brand: { fontSize: 16, fontWeight: "700", color: colors.muted },
  title: { fontSize: 26, fontWeight: "700", color: colors.fg },
  note: { fontSize: 15, color: colors.muted },
});
