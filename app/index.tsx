import { Redirect } from "expo-router";
import { useSession } from "@/features/auth/SessionProvider";

export default function Index() {
  const { session } = useSession();
  return <Redirect href={session ? "/(tabs)" : "/welcome"} />;
}
