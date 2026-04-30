import { useEffect, useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { discipleService } from "@/integrations/supabase/services/discipleService";
import { meetingService } from "@/integrations/supabase/services/meetingService";
import { followupService } from "@/integrations/supabase/services/followupService";
import { milestoneService } from "@/integrations/supabase/services/milestoneService";
import type { DiscipleshipRelationship, Meeting, FollowUp, Milestone, RelationshipStage } from "@/types";
import { STAGE_LABEL, STAGE_ORDER } from "@/types";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { stageBadgeClass, followupStatusClass, formatDate, formatDateTime, initials, relativeDays } from "@/utils/format";
import { ArrowLeft, Calendar, ListChecks, Award, Plus, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

export default function DiscipleProfile() {
  const { id = "" } = useParams({ strict: false }) as { id?: string };
  const [rel, setRel] = useState<DiscipleshipRelationship | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await discipleService.getById(id);
      setRel(r);
      if (r) {
        const [m, f, ms] = await Promise.all([
          meetingService.listByRelationship(r.id),
          followupService.listByRelationship(r.id),
          milestoneService.listForDisciple(r.disciple_id),
        ]);
        setMeetings(m); setFollowups(f); setMilestones(ms);
      }
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { document.title = "Disciple · Sōma"; load(); }, [id]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!rel) return <EmptyState title="Not found" description="This relationship doesn't exist or you can't view it." />;

  const updateStage = async (stage: RelationshipStage) => {
    try { await discipleService.update(rel.id, { stage }); toast.success("Stage updated"); load(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <>
      <Link to="/app/disciples" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Disciples
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center gap-5 mb-8">
        <Avatar className="h-20 w-20">
          <AvatarFallback className="bg-primary/10 text-primary text-2xl font-display">
            {initials(rel.disciple?.display_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="font-display text-3xl font-semibold">{rel.disciple?.display_name ?? "Disciple"}</h1>
          <p className="text-muted-foreground">{rel.disciple?.email}</p>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <Badge variant="outline" className={stageBadgeClass[rel.stage]}>{STAGE_LABEL[rel.stage]}</Badge>
            <span className="text-xs text-muted-foreground">Started {formatDate(rel.start_date)}</span>
          </div>
        </div>
        <Select value={rel.stage} onValueChange={(v) => updateStage(v as RelationshipStage)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STAGE_ORDER.map((s) => <SelectItem key={s} value={s}>{STAGE_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="meetings">Meetings</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-6">
          <Timeline meetings={meetings} followups={followups} milestones={milestones} />
        </TabsContent>

        <TabsContent value="meetings" className="mt-6">
          <MeetingsTab relId={rel.id} meetings={meetings} reload={load} />
        </TabsContent>

        <TabsContent value="followups" className="mt-6">
          <FollowupsTab relId={rel.id} items={followups} reload={load} />
        </TabsContent>

        <TabsContent value="milestones" className="mt-6">
          <MilestonesTab discipleId={rel.disciple_id} items={milestones} reload={load} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function Timeline({ meetings, followups, milestones }: { meetings: Meeting[]; followups: FollowUp[]; milestones: Milestone[] }) {
  type Event = { date: string; type: "meeting" | "followup" | "milestone"; title: string; description?: string };
  const events: Event[] = [
    ...meetings.map((m) => ({ date: m.meeting_date, type: "meeting" as const, title: "Meeting", description: m.summary ?? undefined })),
    ...followups.map((f) => ({ date: f.completed_at ?? f.created_at, type: "followup" as const, title: f.task, description: `Status: ${f.status}` })),
    ...milestones.map((ms) => ({ date: ms.achieved_on, type: "milestone" as const, title: ms.title, description: ms.notes ?? ms.type })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (events.length === 0)
    return <EmptyState title="Nothing yet" description="Meetings, follow-ups, and milestones will appear here as they're recorded." />;

  return (
    <div className="space-y-3">
      {events.map((e, i) => (
        <Card key={i} className="p-4 flex gap-4 items-start">
          <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
            e.type === "meeting" ? "bg-primary" : e.type === "milestone" ? "bg-accent" : "bg-warning"
          }`} />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="font-medium">{e.title}</p>
              <span className="text-xs text-muted-foreground">{relativeDays(e.date)}</span>
            </div>
            {e.description && <p className="text-sm text-muted-foreground mt-1">{e.description}</p>}
          </div>
        </Card>
      ))}
    </div>
  );
}

function MeetingsTab({ relId, meetings, reload }: { relId: string; meetings: Meeting[]; reload: () => void }) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [spiritual, setSpiritual] = useState("");
  const [next, setNext] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await meetingService.create({ relationship_id: relId, summary, spiritual_notes: spiritual, next_steps: next });
      toast.success("Meeting recorded");
      setSummary(""); setSpiritual(""); setNext(""); setOpen(false); reload();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Record meeting</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Record a meeting</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5"><Label>Summary</Label><Textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What did you discuss?" /></div>
              <div className="space-y-1.5"><Label>Spiritual discussion</Label><Textarea value={spiritual} onChange={(e) => setSpiritual(e.target.value)} placeholder="Scripture, prayer, breakthroughs..." /></div>
              <div className="space-y-1.5"><Label>Next steps</Label><Textarea value={next} onChange={(e) => setNext(e.target.value)} placeholder="What should happen before next time?" /></div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {meetings.length === 0
        ? <EmptyState icon={Calendar} title="No meetings recorded" description="Record your first meeting to begin the timeline." />
        : <div className="space-y-3">{meetings.map((m) => (
            <Card key={m.id} className="p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium">{formatDateTime(m.meeting_date)}</p>
                <span className="text-xs text-muted-foreground">{relativeDays(m.meeting_date)}</span>
              </div>
              {m.summary && <p className="text-sm mt-2"><span className="text-muted-foreground">Summary: </span>{m.summary}</p>}
              {m.spiritual_notes && <p className="text-sm mt-1"><span className="text-muted-foreground">Spiritual: </span>{m.spiritual_notes}</p>}
              {m.next_steps && <p className="text-sm mt-1"><span className="text-muted-foreground">Next: </span>{m.next_steps}</p>}
            </Card>))}</div>}
    </>
  );
}

function FollowupsTab({ relId, items, reload }: { relId: string; items: FollowUp[]; reload: () => void }) {
  const [open, setOpen] = useState(false);
  const [task, setTask] = useState("");
  const [due, setDue] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!task) return toast.error("Task required");
    setSaving(true);
    try {
      await followupService.create({ relationship_id: relId, task, due_date: due || undefined });
      toast.success("Follow-up added"); setTask(""); setDue(""); setOpen(false); reload();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };
  const complete = async (id: string) => {
    try { await followupService.setStatus(id, "completed"); toast.success("Marked complete"); reload(); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add follow-up</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Add follow-up</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5"><Label>Task</Label><Input value={task} onChange={(e) => setTask(e.target.value)} placeholder="e.g. Check in about prayer life" /></div>
              <div className="space-y-1.5"><Label>Due date (optional)</Label><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {items.length === 0
        ? <EmptyState icon={ListChecks} title="No follow-ups yet" description="Track accountability tasks for this relationship." />
        : <div className="space-y-2">{items.map((f) => (
            <Card key={f.id} className="p-4 flex items-center gap-3">
              <div className="flex-1">
                <p className="font-medium">{f.task}</p>
                <p className="text-xs text-muted-foreground">Due {formatDate(f.due_date)}</p>
              </div>
              <Badge variant="outline" className={followupStatusClass[f.status]}>{f.status}</Badge>
              {f.status === "pending" && (
                <Button size="sm" variant="outline" onClick={() => complete(f.id)}><Check className="h-3 w-3 mr-1" />Done</Button>
              )}
            </Card>))}</div>}
    </>
  );
}

function MilestonesTab({ discipleId, items, reload }: { discipleId: string; items: Milestone[]; reload: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("baptism");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title) return toast.error("Title required");
    setSaving(true);
    try {
      await milestoneService.create({ disciple_id: discipleId, type, title, notes });
      toast.success("Milestone recorded"); setTitle(""); setNotes(""); setOpen(false); reload();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Record milestone</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Record a milestone</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5"><Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baptism">Baptism</SelectItem>
                    <SelectItem value="lesson_completed">Lesson completed</SelectItem>
                    <SelectItem value="first_service">First service</SelectItem>
                    <SelectItem value="discipling_others">Discipling others</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {items.length === 0
        ? <EmptyState icon={Award} title="No milestones yet" description="Celebrate moments of growth as they happen." />
        : <div className="space-y-2">{items.map((m) => (
            <Card key={m.id} className="p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{m.title}</p>
                <span className="text-xs text-muted-foreground">{formatDate(m.achieved_on)}</span>
              </div>
              <p className="text-xs text-muted-foreground capitalize mt-0.5">{m.type.replace(/_/g," ")}</p>
              {m.notes && <p className="text-sm mt-2">{m.notes}</p>}
            </Card>))}</div>}
    </>
  );
}
