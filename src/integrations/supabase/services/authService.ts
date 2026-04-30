import { supabase } from "@/integrations/supabase/client";

export const authService = {
  async signUp(email: string, password: string, displayName: string) {
    const redirectUrl = `${window.location.origin}/`;
    return supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { display_name: displayName },
      },
    });
  },
  async signIn(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
  },
  async signOut() {
    return supabase.auth.signOut();
  },
  async getSession() {
    return supabase.auth.getSession();
  },
  onAuthStateChange(cb: (event: string, session: import("@supabase/supabase-js").Session | null) => void) {
    return supabase.auth.onAuthStateChange(cb);
  },
};
