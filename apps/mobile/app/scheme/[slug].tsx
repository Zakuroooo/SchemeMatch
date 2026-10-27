import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "@/i18n";
import { summarize } from "@/lib/flow";
import { SCHEMES } from "@/lib/schemes";
import { useScreening } from "@/state/screening";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { CategoryPicture } from "@/ui/Picture";
import { Screen } from "@/ui/Screen";
import { colors, fonts, typeFor } from "@/ui/theme";

/** One eligible scheme: what you get, why you may qualify, what to confirm, how to apply. */
export default function SchemeScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t, lang } = useI18n();
  const type = typeFor(lang);
  const insets = useSafeAreaInsets();
  const { flow } = useScreening();
  const match = summarize(SCHEMES, flow.answers).eligible.find((m) => m.scheme.slug === slug);
  if (!match) return <Redirect href="/results" />;
  const { scheme, result } = match;
  const caps = [styles.caps, { fontFamily: type.body }];
  return (
    <Screen padded={false}>
      <View>
        <CategoryPicture
          category={scheme.category}
          style={[styles.band, { height: 230 + insets.top }]}
          iconSize={64}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("flow.back")}
          onPress={() => router.back()}
          style={[styles.glass, { top: insets.top + 12 }]}
        >
          <Icon name="back" size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={styles.sheet}>
        <Text style={caps}>
          {t(`categories.${scheme.category}`).toUpperCase()}
          {scheme.state ? ` · ${scheme.state}` : ""}
        </Text>
        <Text accessibilityRole="header" style={styles.title}>
          {scheme.text.en.title}
        </Text>
        <Text style={styles.benefit}>{scheme.text.en.benefit}</Text>

        <Card title={t("results.why").toUpperCase()} items={result.reasons} tick type={type.body} />
        <Card
          title={t("results.alsoConfirm").toUpperCase()}
          items={result.also_confirm}
          type={type.body}
        />
        <Card
          title={t("results.otherWays").toUpperCase()}
          items={result.other_ways}
          type={type.body}
        />

        <View style={styles.pair}>
          <View style={styles.mini}>
            <Icon name="globe" size={18} color={colors.accentText} />
            <Text style={caps}>{t("results.applyTitle").toUpperCase()}</Text>
            <Text style={styles.miniText}>{scheme.text.en.how_to_apply}</Text>
          </View>
          <View style={styles.mini}>
            <Icon name="file" size={18} color={colors.accentText} />
            <Text style={caps}>{t("results.docsTitle").toUpperCase()}</Text>
            <Text style={[styles.miniText, { fontFamily: type.body }]}>
              {t("results.docsMissing")}
            </Text>
          </View>
        </View>

        <Button
          variant="primary"
          label={t("results.official")}
          icon={<Icon name="external" size={18} color={colors.onDeep} />}
          onPress={() => void Linking.openURL(scheme.official_url)}
        />
        <Text style={[styles.disclaimer, { fontFamily: type.body }]}>
          {t("results.disclaimer")}
        </Text>
      </View>
    </Screen>
  );
}

function Card({
  title,
  items,
  tick = false,
  type,
}: {
  title: string;
  items: string[];
  tick?: boolean;
  type: string;
}) {
  if (items.length === 0) return null;
  return (
    <View style={styles.card}>
      <Text style={[styles.caps, { fontFamily: type }]}>{title}</Text>
      {items.map((i) => (
        <View key={i} style={styles.item}>
          {tick ? (
            <View style={styles.tick}>
              <Icon name="check" size={12} color={colors.onDeep} weight={3.4} />
            </View>
          ) : (
            <View style={styles.dot} />
          )}
          <Text style={styles.itemText}>{i}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  band: { width: "100%" },
  glass: {
    position: "absolute",
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.glass,
    alignItems: "center",
    justifyContent: "center",
  },
  sheet: {
    marginTop: -26,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: colors.bg,
    padding: 20,
    gap: 12,
    flexGrow: 1,
  },
  caps: { fontSize: 10, letterSpacing: 2.2, color: colors.muted },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, color: colors.ink },
  benefit: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.ink },
  card: {
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    gap: 10,
  },
  item: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  tick: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: colors.deep,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.accent,
    marginTop: 8,
    marginHorizontal: 8,
  },
  itemText: { flex: 1, fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.ink },
  pair: { flexDirection: "row", gap: 10 },
  mini: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    gap: 5,
  },
  miniText: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.ink },
  disclaimer: { fontSize: 12, lineHeight: 18, color: colors.muted, textAlign: "center" },
});
