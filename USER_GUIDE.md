# NexiTool.pro — Complete Developer Guide

This file exists so that any AI or developer, even one unfamiliar with this codebase,
can pick up work on this project without needing the original chat history. If you are
an AI reading this because someone asked you to make a change, read the relevant
section fully before editing anything. Everything here is factual as of 2026-07-07 —
verify against the actual files before trusting a detail, since this file can drift
out of date as the code changes.

## 1. What this project is

NexiTool.pro is a **static HTML/CSS/JS website** (no build step, no framework, no
bundler). It is a collection of free browser-based tools (image/PDF/email tools today)
plus a coin-based system that lets logged-in users pay for AI-powered tools using an
external Supabase backend.

- **Hosting:** GitHub Pages, auto-deployed by `.github/workflows/deploy.yml` on every
  push to `master` or `main`. The workflow just uploads the whole repo root as-is —
  there is no build/compile step. Whatever is committed is what goes live within a
  minute or two of pushing.
- **Custom domain:** `nexitool.pro` is meant to be the live domain but DNS is currently
  still pointed at a WordPress installation during an ICANN transfer lock. Until that
  clears, test the live site at the GitHub Pages URL
  (`https://pratiksolanki0703-cmd.github.io/nexitool-pro/`), not `nexitool.pro`.
- **Backend:** Supabase (hosted Postgres + Auth + Edge Functions). The site talks to
  Supabase entirely from client-side JS using the public anon key — there is no
  custom server of our own. All sensitive logic (balance checks, coin deduction,
  coupon redemption) lives in Postgres functions or the one Edge Function, not in
  client JS, because client JS can always be read/tampered with by the user.
- **No real money.** Coins are only earned via ads/coupons and only spent on tool
  usage inside this site. There is no payment gateway anywhere in this codebase.

## 2. Repository map

```
index.html                     Homepage — tool grid, categories, trending section
about.html, privacy-policy.html, terms-of-service.html, coin.html   Static pages
sitemap.xml                    Must be updated by hand every time a new tool page is added
robots.txt                     Standard crawler rules

components/
  header.html                 Shared header markup, injected at runtime
  footer.html                 Shared footer markup, injected at runtime

css/ (or inline in style.css — see below)
style.css                     Single global stylesheet for the whole site (all pages)

js/
  tools-data.js               TOOLS array + CATEGORIES array — the master list of every tool/category
  blogs-data.js                Blog post metadata (if used by a page)
  script.js                   Core site logic: header/footer loader, homepage grid rendering,
                               theme toggle, related-tools rendering, category filters
  header-animation.js         Small header visual effect, unrelated to auth/coins
  ads-manager.js               Legacy/stale AdSense loader — see section 12
  supabase-client.js           Initializes window.supabaseClient (URL + anon key)
  announcement-config.js / announcement-banner.js   Optional site-wide banner system
  guide-content.js / user-guide.js   First-login onboarding modal FOR END USERS
                                (NOT this document — different purpose, don't confuse them)
  auth-widget.js               Login/logout UI, coin balance UI, premium-access gate,
                               coupon redemption UI. The most important auth/coin file.
  earn-ticker.js               Passive coin earning (auto, every 30s while tab open)
  verify-tracking.js           Ad-blocker detection (gates all coin earning)
  rewarded-ads.js              Active/rewarded-video coin earning (NOT LIVE yet)

tools/
  image-tools/*.html           Free browser-only image tools
  pdf-tools/*.html              Free browser-only PDF tools
  email-tools/*.html            Mix of free + premium (coin-costing) AI tools
  tool-style.css                Shared stylesheet for tool pages

admin/
  generator.html               Local-only admin page that scaffolds new tool pages.
                               NOT deployed/linked publicly, has noindex/nofollow.
                               This is the primary way new tool pages get created.

supabase/
  functions/ai-tool/index.ts   The ONE Edge Function that powers every AI tool
  migrations/*.sql             Every database schema change, in chronological order
  config.toml                  Local Supabase CLI config (for local dev only)

EMAIL_AUTH_DISABLED.md         How to re-enable email/password login (see section 11)
USER_GUIDE.md                  This file
```

