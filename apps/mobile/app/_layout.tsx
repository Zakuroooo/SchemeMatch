import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { I18nProvider } from "@/i18n";
import { ScreeningProvider } from "@/state/screening";
import { colors } from "@/ui/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <ScreeningProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
          />
        </ScreeningProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
