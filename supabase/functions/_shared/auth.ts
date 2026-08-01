import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export function createSupabaseClient(req: Request) {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authorization = req.headers.get("Authorization") ?? "";

  const userClient = createClient(url, anonKey, {
    global: {
      headers: { Authorization: authorization }
    }
  });

  const adminClient = createClient(url, serviceKey);

  return { userClient, adminClient };
}

export async function requireUser(req: Request) {
  const { userClient, adminClient } = createSupabaseClient(req);
  const { data, error } = await userClient.auth.getUser();

  if (error || !data.user) {
    throw new Error("Authentication required.");
  }

  return { user: data.user, userClient, adminClient };
}