## 3. How the frontend is structured (static multi-page site)

There is no single-page-app routing. Every tool is its own real `.html` file. Every
page independently loads the shared header/footer, shared CSS, and `tools-data.js`.

### 3.1 Header/footer loading

`js/script.js`'s `loadComponents()` fetches `components/header.html` and
`components/footer.html` and injects them into the page. It computes a relative
`prefix` (e.g. `../../`) by reading the currently-executing `<script>` tag's own `src`
attribute — deliberately NOT `window.location.pathname`, because GitHub Pages serving
the site from a repo sub-path broke pathname-based depth calculation in the past. If
you ever see the header/footer fail to load or links break on a nested tool page,
check this prefix logic first, and re-read the standing note: don't declare it fixed
from a `curl` check alone — verify in a real browser, curl doesn't execute JS.

If the fetch takes over 100ms, a skeleton loader shows in the header/footer's place so
the page doesn't look broken while waiting.

### 3.2 Tool listing data — `js/tools-data.js`

Two arrays drive the whole site:

```js
const TOOLS = [
  {
    id: 'bulk-image-compressor',      // unique, used as tool_id in premium tools
    name: 'Bulk Image Compressor',
    description: '...',
    category: 'Image',                // must match a CATEGORIES[].name
    color: 'image',                   // must match a .color-{color} class in style.css
    icon: 'shrink',                   // lucide icon name
    path: 'tools/image-tools/bulk-image-compressor.html',
    isTrending: true,                 // shows a 🔥 badge on the homepage card
    isPremium: true                   // optional — shows a 🪙 coin badge; only for AI tools
  },
  ...
];

const CATEGORIES = [
  { name: 'Image', color: 'image' },
  { name: 'PDF', color: 'pdf' },
  { name: 'Email', color: 'email' }
];
```

`js/script.js` reads these two arrays to render the homepage grid, the category
filter pills, and the "Related Tools" section shown at the bottom of every tool page
(tools in the same category, excluding the current one).

### 3.3 Category color system

Every category's `color` value must have a matching CSS rule in `style.css` of the
form `.color-{slug} { --accent: ...; }`. Existing slugs: `trending`, `pdf`, `image`,
`security`, `dev`, `utility`, `seo`, `audio`, `youtube`, `email`. The homepage card
grid, the related-tools section, and category filter chips all read this `--accent`
custom property to theme themselves per category — this is why every element that
needs to pick up a category's color must live inside a container with the
`color-{slug}` class applied (see `renderRelatedTools()`/`renderHome()` in
`js/script.js` for the exact pattern to copy).

### 3.4 Theme toggle

Already fully implemented — a circular-reveal animation using an animated
`clip-path` overlay (`.theme-reveal` with `--x`/`--y`/`--r` CSS custom properties),
not the View Transitions API (deliberately avoided — it snapshots the whole page,
which looked worse). Respects `prefers-reduced-motion`. Do not rebuild this from
scratch; extend the existing implementation in `initThemeToggle()` in `js/script.js`.

## 4. Supabase backend

Connection is initialized in `js/supabase-client.js`, which sets `window.supabaseClient`
using a hardcoded project URL and **anon** key (the anon key is safe to expose — it can
only do what Row Level Security policies allow, see 4.2). This script must load after
the Supabase CDN `<script>` tag and before `auth-widget.js`, `earn-ticker.js`,
`rewarded-ads.js` on every page that uses coins/login.

### 4.1 Tables

