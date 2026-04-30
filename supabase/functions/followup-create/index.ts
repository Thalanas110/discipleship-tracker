import { handle, HttpError } from "../_shared/util.ts";

Deno.serve((req) => handle(req, async (ctx, body) => {
  const { relationship_id, task, due_date } = body as {
    relationship_id: string; task: string; due_date?: string;
  };
  if (!relationship_id || !task) throw new HttpError("relationship_id and task required");

  const { data, error } = await ctx.supabaseUser
    .from("follow_ups")
    .insert({
      relationship_id,
      task,
      due_date: due_date ?? null,
      created_by: ctx.userId,
    })
    .select()
    .maybeSingle();
  if (error) throw new HttpError(error.message);
  return data;
}));
