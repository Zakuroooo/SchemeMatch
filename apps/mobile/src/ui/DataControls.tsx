import type { Profile } from "@schemematch/engine";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useI18n } from "@/i18n";
import type { DeleteReport } from "@/lib/sync/sync";
import { useSync } from "@/state/sync";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { colors, typeFor } from "./theme";

/**
 * Saving is opt-in (PRIVACY-SECURITY §2: only on Save). The note says what is kept and sent
 * before the person decides. Saving is local and quick; sending happens later, in the background.
 */
export function SaveAnswers({ profile }: { profile: Profile }) {
  const { t, lang } = useI18n();
  const type = typeFor(lang);
  const sync = useSync();
  const [state, setState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const save = () => {
    setState("saving");
    sync.save(profile).then(
      () => setState("saved"),
      () => setState("failed"),
    );
  };
  return (
    <View style={styles.card}>
      <Text style={[styles.title, { fontFamily: type.strong }]}>{t("data.saveTitle")}</Text>
      <Text style={[styles.note, { fontFamily: type.body }]}>{t("data.saveNote")}</Text>
      {state === "saved" ? (
        <View style={styles.done}>
          <Icon name="check" size={16} color={colors.accentText} weight={3} />
          <Text accessibilityRole="alert" style={[styles.doneText, { fontFamily: type.body }]}>
            {t("data.saved")}
          </Text>
        </View>
      ) : (
        <>
          <Button
            variant="primary"
            label={state === "saving" ? t("data.saving") : t("data.save")}
            onPress={() => state !== "saving" && save()}
          />
          {state === "failed" && (
            <Text accessibilityRole="alert" style={[styles.note, { fontFamily: type.body }]}>
              {t("data.saveFailed")}
            </Text>
          )}
        </>
      )}
    </View>
  );
}

const DELETE_MESSAGE: Record<DeleteReport["server"], string> = {
  deleted: "data.deleted",
  none: "data.deletedLocal",
  pending: "data.deletedPending",
};

/** "Delete my data" (PRIVACY-SECURITY §3), with one confirm step so a stray tap can't do it. */
export function DeleteMyData() {
  const { t, lang } = useI18n();
  const type = typeFor(lang);
  const sync = useSync();
  const [state, setState] = useState<"idle" | "confirm" | "deleting" | DeleteReport["server"]>(
    "idle",
  );
  const remove = () => {
    setState("deleting");
    sync.deleteMyData().then(
      (r) => setState(r.server),
      () => setState("pending"),
    );
  };
  const body = { fontFamily: type.body };
  if (state === "confirm")
    return (
      <View style={styles.card}>
        <Text style={[styles.note, body]}>{t("data.deleteConfirm")}</Text>
        <View style={styles.row}>
          <Button flex label={t("data.cancel")} onPress={() => setState("idle")} />
          <Button flex variant="primary" label={t("data.deleteYes")} onPress={remove} />
        </View>
      </View>
    );
  if (state === "deleting") return <Text style={[styles.note, body]}>{t("data.deleting")}</Text>;
  return (
    <View>
      <Button variant="quiet" label={t("data.delete")} onPress={() => setState("confirm")} />
      {state !== "idle" && (
        <Text accessibilityRole="alert" style={[styles.note, body]}>
          {t(DELETE_MESSAGE[state])}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    padding: 14,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  title: { fontSize: 16, color: colors.ink },
  note: { fontSize: 13, lineHeight: 19, color: colors.muted },
  done: { flexDirection: "row", gap: 8, alignItems: "center" },
  doneText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.ink },
  row: { flexDirection: "row", gap: 10 },
});