| Table | Purpose | Key columns |
|---|---|---|
| `profiles` | One row per signed-up user | `id` (= auth.uid()), `credit_balance` |
| `models` | Registry of every AI model any tool can call | `id` (text, used as `tool_id`), `name`, `type` (`text`/`image`/`video`/`voice`), `cost` (int, coins), `is_active` (bool), `model_name` (backend model string, e.g. `gemini-2.5-flash-lite`), `system_prompt` |
| `credit_ledger` | Append-only history of every balance change | `user_id`, `amount` (+/-), `type` (`earn_ad`, `earn_video`, `earn_coupon`, `earn_welcome`, `spend_tool`), `model_id`, `meta`, `balance_after` |
| `coupons` | Redeemable coupon codes | `code`, `credit_value`, `max_redemptions`, `redemptions_used`, `expires_at`, `is_active` |
| `coupon_redemptions` | Tracks which user redeemed which coupon | unique per `(coupon_id, user_id)` — prevents double redemption |

### 4.2 Security model: RLS + SECURITY DEFINER RPCs

Every table has Row Level Security enabled. Client roles (`anon`, `authenticated`) are
granted **read-only** access, and even that is restricted:
- `profiles`: a user can only `select` their own row.
- `models`: clients can only `select` the columns `id, name, type, cost, is_active` —
  `model_name` and `system_prompt` are locked to `service_role` only (see
  `20260706130000_models_column_security.sql`), so a user cannot read your Gemini
  system prompt or exact backend model string via the REST API.
- `coupons`: **no SELECT policy at all.** A client can never list or peek at coupon
  codes — they're only checked inside the `redeem_coupon` function running as
  `SECURITY DEFINER`, which bypasses RLS internally.

**All writes/mutations go through exactly four Postgres RPC functions** (found in
`supabase/migrations/20260703200000_coin_economy_schema.sql` and later migrations).
Never write client code that does a raw `insert`/`update` against these tables — it
will be rejected by RLS, and even if it weren't, it would bypass the server-side
validation these functions provide (balance checks, rate limits, expiry checks).

