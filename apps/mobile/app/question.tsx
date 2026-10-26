import type { Field } from "@schemematch/engine";
import { Redirect, router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useI18n } from "@/i18n";
import { currentQuestion } from "@/lib/flow";
import { QUESTIONS, parseTyped } from "@/lib/questions";
import { SCHEMES } from "@/lib/schemes";
import { useScreening } from "@/state/screening";
import { Button } from "@/ui/Button";
import { Screen } from "@/ui/Screen";
import { TAP, colors } from "@/ui/theme";

/** One question per screen, chosen by the engine: only what can still change a result. */
export default function QuestionScreen() {
  const { t } = useI18n();
  const { flow, back } = useScreening();
  const field = currentQuestion(SCHEMES, flow);
  if (field === null) return <Redirect href="/results" />;
  return (
    <Screen>
      <Text style={styles.step}>{t("flow.step", { n: flow.history.length + 1 })}</Text>
      <Text accessibilityRole="header" style={styles.question}>
        {t(`questions.${field}`)}
      </Text>
      {/* key: a new question gets fresh input state */}
      <Answers key={field} field={field} />
      <Text style={styles.hint}>{t("flow.dontKnowHint")}</Text>
      <View style={styles.footer}>
        {flow.history.length > 0 && (
          <Button variant="quiet" label={t("flow.back")} onPress={back} />
        )}
        <Button
          variant="quiet"
          label={t("flow.seeResults")}
          onPress={() => router.push("/results")}
        />
      </View>
    </Screen>
  );
}

function Answers({ field }: { field: Field }) {
  const { t } = useI18n();
  const { answer, skip } = useScreening();
  const q = QUESTIONS[field];
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const dontKnow = <Button label={t("flow.dontKnow")} onPress={() => skip(field)} />;

  if (q.kind === "choice" || q.kind === "yesno") {
    const options = q.kind === "yesno" ? ["yes", "no"] : q.options;
    const group = q.kind === "yesno" ? "yesno" : field;
    return (
      <View style={styles.answers}>
        {options.map((o) => (
          <Button
            key={o}
            variant="primary"
            label={t(`options.${group}.${o}`)}
            onPress={() => answer(field, q.kind === "yesno" ? o === "yes" : o)}
          />
        ))}
        {dontKnow}
      </View>
    );
  }

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
        style={[styles.input, error !== null && styles.inputError]}
      />
      {error !== null && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      <Button variant="primary" label={t("flow.next")} onPress={submit} />
      {dontKnow}
    </View>
  );
}

const styles = StyleSheet.create({
  step: { fontSize: 15, color: colors.muted, marginTop: 8 },
  question: { fontSize: 26, fontWeight: "700", color: colors.fg },
  answers: { gap: 12 },
  hint: { fontSize: 14, color: colors.muted },
  footer: { marginTop: "auto", gap: 4 },
  input: {
    minHeight: TAP,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    fontSize: 22,
    color: colors.fg,
  },
  inputError: { borderColor: colors.danger },
  error: { fontSize: 16, color: colors.danger },
});
