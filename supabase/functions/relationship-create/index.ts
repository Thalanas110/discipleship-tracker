import { handle, HttpError, hasAnyRole } from "../_shared/util.ts";

Deno.serve((req) => handle(req, async (ctx, body) => {
  const { disciple_id, stage, notes, ministry_id } = body as {
    disciple_id: string; stage?: string; notes?: string; ministry_id?: string | null;
  };
  if (!disciple_id) throw new HttpError("disciple_id required");
  if (disciple_id === ctx.userId) throw new HttpError("Cannot disciple yourself");

  const isPrivileged = await hasAnyRole(ctx.supabaseAdmin, ctx.userId, ["admin","pastor","leader"]);
  if (!isPrivileged) throw new HttpError("Forbidden", 403);

  const { data, error } = await ctx.supabaseUser
    .from("discipleship_relationships")
    .insert({
      leader_id: ctx.userId,
      disciple_id,
      stage: stage ?? "new_believer",
      notes: notes ?? null,
      ministry_id: ministry_id ?? null,
    })
    .select()
    .maybeSingle();
  if (error) throw new HttpError(error.message);
  return data;
}));
