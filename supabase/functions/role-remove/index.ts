import { handle, HttpError, hasAnyRole } from "../_shared/util.ts";

Deno.serve((req) => handle(req, async (ctx, body) => {
  const { userId, role } = body as { userId: string; role: string };
  if (!userId || !role) throw new HttpError("userId and role required");
  const isAdmin = await hasAnyRole(ctx.supabaseAdmin, ctx.userId, ["admin"]);
  if (!isAdmin) throw new HttpError("Forbidden", 403);

  const { error } = await ctx.supabaseAdmin
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role", role);
  if (error) throw new HttpError(error.message);
  return { ok: true };
}));
