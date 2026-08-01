import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SessionProvider, useSession } from "@/features/auth/SessionProvider";
import { LoadingScreen } from "@/components/LoadingScreen";

function RootNavigator() {
  const { isLoading, session } = useSession();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        {session ? (
          <Stack.Screen name="(tabs)" />
        ) : (
          <Stack.Screen name="(auth)" />
        )}
        <Stack.Screen name="asset/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="session/index" options={{ presentation: "modal" }} />
        <Stack.Screen name="capture/index" options={{ presentation: "modal" }} />
        <Stack.Screen name="capture/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="dots/index" options={{ presentation: "modal" }} />
        <Stack.Screen name="timeline/index" options={{ presentation: "modal" }} />
        <Stack.Screen name="transformation/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="treasures/index" options={{ presentation: "modal" }} />
        <Stack.Screen name="report/monthly" options={{ presentation: "modal" }} />
        <Stack.Screen name="tasks/create" options={{ presentation: "modal" }} />
        <Stack.Screen name="tasks/[id]" options={{ presentation: "modal" }} />
        <Stack.Screen name="tasks/[id]/results" options={{ presentation: "modal" }} />
        <Stack.Screen name="settings/privacy" options={{ presentation: "modal" }} />
      </Stack>
    </>
  );
}

export default function Layout() {
  return (
    <SessionProvider>
      <RootNavigator />
    </SessionProvider>
  );
}
