import { supabase } from "@/integrations/supabase/client";
import { invoke } from "@/lib/invoke";
import type { Milestone } from "@/types";

export const milestoneService = {
  async listForDisciple(disciple_id: string): Promise<Milestone[]> {
    const { data, error } = await supabase
      .from("milestones")
      .select("*")
      .eq("disciple_id", disciple_id)
      .order("achieved_on", { ascending: false });
    if (error) throw error;
    return (data as Milestone[]) ?? [];
  },
  async listMine(): Promise<Milestone[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    return this.listForDisciple(user.id);
  },
  async create(input: { disciple_id: string; type: string; title: string; achieved_on?: string; notes?: string }) {
    return invoke<Milestone>("milestone-create", input);
  },
};
