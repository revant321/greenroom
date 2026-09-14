import { Redirect } from "expo-router";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/hooks/useAuth";

export default function Index() {
  const { session, loading } = useAuth();
  if (loading) {
    return <LoadingScreen />;
  }
  return <Redirect href={session ? "/shows" : "/login"} />;
}
