import { useEffect, useState } from "react";
import { followupService } from "@/integrations/supabase/services/followupService";
import type { FollowUp } from "@/types";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { followupStatusClass, formatDate } from "@/utils/format";
import { ListChecks, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function FollowUps() {
  const [items, setItems] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setItems(await followupService.listAll()); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { document.title = "Follow-ups · Sōma"; load(); }, []);

  const complete = async (id: string) => {
    try { await followupService.setStatus(id, "completed"); toast.success("Done"); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <>
      <PageHeader title="Follow-ups" description="Accountability tasks across all your relationships." />
      {loading ? <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        : items.length === 0 ? <EmptyState icon={ListChecks} title="No follow-ups yet" description="Add follow-ups from a disciple's profile." />
        : <div className="space-y-2">
            {items.map((f) => (
              <Card key={f.id} className="p-4 flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-medium">{f.task}</p>
                  <p className="text-xs text-muted-foreground">Due {formatDate(f.due_date)}</p>
                </div>
                <Badge variant="outline" className={followupStatusClass[f.status]}>{f.status}</Badge>
                {f.status === "pending" && <Button size="sm" variant="outline" onClick={() => complete(f.id)}><Check className="h-3 w-3 mr-1" />Done</Button>}
              </Card>
            ))}
          </div>}
    </>
  );
}
