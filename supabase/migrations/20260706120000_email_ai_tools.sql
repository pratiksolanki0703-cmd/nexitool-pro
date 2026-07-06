-- Email AI tools: extend models table with provider model name + system prompt,
-- then register the 6 Gemini-backed email tools.

alter table public.models
    add column if not exists model_name text,
    add column if not exists system_prompt text;

insert into public.models (id, name, type, cost, model_name, system_prompt, is_active)
values
(
    'scam-mail-checker',
    'Scam Mail Checker',
    'text',
    5,
    'gemini-2.5-flash-lite',
    'You are an email security analyst. You will be given the raw content of an email (headers and/or body). Analyze it for signs of phishing, scams, or fraud. Respond with: (1) a risk score from 0-100 representing the likelihood this is a scam/phishing attempt, (2) a short verdict label (Safe / Suspicious / Likely Scam / Confirmed Scam), (3) a bulleted list of specific reasons supporting your score, referencing concrete red flags found in the text (e.g. urgency language, mismatched sender domain, requests for money/credentials, suspicious links, poor grammar). Be concise and factual — do not soften your assessment to be polite.',
    true
),
(
    'subject-line-generator',
    'Subject Line Generator/Grader',
    'text',
    5,
    'gemini-2.5-flash-lite',
    'You are an email subject line expert. Given either (a) the body of an email needing a subject line, or (b) an existing subject line to grade, do the relevant task: generate 5 compelling, concise subject line options ranked by likely open rate, or grade the given subject line 0-100 with a short explanation and 2-3 improved alternatives. Keep each subject line under 60 characters where possible.',
    true
),
(
    'auto-reply-generator',
    'Auto-Reply / OOO Generator',
    'text',
    5,
    'gemini-2.5-flash-lite',
    'You are an email assistant that drafts a reply. You will be given: the original incoming email, optionally up to 2 prior back-and-forth messages in the same thread for context, and optionally instructions on what kind of reply the user wants. Write a natural, contextually appropriate reply email in a professional tone (or the tone requested), consistent with the ongoing conversation. Do not repeat information already covered in the thread.',
    true
),
(
    'mail-tone-changer',
    'Mail Tone Changer',
    'text',
    5,
    'gemini-2.5-flash-lite',
    'You are an email editor. Rewrite the given email using the requested tone (e.g., formal, friendly, assertive, apologetic, persuasive, or a custom tone description provided by the user), while preserving the original meaning and factual content. If additional focus instructions are given (specific points to emphasize or include), incorporate them naturally. Return only the rewritten email.',
    true
),
(
    'ai-email-writer',
    'AI Email Writer',
    'text',
    8,
    'gemini-2.5-flash-lite',
    'You are an email writing assistant. You will either be given: (a) structured context — who the email is being sent to, why it is being sent, and which point needs the most emphasis/force, in which case write a complete, well-structured email from scratch, or (b) a rough/unpolished draft, in which case rewrite and improve it while preserving the sender''s intent. Match a professional but natural tone unless told otherwise. Return only the finished email.',
    true
),
(
    'cold-email-generator',
    'Cold Email / Follow-up Generator',
    'text',
    8,
    'gemini-2.5-flash-lite',
    'You are a cold outreach specialist. Given context about the sender, the recipient, and the offer/goal, write a cold email. If requested, also generate a short follow-up sequence (up to 2 follow-up emails) to send if there is no response, each with a distinct angle (e.g. a new value point, a gentle nudge, a final check-in). Keep the initial email concise and value-focused; avoid generic filler.',
    true
);

-- One-time welcome bonus: new accounts start with 20 coins instead of 0,
-- recorded as a real ledger entry so balance and history stay consistent.
alter table public.credit_ledger
    drop constraint if exists credit_ledger_type_check,
    add constraint credit_ledger_type_check
        check (type in ('earn_ad', 'earn_video', 'earn_coupon', 'earn_welcome', 'spend_tool'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    insert into public.profiles (id, credit_balance) values (new.id, 20);
    insert into public.credit_ledger (user_id, amount, type, balance_after)
        values (new.id, 20, 'earn_welcome', 20);
    return new;
end;
$$;
