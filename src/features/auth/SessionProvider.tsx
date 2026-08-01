import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { makeRedirectUri } from "expo-auth-session";
import { Alert, Platform } from "react-native";
import { AuthError, Provider, Session } from "@supabase/supabase-js";
import { isDemoMode, isSupabaseConfigured, supabase } from "@/lib/supabase";

type SessionContextValue = {
  session: Session | null;
  isLoading: boolean;
  signInWithEmail: (email: string) => Promise<{ error: AuthError | null }>;
  signInWithOAuth: (provider: Extract<Provider, "apple" | "google">) => Promise<void>;
  startDemo: () => void;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode && !isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      isLoading,
      signInWithEmail: async (email) => {
        if (isDemoMode && !isSupabaseConfigured) {
          setSession(createDemoSession(email));
          return { error: null };
        }

        const redirectTo = getAuthRedirectUrl();
        return supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectTo
          }
        });
      },
      signInWithOAuth: async (provider) => {
        if (isDemoMode && !isSupabaseConfigured) {
          setSession(createDemoSession(`${provider}@demo.phoneshepherd.app`));
          return;
        }

        const redirectTo = getAuthRedirectUrl();
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo,
            skipBrowserRedirect: false
          }
        });

        if (error) {
          Alert.alert("Sign-in failed", error.message);
        }
      },
      startDemo: () => {
        setSession(createDemoSession("demo@phoneshepherd.app"));
      },
      signOut: async () => {
        if (isDemoMode && !isSupabaseConfigured) {
          setSession(null);
          return;
        }

        await supabase.auth.signOut();
      }
    }),
    [isLoading, session]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

function getAuthRedirectUrl() {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.location.origin;
  }

  return makeRedirectUri({ scheme: "phoneshepherd" });
}

function createDemoSession(email: string) {
  return {
    access_token: "demo-token",
    refresh_token: "demo-refresh-token",
    expires_in: 3600,
    token_type: "bearer",
    user: {
      id: "demo-user",
      aud: "authenticated",
      role: "authenticated",
      email,
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString()
    }
  } as Session;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return context;
}
