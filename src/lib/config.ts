import { supabase, isDemoMode, isSupabaseConfigured } from "@/lib/supabase";

export type AppConnectionStatus = {
  mode: "demo" | "production";
  isSupabaseConfigured: boolean;
  canUseRemoteAi: boolean;
  message: string;
};

export function getConnectionStatus(): AppConnectionStatus {
  const mode = isDemoMode && !isSupabaseConfigured ? "demo" : "production";

  return {
    mode,
    isSupabaseConfigured,
    canUseRemoteAi: mode === "production",
    message:
      mode === "demo"
        ? "Demo mode is active. Add Supabase keys and set EXPO_PUBLIC_DEMO_MODE=false for real AI analysis."
        : "Production mode is active. Screenshots will be sent to Supabase Edge Functions for AI analysis."
  };
}

export async function checkSupabaseConnection() {
  if (!isSupabaseConfigured) {
    return {
      ok: false,
      message: "Supabase URL and anon key are not configured."
    };
  }

  const { error } = await supabase.auth.getSession();

  if (error) {
    return {
      ok: false,
      message: error.message
    };
  }

  return {
    ok: true,
    message: "Supabase client is reachable."
  };
}
