import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { LANGUAGES, num, translate, useI18n, type Lang } from "@/i18n";
import { useScreening } from "@/state/screening";
import { DeleteMyData } from "@/ui/DataControls";
import { Icon } from "@/ui/Icon";
import { IMAGES } from "@/ui/images";
import { Screen } from "@/ui/Screen";
import { colors, fonts, TAP } from "@/ui/theme";

const CHECKS = [
  { key: "pension", image: IMAGES.pension },
  { key: "gas", image: IMAGES.gas },
  { key: "bank", image: IMAGES.bank },
] as const;

/** First screen: pick a language. The prompt is shown in every language, since we don't know hers yet. */
export default function LanguageScreen() {
  const { lang, setLang, t } = useI18n();
  const { reset } = useScreening();
  const choose = (l: Lang) => {
    setLang(l);
    reset();
    router.push("/question");
  };
  const bn = lang === "bn";
  return (
    <Screen>
      <View style={styles.top}>
        <Text style={styles.caps}>SCHEMEMATCH</Text>
        <View style={styles.pill}>
          <Icon name="offline" size={12} color={colors.muted} weight={2.2} />
          <Text style={styles.pillText}>{t("app.offline")}</Text>
        </View>
      </View>

      {/* Three things a family can get: money to the bank, free gas, help for the home. */}
      <View style={styles.hero}>
        {/* The pictures are decoration for screen readers; the badge below is not. */}
        <Image
          source={IMAGES.dbt}
          style={[styles.card, styles.big]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Image
          source={IMAGES.gas}
          style={[styles.card, styles.small1]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Image
          source={IMAGES.family}
          style={[styles.card, styles.small2]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <View style={styles.badge}>
          <View style={styles.badgeDot}>
            <Icon name="check" size={11} color={colors.onAccent} weight={3.4} />
          </View>
          <Text style={[styles.badgeText, bn && { fontFamily: fonts.bnStrong }]}>
            {t("app.badge")}
          </Text>
        </View>
      </View>

      <View style={styles.head}>
        <Text accessibilityRole="header" style={[styles.h1, bn && styles.h1bn]}>
          {t("app.headA")}{" "}
          <Text style={[styles.h1accent, bn && styles.h1bn]}>{t("app.headB")}</Text>
        </Text>
        <Text style={styles.prompt}>
          {LANGUAGES.map((l) => translate(l, "language.title")).join(" · ")}
        </Text>
      </View>

      <View style={styles.langs}>
        <LangPill
          glyph="অ"
          label={translate("bn", "language.bn")}
          primary
          onPress={() => choose("bn")}
        />
        <LangPill glyph="A" label={translate("en", "language.en")} onPress={() => choose("en")} />
      </View>

      <View style={styles.checks}>
        <Text style={styles.caps}>{t("app.checksTitle").toUpperCase()}</Text>
        <View style={styles.checkRow}>
          {CHECKS.map((c) => (
            <View key={c.key} style={styles.checkTile}>
              <Image source={c.image} style={styles.checkImg} accessibilityIgnoresInvertColors />
              <Text style={[styles.checkLabel, bn && { fontFamily: fonts.bnStrong }]}>
                {t(`checks.${c.key}`)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.steps}>
        <Text style={styles.caps}>{t("app.stepsTitle").toUpperCase()}</Text>
        {(["step1", "step2", "step3"] as const).map((k, i) => (
          <View key={k} style={styles.stepRow}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{num(lang, i + 1)}</Text>
            </View>
            <Text style={[styles.stepText, bn && { fontFamily: fonts.bnBody }]}>
              {t(`app.${k}`)}
            </Text>
          </View>
        ))}
      </View>

      <Text style={[styles.foot, bn && { fontFamily: fonts.bnBody }]}>{t("app.testing")}</Text>
      <DeleteMyData />
    </Screen>
  );
}

function LangPill({
  glyph,
  label,
  primary = false,
  onPress,
}: {
  glyph: string;
  label: string;
  primary?: boolean;
  onPress: () => void;
}) {
  const bn = glyph === "অ";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.lang,
        primary ? styles.langPrimary : styles.langSecondary,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.glyph, primary ? styles.glyphPrimary : styles.glyphSecondary]}>
        <Text
          style={[
            styles.glyphText,
            bn ? { fontFamily: fonts.bnDisplay } : { fontFamily: fonts.display },
            primary && { color: colors.onAccent },
          ]}
        >
          {glyph}
        </Text>
      </View>
      <Text
        style={[
          styles.langText,
          { fontFamily: bn ? fonts.bnStrong : fonts.bodyStrong },
          primary && { color: colors.onDeep },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const shadow = {
  shadowColor: "#000",
  shadowOpacity: 0.18,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 10 },
  elevation: 6,
};

const styles = StyleSheet.create({
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  caps: { fontFamily: fonts.body, fontSize: 11, letterSpacing: 3, color: colors.muted },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: { fontFamily: fonts.body, fontSize: 11, color: colors.muted },
  hero: { height: 270, borderRadius: 26, backgroundColor: colors.tint, overflow: "hidden" },
  card: { position: "absolute", borderRadius: 18, ...shadow },
  big: { left: 16, top: 16, width: "54%", height: 206, transform: [{ rotate: "-3deg" }] },
  small1: { right: 16, top: 20, width: "34%", height: 118, transform: [{ rotate: "4deg" }] },
  small2: { right: 22, top: 148, width: "34%", height: 96, transform: [{ rotate: "-2deg" }] },
  badge: {
    position: "absolute",
    left: 14,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.glass,
    borderRadius: 999,
    paddingVertical: 6,
    paddingLeft: 7,
    paddingRight: 12,
  },
  badgeDot: {
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontFamily: fonts.bodyStrong, fontSize: 12, color: "#FFFFFF" },
  head: { gap: 6 },
  h1: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, color: colors.ink },
  h1bn: { fontFamily: fonts.bnDisplay, fontSize: 26, lineHeight: 38 },
  h1accent: { fontFamily: fonts.displayItalic, color: colors.accentText },
  prompt: { fontFamily: fonts.bnBody, fontSize: 14, color: colors.muted },
  langs: { flexDirection: "row", gap: 10 },
  lang: {
    flex: 1,
    minHeight: TAP,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
  },
  langPrimary: { backgroundColor: colors.deep },
  langSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  glyph: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  glyphPrimary: { backgroundColor: colors.accent },
  glyphSecondary: { borderWidth: 1, borderColor: colors.ink },
  glyphText: { fontSize: 18, color: colors.ink },
  langText: { fontSize: 16, color: colors.ink },
  checks: { gap: 8 },
  steps: { gap: 8 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.accentText,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { fontFamily: fonts.display, fontSize: 13, color: colors.accentText },
  stepText: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  checkRow: { flexDirection: "row", gap: 10 },
  checkTile: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
  },
  checkImg: { width: "100%", height: 64 },
  checkLabel: {
    fontFamily: fonts.bodyStrong,
    fontSize: 12,
    color: colors.ink,
    paddingHorizontal: 9,
    paddingVertical: 8,
  },
  foot: {
    marginTop: "auto",
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 16,
    color: colors.muted,
    textAlign: "center",
  },
});