1. **`earn_ad_tick()`** — passive earning, ~5 coins per call. Identity comes only
   from `auth.uid()` (the caller's own JWT), so it cannot be called on someone else's
   behalf. Enforces a combined rate cap of 90 coins/minute shared with
   `earn_video_ad`, by summing recent `credit_ledger` rows.
2. **`earn_video_ad()`** — active/rewarded-ad earning, ~30 coins per call. Same
   combined 90-coins/minute cap as above.
3. **`spend_credit(p_model_id text)`** — atomically row-locks the caller's `profiles`
   row, checks `credit_balance >= models.cost`, deducts it, and inserts a
   `spend_tool` ledger row. This is the only function that ever removes coins.
4. **`redeem_coupon(p_code text)`** — validates the coupon is active, not expired,
   under its redemption limit, and not already redeemed by this user; credits
   `credit_value` coins and records both a `coupon_redemptions` row and an
   `earn_coupon` ledger entry.

There is also a trigger, `handle_new_user()`, that fires on signup: creates the
`profiles` row and grants a **20-coin welcome bonus**, recorded as an `earn_welcome`
ledger entry. And a `pg_cron` job, `cleanup_old_watch_ad_history()`, that runs daily
at 2am UTC and deletes `earn_video` ledger rows older than 2 months (just for ledger
table hygiene, does not affect balances).

### 4.3 Making a schema change

1. Create a new file in `supabase/migrations/` named
   `YYYYMMDDHHMMSS_short_description.sql` — timestamps must sort chronologically
   after the last migration (check `ls supabase/migrations/` for the latest).
2. Write plain SQL (`create table`, `alter table`, `create or replace function`, etc).
3. Apply it. There is no CI step that runs migrations automatically — the GitHub
   Actions workflow only deploys static files. You must apply migrations yourself,
   either:
   - Via the Supabase Dashboard → SQL Editor → paste the migration's SQL → Run.
     (Simplest option, no local setup needed — this is the most likely path for a
     one-off change like adding a model or issuing a coupon.)
   - Or, if the Supabase CLI is installed and linked to this project, `supabase db
     push` from the repo root.
4. If you touch RLS/grants, always re-check that `anon`/`authenticated` still can't do
   anything they shouldn't — the existing migrations are the reference pattern to
   copy (revoke-all-then-grant-narrow).

## 5. The coin economy in practice

### 5.1 Earning coins

| Method | Trigger | Amount | File | Live? |
|---|---|---|---|---|
| Welcome bonus | Signup (Google OAuth) | 20 coins, once | `handle_new_user()` trigger | Yes |
| Passive | Automatic tick every 30s while tab is visible + user logged in + no ad blocker detected | ~5 coins/tick | `js/earn-ticker.js` calls `earn_ad_tick` RPC | Yes |
| Active/rewarded video | User manually watches a rewarded video ad to completion | ~30 coins/watch | `js/rewarded-ads.js` calls `earn_video_ad` RPC | **No** — `AD_NETWORK_READY = false` in the file; placeholder ad zone ID, waiting on ad network account approval (Adsterra/Monetag). Flip that flag and fill in the real zone ID once the account is approved. |
| Coupon | User enters a code in the coin UI | Whatever `credit_value` the coupon has | `js/auth-widget.js` calls `redeem_coupon` RPC | Yes |

Both passive and active earning share one combined server-side cap: **90 coins per
minute**, enforced inside the RPC functions themselves (not just in the frontend), so
it can't be bypassed by calling the RPC repeatedly from a browser console.

Ad-blocker detection (`js/verify-tracking.js`) gates *all* earning — it does a real
`fetch()` probe against `ads/display-ads.js` (not a fake DOM bait element, since modern
blockers ignore those) and, if a blocker is detected, disables earning and shows a
"red coin" UI indicator instead of a modal popup.

### 5.2 Spending coins

Coins are only ever spent by calling the shared Edge Function (`ai-tool`), which is
the only code path that calls `spend_credit`. See section 6 for the full flow.

### 5.3 Client-side balance display

`js/auth-widget.js` keeps a cached balance in memory/localStorage and exposes:
- `window.updateCachedBalance(newBalance)` — call after any server-confirmed change.
- `window.deductLocalBalance(cost)` — optimistic local decrement right after a
  successful spend, so the UI updates instantly without waiting for a full refetch.
- `window.updateCoinUI(disabled)` — refreshes the coin badge in the header.
- `window.requirePremiumAccess(cost)` — async, returns `true`/`false`. Call this
  before attempting a premium action: it checks login state and local balance, and
  pops the login modal or an "insufficient balance" modal as needed. **This is a
  frontend-only pre-check for UX** — the real, unbypassable check happens
  server-side inside `spend_credit`.

## 6. The AI Tool Edge Function — `supabase/functions/ai-tool/index.ts`

This single Edge Function powers **every** AI-backed tool on the site — there is one
shared endpoint, not one function per tool. Which tool/model is being called is
decided entirely by a `tool_id` string sent in the request body.

### 6.1 Request contract

```
POST <TOOL_FUNCTION_URL>
Headers: Authorization: Bearer <user's Supabase JWT>, Content-Type: application/json
Body: { "tool_id": "ai-email-writer-flash", "input": "...", "output_language": "en" }
```

### 6.2 Flow (in order)

1. Validate the `Authorization` header is present.
2. Parse `{ tool_id, input, output_language }` from the body.
3. Using a **service-role** admin client (bypasses RLS), read `cost`, `is_active`,
   `model_name`, `system_prompt` from the `models` table row where `id = tool_id`.
4. Using a **user-scoped** client (forwards the caller's JWT), pre-check that
   `profiles.credit_balance >= cost` for this user.
5. Call Gemini via an internal `callGemini(modelName, systemPrompt, input,
   outputLanguage)` helper. This helper round-robins across up to 3 Gemini API keys
   (`GEMINI_KEY_1`, `GEMINI_KEY_2`, `GEMINI_KEY_3` — Supabase project secrets) and
   fails over to the next key on error, for basic quota/rate-limit resilience.
6. **Only if the AI call succeeded**, call the `spend_credit` RPC (which does the
   real, atomic, race-safe balance check-and-deduct using a row lock).
7. Return `{ success, output, balance }` to the client. If the balance was
   insufficient, returns `{ success: false, reason: 'insufficient_balance' }` instead.

CORS is controlled by an `ALLOWED_ORIGINS` env secret (comma-separated origins),
falling back to `https://pratiksolanki0703-cmd.github.io,https://nexitool.pro` if
unset.

### 6.3 IMPORTANT LIMITATION — read this before adding an image/video/voice model

`callGemini()` is **the only AI-calling code path that exists today**. Even though
the `models.type` column accepts `image`, `video`, and `voice` values, the Edge
Function has no branching logic to call any provider other than Gemini text
generation. If you register a model row with `type = 'image'` pointing at, say,
Stable Diffusion, the Edge Function will still try to call Gemini with it and it will
not work correctly.

**To genuinely support a non-Gemini provider** (e.g. Stable Diffusion for
text-to-image), you must edit `supabase/functions/ai-tool/index.ts` itself:
add a new call function (e.g. `callStableDiffusion(...)`), and branch on
`model.type` (or a new column) to route to the right one before returning the
result. This is a backend code change — nothing in `admin/generator.html` can
provide this on its own; the generator only wires up the frontend call + the SQL
row insert. Do not assume a new "image" model works just because you added its row
to the `models` table.

## 7. Adding a new tool

Primary workflow: use `admin/generator.html` (open it locally, e.g.
`file:///.../admin/generator.html`, or serve the repo locally — it is never deployed
publicly).

### 7.1 Free tool (no coins, e.g. an image/PDF utility)

1. Fill in the generator's basic fields: id, name, description, category, icon,
   feature list, FAQ, ad slots.
2. Leave "Premium" unchecked.
3. Paste your actual tool logic (upload box, processing code, download button) into
   the `toolCode` textarea — this part is written separately (by you or another AI),
   the generator only wraps it with SEO/layout/ad scaffolding.
4. Click Generate. Copy `outputHtml` into a new file at
   `tools/{category}-tools/{id}.html`.
5. Copy `outputEntry` (the `TOOLS` array entry) into `js/tools-data.js`.
6. Add a `<url>` entry for the new page to `sitemap.xml` (this is NOT automated —
   the generator does not touch `sitemap.xml`).
7. Commit and push.

### 7.2 Premium/AI tool with a single model

Same as above, but check "Premium", and in the new "AI Models" step add exactly one
model row (label, ID suffix, cost, type, backend model name, system prompt). The
generator will:
- Generate a `NEXI_PREMIUM_MODELS` JS array and a `window.premiumRun(payload)`
  helper wired to call the shared Edge Function with this tool's `tool_id`.
- Generate an `outputSql` block — an `insert into public.models (...)` statement —
  in a new textarea under the main outputs. **Run this SQL** (Supabase Dashboard →
  SQL Editor, or `supabase db push` if using a migration file) — the tool will not
  actually work until this row exists in the `models` table, because the Edge
  Function reads cost/model/prompt from that table at request time.
- Your `toolCode` should call `await window.premiumRun({ input, output_language })`
  wherever it needs to trigger the AI call — it internally handles the login check,
  the `requirePremiumAccess` balance pre-check, the fetch to the Edge Function, and
  the optimistic local balance deduction on success.

### 7.3 Premium/AI tool with multiple models of different cost

This directly answers "what if text-to-image needs both a cheap Stable Diffusion
option and an expensive Gemini option at different coin costs":

1. In the generator's "AI Models" step, click "+ Add AI Model" once per model
   variant (e.g. one row for `sd` at 5 coins, another for `gemini` at 15 coins).
2. When more than one model row exists, the generator additionally outputs a
   model-picker radio UI in the generated HTML, and `NEXI_PREMIUM_MODELS` will
   contain all of them. `window.selectedPremiumModelId` tracks which one the user
   picked; `window.premiumRun(payload, modelId)` accepts an explicit model ID
   override if your tool code manages selection itself instead of using the
   generated radio UI.
3. `outputSql` will contain one `insert` statement per model — run all of them.
4. **Remember the section 6.3 limitation**: if any of these variants uses a
   non-Gemini provider (Stable Diffusion, etc.), you still need to hand-edit
   `supabase/functions/ai-tool/index.ts` to add that provider's call function and
   route to it based on the model row (e.g. by `type` or `model_name` prefix). The
   generator cannot do this part for you — it only handles the frontend wiring and
   the DB row.

## 8. Adding a new category

1. Add an entry to `CATEGORIES` in `js/tools-data.js`:
   `{ name: 'Video', color: 'video' }`.
2. Add a matching CSS rule in `style.css`: `.color-video { --accent: #...; }`
   (copy an existing `.color-{slug}` rule as a template and pick a distinct hex).
3. Use that same `category`/`color` pair on any `TOOLS` entries in that category —
   the homepage grid, filters, and related-tools sections pick this up automatically,
   no other code changes needed.

## 9. Generating a coupon code for a special member

There is no admin UI for this yet — it's a direct SQL insert via the Supabase
Dashboard → SQL Editor (or CLI). Coupons have no client-side write path by design
(see 4.2 — the `coupons` table has no SELECT policy either, so it can't be listed or
guessed from the frontend).

Example — a one-time 100-coin code for a specific member, expiring in 30 days:

```sql
insert into public.coupons (code, credit_value, max_redemptions, redemptions_used, expires_at, is_active)
values ('SPECIAL100', 100, 1, 0, now() + interval '30 days', true);
```

- `code` — whatever string the member will type in; keep it unique.
- `credit_value` — coins granted on redemption.
- `max_redemptions` — set to `1` for a single-use code for one person, or higher for
  a code meant to be shared among a group.
- `expires_at` — set `null` for a code that never expires.
- `is_active` — set `false` later (via `update`) to kill a code early without
  deleting its row (keeps redemption history intact).

The member redeems it themselves through the site's coupon-entry UI (in
`js/auth-widget.js`), which calls `redeem_coupon('SPECIAL100')`. That RPC handles all
validation (expiry, active flag, redemption limit, already-redeemed-by-this-user) and
credits their balance atomically — you do not need to touch `profiles` or
`credit_ledger` directly.

To check who has redeemed a coupon:

```sql
select * from public.coupon_redemptions where coupon_id = (select id from public.coupons where code = 'SPECIAL100');
```

## 10. Re-enabling email/password login

Full detail lives in `EMAIL_AUTH_DISABLED.md` at the repo root — read that file for
exact line references. Summary: email/password auth (including a 3-step forgot-password
flow) is fully implemented in `js/auth-widget.js` but currently commented out (not
deleted), because only Google OAuth is live today. Re-enabling requires uncommenting
four specific blocks in that file: the HTML email-login section, its event listeners,
the email form submit handler, and the forgot-password modal logic. No Supabase schema
changes are needed for this — Supabase Auth already supports email/password out of the
box; this is purely a frontend re-enable.

## 11. Ads system (separate from coin-earning)

Note: `js/ads-manager.js` is a legacy/stale Google AdSense loader referencing a
placeholder `PLACEHOLDER_PUB_ID` and gated by a `localStorage.getItem('userType')`
check whose comment is out of date (it says "no login system exists yet", which is no
longer true — Google OAuth is live). Treat this file as needing review/cleanup before
relying on it; it is not the mechanism used for coin-earning ad detection (that's
`js/verify-tracking.js`, described in 5.1) — this file is about actually *displaying*
AdSense ad units for site revenue, a separate concern from the coin economy.

## 12. Validation checklist before committing

- No Devanagari/Hinglish text anywhere in code, comments, or SEO copy — grep with
  `grep -nP "[\x{0900}-\x{097F}]"` across changed files.
- No "upcoming"/"coming soon" wording anywhere unless explicitly requested.
- Syntax-check any inline `<script>` blocks and standalone `.js` files before
  committing (e.g. `node -c file.js`, or wrap inline script content in
  `new Function(...)`).
- If `sitemap.xml` was touched, confirm it's still valid XML.
- If any JSON-LD block was touched, confirm it's still valid JSON.
- Commit and push — GitHub Actions deploys automatically on push to `master`/`main`,
  no manual deploy step needed.
