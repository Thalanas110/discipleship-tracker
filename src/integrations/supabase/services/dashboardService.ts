import { invoke } from "@/lib/invoke";
import type { DashboardSummary } from "@/types";

export const dashboardService = {
  async getSummary(): Promise<DashboardSummary> {
    return invoke<DashboardSummary>("dashboard-summary");
  },
};
