import { handle, HttpError } from "../_shared/util.ts";

Deno.serve((req) => handle(req, async (ctx, body) => {
  const { disciple_id, type, title, achieved_on, notes } = body as {
    disciple_id: string; type: string; title: string; achieved_on?: string; notes?: string;
  };
  if (!disciple_id || !type || !title) throw new HttpError("disciple_id, type, title required");
  const { data, error } = await ctx.supabaseUser
    .from("milestones")
    .insert({
      disciple_id, type, title,
      achieved_on: achieved_on ?? new Date().toISOString().slice(0,10),
      notes: notes ?? null,
      created_by: ctx.userId,
    })
    .select()
    .maybeSingle();
  if (error) throw new HttpError(error.message);
  return data;
}));
