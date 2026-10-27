import { Inter_400Regular, Inter_600SemiBold } from "@expo-google-fonts/inter";
import {
  NotoSansBengali_600SemiBold,
  NotoSansBengali_700Bold,
} from "@expo-google-fonts/noto-sans-bengali";
import { NotoSerifBengali_700Bold } from "@expo-google-fonts/noto-serif-bengali";
import {
  PlayfairDisplay_500Medium,
  PlayfairDisplay_500Medium_Italic,
} from "@expo-google-fonts/playfair-display";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { I18nProvider } from "@/i18n";
import { ScreeningProvider } from "@/state/screening";
import { colors } from "@/ui/theme";

export default function RootLayout() {
  // The font files ship inside the app, so this works offline. Until they load, the splash stays.
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    NotoSansBengali_600SemiBold,
    NotoSansBengali_700Bold,
    NotoSerifBengali_700Bold,
    PlayfairDisplay_500Medium,
    PlayfairDisplay_500Medium_Italic,
  });
  if (!loaded) return null;
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <ScreeningProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "slide_from_right",
              contentStyle: { backgroundColor: colors.bg },
            }}
          />
        </ScreeningProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
