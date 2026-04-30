import { handle, HttpError, hasAnyRole } from "../_shared/util.ts";

Deno.serve((req) => handle(req, async (ctx) => {
  const isAdmin = await hasAnyRole(ctx.supabaseAdmin, ctx.userId, ["admin","pastor","viewer"]);
  if (!isAdmin) throw new HttpError("Forbidden", 403);
  const admin = ctx.supabaseAdmin;

  const [{ count: total_users }, { data: rels }, { count: meetings_30 }, { data: fups }] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("discipleship_relationships").select("id, status, stage"),
    admin.from("meetings").select("*", { count: "exact", head: true })
      .gte("meeting_date", new Date(Date.now() - 30*24*3600*1000).toISOString()),
    admin.from("follow_ups").select("status, due_date"),
  ]);

  const active = (rels ?? []).filter((r: any) => r.status === "active");
  const by_stage: Record<string, number> = {};
  for (const r of active) by_stage[r.stage] = (by_stage[r.stage] ?? 0) + 1;

  const today = new Date().toISOString().slice(0,10);
  const followups_pending = (fups ?? []).filter((f: any) => f.status === "pending").length;
  const followups_completed = (fups ?? []).filter((f: any) => f.status === "completed").length;
  const at_risk = (fups ?? []).filter((f: any) => f.status === "pending" && f.due_date && f.due_date < today).length;

  return {
    total_users: total_users ?? 0,
    active_relationships: active.length,
    meetings_last_30d: meetings_30 ?? 0,
    followups_pending,
    followups_completed,
    at_risk,
    by_stage,
  };
}));
