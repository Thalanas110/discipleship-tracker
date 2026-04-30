import { handle, HttpError } from "../_shared/util.ts";

Deno.serve((req) => handle(req, async (ctx, body) => {
  const updates = (body?.updates ?? {}) as Record<string, unknown>;
  // Whitelist updatable fields
  const allowed = ["display_name", "avatar_url", "phone", "bio", "ministry_id"];
  const clean: Record<string, unknown> = {};
  for (const k of allowed) if (k in updates) clean[k] = updates[k];
  if (Object.keys(clean).length === 0) throw new HttpError("No valid fields", 400);

  const { data, error } = await ctx.supabaseUser
    .from("profiles")
    .update(clean)
    .eq("id", ctx.userId)
    .select()
    .maybeSingle();
  if (error) throw new HttpError(error.message);
  return data;
}));
