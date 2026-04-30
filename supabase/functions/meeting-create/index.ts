import { handle, HttpError } from "../_shared/util.ts";

Deno.serve((req) => handle(req, async (ctx, body) => {
  const { relationship_id, meeting_date, summary, spiritual_notes, next_steps } = body as {
    relationship_id: string; meeting_date?: string; summary?: string;
    spiritual_notes?: string; next_steps?: string;
  };
  if (!relationship_id) throw new HttpError("relationship_id required");

  const { data, error } = await ctx.supabaseUser
    .from("meetings")
    .insert({
      relationship_id,
      meeting_date: meeting_date ?? new Date().toISOString(),
      summary: summary ?? null,
      spiritual_notes: spiritual_notes ?? null,
      next_steps: next_steps ?? null,
      created_by: ctx.userId,
    })
    .select()
    .maybeSingle();
  if (error) throw new HttpError(error.message);
  return data;
}));
