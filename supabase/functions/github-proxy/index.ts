// GitHub API Proxy — Token bleibt server-seitig, nie im Browser
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const token = Deno.env.get('GITHUB_TOKEN')
  if (!token) {
    return new Response(JSON.stringify({ error: 'GITHUB_TOKEN not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const url = new URL(req.url)
  // /functions/v1/github-proxy/repos/... → https://api.github.com/repos/...
  const ghPath = url.pathname.replace(/.*\/github-proxy/, '')
  const ghUrl = `https://api.github.com${ghPath}${url.search}`

  const ghResponse = await fetch(ghUrl, {
    method: req.method,
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'matchfoundr-board',
    },
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
  })

  const data = await ghResponse.text()

  return new Response(data, {
    status: ghResponse.status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
