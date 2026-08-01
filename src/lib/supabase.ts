import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isDemoMode = process.env.EXPO_PUBLIC_DEMO_MODE !== "false";
export const isSupabaseConfigured =
  Boolean(supabaseUrl && supabaseAnonKey) &&
  supabaseUrl !== "https://your-project.supabase.co" &&
  supabaseAnonKey !== "your-anon-key";

if (!isSupabaseConfigured) {
  console.warn("Missing Supabase environment variables. Copy .env.example to .env.");
}

export const supabase = createClient(supabaseUrl ?? "https://example.supabase.co", supabaseAnonKey ?? "missing", {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === "web"
  }
});
