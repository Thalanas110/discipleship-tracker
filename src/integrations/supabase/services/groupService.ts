import { supabase } from "@/integrations/supabase/client";
import { invoke } from "@/lib/invoke";
import type { Group } from "@/types";

export const groupService = {
  async list(): Promise<Group[]> {
    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .order("name");
    if (error) throw error;
    return (data as Group[]) ?? [];
  },
  async create(input: { name: string; description?: string; ministry_id?: string | null }) {
    return invoke<Group>("group-create", input);
  },
  async addMember(group_id: string, member_id: string) {
    return invoke("group-add-member", { group_id, member_id });
  },
};
