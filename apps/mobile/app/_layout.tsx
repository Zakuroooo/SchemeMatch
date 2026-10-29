// Import each weight on its own: the packages' main entry would bundle every weight (49 files, 12 MB).
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { NotoSansBengali_600SemiBold } from "@expo-google-fonts/noto-sans-bengali/600SemiBold";
import { NotoSansBengali_700Bold } from "@expo-google-fonts/noto-sans-bengali/700Bold";
import { NotoSerifBengali_700Bold } from "@expo-google-fonts/noto-serif-bengali/700Bold";
import { PlayfairDisplay_500Medium } from "@expo-google-fonts/playfair-display/500Medium";
import { PlayfairDisplay_500Medium_Italic } from "@expo-google-fonts/playfair-display/500Medium_Italic";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { I18nProvider } from "@/i18n";
import { phoneSync } from "@/lib/sync/phone";
import { ScreeningProvider } from "@/state/screening";
import { SyncProvider } from "@/state/sync";
import { colors } from "@/ui/theme";

export default function RootLayout() {
  // One sync service for the app's lifetime. Saved screenings are sent in the background.
  const [sync] = useState(phoneSync);
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
        <SyncProvider sync={sync}>
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
        </SyncProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
