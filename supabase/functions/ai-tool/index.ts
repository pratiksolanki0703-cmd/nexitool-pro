// Shared Edge Function for every Gemini-backed AI tool on the site (email tools
// first, more categories later). One function, routed by `tool_id` in the request
// body, instead of one function per tool — keeps the Gemini key rotation and
// coin-spend logic in a single place.
//
// Request body: { tool_id: string, input: string, output_language?: string }
// Auth: forward the user's Supabase session access token as `Authorization: Bearer <token>`.
//
// Flow: look up the tool's cost/model/system_prompt (service role, since those
// columns are locked down from anon/authenticated — see migration
// 20260706130000_models_column_security.sql) -> pre-check the caller can afford
// it -> call Gemini with key rotation + failover -> charge via the existing
// spend_credit() RPC only after a successful AI response -> return the result.

import { createClient } from 'jsr:@supabase/supabase-js@2';

// Centralized CORS allow-list. Update ALLOWED_ORIGINS (comma-separated) as a
// function secret when the domain changes — no code edit needed for a domain swap.
// Falls back to the current GitHub Pages URL + the eventual production domain
// so this works before that secret is set.
const DEFAULT_ALLOWED_ORIGINS = 'https://pratiksolanki0703-cmd.github.io,https://nexitool.pro';

function corsHeaders(origin) {
    const allowList = (Deno.env.get('ALLOWED_ORIGINS') ?? DEFAULT_ALLOWED_ORIGINS)
        .split(',')
        .map((o) => o.trim());
    const allowOrigin = allowList.includes(origin) ? origin : allowList[0];
    return {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Headers': 'authorization, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };
}

// Round-robin index, kept at module scope so it persists across warm invocations
// of the same function instance (best-effort — not shared across instances).
let rrIndex = 0;

async function callGemini(modelName, systemPrompt, userInput, outputLanguage) {
    const keys = [
        Deno.env.get('GEMINI_KEY_1'),
        Deno.env.get('GEMINI_KEY_2'),
        Deno.env.get('GEMINI_KEY_3')
    ].filter(Boolean);

    if (keys.length === 0) throw new Error('No Gemini API keys configured');

    let fullSystemPrompt = systemPrompt;
    if (outputLanguage) {
        fullSystemPrompt += `\n\nRegardless of what language the input is written in, write your entire response in ${outputLanguage}.`;
    }

    let lastError;
    for (let attempt = 0; attempt < keys.length; attempt++) {
        const key = keys[(rrIndex + attempt) % keys.length];
        try {
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        systemInstruction: { parts: [{ text: fullSystemPrompt }] },
                        contents: [{ role: 'user', parts: [{ text: userInput }] }]
                    })
                }
            );

            if (!res.ok) {
                lastError = new Error(`Gemini key #${attempt + 1} returned ${res.status}`);
                continue;
            }

            const json = await res.json();
            const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
            if (!text) {
                lastError = new Error('Gemini returned an empty response');
                continue;
            }

            // Advance past whichever key just succeeded so the next request
            // picks up round-robin from there.
            rrIndex = (rrIndex + attempt + 1) % keys.length;
            return text;
        } catch (err) {
            lastError = err;
        }
    }
    throw lastError ?? new Error('All Gemini keys failed');
}

Deno.serve(async (req) => {
    const origin = req.headers.get('origin') ?? '';
    const headers = corsHeaders(origin);

    if (req.method === 'OPTIONS') {
        return new Response(null, { headers });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ success: false, reason: 'method_not_allowed' }), { status: 405, headers });
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader) {
        return new Response(JSON.stringify({ success: false, reason: 'not_authenticated' }), { status: 401, headers });
    }

    let body;
    try {
        body = await req.json();
    } catch {
        return new Response(JSON.stringify({ success: false, reason: 'invalid_json' }), { status: 400, headers });
    }

    const { tool_id, input, output_language } = body ?? {};
    if (!tool_id || typeof input !== 'string' || !input.trim()) {
        return new Response(JSON.stringify({ success: false, reason: 'missing_fields' }), { status: 400, headers });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    // Service-role client: only place allowed to read model_name/system_prompt.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    // User-scoped client: resolves auth.uid() from the forwarded JWT, so RLS
    // and the spend_credit() RPC apply to the actual caller, not the service role.
    const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } }
    });

    const { data: model, error: modelError } = await adminClient
        .from('models')
        .select('cost, is_active, model_name, system_prompt')
        .eq('id', tool_id)
        .single();

    if (modelError || !model || !model.is_active) {
        return new Response(JSON.stringify({ success: false, reason: 'invalid_tool' }), { status: 400, headers });
    }

    // Pre-check balance before spending a real Gemini call on a request that
    // can't be charged anyway.
    const { data: profile, error: profileError } = await userClient
        .from('profiles')
        .select('credit_balance')
        .single();

    if (profileError || !profile) {
        return new Response(JSON.stringify({ success: false, reason: 'not_authenticated' }), { status: 401, headers });
    }

    if (profile.credit_balance < model.cost) {
        return new Response(
            JSON.stringify({ success: false, reason: 'insufficient_balance', balance: profile.credit_balance, cost: model.cost }),
            { status: 402, headers }
        );
    }

    let output;
    try {
        output = await callGemini(model.model_name, model.system_prompt, input, output_language);
    } catch (err) {
        console.error('Gemini call failed', err);
        return new Response(JSON.stringify({ success: false, reason: 'ai_unavailable' }), { status: 502, headers });
    }

    // Charge only after a successful AI response. spend_credit() re-checks the
    // balance atomically (with a row lock), so this is race-safe even if the
    // pre-check above went stale.
    const { data: spend, error: spendError } = await userClient.rpc('spend_credit', { p_model_id: tool_id });

    if (spendError || !spend?.success) {
        return new Response(
            JSON.stringify({ success: false, reason: spend?.reason ?? 'spend_failed', balance: spend?.balance }),
            { status: 402, headers }
        );
    }

    return new Response(
        JSON.stringify({ success: true, output, balance: spend.balance }),
        { status: 200, headers }
    );
});
