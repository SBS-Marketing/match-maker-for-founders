export function edgeFunctionUrl(functionName: string, path = ""): string {
  const configuredBase = import.meta.env.VITE_SUPABASE_EDGE_FUNCTION_URL as string | undefined;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const base = (
    configuredBase?.trim() || (supabaseUrl ? `${supabaseUrl}/functions/v1` : "")
  ).replace(/\/+$/, "");
  const suffix = path ? `/${path.replace(/^\/+/, "")}` : "";

  return `${base}/${functionName}${suffix}`;
}

export function edgeFunctionHeaders(accessToken?: string): Record<string, string> {
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (anonKey) headers.apikey = anonKey;
  if (accessToken || anonKey) headers.Authorization = `Bearer ${accessToken || anonKey}`;

  return headers;
}
