import { supabase } from "@/integrations/supabase/client";
import { invoke } from "@/lib/invoke";
import type { DiscipleshipRelationship, RelationshipStage, RelationshipStatus } from "@/types";

const RELATIONSHIP_WITH_PROFILES_SELECT =
  "*, disciple:profiles!discipleship_relationships_disciple_profile_id_fkey(*), leader:profiles!discipleship_relationships_leader_profile_id_fkey(*)";

export const discipleService = {
  async listMyDisciples(): Promise<DiscipleshipRelationship[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("discipleship_relationships")
      .select(RELATIONSHIP_WITH_PROFILES_SELECT)
      .eq("leader_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as unknown as DiscipleshipRelationship[]) ?? [];
  },
  async listAll(): Promise<DiscipleshipRelationship[]> {
    const { data, error } = await supabase
      .from("discipleship_relationships")
      .select(RELATIONSHIP_WITH_PROFILES_SELECT)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as unknown as DiscipleshipRelationship[]) ?? [];
  },
  async getById(id: string): Promise<DiscipleshipRelationship | null> {
    const { data, error } = await supabase
      .from("discipleship_relationships")
      .select(RELATIONSHIP_WITH_PROFILES_SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data as unknown as DiscipleshipRelationship | null;
  },
  async create(input: {
    disciple_id: string;
    stage?: RelationshipStage;
    notes?: string;
    ministry_id?: string | null;
  }) {
    return invoke<DiscipleshipRelationship>("relationship-create", input);
  },
  async update(id: string, updates: Partial<{ stage: RelationshipStage; status: RelationshipStatus; notes: string }>) {
    return invoke<DiscipleshipRelationship>("relationship-update", { id, updates });
  },
};
