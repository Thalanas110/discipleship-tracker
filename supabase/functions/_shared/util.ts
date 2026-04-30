// Shared helpers for edge functions
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

export function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

export interface AuthContext {
  userId: string;
  supabaseUser: SupabaseClient; // user-scoped (RLS-respecting)
  supabaseAdmin: SupabaseClient; // service-role (use carefully)
}

export async function requireAuth(req: Request): Promise<AuthContext> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new HttpError("Unauthorized", 401);
  }
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabaseUser.auth.getUser(token);
  if (error || !data?.user) throw new HttpError("Unauthorized", 401);

  const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE);
  return { userId: data.user.id, supabaseUser, supabaseAdmin };
}

export class HttpError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function hasAnyRole(admin: SupabaseClient, userId: string, roles: string[]): Promise<boolean> {
  const { data, error } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", roles);
  if (error) return false;
  return (data?.length ?? 0) > 0;
}

export function handle(req: Request, fn: (ctx: AuthContext, body: any) => Promise<unknown>) {
  return (async () => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    try {
      const ctx = await requireAuth(req);
      const body = req.method === "GET" ? {} : await req.json().catch(() => ({}));
      const result = await fn(ctx, body);
      return jsonResponse(result ?? { ok: true });
    } catch (e) {
      const err = e as HttpError;
      console.error("Edge function error:", err.message, err.stack);
      return errorResponse(err.message || "Internal error", err.status || 500);
    }
  })();
}
