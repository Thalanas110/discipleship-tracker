import { useEffect, useState } from "react";
import { meetingService } from "@/integrations/supabase/services/meetingService";
import type { Meeting } from "@/types";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { formatDateTime, relativeDays } from "@/utils/format";
import { Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Meetings() {
  const [items, setItems] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Meetings · Sōma";
    (async () => {
      try { setItems(await meetingService.listMine(50)); }
      catch (e: any) { toast.error(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <>
      <PageHeader title="Meetings" description="A record of meaningful conversations." />
      {loading ? <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        : items.length === 0 ? <EmptyState icon={Calendar} title="No meetings recorded" description="Meetings recorded for any disciple will show up here." />
        : <div className="space-y-3">
            {items.map((m) => (
              <Card key={m.id} className="p-5">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{formatDateTime(m.meeting_date)}</p>
                  <span className="text-xs text-muted-foreground">{relativeDays(m.meeting_date)}</span>
                </div>
                {m.summary && <p className="text-sm mt-2">{m.summary}</p>}
              </Card>
            ))}
          </div>}
    </>
  );
}
