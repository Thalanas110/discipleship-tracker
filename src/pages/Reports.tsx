import { useEffect, useState } from "react";
import { reportService, type MinistryReport } from "@/integrations/supabase/services/reportService";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { stageBadgeClass } from "@/utils/format";
import { STAGE_LABEL, STAGE_ORDER, type RelationshipStage } from "@/types";
import { BarChart3, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Reports() {
  const [report, setReport] = useState<MinistryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Reports · Sōma";
    (async () => {
      try { setReport(await reportService.getMinistryReport()); }
      catch (e: any) { setError(e.message); toast.error(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (error || !report) return <EmptyState icon={BarChart3} title="Reports unavailable" description={error ?? "You may not have access to ministry reports."} />;

  const stats = [
    { label: "Total users", value: report.total_users },
    { label: "Active relationships", value: report.active_relationships },
    { label: "Meetings (30d)", value: report.meetings_last_30d },
    { label: "Follow-ups pending", value: report.followups_pending },
    { label: "Follow-ups completed", value: report.followups_completed },
    { label: "At-risk follow-ups", value: report.at_risk, accent: report.at_risk > 0 },
  ];

  return (
    <>
      <PageHeader title="Ministry health" description="A snapshot of how disciples are growing." />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
            <p className={`font-display text-3xl font-semibold mt-2 ${s.accent ? "text-destructive" : "text-primary"}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="font-display text-xl font-semibold mb-4">Active relationships by stage</h2>
        <div className="space-y-3">
          {STAGE_ORDER.map((s: RelationshipStage) => {
            const count = report.by_stage[s] ?? 0;
            const max = Math.max(...Object.values(report.by_stage), 1);
            return (
              <div key={s}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <Badge variant="outline" className={stageBadgeClass[s]}>{STAGE_LABEL[s]}</Badge>
                  <span className="text-muted-foreground">{count}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-primary rounded-full transition-all" style={{ width: `${(count / max) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}
