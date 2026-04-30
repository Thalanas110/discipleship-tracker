import { handle, HttpError } from "../_shared/util.ts";

Deno.serve((req) => handle(req, async (ctx, body) => {
  const { title, description, visibility } = body as { title: string; description?: string; visibility?: string };
  if (!title) throw new HttpError("title required");
  const { data, error } = await ctx.supabaseUser
    .from("prayer_requests")
    .insert({ user_id: ctx.userId, title, description: description ?? null, visibility: visibility ?? "private" })
    .select()
    .maybeSingle();
  if (error) throw new HttpError(error.message);
  return data;
}));
