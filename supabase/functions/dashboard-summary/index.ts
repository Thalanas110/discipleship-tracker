import { handle, hasAnyRole } from "../_shared/util.ts";

const STALE_DAYS = 14;

Deno.serve((req) => handle(req, async (ctx) => {
  const { supabaseUser, supabaseAdmin, userId } = ctx;
  const isAdmin = await hasAnyRole(supabaseAdmin, userId, ["admin","pastor"]);

  // Get this user's relationships (as leader) — RLS-respecting
  const { data: rels } = await supabaseUser
    .from("discipleship_relationships")
    .select("id, disciple_id, leader_id, status, stage, profiles:profiles!discipleship_relationships_disciple_id_fkey(display_name)")
    .eq("status","active");

  const myLeaderRels = (rels ?? []).filter((r: any) => r.leader_id === userId);

  // Recent meetings (last 30d)
  const since30 = new Date(Date.now() - 30*24*3600*1000).toISOString();
  const { data: recentMeetings } = await supabaseUser
    .from("meetings")
    .select("id, relationship_id, meeting_date")
    .gte("meeting_date", since30)
    .order("meeting_date", { ascending: false });

  // Pending follow-ups due
  const today = new Date().toISOString().slice(0,10);
  const { data: dueFollowups } = await supabaseUser
    .from("follow_ups")
    .select("id, relationship_id, due_date, status")
    .eq("status","pending");

  // Care alerts: for each of my leader rels, check last meeting
  const meetingsByRel: Record<string, string> = {};
  for (const m of recentMeetings ?? []) {
    if (!meetingsByRel[m.relationship_id] || m.meeting_date > meetingsByRel[m.relationship_id]) {
      meetingsByRel[m.relationship_id] = m.meeting_date;
    }
  }

  const alerts: any[] = [];
  for (const r of myLeaderRels) {
    const last = meetingsByRel[r.id];
    const days = last
      ? Math.floor((Date.now() - new Date(last).getTime()) / (24*3600*1000))
      : 999;
    if (days > STALE_DAYS) {
      alerts.push({
        type: days > 60 ? "inactive" : "no_recent_meeting",
        relationship_id: r.id,
        disciple_id: r.disciple_id,
        disciple_name: (r as any).profiles?.display_name ?? "Disciple",
        days,
        message: last ? `No meeting in ${days} days` : "No meetings recorded yet",
      });
    }
  }

  // Missed follow-ups
  for (const f of dueFollowups ?? []) {
    if (f.due_date && f.due_date < today) {
      const rel = myLeaderRels.find((r: any) => r.id === f.relationship_id);
      if (rel) {
        alerts.push({
          type: "missed_followup",
          relationship_id: f.relationship_id,
          disciple_id: rel.disciple_id,
          disciple_name: (rel as any).profiles?.display_name ?? "Disciple",
          message: `Follow-up overdue (due ${f.due_date})`,
        });
      }
    }
  }

  return {
    role_view: isAdmin ? "admin" : (myLeaderRels.length > 0 ? "leader" : "disciple"),
    active_disciples: myLeaderRels.length,
    followups_due: (dueFollowups ?? []).filter((f: any) => !f.due_date || f.due_date <= today).length,
    recent_meetings: (recentMeetings ?? []).length,
    care_alerts: alerts.slice(0, 10),
    upcoming: [],
  };
}));
