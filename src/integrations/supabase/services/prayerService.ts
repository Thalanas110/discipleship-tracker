import { supabase } from "@/integrations/supabase/client";
import { invoke } from "@/lib/invoke";
import type { PrayerRequest, PrayerVisibility } from "@/types";

export const prayerService = {
  async list(): Promise<PrayerRequest[]> {
    const { data, error } = await supabase
      .from("prayer_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as PrayerRequest[]) ?? [];
  },
  async create(input: { title: string; description?: string; visibility?: PrayerVisibility }) {
    return invoke<PrayerRequest>("prayer-create", input);
  },
  async markAnswered(id: string, answered_note?: string) {
    return invoke<PrayerRequest>("prayer-answer", { id, answered_note });
  },
};
