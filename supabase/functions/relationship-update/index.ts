import { handle, HttpError } from "../_shared/util.ts";

Deno.serve((req) => handle(req, async (ctx, body) => {
  const { id, updates } = body as { id: string; updates: Record<string, unknown> };
  if (!id || !updates) throw new HttpError("id and updates required");
  const allowed = ["stage", "status", "notes"];
  const clean: Record<string, unknown> = {};
  for (const k of allowed) if (k in updates) clean[k] = updates[k];

  const { data, error } = await ctx.supabaseUser
    .from("discipleship_relationships")
    .update(clean)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw new HttpError(error.message);
  return data;
}));
