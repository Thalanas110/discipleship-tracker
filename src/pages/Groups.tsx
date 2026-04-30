import { useEffect, useState } from "react";
import { groupService } from "@/integrations/supabase/services/groupService";
import type { Group } from "@/types";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UsersRound, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setGroups(await groupService.list()); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { document.title = "Groups · Sōma"; load(); }, []);

  const save = async () => {
    if (!name) return toast.error("Name required");
    setSaving(true);
    try {
      await groupService.create({ name, description });
      toast.success("Group created"); setName(""); setDescription(""); setOpen(false); load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <>
      <PageHeader
        title="Groups"
        description="Small groups, ministry teams, and gatherings."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New group</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Create a group</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      {loading ? <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        : groups.length === 0 ? <EmptyState icon={UsersRound} title="No groups yet" description="Groups help organize people by ministry, team, or season." />
        : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((g) => (
              <Card key={g.id} className="p-5">
                <h3 className="font-display text-lg font-medium">{g.name}</h3>
                {g.description && <p className="text-sm text-muted-foreground mt-1">{g.description}</p>}
              </Card>
            ))}
          </div>}
    </>
  );
}
