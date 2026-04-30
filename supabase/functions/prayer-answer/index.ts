import { handle, HttpError } from "../_shared/util.ts";

Deno.serve((req) => handle(req, async (ctx, body) => {
  const { id, answered_note } = body as { id: string; answered_note?: string };
  if (!id) throw new HttpError("id required");
  const { data, error } = await ctx.supabaseUser
    .from("prayer_requests")
    .update({ answered: true, answered_at: new Date().toISOString(), answered_note: answered_note ?? null })
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) throw new HttpError(error.message);
  return data;
}));
