// ─────────────────────────────────────────────────────────────
// matchfoundr · Co-Pilot Edge Function
// Pipeline: Kimi K2.6 (heavy work) → Claude Sonnet (polish)
// Routing via OpenRouter — one API key for both models
// ─────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { KIMI_PROMPTS, SONNET_PROMPTS, type FounderContext, type TaskType } from './prompts.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const KIMI_MODEL    = 'moonshotai/kimi-k2.6'
const SONNET_MODEL  = 'anthropic/claude-sonnet-4-6'

// ─── Generic OpenRouter call ─────────────────────────────────
async function callOpenRouter(model: string, prompt: string, maxTokens = 2048): Promise<string> {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
      'HTTP-Referer': 'https://matchfoundr.com',
      'X-Title': 'matchfoundr Co-Pilot',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: model === KIMI_MODEL ? 0.3 : 0.7,
      max_tokens: maxTokens,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`OpenRouter error (${model}): ${JSON.stringify(data)}`)
  return data.choices[0].message.content
}

// ─── Convenience wrappers ────────────────────────────────────
const callKimi   = (prompt: string) => callOpenRouter(KIMI_MODEL,   prompt, 2048)
const callSonnet = (prompt: string) => callOpenRouter(SONNET_MODEL, prompt, 1024)

// ─── Parse JSON safely ───────────────────────────────────────
function parseJSON(text: string): any {
  if (!text || text.trim() === '') return { raw: '' }
  try {
    return JSON.parse(text)
  } catch {
    // Try extracting JSON array first, then object
    try {
      const arrMatch = text.match(/\[[\s\S]*\]/)
      if (arrMatch) return JSON.parse(arrMatch[0])
    } catch { /* fall through */ }
    try {
      const objMatch = text.match(/\{[\s\S]*\}/)
      if (objMatch) return JSON.parse(objMatch[0])
    } catch { /* fall through */ }
  }
  return { raw: text, antwort: text }
}

// ─── Extract best text from Kimi response ────────────────────
function extractDraft(kimiData: Record<string, unknown>, kimiRaw: string): string {
  const draft = kimiData.antwort ?? kimiData.raw ?? kimiRaw
  const text = String(draft ?? '').trim()
  if (!text || text === 'undefined' || text === 'null') return kimiRaw
  return text
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
      console.log('[KIMI context_parse]', kimiRaw.slice(0, 300))
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
      if (!message || message.trim() === '') {
        return new Response(
          JSON.stringify({ error: 'message darf nicht leer sein' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Stage 1: Kimi analyzes + answers
      const kimiPrompt = KIMI_PROMPTS.chat(ctx, message)
      const kimiRaw = await callKimi(kimiPrompt)
      console.log('[KIMI chat raw]', kimiRaw.slice(0, 300))
      const kimiData = parseJSON(kimiRaw)
      console.log('[KIMI chat parsed] antwort:', String(kimiData.antwort ?? '').slice(0, 200))

      // Extract draft — never pass empty string to Sonnet
      const draft = extractDraft(kimiData, kimiRaw)
      console.log('[DRAFT to Sonnet]', draft.slice(0, 200))

      // Stage 2: Sonnet polishes the answer text
      const sonnetPrompt = SONNET_PROMPTS.chat(ctx, draft)
      const polishedAnswer = await callSonnet(sonnetPrompt)

      // Save assistant message to DB
      if (session_id) {
        await supabase.from('copilot_messages').insert({
          session_id,
          user_id:    user.id,
          role:       'assistant',
          content:    polishedAnswer,
          model_used: 'kimi+sonnet',
          sources:    Array.isArray(kimiData.quellen) ? kimiData.quellen : [],
        })

        // Save deadline if Kimi detected one
        const deadline = kimiData.neue_deadline_erkannt as Record<string, unknown> | null
        if (deadline?.titel && deadline?.datum) {
          await supabase.from('deadlines').insert({
            user_id:   user.id,
            session_id,
            title:     deadline.titel,
            due_date:  deadline.datum,
            priority:  deadline.priorität || 'medium',
          })
        }
      }

      result = {
        answer:        polishedAnswer,
        too_early:     kimiData.zu_frueh === true,
        sources:       Array.isArray(kimiData.quellen) ? kimiData.quellen : [],
        quick_actions: Array.isArray(kimiData.follow_up_aktionen) ? kimiData.follow_up_aktionen : [],
      }
    }

    else if (task === 'plan_generate') {
      // Load assessment scores if available
      const { data: assessment } = await supabase
        .from('founder_assessment')
        .select('scores')
        .eq('user_id', user.id)
        .single()

      // Load skills if available
      const { data: skills } = await supabase
        .from('founder_skills')
        .select('skills, looking_for, availability')
        .eq('user_id', user.id)
        .single()

      // Enrich context with industry + assessment
      const { data: profileFull } = await supabase
        .from('profiles')
        .select('industry, venture_term, partner_term')
        .eq('id', user.id)
        .single()

      if (profileFull?.industry) {
        ctx.industry     = profileFull.industry
        ctx.venture_term = profileFull.venture_term
        ctx.partner_term = profileFull.partner_term
      }

      const enrichedInput = JSON.stringify({
        message,
        assessment_scores: assessment?.scores || null,
        skills: skills?.skills || null,
      })

      // Stage 1: Kimi builds structured plan
      const kimiPrompt = KIMI_PROMPTS.plan_generate(ctx, enrichedInput)
      const kimiRaw = await callKimi(kimiPrompt)
      console.log('[KIMI plan_generate]', kimiRaw.slice(0, 300))
      const planData = parseJSON(kimiRaw)

      // Stage 2: Sonnet turns it into a presentation
      const sonnetPrompt = SONNET_PROMPTS.plan_presentation(ctx, JSON.stringify(planData))
      const sonnetRaw = await callSonnet(sonnetPrompt)
      const slides = parseJSON(sonnetRaw)

      // Save plan as document
      await supabase.from('copilot_documents').insert({
        user_id:       user.id,
        session_id:    session_id || null,
        type:          'pitch_outline',
        title:         `Persönlicher Plan — ${ctx.userName}`,
        content:       sonnetRaw,
        draft_content: kimiRaw,
        fill_pct:      100,
        status:        'ready',
        metadata:      { slides_count: Array.isArray(slides) ? slides.length : 0 },
      })

      result = { plan: planData, slides }
    }

    else if (task === 'deadline_extract') {
      // Kimi only — pure extraction
      const kimiPrompt = KIMI_PROMPTS.deadline_extract(ctx, message)
      const kimiRaw = await callKimi(kimiPrompt)
      console.log('[KIMI deadline_extract]', kimiRaw.slice(0, 300))
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
      console.log('[KIMI document_exist]', kimiRaw.slice(0, 300))

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
      console.log('[KIMI advisor_reasons]', kimiRaw.slice(0, 300))
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
      console.log('[KIMI daily_brief]', kimiRaw.slice(0, 300))

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
      console.log('[KIMI email draft]', kimiRaw.slice(0, 300))
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
      console.log('[KIMI match_explain]', kimiRaw.slice(0, 300))
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
