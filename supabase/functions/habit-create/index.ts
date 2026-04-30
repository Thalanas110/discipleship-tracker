import { handle, HttpError } from "../_shared/util.ts";

Deno.serve((req) => handle(req, async (ctx, body) => {
  const { name, type, frequency } = body as { name: string; type?: string; frequency?: string };
  if (!name) throw new HttpError("name required");
  const { data, error } = await ctx.supabaseUser
    .from("habits")
    .insert({ user_id: ctx.userId, name, type: type ?? null, frequency: frequency ?? "daily" })
    .select()
    .maybeSingle();
  if (error) throw new HttpError(error.message);
  return data;
}));
