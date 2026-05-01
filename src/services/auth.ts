import { supabase } from "@/integrations/supabase/client";

export function signInWithGoogle(redirectTo = window.location.origin) {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
}
