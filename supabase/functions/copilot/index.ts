// ─────────────────────────────────────────────────────────────
// matchfoundr · Co-Pilot Edge Function
// Pipeline: Kimi K2.6 (heavy work) → Claude Sonnet (polish)
// ─────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.27.0'
import { KIMI_PROMPTS, SONNET_PROMPTS, type FounderContext, type TaskType } from './prompts.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Kimi API call ───────────────────────────────────────────
async function callKimi(prompt: string): Promise<string> {
  const res = await fetch('https://api.moonshot.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('KIMI_API_KEY')}`,
    },
    body: JSON.stringify({
      model: 'moonshot-v1-32k',   // Kimi K2.6 equivalent
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2048,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Kimi error: ${JSON.stringify(data)}`)
  return data.choices[0].message.content
}

// ─── Sonnet API call ─────────────────────────────────────────
async function callSonnet(prompt: string): Promise<string> {
  const anthropic = new Anthropic({
    apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
  })
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6-20250219',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })
  return (msg.content[0] as { text: string }).text
}

// ─── Parse JSON safely ───────────────────────────────────────
function parseJSON(text: string): Record<string, unknown> {
  try {
    const match = text.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : { raw: text }
  } catch {
    return { raw: text }
  }
}

// ─── Main handler ────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    const body = await req.json() as {
      task: TaskType
      session_id?: string
      message?: string
      extra?: Record<string, unknown>
    }

    const { task, session_id, message = '', extra = {} } = body

    // Load founder context
    const { data: contextData } = await supabase
      .from('copilot_context')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()

    const ctx: FounderContext = {
      userName: profile?.display_name || 'Founder',
      role:  contextData?.role,
      idea:  contextData?.idea,
      stage: contextData?.stage,
      city:  contextData?.city,
      goal:  contextData?.goal,
      risk:  contextData?.risk,
    }

    let result: Record<string, unknown> = {}

    // ── TASK ROUTER ──────────────────────────────────────────

    if (task === 'context_parse') {
      // Kimi only — pure extraction
      const kimiPrompt = KIMI_PROMPTS.context_parse(ctx, message)
      const kimiRaw = await callKimi(kimiPrompt)
      const parsed = parseJSON(kimiRaw)

      // Save/update context
      await supabase.from('copilot_context').upsert({
        user_id:    user.id,
        session_id: session_id || null,
        ...parsed,
        raw_context: parsed,
        updated_at: new Date().toISOString(),
      })

      result = { context: parsed }
    }

    else if (task === 'chat') {
      // Stage 1: Kimi analyzes + answers
      const kimiPrompt = KIMI_PROMPTS.chat(ctx, message)
      const kimiRaw = await callKimi(kimiPrompt)
      const kimiData = parseJSON(kimiRaw)

      // Stage 2: Sonnet polishes the answer text
      const sonnetPrompt = SONNET_PROMPTS.chat(ctx, String(kimiData.antwort || kimiRaw))
      const polishedAnswer = await callSonnet(sonnetPrompt)

      // Save message
      if (session_id) {
        await supabase.from('copilot_messages').insert({
          session_id,
          user_id: user.id,
          role: 'assistant',
          content: polishedAnswer,
          model_used: 'kimi+sonnet',
          sources: kimiData.quellen || [],
        })

        // Extract deadlines if found
        if (kimiData.neue_deadline_erkannt) {
          const deadlineData = kimiData.neue_deadline_erkannt as Record<string, unknown>
          await supabase.from('deadlines').insert({
            user_id:   user.id,
            session_id,
            title:     deadlineData.titel,
            due_date:  deadlineData.datum,
            priority:  deadlineData.priorität || 'medium',
          })
        }
      }

      result = {
        answer:       polishedAnswer,
        sources:      kimiData.quellen || [],
        quick_actions: kimiData.follow_up_aktionen || [],
      }
    }

    else if (task === 'plan_generate') {
      // Stage 1: Kimi builds structure
      const kimiPrompt = KIMI_PROMPTS.plan_generate(ctx, message)
      const kimiRaw = await callKimi(kimiPrompt)
      const planData = parseJSON(kimiRaw)

      // Stage 2: Sonnet writes readable plan text
      const sonnetPrompt = SONNET_PROMPTS.plan_text(ctx, JSON.stringify(planData))
      const planText = await callSonnet(sonnetPrompt)

      result = { plan: planData, plan_text: planText }
    }

    else if (task === 'deadline_extract') {
      // Kimi only — pure extraction
      const kimiPrompt = KIMI_PROMPTS.deadline_extract(ctx, message)
      const kimiRaw = await callKimi(kimiPrompt)
      const data = parseJSON(kimiRaw)

      const deadlines = (data.deadlines as Array<Record<string, unknown>>) || []
      if (deadlines.length > 0 && session_id) {
        await supabase.from('deadlines').insert(
          deadlines.map(d => ({
            user_id:   user.id,
            session_id,
            title:     d.titel,
            due_date:  d.datum,
            priority:  d.priorität || 'medium',
            notes:     d.notiz,
          }))
        )
      }

      result = { deadlines }
    }

    else if (task === 'document_exist') {
      // Stage 1: Kimi fills content from profile
      const kimiPrompt = KIMI_PROMPTS.document_exist_draft(ctx, message)
      const kimiRaw = await callKimi(kimiPrompt)

      // Stage 2: Sonnet polishes every section
      const sonnetPrompt = SONNET_PROMPTS.document_exist(ctx, kimiRaw)
      const polished = await callSonnet(sonnetPrompt)

      // Calculate fill percentage
      const missing = (parseJSON(kimiRaw).fehlende_infos as string[]) || []
      const fillPct = Math.max(0, 100 - missing.length * 8)

      // Save document
      const { data: doc } = await supabase.from('copilot_documents').insert({
        user_id:       user.id,
        session_id:    session_id || null,
        type:          'exist_antrag',
        title:         'EXIST-Gründerstipendium Antrag',
        content:       polished,
        draft_content: kimiRaw,
        fill_pct:      fillPct,
        status:        'draft',
        metadata:      { missing_fields: missing },
      }).select().single()

      result = { document: doc, fill_pct: fillPct, missing_fields: missing }
    }

    else if (task === 'advisor_reasons') {
      const advisorInfo = JSON.stringify(extra.advisor || {})

      // Stage 1: Kimi analyzes fit
      const kimiPrompt = KIMI_PROMPTS.advisor_reasons(ctx, advisorInfo)
      const kimiRaw = await callKimi(kimiPrompt)
      const kimiData = parseJSON(kimiRaw)

      // Stage 2: Sonnet polishes the reason texts
      const sonnetPrompt = SONNET_PROMPTS.advisor_reasons(ctx, JSON.stringify(kimiData))
      const polished = await callSonnet(sonnetPrompt)

      result = {
        reasons:   kimiData.gründe || [],
        fit_score: kimiData.fit_score || 0,
        polished,
      }
    }

    else if (task === 'daily_brief') {
      // Load today's data
      const today = new Date().toISOString().split('T')[0]
      const { data: deadlines } = await supabase
        .from('deadlines')
        .select('title, due_date')
        .eq('user_id', user.id)
        .eq('status', 'open')
        .lte('due_date', new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0])

      const dailyData = JSON.stringify({ deadlines, today })

      // Stage 1: Kimi structures the brief
      const kimiPrompt = KIMI_PROMPTS.daily_brief_draft(ctx, dailyData)
      const kimiRaw = await callKimi(kimiPrompt)

      // Stage 2: Sonnet writes it naturally
      const sonnetPrompt = SONNET_PROMPTS.daily_brief(ctx, kimiRaw)
      const brief = await callSonnet(sonnetPrompt)

      result = { brief, raw: parseJSON(kimiRaw) }
    }

    // ── EMAIL TASKS ──────────────────────────────────────────
    else if (task.startsWith('email_')) {
      // Stage 1: Kimi drafts structure
      const kimiPrompt = KIMI_PROMPTS.chat(ctx, `Erstelle einen Email-Entwurf für: ${message}`)
      const kimiRaw = await callKimi(kimiPrompt)
      const kimiData = parseJSON(kimiRaw)

      // Stage 2: Sonnet writes the actual email
      const sonnetKey = task as keyof typeof SONNET_PROMPTS
      const sonnetPromptFn = SONNET_PROMPTS[sonnetKey] || SONNET_PROMPTS.chat
      const email = await callSonnet(sonnetPromptFn(ctx, String(kimiData.antwort || kimiRaw)))

      // Save as document
      await supabase.from('copilot_documents').insert({
        user_id:    user.id,
        session_id: session_id || null,
        type:       task,
        title:      `Email: ${message.slice(0, 60)}`,
        content:    email,
        draft_content: String(kimiData.antwort || kimiRaw),
        fill_pct:   100,
        status:     'ready',
        metadata:   extra,
      })

      result = { email }
    }

    else if (task === 'match_explain') {
      const matchInfo = JSON.stringify(extra.match || {})
      const kimiPrompt = KIMI_PROMPTS.match_explain(ctx, matchInfo)
      const kimiRaw = await callKimi(kimiPrompt)
      result = { explanation: parseJSON(kimiRaw) }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Co-Pilot error:', err)
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
