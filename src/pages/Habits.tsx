import { useEffect, useState } from "react";
import { habitService } from "@/integrations/supabase/services/habitService";
import type { Habit, HabitFrequency } from "@/types";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sprout, Plus, Check, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Habits() {
  const [items, setItems] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("bible_reading");
  const [frequency, setFrequency] = useState<HabitFrequency>("daily");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setItems(await habitService.listMine()); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { document.title = "Habits · Sōma"; load(); }, []);

  const save = async () => {
    if (!name) return toast.error("Name required");
    setSaving(true);
    try { await habitService.create({ name, type, frequency }); toast.success("Habit added"); setName(""); setOpen(false); load(); }
    catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };
  const checkin = async (id: string) => {
    try { await habitService.checkin(id); toast.success("Checked in"); }
    catch (e: any) { toast.error(e.message); }
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this habit?")) return;
    try { await habitService.remove(id); toast.success("Deleted"); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <>
      <PageHeader
        title="Habits"
        description="Supporting practices — Bible reading, prayer, fellowship. They support discipleship; they don't define it."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New habit</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Add a habit</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Morning prayer" /></div>
                <div className="space-y-1.5"><Label>Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bible_reading">Bible reading</SelectItem>
                      <SelectItem value="prayer">Prayer</SelectItem>
                      <SelectItem value="fellowship">Fellowship</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5"><Label>Frequency</Label>
                  <Select value={frequency} onValueChange={(v) => setFrequency(v as HabitFrequency)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Add</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      {loading ? <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        : items.length === 0 ? <EmptyState icon={Sprout} title="No habits yet" description="Habits are optional — add a few that support your spiritual journey." />
        : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((h) => (
              <Card key={h.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-lg font-medium">{h.name}</h3>
                    <p className="text-xs text-muted-foreground capitalize">{(h.type ?? "").replace(/_/g," ")} · {h.frequency}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(h.id)}><Trash2 className="h-4 w-4 text-muted-foreground" /></Button>
                </div>
                <Button size="sm" className="mt-4 w-full" variant="outline" onClick={() => checkin(h.id)}>
                  <Check className="h-3 w-3 mr-1" />Check in today
                </Button>
              </Card>
            ))}
          </div>}
    </>
  );
}
