import { useEffect, useState } from "react";
import { milestoneService } from "@/integrations/supabase/services/milestoneService";
import type { Milestone } from "@/types";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Award, Loader2 } from "lucide-react";
import { formatDate } from "@/utils/format";
import { toast } from "sonner";

export default function Milestones() {
  const [items, setItems] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    document.title = "Milestones · Sōma";
    (async () => {
      try { setItems(await milestoneService.listMine()); }
      catch (e: any) { toast.error(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <>
      <PageHeader title="Milestones" description="Markers of growth on your journey." />
      {loading ? <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        : items.length === 0 ? <EmptyState icon={Award} title="No milestones yet" description="Milestones recorded by your leader will appear here." />
        : <div className="grid sm:grid-cols-2 gap-4">
            {items.map((m) => (
              <Card key={m.id} className="p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-medium">{m.title}</h3>
                  <Award className="h-5 w-5 text-accent" />
                </div>
                <p className="text-xs text-muted-foreground capitalize mt-1">{m.type.replace(/_/g," ")} · {formatDate(m.achieved_on)}</p>
                {m.notes && <p className="text-sm mt-3">{m.notes}</p>}
              </Card>
            ))}
          </div>}
    </>
  );
}
