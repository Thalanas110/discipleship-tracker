import { supabase } from "@/integrations/supabase/client";
import { invoke } from "@/lib/invoke";
import type { AppRole } from "@/types";

export const roleService = {
  async getMyRoles(): Promise<AppRole[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    if (error) throw error;
    return (data ?? []).map((r) => r.role as AppRole);
  },
  async getUserRoles(userId: string): Promise<AppRole[]> {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (error) throw error;
    return (data ?? []).map((r) => r.role as AppRole);
  },
  async assignRole(userId: string, role: AppRole) {
    return invoke("role-assign", { userId, role });
  },
  async removeRole(userId: string, role: AppRole) {
    return invoke("role-remove", { userId, role });
  },
};
