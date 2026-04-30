import { supabase } from "@/integrations/supabase/client";

/**
 * Invoke an edge function with the user's auth token.
 * All write operations in the app go through this helper.
 */
export async function invoke<T = unknown>(
  name: string,
  body?: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    // Try to extract meaningful error from edge function response
    const message =
      (data as { error?: string } | null)?.error ||
      error.message ||
      "Request failed";
    throw new Error(message);
  }
  if (data && typeof data === "object" && "error" in (data as object)) {
    throw new Error((data as { error: string }).error);
  }
  return data as T;
}
