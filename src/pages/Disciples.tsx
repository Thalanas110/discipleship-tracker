import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { discipleService } from "@/integrations/supabase/services/discipleService";
import { profileService } from "@/integrations/supabase/services/profileService";
import type { DiscipleshipRelationship, Profile, RelationshipStage } from "@/types";
import { STAGE_LABEL, STAGE_ORDER } from "@/types";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { stageBadgeClass, initials } from "@/utils/format";
import { Users, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Disciples() {
  const { hasAnyRole } = useAuth();
  const [rels, setRels] = useState<DiscipleshipRelationship[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [discipleId, setDiscipleId] = useState<string>("");
  const [stage, setStage] = useState<RelationshipStage>("new_believer");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const isPrivileged = hasAnyRole(["admin","pastor"]);

  const load = async () => {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([
        isPrivileged ? discipleService.listAll() : discipleService.listMyDisciples(),
        profileService.list(),
      ]);
      setRels(r); setProfiles(p);
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  };

  useEffect(() => { document.title = "Disciples · Sōma"; load(); }, []);

  const submit = async () => {
    if (!discipleId) return toast.error("Select a person");
    setSaving(true);
    try {
      await discipleService.create({ disciple_id: discipleId, stage, notes });
      toast.success("Relationship created");
      setOpen(false); setDiscipleId(""); setNotes(""); setStage("new_believer");
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <>
      <PageHeader
        title="Disciples"
        description={isPrivileged ? "All discipleship relationships in your ministry." : "People you're walking with."}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add disciple</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Begin a discipleship relationship</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Person</Label>
                  <Select value={discipleId} onValueChange={setDiscipleId}>
                    <SelectTrigger><SelectValue placeholder="Choose someone" /></SelectTrigger>
                    <SelectContent>
                      {profiles.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.display_name ?? p.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Stage</Label>
                  <Select value={stage} onValueChange={(v) => setStage(v as RelationshipStage)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAGE_ORDER.map((s) => <SelectItem key={s} value={s}>{STAGE_LABEL[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How did this relationship begin?" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={submit} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : rels.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No disciples assigned yet"
          description="Begin a relationship to start tracking meetings, follow-ups, and milestones."
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rels.map((r) => (
            <Link key={r.id} to={`/app/disciples/${r.id}`}>
              <Card className="p-5 hover:shadow-warm transition-shadow h-full">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar><AvatarFallback className="bg-primary/10 text-primary">{initials(r.disciple?.display_name)}</AvatarFallback></Avatar>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{r.disciple?.display_name ?? "Disciple"}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.disciple?.email}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={stageBadgeClass[r.stage]}>{STAGE_LABEL[r.stage]}</Badge>
                  <span className="text-xs text-muted-foreground capitalize">{r.status}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
