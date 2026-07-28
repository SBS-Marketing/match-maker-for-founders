export function edgeFunctionUrl(functionName: string, path = ""): string {
  const fallbackSupabaseUrl = "https://rzmcoxnfcpqqyxgkafwk.supabase.co";
  const configuredBase = import.meta.env.VITE_SUPABASE_EDGE_FUNCTION_URL as string | undefined;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const base = (
    configuredBase?.trim() ||
    `${(supabaseUrl || fallbackSupabaseUrl).replace(/\/+$/, "")}/functions/v1`
  ).replace(/\/+$/, "");
  const suffix = path ? `/${path.replace(/^\/+/, "")}` : "";

  return `${base}/${functionName}${suffix}`;
}

export function edgeFunctionHeaders(accessToken?: string): Record<string, string> {
  const fallbackAnonKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6bWNveG5mY3BxcXl4Z2thZndrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NTk1MzAsImV4cCI6MjEwMDIzNTUzMH0.9hT70TrLAQks_m3ZUmoH8daRRhHyZ-kP50_-5kIgea0";
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
  const apiKey = anonKey || fallbackAnonKey;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  headers.apikey = apiKey;
  headers.Authorization = `Bearer ${accessToken || apiKey}`;

  return headers;
}
