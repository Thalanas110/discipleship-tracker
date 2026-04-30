import { supabase } from "@/integrations/supabase/client";
import { invoke } from "@/lib/invoke";
import type { FollowUp, FollowupStatus } from "@/types";

export const followupService = {
  async listByRelationship(relationship_id: string): Promise<FollowUp[]> {
    const { data, error } = await supabase
      .from("follow_ups")
      .select("*")
      .eq("relationship_id", relationship_id)
      .order("due_date", { ascending: true, nullsFirst: false });
    if (error) throw error;
    return (data as FollowUp[]) ?? [];
  },
  async listAll(): Promise<FollowUp[]> {
    const { data, error } = await supabase
      .from("follow_ups")
      .select("*")
      .order("due_date", { ascending: true, nullsFirst: false });
    if (error) throw error;
    return (data as FollowUp[]) ?? [];
  },
  async listDue(): Promise<FollowUp[]> {
    const { data, error } = await supabase
      .from("follow_ups")
      .select("*")
      .eq("status", "pending")
      .order("due_date", { ascending: true });
    if (error) throw error;
    return (data as FollowUp[]) ?? [];
  },
  async create(input: { relationship_id: string; task: string; due_date?: string }) {
    return invoke<FollowUp>("followup-create", input);
  },
  async setStatus(id: string, status: FollowupStatus) {
    return invoke<FollowUp>("followup-update", { id, status });
  },
};
