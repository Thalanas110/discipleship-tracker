import { useEffect, useState } from "react";
import { prayerService } from "@/integrations/supabase/services/prayerService";
import type { PrayerRequest, PrayerVisibility } from "@/types";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, Plus, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/utils/format";

export default function Prayer() {
  const [items, setItems] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<PrayerVisibility>("private");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setItems(await prayerService.list()); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { document.title = "Prayer · Sōma"; load(); }, []);

  const save = async () => {
    if (!title) return toast.error("Title required");
    setSaving(true);
    try { await prayerService.create({ title, description, visibility }); toast.success("Prayer recorded"); setTitle(""); setDescription(""); setOpen(false); load(); }
    catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };
  const answer = async (id: string) => {
    const note = prompt("Brief note about how this was answered (optional):") ?? undefined;
    try { await prayerService.markAnswered(id, note); toast.success("Marked answered"); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <>
      <PageHeader
        title="Prayer requests"
        description="Carry one another's burdens."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New request</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">New prayer request</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Details</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Visibility</Label>
                  <Select value={visibility} onValueChange={(v) => setVisibility(v as PrayerVisibility)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private (only me)</SelectItem>
                      <SelectItem value="leader_only">My leader</SelectItem>
                      <SelectItem value="public">Ministry-wide</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      {loading ? <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        : items.length === 0 ? <EmptyState icon={Heart} title="No prayer requests yet" description="Add prayers and celebrate as they are answered." />
        : <div className="space-y-3">
            {items.map((p) => (
              <Card key={p.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">{p.title}</h3>
                      <Badge variant="outline" className="text-xs capitalize">{p.visibility.replace("_"," ")}</Badge>
                      {p.answered && <Badge className="bg-success text-success-foreground">Answered</Badge>}
                    </div>
                    {p.description && <p className="text-sm text-muted-foreground mt-2">{p.description}</p>}
                    {p.answered && p.answered_note && <p className="text-sm mt-2 italic text-success">"{p.answered_note}" — {formatDate(p.answered_at)}</p>}
                  </div>
                  {!p.answered && <Button size="sm" variant="outline" onClick={() => answer(p.id)}><Check className="h-3 w-3 mr-1" />Answered</Button>}
                </div>
              </Card>
            ))}
          </div>}
    </>
  );
}
