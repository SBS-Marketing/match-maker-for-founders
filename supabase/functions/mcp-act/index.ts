// matchfoundr · MCP action executor
//
// POST { action:"slack_post", channel_id, channel, text }
// POST { action:"gmail_send", to, subject, body }
// Executes external writes only after a user-confirmed client action.

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type SlackChannel = {
  id: string;
  name: string;
};

type SlackPostResult = {
  ok?: boolean;
  error?: string;
  channel?: string;
  ts?: string;
};

function supabase() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanChannelName(value: string): string {
  return value.trim().replace(/^#/, "").toLowerCase();
}

function publicError(error: unknown): string {
  return error instanceof Error ? error.message : String(error || "unknown_error");
}

async function auditAction(
  db: ReturnType<typeof supabase>,
  row: {
    user_id: string;
    connector_id: string;
    action: string;
    target?: string;
    status: "success" | "error" | "blocked";
    request?: Record<string, unknown>;
    response?: Record<string, unknown>;
    error?: string;
  },
) {
  const { error } = await db.from("mcp_action_logs").insert({
    user_id: row.user_id,
    connector_id: row.connector_id,
    action: row.action,
    target: row.target ?? null,
    status: row.status,
    request: row.request ?? {},
    response: row.response ?? {},
    error: row.error ?? null,
  });
  if (error) console.warn("mcp-act audit failed:", error.message);
}

async function recentActionCount(
  db: ReturnType<typeof supabase>,
  userID: string,
  connectorID: string,
): Promise<number> {
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { count, error } = await db
    .from("mcp_action_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userID)
    .eq("connector_id", connectorID)
    .gte("created_at", since);
  if (error) {
    console.warn("mcp-act rate-limit read failed:", error.message);
    return 0;
  }
  return count ?? 0;
}

async function freshGoogleAccessToken(
  db: ReturnType<typeof supabase>,
  userID: string,
): Promise<string | null> {
  const { data: row } = await db
    .from("account_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userID)
    .eq("provider", "gmail")
    .maybeSingle();
  if (!row?.access_token) return null;

  const validUntil = row.expires_at ? new Date(row.expires_at).getTime() : 0;
  if (validUntil > Date.now() + 60_000 || !row.refresh_token) return row.access_token;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID") || "",
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") || "",
      refresh_token: row.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const tokens = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  const accessToken = str(tokens.access_token);
  if (!response.ok || !accessToken) return null;

  const expiresIn = typeof tokens.expires_in === "number" ? tokens.expires_in : 3600;
  await db
    .from("account_tokens")
    .update({
      access_token: accessToken,
      expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userID)
    .eq("provider", "gmail");
  return accessToken;
}

function base64URL(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function isEmail(value: string): boolean {
  return /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(value);
}

async function sendGmail(
  accessToken: string,
  to: string,
  subject: string,
  body: string,
): Promise<{ id?: string; threadId?: string }> {
  const safeSubject = subject.replace(/[\r\n]+/g, " ").trim();
  const message = [
    `To: ${to}`,
    `Subject: ${safeSubject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    body,
  ].join("\r\n");
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: base64URL(message) }),
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const apiError =
      data.error && typeof data.error === "object"
        ? str((data.error as Record<string, unknown>).message)
        : "";
    throw new Error(apiError || `gmail_http_${response.status}`);
  }
  return {
    id: str(data.id) || undefined,
    threadId: str(data.threadId) || undefined,
  };
}

async function slackFetch(accessToken: string, url: URL, init: RequestInit = {}): Promise<unknown> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  const res = await fetch(url, {
    ...init,
    headers,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`slack_http_${res.status}`);
  return data;
}

async function loadSlackChannels(accessToken: string): Promise<SlackChannel[]> {
  const channels: SlackChannel[] = [];
  let cursor = "";
  for (let page = 0; page < 3; page += 1) {
    const url = new URL("https://slack.com/api/conversations.list");
    url.searchParams.set("limit", "200");
    url.searchParams.set("types", "public_channel");
    url.searchParams.set("exclude_archived", "true");
    if (cursor) url.searchParams.set("cursor", cursor);
    const data = await slackFetch(accessToken, url);
    const input = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
    if (input.ok !== true) throw new Error(str(input.error) || "slack_channels_failed");
    const rows = Array.isArray(input.channels) ? (input.channels as Record<string, unknown>[]) : [];
    for (const row of rows) {
      const id = str(row.id);
      const name = str(row.name);
      if (id && name) channels.push({ id, name });
    }
    const metadata =
      input.response_metadata && typeof input.response_metadata === "object"
        ? (input.response_metadata as Record<string, unknown>)
        : {};
    cursor = str(metadata.next_cursor);
    if (!cursor) break;
  }
  return channels;
}

async function resolveSlackChannel(
  accessToken: string,
  channelID: string,
  channelName: string,
): Promise<SlackChannel | null> {
  const channels = await loadSlackChannels(accessToken);
  if (channelID) {
    return channels.find((channel) => channel.id === channelID) ?? null;
  }
  const cleanName = cleanChannelName(channelName);
  if (!cleanName) return null;
  return channels.find((channel) => cleanChannelName(channel.name) === cleanName) ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const db = supabase();
  const authHeader = req.headers.get("Authorization") || "";
  const {
    data: { user },
  } = await db.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!user) return json({ error: "unauthorized" }, 401);

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = str(body.action);
  if (action === "capabilities") {
    return json({ ok: true, actions: ["slack_post", "gmail_send"] });
  }
  if (action === "gmail_send") {
    const to = str(body.to).toLowerCase();
    const subject = str(body.subject);
    const messageBody = str(body.body) || str(body.text) || str(body.message);
    const auditRequest = {
      to,
      subject_preview: subject.slice(0, 180),
      body_preview: messageBody.slice(0, 240),
      body_length: messageBody.length,
    };

    if (
      !isEmail(to) ||
      !subject ||
      subject.length > 180 ||
      !messageBody ||
      messageBody.length > 20_000
    ) {
      await auditAction(db, {
        user_id: user.id,
        connector_id: "gmail",
        action,
        target: to,
        status: "blocked",
        request: auditRequest,
        error: "invalid_email_draft",
      });
      return json(
        {
          error: "invalid_email_draft",
          message: "Empfänger, Betreff oder Nachricht sind nicht versandbereit.",
        },
        400,
      );
    }

    if ((await recentActionCount(db, user.id, "gmail")) >= 12) {
      await auditAction(db, {
        user_id: user.id,
        connector_id: "gmail",
        action,
        target: to,
        status: "blocked",
        request: auditRequest,
        error: "rate_limited",
      });
      return json({ error: "rate_limited", message: "Zu viele E-Mails in kurzer Zeit." }, 429);
    }

    const { data: connection } = await db
      .from("connected_accounts")
      .select("status")
      .eq("user_id", user.id)
      .eq("provider", "gmail")
      .maybeSingle();
    if (connection?.status !== "connected") {
      await auditAction(db, {
        user_id: user.id,
        connector_id: "gmail",
        action,
        target: to,
        status: "blocked",
        request: auditRequest,
        error: "gmail_not_connected",
      });
      return json({ error: "gmail_not_connected", message: "Gmail ist nicht verbunden." }, 409);
    }

    const accessToken = await freshGoogleAccessToken(db, user.id);
    if (!accessToken) {
      return json(
        { error: "gmail_token_missing", message: "Die Gmail-Verbindung muss erneuert werden." },
        409,
      );
    }

    try {
      const sent = await sendGmail(accessToken, to, subject, messageBody);
      const response = {
        ok: true,
        action,
        connector_id: "gmail",
        to,
        message_id: sent.id ?? null,
        thread_id: sent.threadId ?? null,
      };
      await auditAction(db, {
        user_id: user.id,
        connector_id: "gmail",
        action,
        target: to,
        status: "success",
        request: auditRequest,
        response,
      });
      return json(response);
    } catch (error) {
      const message = publicError(error);
      await auditAction(db, {
        user_id: user.id,
        connector_id: "gmail",
        action,
        target: to,
        status: "error",
        request: auditRequest,
        error: message,
      });
      return json({ error: "gmail_send_failed", message }, 502);
    }
  }

  if (action !== "slack_post") return json({ error: "unsupported_action" }, 400);

  const text = str(body.text) || str(body.message);
  const channelID = str(body.channel_id) || str(body.channelId);
  const channelName = str(body.channel) || str(body.channel_name) || str(body.channelName);
  const auditRequest = {
    channel_id: channelID,
    channel: channelName,
    text_preview: text.slice(0, 240),
    text_length: text.length,
  };

  if (!text || text.length > 2_000) {
    await auditAction(db, {
      user_id: user.id,
      connector_id: "slack",
      action,
      target: channelID || channelName,
      status: "blocked",
      request: auditRequest,
      error: "invalid_text",
    });
    return json({ error: "invalid_text", message: "Slack-Text fehlt oder ist zu lang." }, 400);
  }

  if ((await recentActionCount(db, user.id, "slack")) >= 20) {
    await auditAction(db, {
      user_id: user.id,
      connector_id: "slack",
      action,
      target: channelID || channelName,
      status: "blocked",
      request: auditRequest,
      error: "rate_limited",
    });
    return json({ error: "rate_limited", message: "Zu viele Slack-Aktionen in kurzer Zeit." }, 429);
  }

  const { data: connection } = await db
    .from("mcp_connections")
    .select("status")
    .eq("user_id", user.id)
    .eq("connector_id", "slack")
    .maybeSingle();
  if (connection?.status !== "connected") {
    await auditAction(db, {
      user_id: user.id,
      connector_id: "slack",
      action,
      target: channelID || channelName,
      status: "blocked",
      request: auditRequest,
      error: "slack_not_connected",
    });
    return json({ error: "slack_not_connected", message: "Slack ist nicht verbunden." }, 409);
  }

  const { data: tokenRow } = await db
    .from("mcp_oauth_tokens")
    .select("access_token")
    .eq("user_id", user.id)
    .eq("connector_id", "slack")
    .maybeSingle();
  const accessToken = str(tokenRow?.access_token);
  if (!accessToken) return json({ error: "slack_token_missing" }, 409);

  try {
    const channel = await resolveSlackChannel(accessToken, channelID, channelName);
    if (!channel) {
      await auditAction(db, {
        user_id: user.id,
        connector_id: "slack",
        action,
        target: channelID || channelName,
        status: "blocked",
        request: auditRequest,
        error: "unknown_channel",
      });
      return json(
        { error: "unknown_channel", message: "Der Slack-Channel wurde nicht gefunden." },
        400,
      );
    }

    const postURL = new URL("https://slack.com/api/chat.postMessage");
    const postData = (await slackFetch(accessToken, postURL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ channel: channel.id, text }),
    })) as SlackPostResult;
    if (postData.ok !== true) throw new Error(postData.error || "slack_post_failed");

    const response = {
      ok: true,
      action: "slack_post",
      connector_id: "slack",
      channel_id: channel.id,
      channel: `#${channel.name}`,
      message_ts: postData.ts ?? null,
    };
    await auditAction(db, {
      user_id: user.id,
      connector_id: "slack",
      action,
      target: channel.id,
      status: "success",
      request: auditRequest,
      response,
    });
    return json(response);
  } catch (error) {
    const message = publicError(error);
    await auditAction(db, {
      user_id: user.id,
      connector_id: "slack",
      action,
      target: channelID || channelName,
      status: "error",
      request: auditRequest,
      error: message,
    });
    return json({ error: "slack_post_failed", message }, 502);
  }
});
