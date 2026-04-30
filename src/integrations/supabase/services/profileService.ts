import { supabase } from "@/integrations/supabase/client";
import { invoke } from "@/lib/invoke";
import type { Profile } from "@/types";

export const profileService = {
  async getById(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return data as Profile | null;
  },
  async list(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("display_name", { ascending: true });
    if (error) throw error;
    return (data as Profile[]) ?? [];
  },
  async update(updates: Partial<Profile>) {
    return invoke<Profile>("profile-update", { updates });
  },
};
