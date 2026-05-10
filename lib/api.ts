/**
 * Universal data API client — bypasses RLS issues by going through API routes
 * with the supabase service role.
 *
 * Usage:
 *   const { ok, error, data } = await api("announcement:create", { titre: "..." });
 */
export async function api<T = any>(
  action: string,
  payload?: any
): Promise<{ ok: boolean; error?: string; data?: T }> {
  try {
    const r = await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload: payload || {} }),
    });
    const json = await r.json();
    if (!r.ok) {
      return { ok: false, error: json.error || `HTTP ${r.status}` };
    }
    return { ok: true, data: json.data };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Network error" };
  }
}
