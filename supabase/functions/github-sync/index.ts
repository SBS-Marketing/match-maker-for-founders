import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
const repoDefault = "SBS-Marketing/match-maker-for-founders"

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405)

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  const githubToken = Deno.env.get("GITHUB_TOKEN")
  const hermesUrl = Deno.env.get("HERMES_WEBHOOK_URL")
  const hermesSecret = Deno.env.get("HERMES_WEBHOOK_SECRET")
  if (!serviceKey || !githubToken || !hermesUrl || !hermesSecret) {
    return json({ error: "sync_not_configured" }, 500)
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey)
  const body = await req.json().catch(() => null)
  const taskId = body?.task_id
  if (typeof taskId !== "string") return json({ error: "task_id_required" }, 400)

  const { data: task, error: taskError } = await supabase
    .from("admin_tasks")
    .select("id,title,board_column,assignee_id,assignee_name,github_repo,github_issue_number,github_url,github_state,github_labels")
    .eq("id", taskId)
    .single()
  if (taskError || !task) return json({ error: taskError?.message ?? "task_not_found" }, 404)

  // Eine Hermes-Zuweisung wird sofort im Kanban übernommen: Inbox → In Arbeit.
  // Die interne Zuweisung bleibt maßgeblich; andere Assignees werden nicht angefasst.
  const effectiveColumn = task.assignee_name === "Hermes" && task.board_column === "inbox"
    ? "doing"
    : task.board_column
  if (effectiveColumn !== task.board_column) {
    const { error: moveError } = await supabase.from("admin_tasks").update({ board_column: effectiveColumn }).eq("id", task.id)
    if (moveError) return json({ error: "kanban_move_failed", detail: moveError.message }, 500)
  }

  const repo = task.github_repo || repoDefault
  const [owner, name] = repo.split("/")
  if (!owner || !name) return json({ error: "invalid_repo" }, 400)
  const headers = {
    Authorization: `Bearer ${githubToken}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "matchfoundr-admin-sync",
    "Content-Type": "application/json",
  }

  let issueNumber = task.github_issue_number as number | null
  let issueUrl = task.github_url as string | null
  let action = "updated"
  if (!issueNumber) {
    const created = await fetch(`https://api.github.com/repos/${owner}/${name}/issues`, {
      method: "POST", headers,
      body: JSON.stringify({ title: task.title, body: `Created from the matchfoundr Admin-Kanban.\n\nSupabase task: ${task.id}`, labels: ["board", "Status: Offen"] }),
    })
    if (!created.ok) return json({ error: "github_create_failed", detail: await created.text() }, 502)
    const issue = await created.json()
    issueNumber = issue.number
    issueUrl = issue.html_url
    action = "created"
  } else {
    const patched = await fetch(`https://api.github.com/repos/${owner}/${name}/issues/${issueNumber}`, {
      method: "PATCH", headers,
      body: JSON.stringify({ title: task.title, state: task.github_state === "closed" || effectiveColumn === "done" ? "closed" : "open" }),
    })
    if (!patched.ok) return json({ error: "github_update_failed", detail: await patched.text() }, 502)
  }

  const labels = ["board", statusLabel(effectiveColumn)]
  const labelsRes = await fetch(`https://api.github.com/repos/${owner}/${name}/issues/${issueNumber}/labels`, {
    method: "PUT", headers, body: JSON.stringify({ labels }),
  })
  if (!labelsRes.ok) return json({ error: "github_labels_failed", detail: await labelsRes.text() }, 502)

  const now = new Date().toISOString()
  const { error: updateError } = await supabase.from("admin_tasks").update({
    github_repo: repo, github_issue_number: issueNumber, github_url: issueUrl,
    github_state: effectiveColumn === "done" ? "closed" : "open", github_labels: labels, github_synced_at: now,
  }).eq("id", task.id)
  if (updateError) return json({ error: "kanban_update_failed", detail: updateError.message }, 500)

  const payload = JSON.stringify({ event_type: "kanban_assignment", task_id: task.id, title: task.title, assignee_name: task.assignee_name, board_column: effectiveColumn, github_repo: repo, github_issue_number: issueNumber, github_url: issueUrl })
  if (task.assignee_name === "Hermes") {
    const signature = await hmac(payload, hermesSecret)
    const delivered = await fetch(hermesUrl, { method: "POST", headers: { "Content-Type": "application/json", "X-Hub-Signature-256": signature, "X-Event-Type": "kanban_assignment" }, body: payload })
    if (!delivered.ok) return json({ error: "hermes_delivery_failed", detail: await delivered.text() }, 502)
  }
  return json({ ok: true, action, issue_number: issueNumber, issue_url: issueUrl, hermes_triggered: task.assignee_name === "Hermes" })
})

function statusLabel(column: string): string {
  return ({ inbox: "Status: Offen", doing: "Status: In Arbeit", review: "Status: Review", done: "Status: Fertig" } as Record<string, string>)[column] || "Status: Offen"
}
async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)))
  return `sha256=${Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")}`
}
function json(value: unknown, status = 200) { return new Response(JSON.stringify(value), { status, headers: { ...cors, "Content-Type": "application/json" } }) }
