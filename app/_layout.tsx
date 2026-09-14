import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/poppins";
import { AuthProvider } from "@/hooks/useAuth";
import { UserQueryCacheProvider } from "@/lib/UserQueryCacheProvider";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { ToastProvider } from "@/components/Toast";

export default function RootLayout() {
  // Poppins is the app typeface (design language port). Screens render with
  // system fallback metrics until loaded, then swap — no splash blocking.
  useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <UserQueryCacheProvider>
          <ThemeProvider>
            <ToastProvider>
              <Stack screenOptions={{ headerShown: false }} />
            </ToastProvider>
          </ThemeProvider>
        </UserQueryCacheProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
