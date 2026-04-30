import { handle, HttpError, hasAnyRole } from "../_shared/util.ts";

Deno.serve((req) => handle(req, async (ctx, body) => {
  const { name, description, ministry_id } = body as { name: string; description?: string; ministry_id?: string | null };
  if (!name) throw new HttpError("name required");
  const allowed = await hasAnyRole(ctx.supabaseAdmin, ctx.userId, ["admin","pastor","leader"]);
  if (!allowed) throw new HttpError("Forbidden", 403);
  const { data, error } = await ctx.supabaseUser
    .from("groups")
    .insert({ name, description: description ?? null, ministry_id: ministry_id ?? null, leader_id: ctx.userId })
    .select()
    .maybeSingle();
  if (error) throw new HttpError(error.message);
  return data;
}));
