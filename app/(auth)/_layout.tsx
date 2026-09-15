import { Redirect, Stack } from "expo-router";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/hooks/useAuth";

export default function AuthLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (session) {
    return <Redirect href="/shows" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
