// GitHub API Proxy — Token bleibt server-seitig, nie im Browser
export default async (request: Request) => {
  const token = Deno.env.get("GITHUB_TOKEN");
  if (!token) {
    return new Response(JSON.stringify({ error: "GITHUB_TOKEN not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(request.url);
  // /api/github/repos/... → https://api.github.com/repos/...
  const ghPath = url.pathname.replace("/api/github", "");
  const ghUrl = `https://api.github.com${ghPath}${url.search}`;

  const ghResponse = await fetch(ghUrl, {
    method: request.method,
    headers: {
      "Authorization": `token ${token}`,
      "Accept": "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      "User-Agent": "matchfoundr-board",
    },
    body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
  });

  const data = await ghResponse.text();

  return new Response(data, {
    status: ghResponse.status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};

export const config = { path: "/api/github/*" };
