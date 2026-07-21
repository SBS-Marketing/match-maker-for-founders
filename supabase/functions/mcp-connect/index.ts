// matchfoundr · MCP connector OAuth hub
//
// POST { action:"connect", connector_id, returnTo } -> { url } or direct status
// POST { action:"disconnect", connector_id }         -> deletes connection/tokens
// POST { action:"list" }                             -> user's connector status
// GET  ?code=&state=                                 -> OAuth callback

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type ConnectorID =
  | "authorities"
  | "google_drive"
  | "notion"
  | "slack"
  | "github"
  | "commerce"
  | "accounting"
  | "google_business";

type ConnectorMode = "builtin" | "oauth" | "setup_required";

type ConnectorSpec = {
  id: ConnectorID;
  label: string;
  mode: ConnectorMode;
  scopes: string[];
  capabilities: string[];
};

type OAuthTokens = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  account_label?: string;
  metadata?: Record<string, unknown>;
};

const connectorSpecs: Record<ConnectorID, ConnectorSpec> = {
  authorities: {
    id: "authorities",
    label: "Web, Kammern & Aemter",
    mode: "builtin",
    scopes: ["public_web_research"],
    capabilities: ["sources", "authority_contacts", "requirements"],
  },
  google_drive: {
    id: "google_drive",
    label: "Google Drive & Docs",
    mode: "oauth",
    scopes: [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/drive.readonly",
    ],
    capabilities: ["drive_files", "docs_context", "pdf_context"],
  },
  notion: {
    id: "notion",
    label: "Notion Wissen",
    mode: "oauth",
    scopes: [],
    capabilities: ["notion_search", "workspace_context", "checklists"],
  },
  slack: {
    id: "slack",
    label: "Slack Team",
    mode: "oauth",
    scopes: ["channels:read", "channels:history", "chat:write", "team:read", "users:read"],
    capabilities: ["team_briefing", "broadcast_drafts", "channel_context"],
  },
  github: {
    id: "github",
    label: "GitHub & Website-Code",
    mode: "oauth",
    scopes: ["read:user", "user:email", "repo"],
    capabilities: ["repos", "issues", "website_code"],
  },
  commerce: {
    id: "commerce",
    label: "Shopify/WooCommerce",
    mode: "setup_required",
    scopes: [],
    capabilities: ["products", "orders", "customers"],
  },
  accounting: {
    id: "accounting",
    label: "Buchhaltung",
    mode: "setup_required",
    scopes: [],
    capabilities: ["receipts", "invoices", "cashflow"],
  },
  google_business: {
    id: "google_business",
    label: "Google Business",
    mode: "oauth",
    scopes: [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/business.manage",
    ],
    capabilities: ["business_profile", "reviews", "local_visibility"],
  },
};

function supabase() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

function functionURL(): string {
  return `${Deno.env.get("SUPABASE_URL")!}/functions/v1/mcp-connect`;
}

function defaultReturnTo(appURL: string): string {
  return `${appURL.replace(/\/$/, "")}/profile`;
}

function safeReturnTo(value: string | null | undefined, appURL: string): string {
  if (!value) return defaultReturnTo(appURL);
  try {
    const url = new URL(value);
    if (url.protocol === "matchfoundr:" && url.host === "integration-callback") {
      return "matchfoundr://integration-callback";
    }

    const app = new URL(appURL);
    const allowedWebOrigins = new Set([
      app.origin,
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ]);
    if (
      (url.protocol === "https:" || url.protocol === "http:") &&
      allowedWebOrigins.has(url.origin)
    ) {
      return url.toString();
    }
  } catch {
    // Invalid redirects fall back to the app URL.
  }
  return defaultReturnTo(appURL);
}

function redirectWithOutcome(returnTo: string, outcome: string, connectorID?: string): Response {
  const target = new URL(returnTo);
  target.searchParams.set("connect", outcome);
  target.searchParams.set("kind", "mcp");
  if (connectorID) target.searchParams.set("provider", connectorID);
  return Response.redirect(target.toString(), 302);
}

async function hmacKey(): Promise<CryptoKey> {
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!.slice(0, 32);
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function signState(payload: Record<string, string>): Promise<string> {
  const data = btoa(JSON.stringify(payload));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(), new TextEncoder().encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).slice(0, 24);
  return `${data}.${sigB64}`;
}

async function verifyState(state: string): Promise<Record<string, string> | null> {
  const [data, sig] = state.split(".");
  if (!data || !sig) return null;
  const expected = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(),
    new TextEncoder().encode(data),
  );
  const expectedB64 = btoa(String.fromCharCode(...new Uint8Array(expected))).slice(0, 24);
  if (expectedB64 !== sig) return null;
  try {
    return JSON.parse(atob(data));
  } catch {
    return null;
  }
}

