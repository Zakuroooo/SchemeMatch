import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useI18n } from "@/i18n";
import { summarize, type Match } from "@/lib/flow";
import { SCHEMES } from "@/lib/schemes";
import { useScreening } from "@/state/screening";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { CategoryPicture } from "@/ui/Picture";
import { Screen } from "@/ui/Screen";
import { colors, fonts, typeFor } from "@/ui/theme";

const open = (m: Match) =>
  router.push({ pathname: "/scheme/[slug]", params: { slug: m.scheme.slug } });

export default function ResultsScreen() {
  const { t, lang } = useI18n();
  const type = typeFor(lang);
  const { flow, retrySkipped, reset } = useScreening();
  const s = summarize(SCHEMES, flow.answers);
  const tiles = s.eligible.slice(0, 4);
  const rows = s.eligible.slice(4);
  const caps = { fontFamily: type.body };
  return (
    <Screen>
      <Text style={[styles.caps, caps]}>{t("results.title").toUpperCase()}</Text>
      <View style={styles.count}>
        <Text style={styles.number}>{s.eligible.length}</Text>
        <Text accessibilityRole="header" style={[styles.countLabel, { fontFamily: type.display }]}>
          {t("results.count", { count: s.eligible.length })}
        </Text>
      </View>
      <Text style={[styles.disclaimer, { fontFamily: type.body }]}>{t("results.disclaimer")}</Text>
      {lang !== "en" && (
        <Text style={[styles.note, { fontFamily: type.body }]}>{t("results.englishOnly")}</Text>
      )}

      {s.eligible.length === 0 && (
        <Text style={[styles.note, { fontFamily: type.body }]}>{t("results.none")}</Text>
      )}
      <View style={styles.grid}>
        {tiles.map((m, i) => (
          <Pressable
            key={m.scheme.slug}
            accessibilityRole="button"
            accessibilityLabel={`${m.scheme.text.en.title}. ${t("results.details")}`}
            onPress={() => open(m)}
            style={({ pressed }) => [
              styles.tile,
              i === 0 && styles.tileDeep,
              pressed && styles.pressed,
            ]}
          >
            <CategoryPicture category={m.scheme.category} style={styles.tileImg} />
            <View style={styles.tileBody}>
              <Text style={[styles.tileCat, caps, i === 0 && styles.onDeepSoft]}>
                {t(`categories.${m.scheme.category}`).toUpperCase()}
                {m.scheme.state ? ` · ${m.scheme.state}` : ""}
              </Text>
              <Text style={[styles.tileTitle, i === 0 && styles.onDeep]} numberOfLines={2}>
                {m.scheme.text.en.title}
              </Text>
              <Text style={[styles.tileBenefit, i === 0 && styles.onDeepSoft]} numberOfLines={2}>
                {m.scheme.text.en.benefit}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      {rows.length > 0 && (
        <View style={styles.list}>
          <Text style={[styles.caps, caps, styles.listTitle]}>
            {t("results.more").toUpperCase()}
          </Text>
          {rows.map((m, i) => (
            <Pressable
              key={m.scheme.slug}
              accessibilityRole="button"
              accessibilityLabel={`${m.scheme.text.en.title}. ${t("results.details")}`}
              onPress={() => open(m)}
              style={({ pressed }) => [
                styles.row,
                i < rows.length - 1 && styles.rowLine,
                pressed && styles.pressed,
              ]}
            >
              <CategoryPicture category={m.scheme.category} style={styles.thumb} iconSize={18} />
              <View style={styles.rowText}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {m.scheme.text.en.title}
                </Text>
                <Text style={styles.rowNote} numberOfLines={1}>
                  {m.scheme.text.en.benefit}
                </Text>
              </View>
              <Icon name="chevron" size={16} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      )}

      {s.needInfo.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: type.strong }]}>
            {t("results.needInfo", { count: s.needInfo.length })}
          </Text>
          <Button
            variant="primary"
            label={t("results.answerMore")}
            icon={<Icon name="arrow" size={18} color={colors.onDeep} />}
            onPress={() => {
              retrySkipped();
              router.push("/question");
            }}
          />
        </View>
      )}

      {s.notEligible.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { fontFamily: type.strong }]}>
            {t("results.notEligible", { count: s.notEligible.length })}
          </Text>
          {s.notEligible.map(({ scheme, result }) => (
            <Text key={scheme.slug} style={styles.missed}>
              <Text style={styles.missedTitle}>{scheme.text.en.title}</Text>
              {result.failed ? ` · ${result.failed.source_quote}` : ""}
            </Text>
          ))}
        </View>
      )}
      {s.otherStates > 0 && (
        <Text style={[styles.note, { fontFamily: type.body }]}>
          {t("results.otherStates", { count: s.otherStates })}
        </Text>
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
  caps: { fontSize: 11, letterSpacing: 3, color: colors.muted },
  count: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  number: { fontFamily: fonts.display, fontSize: 76, lineHeight: 82, color: colors.accentText },
  countLabel: { flex: 1, fontSize: 20, lineHeight: 26, color: colors.ink, paddingBottom: 10 },
  disclaimer: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    borderRadius: 14,
  },
  note: { fontSize: 13, color: colors.muted },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    width: "48.4%",
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tileDeep: { backgroundColor: colors.deep, borderColor: colors.deep },
  pressed: { opacity: 0.85 },
  tileImg: { width: "100%", height: 92 },
  tileBody: { padding: 11, gap: 3 },
  tileCat: { fontSize: 9, letterSpacing: 1.6, color: colors.muted },
  tileTitle: { fontFamily: fonts.display, fontSize: 16, lineHeight: 20, color: colors.ink },
  tileBenefit: { fontFamily: fonts.body, fontSize: 11, lineHeight: 15, color: colors.muted },
  onDeep: { color: colors.onDeep },
  onDeepSoft: { color: "#C9C9C9" },
  list: {
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingBottom: 2,
  },
  listTitle: { paddingTop: 12, paddingBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 56 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: colors.line },
  thumb: { width: 38, height: 38, borderRadius: 10 },
  rowText: { flex: 1 },
  rowTitle: { fontFamily: fonts.bodyStrong, fontSize: 13, color: colors.ink },
  rowNote: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
  section: { gap: 10, marginTop: 4 },
  sectionTitle: { fontSize: 16, color: colors.ink },
  missed: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.ink },
  missedTitle: { fontFamily: fonts.bodyStrong },
});
