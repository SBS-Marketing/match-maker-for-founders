// ─────────────────────────────────────────────────────────────
// matchfoundr · Issue #13 — Swipe API Edge Function
// Verarbeitet Swipes, prüft auf Mutual Matches, erstellt Conversations
// ─────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SwipePayload {
  target_id: string
  direction: 'like' | 'pass'
}

interface SwipeResult {
  success: boolean
  mutual_match: boolean
  match_id?: string
  conversation_id?: string
  direction: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    })

    // Auth prüfen
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const url = new URL(req.url)
    const path = url.pathname.replace(/^\/swipe\/?/, '')

    if (req.method === 'POST' && path === '') {
      const body = await req.json() as SwipePayload

      if (!body.target_id || !body.direction) {
        return new Response(JSON.stringify({ error: 'target_id und direction erforderlich' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (body.direction !== 'like' && body.direction !== 'pass') {
        return new Response(JSON.stringify({ error: 'direction muss like oder pass sein' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Idempotenter Upsert via RPC (schneller und transaktionssicher)
      const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('perform_swipe', {
        p_swiper_id: user.id,
        p_target_id: body.target_id,
        p_direction: body.direction,
      })

      if (rpcError) {
        console.error('RPC Fehler:', rpcError)
        // Fallback: Direkter Insert
        const { error: insertErr } = await supabaseAdmin
          .from('swipes')
          .upsert(
            {
              swiper_id: user.id,
              target_id: body.target_id,
              direction: body.direction,
            },
            { onConflict: 'swiper_id,target_id' }
          )
        if (insertErr) throw insertErr
      }

      const result: SwipeResult = {
        success: true,
        mutual_match: false,
        direction: body.direction,
      }

      // Bei Like: Prüfen ob Mutual Match
      if (body.direction === 'like') {
        const { data: reverseSwipe } = await supabaseAdmin
          .from('swipes')
          .select('id')
          .eq('swiper_id', body.target_id)
          .eq('target_id', user.id)
          .eq('direction', 'like')
          .maybeSingle()

        if (reverseSwipe) {
          result.mutual_match = true
          // Match Details laden
          const { data: match } = await supabaseAdmin
            .from('mutual_matches')
            .select('id, conversation_id')
            .or(`and(user_a.eq.${user.id},user_b.eq.${body.target_id}),and(user_a.eq.${body.target_id},user_b.eq.${user.id})`)
            .maybeSingle()

          if (match) {
            result.match_id = match.id
            result.conversation_id = match.conversation_id ?? undefined
          }
        }
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (req.method === 'GET' && path === 'history') {
      const { data: swipes, error } = await supabaseAdmin
        .from('swipes')
        .select('*, target:profiles!swipes_target_id_fkey(id, display_name, photo_url)')
        .eq('swiper_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error

      return new Response(JSON.stringify({ success: true, swipes }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[swipe]', err)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
