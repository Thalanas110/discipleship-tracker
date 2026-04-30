import { handle, HttpError } from "../_shared/util.ts";

Deno.serve((req) => handle(req, async (ctx, body) => {
  const { id } = body as { id: string };
  if (!id) throw new HttpError("id required");
  const { error } = await ctx.supabaseUser.from("habits").delete().eq("id", id);
  if (error) throw new HttpError(error.message);
  return { ok: true };
}));
