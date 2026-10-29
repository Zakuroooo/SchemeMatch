import type { Field } from "@schemematch/engine";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useI18n } from "@/i18n";
import { currentQuestion, progress } from "@/lib/flow";
import { QUESTIONS, parseTyped } from "@/lib/questions";
import { SCHEMES } from "@/lib/schemes";
import { useScreening } from "@/state/screening";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { questionPicture } from "@/ui/images";
import { Screen } from "@/ui/Screen";
import { TAP, colors, typeFor } from "@/ui/theme";

/** One question per screen, chosen by the engine: only what can still change a result. */
export default function QuestionScreen() {
  const { t, lang } = useI18n();
  const { flow, back } = useScreening();
  const field = currentQuestion(SCHEMES, flow);
  if (field === null) return <Redirect href="/results" />;
  const type = typeFor(lang);
  const picture = questionPicture(field);
  const done = progress(SCHEMES, flow);
  return (
    <Screen>
      <View style={styles.top}>
        {flow.history.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("flow.back")}
            onPress={back}
            style={styles.round}
          >
            <Icon name="back" size={18} />
          </Pressable>
        ) : (
          <View style={styles.roundSpacer} />
        )}
        <View
          style={styles.track}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(done * 100) }}
        >
          <View style={[styles.fill, { width: `${Math.max(6, done * 100)}%` }]} />
        </View>
        <Text style={[styles.step, { fontFamily: type.body }]}>
          {t("flow.step", { n: flow.history.length + 1 })}
        </Text>
      </View>

      {picture && (
        <Image source={picture} style={styles.picture} accessibilityIgnoresInvertColors />
      )}

      <Text
        accessibilityRole="header"
        style={[styles.question, { fontFamily: type.display }, lang === "bn" && styles.questionBn]}
      >
        {t(`questions.${field}`)}
      </Text>

      {/* key: a new question gets fresh input state */}
      <Answers key={field} field={field} />

      <View style={styles.why}>
        <Icon name="info" size={18} color={colors.accentText} />
        <View style={styles.whyText}>
          <Text style={[styles.whyTitle, { fontFamily: type.strong }]}>{t("flow.whyTitle")}</Text>
          <Text style={[styles.whyBody, { fontFamily: type.body }]}>
            {t(`why.${field}`)} {t("flow.dontKnowHint")}
          </Text>
        </View>
      </View>
      <Button
        variant="quiet"
        label={t("flow.seeResults")}
        onPress={() => router.push("/results")}
      />
    </Screen>
  );
}

function Answers({ field }: { field: Field }) {
  const { t, lang } = useI18n();
  const { answer, skip } = useScreening();
  const type = typeFor(lang);
  const q = QUESTIONS[field];
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const dontKnow = (
    <Button
      variant="quiet"
      label={t("flow.dontKnow")}
      icon={<Icon name="question" size={18} />}
      onPress={() => skip(field)}
    />
  );

  if (q.kind === "yesno")
    return (
      <View style={styles.answers}>
        <View style={styles.row}>
          <Button
            flex
            variant="primary"
            label={t("options.yesno.yes")}
            icon={<Icon name="check" size={18} color={colors.onDeep} weight={3} />}
            onPress={() => answer(field, true)}
          />
          <Button
            flex
            label={t("options.yesno.no")}
            icon={<Icon name="cross" size={16} weight={3} />}
            onPress={() => answer(field, false)}
          />
        </View>
        {dontKnow}
      </View>
    );

  if (q.kind === "choice")
    return (
      <View style={styles.answers}>
        {/* Short lists stack; long ones (classes, categories) go two to a row. */}
        <View style={[styles.grid, q.options.length > 3 && styles.gridTwo]}>
          {q.options.map((o) => (
            <View key={o} style={q.options.length > 3 ? styles.half : styles.full}>
              <Button label={t(`options.${field}.${o}`)} onPress={() => answer(field, o)} />
            </View>
          ))}
        </View>
        {dontKnow}
      </View>
    );

  const submit = () => {
    const value = parseTyped(field, text);
    if (value === null)
      setError(
        q.kind === "text"
          ? t("flow.invalidText", { min: q.min })
          : t("flow.invalid", { min: q.min, max: q.max }),
      );
    else answer(field, value);
  };
  return (
    <View style={styles.answers}>
      <TextInput
        accessibilityLabel={t(`questions.${field}`)}
        placeholder={t("flow.typeHere")}
        placeholderTextColor={colors.muted}
        value={text}
        onChangeText={(v) => {
          setText(v);
          setError(null);
        }}
        onSubmitEditing={submit}
        keyboardType={
          q.kind === "int" ? "number-pad" : q.kind === "number" ? "decimal-pad" : "default"
        }
        autoComplete="off"
        autoCorrect={false}
        returnKeyType="next"
        style={[styles.input, { fontFamily: type.strong }, error !== null && styles.inputError]}
      />
      {error !== null && (
        <Text accessibilityRole="alert" style={[styles.error, { fontFamily: type.body }]}>
          {error}
        </Text>
      )}
      <Button
        variant="primary"
        label={t("flow.next")}
        icon={<Icon name="arrow" size={18} color={colors.onDeep} />}
        onPress={submit}
      />
      {dontKnow}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", gap: 12 },
  round: {
    width: 44,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: "center",
    justifyContent: "center",
  },
  roundSpacer: { width: 44, height: 44 },
  track: { flex: 1, height: 4, borderRadius: 4, backgroundColor: colors.line, overflow: "hidden" },
  fill: { height: 4, borderRadius: 4, backgroundColor: colors.accent },
  step: { fontSize: 12, color: colors.muted },
  picture: { width: "100%", height: 200, borderRadius: 24 },
  question: { fontSize: 28, lineHeight: 36, color: colors.ink, marginTop: 4 },
  questionBn: { fontSize: 25, lineHeight: 38 },
  answers: { gap: 10 },
  row: { flexDirection: "row", gap: 10 },
  grid: { gap: 10 },
  gridTwo: { flexDirection: "row", flexWrap: "wrap" },
  half: { width: "48.5%" },
  full: { width: "100%" },
  input: {
    minHeight: TAP + 4,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    backgroundColor: colors.surface,
    paddingHorizontal: 18,
    fontSize: 22,
    color: colors.ink,
  },
  inputError: { borderColor: colors.accent },
  error: { fontSize: 15, color: colors.accentText },
  why: {
    marginTop: "auto",
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  whyText: { flex: 1, gap: 2 },
  whyTitle: { fontSize: 13, color: colors.ink },
  whyBody: { fontSize: 13, lineHeight: 20, color: colors.muted },
});
