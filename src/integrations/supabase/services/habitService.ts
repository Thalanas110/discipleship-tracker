import { supabase } from "@/integrations/supabase/client";
import { invoke } from "@/lib/invoke";
import type { Habit, HabitCheckin, HabitFrequency } from "@/types";

export const habitService = {
  async listMine(): Promise<Habit[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("habits")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as Habit[]) ?? [];
  },
  async listCheckins(habit_id: string): Promise<HabitCheckin[]> {
    const { data, error } = await supabase
      .from("habit_checkins")
      .select("*")
      .eq("habit_id", habit_id)
      .order("checkin_date", { ascending: false })
      .limit(60);
    if (error) throw error;
    return (data as HabitCheckin[]) ?? [];
  },
  async create(input: { name: string; type?: string; frequency?: HabitFrequency }) {
    return invoke<Habit>("habit-create", input);
  },
  async checkin(habit_id: string, note?: string) {
    return invoke<HabitCheckin>("habit-checkin", { habit_id, note });
  },
  async remove(id: string) {
    return invoke("habit-delete", { id });
  },
};
