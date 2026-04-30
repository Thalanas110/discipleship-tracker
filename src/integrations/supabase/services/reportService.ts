import { invoke } from "@/lib/invoke";

export interface MonthlyActivityPoint {
  month_key: string;
  month_label: string;
  meetings: number;
  followups_created: number;
  followups_completed: number;
}

export interface FollowupStatusBreakdownItem {
  status: "pending" | "completed" | "missed" | "cancelled";
  count: number;
}

export interface LeaderPerformanceRow {
  leader_id: string;
  leader_name: string;
  active_disciples: number;
  meetings_last_30d: number;
  followups_pending: number;
  at_risk_followups: number;
}

export interface MinistryReport {
  generated_at: string;
  total_users: number;
  active_relationships: number;
  meetings_last_30d: number;
  followups_pending: number;
  followups_completed: number;
  at_risk: number;
  followup_completion_rate: number;
  active_disciples_per_leader: number;
  by_stage: Record<string, number>;
  followup_status_breakdown: FollowupStatusBreakdownItem[];
  monthly_activity: MonthlyActivityPoint[];
  leader_performance: LeaderPerformanceRow[];
}

export const reportService = {
  async getMinistryReport(): Promise<MinistryReport> {
    return invoke<MinistryReport>("report-ministry");
  },
};
