import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { dashboardService } from "@/integrations/supabase/services/dashboardService";
import { discipleService } from "@/integrations/supabase/services/discipleService";
import type { DashboardSummary, DiscipleshipRelationship } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { stageBadgeClass } from "@/utils/format";
import { STAGE_LABEL } from "@/types";
import { Link } from "react-router-dom";
import { AlertTriangle, Users, Calendar, ListChecks, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [disciples, setDisciples] = useState<DiscipleshipRelationship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Dashboard · Sōma";
    (async () => {
      try {
        const [s, d] = await Promise.all([
          dashboardService.getSummary().catch((e) => { toast.error(e.message); return null; }),
          discipleService.listMyDisciples().catch(() => []),
        ]);
        setSummary(s);
        setDisciples(d);
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const greeting = user?.user_metadata?.display_name ?? user?.email?.split("@")[0] ?? "friend";

  return (
    <>
      <PageHeader
        title={`Peace, ${greeting}.`}
        description="Here's a snapshot of the people you're walking with."
      />

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Users} label="Active disciples" value={summary.active_disciples} />
          <StatCard icon={ListChecks} label="Follow-ups due" value={summary.followups_due} accent={summary.followups_due > 0 ? "warning" : undefined} />
          <StatCard icon={Calendar} label="Meetings (30d)" value={summary.recent_meetings} />
          <StatCard icon={AlertTriangle} label="Care alerts" value={summary.care_alerts.length} accent={summary.care_alerts.length > 0 ? "destructive" : undefined} />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-xl font-semibold">Your disciples</h2>
              <Button variant="ghost" size="sm" asChild><Link to="/app/disciples">View all →</Link></Button>
            </div>
            {disciples.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No disciples assigned yet"
                description="Once you start walking with someone, they'll appear here."
                action={<Button asChild><Link to="/app/disciples">Add a disciple</Link></Button>}
              />
            ) : (
              <div className="space-y-2">
                {disciples.slice(0,5).map((r) => (
                  <Link
                    key={r.id}
                    to={`/app/disciples/${r.id}`}
                    className="flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:shadow-soft transition-shadow"
                  >
                    <div>
                      <p className="font-medium">{r.disciple?.display_name ?? "Disciple"}</p>
                      <p className="text-xs text-muted-foreground">{r.disciple?.email}</p>
                    </div>
                    <Badge variant="outline" className={stageBadgeClass[r.stage]}>{STAGE_LABEL[r.stage]}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section>
            <h2 className="font-display text-xl font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-accent" /> Care alerts
            </h2>
            {!summary || summary.care_alerts.length === 0 ? (
              <Card className="p-5 text-sm text-muted-foreground bg-card/50 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-success" /> All clear — no one needs urgent follow-up.
              </Card>
            ) : (
              <div className="space-y-2">
                {summary.care_alerts.map((a, i) => (
                  <Link
                    key={i}
                    to={`/app/disciples/${a.relationship_id}`}
                    className="block p-3 rounded-lg bg-accent/10 border border-accent/20 hover:bg-accent/15 transition-colors"
                  >
                    <p className="text-sm font-medium">{a.disciple_name}</p>
                    <p className="text-xs text-muted-foreground">{a.message}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function StatCard({
  icon: Icon, label, value, accent,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; accent?: "warning" | "destructive" }) {
  const accentClass =
    accent === "destructive" ? "text-destructive" : accent === "warning" ? "text-warning-foreground" : "text-primary";
  return (
    <Card className="p-4 shadow-soft">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
        <Icon className={`h-4 w-4 ${accentClass}`} />
      </div>
      <p className={`font-display text-3xl font-semibold ${accentClass}`}>{value}</p>
    </Card>
  );
}
