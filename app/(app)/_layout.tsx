import { Redirect, Stack } from "expo-router";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/theme/useTheme";
import { fonts } from "@/theme/tokens";

export default function AppLayout() {
  const { session, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="settings"
        options={{
          presentation: "modal",
          headerShown: true,
          title: "Settings",
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          headerTintColor: colors.accent,
          headerTitleStyle: {
            color: colors.text,
            fontFamily: fonts.semibold,
            fontWeight: "600" as const,
          },
        }}
      />
    </Stack>
  );
}
