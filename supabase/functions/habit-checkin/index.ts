import { handle, HttpError } from "../_shared/util.ts";

Deno.serve((req) => handle(req, async (ctx, body) => {
  const { habit_id, note } = body as { habit_id: string; note?: string };
  if (!habit_id) throw new HttpError("habit_id required");
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await ctx.supabaseUser
    .from("habit_checkins")
    .upsert({ habit_id, user_id: ctx.userId, checkin_date: today, note: note ?? null }, { onConflict: "habit_id,checkin_date" })
    .select()
    .maybeSingle();
  if (error) throw new HttpError(error.message);
  return data;
}));
