import { handle, HttpError } from "../_shared/util.ts";

Deno.serve((req) => handle(req, async (ctx, body) => {
  const { id, status } = body as { id: string; status: string };
  if (!id || !status) throw new HttpError("id and status required");
  const allowed = ["pending","completed","missed","cancelled"];
  if (!allowed.includes(status)) throw new HttpError("Invalid status");

  const updates: Record<string, unknown> = { status };
  if (status === "completed") updates.completed_at = new Date().toISOString();

  const { data, error } = await ctx.supabaseUser
    .from("follow_ups")
    .update(updates)
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw new HttpError(error.message);
  return data;
}));