function clientSecrets(connectorID: ConnectorID): { clientID?: string; clientSecret?: string } {
  switch (connectorID) {
    case "google_drive":
    case "google_business":
      return {
        clientID: Deno.env.get("GOOGLE_CLIENT_ID"),
        clientSecret: Deno.env.get("GOOGLE_CLIENT_SECRET"),
      };
    case "github":
      return {
        clientID: Deno.env.get("GITHUB_CLIENT_ID"),
        clientSecret: Deno.env.get("GITHUB_CLIENT_SECRET"),
      };
    case "slack":
      return {
        clientID: Deno.env.get("SLACK_CLIENT_ID"),
        clientSecret: Deno.env.get("SLACK_CLIENT_SECRET"),
      };
    case "notion":
      return {
        clientID: Deno.env.get("NOTION_CLIENT_ID"),
        clientSecret: Deno.env.get("NOTION_CLIENT_SECRET"),
      };
    default:
      return {};
  }
}

function oauthURL(connectorID: ConnectorID, state: string): string {
  const spec = connectorSpecs[connectorID];
  const { clientID } = clientSecrets(connectorID);
  if (!clientID) throw new Error(`${connectorID} OAuth client missing`);

  if (connectorID === "github") {
    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", clientID);
    url.searchParams.set("redirect_uri", functionURL());
    url.searchParams.set("scope", spec.scopes.join(" "));
    url.searchParams.set("state", state);
    return url.toString();
  }

  if (connectorID === "slack") {
    const url = new URL("https://slack.com/oauth/v2/authorize");
    url.searchParams.set("client_id", clientID);
    url.searchParams.set("redirect_uri", functionURL());
    url.searchParams.set("scope", spec.scopes.join(","));
    url.searchParams.set("state", state);
    return url.toString();
  }

  if (connectorID === "notion") {
    const url = new URL("https://api.notion.com/v1/oauth/authorize");
    url.searchParams.set("client_id", clientID);
    url.searchParams.set("redirect_uri", functionURL());
    url.searchParams.set("response_type", "code");
    url.searchParams.set("owner", "user");
    url.searchParams.set("state", state);
    return url.toString();
  }

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientID);
  url.searchParams.set("redirect_uri", functionURL());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", spec.scopes.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

