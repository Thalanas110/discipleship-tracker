import { handle, HttpError } from "../_shared/util.ts";

Deno.serve((req) => handle(req, async (ctx, body) => {
  const { group_id, member_id } = body as { group_id: string; member_id: string };
  if (!group_id || !member_id) throw new HttpError("group_id and member_id required");
  const { data, error } = await ctx.supabaseUser
    .from("group_members")
    .insert({ group_id, member_id })
    .select()
    .maybeSingle();
  if (error && !error.message.includes("duplicate")) throw new HttpError(error.message);
  return data ?? { ok: true };
}));
