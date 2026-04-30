import { invoke } from "@/lib/invoke";

export interface MinistryReport {
  total_users: number;
  active_relationships: number;
  meetings_last_30d: number;
  followups_pending: number;
  followups_completed: number;
  at_risk: number;
  by_stage: Record<string, number>;
}

export const reportService = {
  async getMinistryReport(): Promise<MinistryReport> {
    return invoke<MinistryReport>("report-ministry");
  },
};