async function exchangeOAuthCode(connectorID: ConnectorID, code: string): Promise<OAuthTokens> {
  const { clientID, clientSecret } = clientSecrets(connectorID);
  if (!clientID || !clientSecret) throw new Error(`${connectorID} OAuth secrets missing`);

  if (connectorID === "github") {
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientID,
        client_secret: clientSecret,
        code,
        redirect_uri: functionURL(),
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.access_token)
      throw new Error(data.error_description || "GitHub token failed");
    const label = await githubLabel(data.access_token);
    return {
      access_token: data.access_token,
      token_type: data.token_type,
      scope: data.scope,
      account_label: label,
      metadata: { scope: data.scope },
    };
  }

  if (connectorID === "slack") {
    const res = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientID,
        client_secret: clientSecret,
        code,
        redirect_uri: functionURL(),
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok || !data.access_token) {
      throw new Error(data.error || "Slack token failed");
    }
    return {
      access_token: data.access_token,
      token_type: data.token_type,
      scope: data.scope,
      account_label: data.team?.name || "Slack Workspace",
      metadata: {
        team_id: data.team?.id,
        team_name: data.team?.name,
        bot_user_id: data.bot_user_id,
      },
    };
  }

  if (connectorID === "notion") {
    const res = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${clientID}:${clientSecret}`)}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: functionURL(),
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.access_token) throw new Error(data.message || "Notion token failed");
    return {
      access_token: data.access_token,
      token_type: data.token_type,
      account_label: data.workspace_name || "Notion Workspace",
      metadata: {
        workspace_id: data.workspace_id,
        workspace_name: data.workspace_name,
        owner: data.owner,
      },
    };
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientID,
      client_secret: clientSecret,
      redirect_uri: functionURL(),
      grant_type: "authorization_code",
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || "Google token failed");
  }
  const label = await googleLabel(data.access_token);
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    token_type: data.token_type,
    scope: data.scope,
    account_label: label,
    metadata: { scope: data.scope },
  };
}

async function googleLabel(accessToken: string): Promise<string | undefined> {
  try {
    const info = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => r.json());
    return info?.email || undefined;
  } catch {
    return undefined;
  }
}

async function githubLabel(accessToken: string): Promise<string | undefined> {
  try {
    const info = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "matchfoundr",
      },
    }).then((r) => r.json());
    return info?.login || undefined;
  } catch {
    return undefined;
  }
}

async function saveConnection(userID: string, connectorID: ConnectorID, tokens: OAuthTokens) {
  const db = supabase();
  const spec = connectorSpecs[connectorID];
  const now = new Date().toISOString();
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  await db.from("mcp_oauth_tokens").upsert(
    {
      user_id: userID,
      connector_id: connectorID,
      access_token: tokens.access_token,
      ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
      token_type: tokens.token_type ?? null,
      scope: tokens.scope ?? spec.scopes.join(" "),
      expires_at: expiresAt,
      metadata: tokens.metadata ?? {},
      updated_at: now,
    },
    { onConflict: "user_id,connector_id" },
  );

  await db.from("mcp_connections").upsert(
    {
      user_id: userID,
      connector_id: connectorID,
      status: "connected",
      account_label: tokens.account_label ?? spec.label,
      scopes: spec.scopes,
      capabilities: { tools: spec.capabilities },
      metadata: { note: `${spec.label} verbunden`, ...(tokens.metadata ?? {}) },
      connected_at: now,
      updated_at: now,
    },
    { onConflict: "user_id,connector_id" },
  );
}

async function saveBuiltinConnection(userID: string, connectorID: ConnectorID) {
  const spec = connectorSpecs[connectorID];
  const now = new Date().toISOString();
  await supabase()
    .from("mcp_connections")
    .upsert(
      {
        user_id: userID,
        connector_id: connectorID,
        status: "connected",
        account_label: "Live-Recherche aktiv",
        scopes: spec.scopes,
        capabilities: { tools: spec.capabilities },
        metadata: { note: "Ohne OAuth nutzbar" },
        connected_at: now,
        updated_at: now,
      },
      { onConflict: "user_id,connector_id" },
    );
}

async function saveSetupRequired(userID: string, connectorID: ConnectorID) {
  const spec = connectorSpecs[connectorID];
  await supabase()
    .from("mcp_connections")
    .upsert(
      {
        user_id: userID,
        connector_id: connectorID,
        status: "setup_required",
        account_label: "Provider-Auswahl/API-Zugang fehlt",
        scopes: spec.scopes,
        capabilities: { tools: spec.capabilities },
        metadata: {
          note:
            connectorID === "commerce"
              ? "Shopify/WooCommerce braucht Shop-Domain plus App-Zugang."
              : "Buchhaltung braucht konkreten Anbieter wie Lexoffice, Sevdesk oder DATEV.",
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,connector_id" },
    );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const appURL = Deno.env.get("APP_URL") || "https://matchfoundr.de";
  const url = new URL(req.url);

  if (req.method === "GET" && url.searchParams.has("code")) {
    const state = await verifyState(url.searchParams.get("state") || "");
    const connectorID = state?.connector_id as ConnectorID | undefined;
    const returnTo = safeReturnTo(state?.return_to, appURL);
    if (!state?.user_id || !connectorID || !connectorSpecs[connectorID]) {
      return redirectWithOutcome(defaultReturnTo(appURL), "invalid", connectorID);
    }

    try {
      const tokens = await exchangeOAuthCode(connectorID, url.searchParams.get("code")!);
      await saveConnection(state.user_id, connectorID, tokens);
      return redirectWithOutcome(returnTo, "ok", connectorID);
    } catch (err) {
      console.error("mcp-connect callback:", err);
      return redirectWithOutcome(returnTo, "error", connectorID);
    }
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization") || "";
  const {
    data: { user },
  } = await supabase().auth.getUser(authHeader.replace("Bearer ", ""));
  if (!user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = (await req.json().catch(() => ({}))) as {
    connector_id?: ConnectorID;
    action?: "connect" | "disconnect" | "list";
    return_to?: string;
    returnTo?: string;
  };
  const action = body.action ?? "connect";

  if (action === "list") {
    const { data } = await supabase()
      .from("mcp_connections")
      .select(
        "connector_id,status,account_label,scopes,capabilities,metadata,connected_at,updated_at",
      )
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    return new Response(JSON.stringify({ ok: true, connections: data ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const connectorID = body.connector_id;
  if (!connectorID || !connectorSpecs[connectorID]) {
    return new Response(JSON.stringify({ error: "unknown_connector" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (action === "disconnect") {
    await Promise.all([
      supabase()
        .from("mcp_connections")
        .delete()
        .eq("user_id", user.id)
        .eq("connector_id", connectorID),
      supabase()
        .from("mcp_oauth_tokens")
        .delete()
        .eq("user_id", user.id)
        .eq("connector_id", connectorID),
    ]);
    return new Response(JSON.stringify({ ok: true, status: "disconnected" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const spec = connectorSpecs[connectorID];
  if (spec.mode === "builtin") {
    await saveBuiltinConnection(user.id, connectorID);
    return new Response(
      JSON.stringify({
        ok: true,
        status: "connected",
        message: `${spec.label} ist aktiv. Kein externer Login noetig.`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (spec.mode === "setup_required") {
    await saveSetupRequired(user.id, connectorID);
    return new Response(
      JSON.stringify({
        ok: false,
        status: "setup_required",
        message: `${spec.label} braucht noch einen konkreten Anbieter-Zugang, bevor OAuth live ist.`,
      }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const secrets = clientSecrets(connectorID);
  if (!secrets.clientID || !secrets.clientSecret) {
    await saveSetupRequired(user.id, connectorID);
    return new Response(
      JSON.stringify({
        ok: false,
        status: "setup_required",
        message: `${spec.label}: OAuth-Secrets fehlen in Supabase.`,
      }),
      { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const returnTo = safeReturnTo(body.return_to || body.returnTo, appURL);
  const state = await signState({
    user_id: user.id,
    connector_id: connectorID,
    return_to: returnTo,
    ts: String(Date.now()),
  });

  return new Response(JSON.stringify({ ok: true, url: oauthURL(connectorID, state) }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
