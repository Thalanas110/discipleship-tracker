import { supabase } from "@/integrations/supabase/client";
import { invoke } from "@/lib/invoke";
import type { Meeting } from "@/types";

export const meetingService = {
  async listByRelationship(relationship_id: string): Promise<Meeting[]> {
    const { data, error } = await supabase
      .from("meetings")
      .select("*")
      .eq("relationship_id", relationship_id)
      .order("meeting_date", { ascending: false });
    if (error) throw error;
    return (data as Meeting[]) ?? [];
  },
  async listMine(limit = 20): Promise<Meeting[]> {
    const { data, error } = await supabase
      .from("meetings")
      .select("*")
      .order("meeting_date", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as Meeting[]) ?? [];
  },
  async create(input: {
    relationship_id: string;
    meeting_date?: string;
    summary?: string;
    spiritual_notes?: string;
    next_steps?: string;
  }) {
    return invoke<Meeting>("meeting-create", input);
  },
};
