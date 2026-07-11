# AI_CONTEXT.md — Memory & Context for opencode (and any AI assistant)

> **Purpose**: Ye file isliye bani hai kyunki opencode (ya koi bhi AI assistant)
> har naye session me purana context bhool jata hai. Session band hote hi sab
> khatam. Is file ko padhne ke baad AI ko poora project ka context mil jana
> chahiye — bina purani chat history dekhe.
>
> **Last updated**: 2026-07-11
> **Created by**: opencode (GLM-5.2 model)
> **Note**: Ye file `MEMORY.md` ka replacement NAHI hai. `MEMORY.md` Claude
> (Haiku 4.5) ne 2026-07-03 ko banayi thi. Dono files padhni chahiye —
> `USER_GUIDE.md` sabse detailed/authoritative hai, `MEMORY.md` me open
> issues aur coin economy ka planning history hai, ye file sirf mera
> quick-reference hai.

---

## 1. Quick Facts (shaam ko 5 sec me padh lo)

- **Project**: NexiTool.pro — free online tools (image, PDF, email) + coin-based AI tools
- **Repo**: `pratiksolanki0703-cmd/nexitool-pro` (public)
- **Live**: GitHub Pages auto-deploy on push to `master`/`main` via
  `.github/workflows/deploy.yml` (just uploads repo root, no build step)
- **Test URL**: `https://pratiksolanki0703-cmd.github.io/nexitool-pro/`
  (kyunki `nexitool.pro` domain ICANN transfer lock me hai abhi, GitHub Pages
  subpath pe serve ho raha hai)
- **Tech stack**: Vanilla HTML/CSS/JS, no framework, no bundler, no build step
- **Backend**: Supabase (hosted Postgres + Auth + 1 Edge Function `ai-tool`)
- **Git user**: Solanki Pratik `<pratik@nexitool.pro>`
- **Branch**: `master` (primary dev), `main` (mirror)
- **Open tools**: 23 total (6 image, 11 PDF, 7 email) — count via `grep -c "id:" js/tools-data.js`
- **Admin panel**: ALAG private repo `pratiksolanki0703-cmd/admin`, local-only, never deployed

---

## 2. Environment / Access (IMPORTANT — session start yaha se check karo)

1. **GitHub CLI**: `gh auth status` se check karo login hai ya nahi.
   - User ka patiksolanki0703-cmd account se linked hai (token scopes: repo, workflow, read:org, gist)
   - Agar logged out: user se bolo `gh auth login` karembhai (Termux Ubuntu me).
   - Repo clone: `gh repo clone pratiksolanki0703-cmd/nexitool-pro <dir>`
2. **Supabase CLI**: `supabase projects list` se verify karo.
   - Project ID: `wznrwewwwaqhxlhvfqol` (name "Nexitool.pro", region ap-northeast-1)
   - **Claude ka token 2026-07-03 ko expire hua tha — future session me fresh `supabase login` chahiye bina maange nahi milega.**
   - Migrations: `supabase/migrations/*.sql` (8 files, chronological by timestamp prefix)
3. **Supabase dashboard** (fallback agar CLI nahi): https://supabase.com/dashboard
   - SQL Editor manual migration run ho sakta hai
   - Email/password auth + Google OAuth providers Dashboard me toggle hote hain (local Docker nahi hai)
4. **No localhost dev server assumption** — ye Termux/Ubuntu proot me chal raha hai,
   Python http.server ya `npx serve` chala sakte ho agar local preview chahiye.

---

## 3. Critical Rules (hamesha yaad rakh, bina reminder)

1. **Code/comments/SEO copy me Hinglish/Devanagari text MANA hai.**
   Quick check karna hoga commit se pehle:
   ```bash
   grep -rnP "[\x{0900}-\x{097F}]" --include=*.html --include=*.css --include=*.js .
   ```
   (baat AM conversation me Hindi/English ho sakti hai — ye rule sirf code/files pe lagu)
2. **"Coming soon" / "upcoming" jaisa wording MANA hai** unless user explicitly bole.
3. **Header/footer fix claim kabhi sirf `curl` se mat karo.** MEMORY.md issue #6 history:
   Claude ne `curl` se verify karke "fixed" bol diya tha, but real browser me broken tha.
   Hamesha bolo user ko: "browser me live site khol ke verify karo" — local check
   enough nahi hai.
4. **text2tool.in se kuch copy mat karo** — ni `MEMORY.md` me standing rule hai.
   Wording, icon choices, layout — kuch bhi nahi.
5. **Never commit secrets** — Supabase service_role key, Gemini API keys, OAuth
   client secrets — ye sab Edge Functions ke env secrets me hain, repo me nahi.
6. **AI bina user se puche commit/push mat karo.** OAuth keys/test runs ki tarah
   user ko verify karne do. (User ne explicitly bola tha.)
7. **Client-side JS se table writes mat karo.** Sirf 4 RPC functions se mutations
   allowed: `earn_ad_tick`, `earn_video_ad`, `spend_credit`, `redeem_coupon`.
   Aur admin panel ke: `admin_*` functions (gated by `is_current_admin()`).
8. **Run lint/typecheck agar setup hai**: ye static HTML site hai, koi linter
   nahi. JS syntax check: `node -c js/file.js` se karo before commit.
   git pre-commit hook? — check karo. `ls .git/hooks/` aur `cat .git/hooks/pre-commit 2>/dev/null`

---

## 4. File reference (jaldi jaanne ke liye)

```
index.html                Homepage — tool grid, categories
about.html, privacy-policy.html, terms-of-service.html, coin.html   Static pages

components/header.html    Runtime pe inject hota hai (js/script.js loadComponents)
components/footer.html    Same

style.css                 Single global stylesheet (~43KB, neon v3 palette)
tools/tool-style.css      Tool pages ka shared stylesheet

js/script.js              Core: header/footer loader, homepage render, theme toggle, related tools
js/tools-data.js          TOOLS[] + CATEGORIES[] — 23 entries, master list
js/auth-widget.js         MOST IMPORTANT auth/coin file — login, balance UI, coupon redeem
js/supabase-client.js     window.supabaseClient init (URL + anon key, safe to expose)
js/earn-ticker.js         Passive coin earning (30s tick, gated on login+visibility+no adblock)
js/verify-tracking.js     Ad-blocker detection (real fetch probe, gates ALL earning)
js/rewarded-ads.js        Rewarded video — NOT LIVE (AD_NETWORK_READY = false)
js/ads-manager.js         STALE AdSense loader — review needed before use
js/header-animation.js    Visual effect only
js/announcement-*.js      Optional banner system
js/guide-content.js + user-guide.js  First-login onboarding modal (END USER ka, ye file nahi)

tools/image-tools/*.html   6 free image tools
tools/pdf-tools/*.html      11 free PDF tools
tools/email-tools/*.html    7 tools — mix of free (temp-mail, scam-checker) + premium (AI)

admin/generator.html       Local-only tool page generator (noindex, never deployed)

supabase/functions/ai-tool/index.ts   THE single Edge Function for all AI tools
supabase/migrations/*.sql             8 migrations, chronological by timestamp prefix
supabase/config.toml                  Local CLI config (for local dev, not used today)
```

### Key insight (Edge Function ka)
- Sirf EK Edge Function `ai-tool` hai jo sab AI tools power karta hai.
- Request body me `tool_id` string aata hai, usse `models` table lookup hota hai.
- `callGemini()` helper 3 keys me round-robins (GEMINI_KEY_1/2/3 secrets).
- **SIRF Gemini text generation support karta hai.** Image/video/voice models
  register karoge to Edge Function me hand-edit karke naya provider function
  add karna padega (e.g. `callStableDiffusion()`) — generator.html sirf frontend
  wiring deta hai, ye backend change nahi.

---

## 5. Coin economy (tl;dr)

| Method | Amount | Live? |
|---|---|---|
| Welcome bonus (Google signup) | 20 coins once | Yes |
| Passive tick (30s, login+visible+no adblock) | ~5/tick | Yes |
| Rewarded video ad | ~30/watch | **No** (AD_NETWORK_READY = false, waiting Adsterra/Monetag approval) |
| Coupon redeem | per coupon credit_value | Yes |
| Server-side cap | 90 coins/min/user (earn_ad + earn_video combined, inside RPC) | Enforced server-side |
| Spend | sirf `spend_credit(p_model_id)` se, Edge Function se | Atomic row-lock based |

---

## 6. Known open issues (abhi tak fix nahi — MEMORY.md se)

Ye 2026-07-03 ko user ne live site pe report kiye, MEMORY.md me listed.
Recent commits (b6d50e4, beba572) dekh ke lagta hai design/tools ka kaam hua
hai but ye specific issues resolve hua ya nahi — user se confirm karo bina
zięki assumptions mat karo:

1. Design cheap/AI-generated lagta hai, premium nahi
2. Trending badge oversized hai — tool card cover kar deta
3. text2tool.in jaisa lagta hai (multiple attempts ke baad bhi)
4. SEO content narrow hai — sirf "image and PDF" mention, aane wale AI tools
   ke liye scale nahi karta
5. Category color inconsistent (PDF card: pink border, red icon)
6. **Header/footer inner tool pages pe load nahi hote (sirf homepage)** —
   Claude ne claim kiya fix, but user ne live pe broken report kiya. curl se
   verify mat karna.
7. Missing pages: About, Privacy Policy, Terms, Contact — though abhi files
   exist kar rahe hain (2026-07-11 ls output per) to shayad ho gaye. Verify.

---

## 7. Admin panel (separate repo)

- `pratiksolanki0703-cmd/admin` private repo — local only, never deployed
- Schemas + RPCs yaha `supabase/migrations/20260707000000_admin_panel.sql` me
- Features: `profiles.is_admin`, `profiles.is_blocked`, `coupons.restricted_to_user_id`,
  per-user daily 2-coupon cap, `max_redemptions=1` hard constraint, `credit_value <= 1000` hard
- Admin RPCs: `admin_search_user`, `admin_list_users`, `admin_top_spenders`,
  `admin_stats`, `admin_set_blocked`, `admin_generate_coupon`, `admin_list_coupons`
- **No RPC to directly set balance** — by design, only coupon redemption
  adds coins (manual SQL Dashboard se else)

---

## 8. Email auth (current state)

- Google OAuth = LIVE
- Email/password = implement + tested but **commented out** in `js/auth-widget.js`
  (`EMAIL_AUTH_DISABLED.md` dekho for 4 uncomment blocks)
- Re-enable: uncomment karna hai, koi schema change nahi — Supabase Auth already
  supports, sirf frontend toggle
- Forgot password 3-step modal bhi ready commented (email → OTP → new password)

---

## 9. My (opencode) workflow

**Naya session shuru hone pe:**
1. `gh auth status` check karo (logged in nahi to user se bolo `gh auth login`)
2. `cd /root/myproject` ya jaha bhi working dir ho, `git status` + `git log --oneline -5`
3. Ye file + `USER_GUIDE.md` + `MEMORY.md` padh lo
4. Agar Supabase ka kaam hai: `supabase projects list` se check, nahi to
   user se access token mango (ya Dashboard SQL Editor bolo)

**Kisi change ka pehle:**
1. Related file(s) padh lo (`read` tool se)
2. `tools-data.js` agar naya tool add kar rahe ho (entry pattern mimic karo)
3. Naive edits mat karo — pattern pehle samjho (`color-{slug}`, RPC-only writes, etc.)

**Commit karne ka pehle (user se permission maango):**
1. `grep -rnP "[\x{0900}-\x{097F}]"` — Devanagari check
2. `node -c js/file.js` for JS syntax  
3. `git status` clean state verify
4. Commit message me Hinglish allowed (chat ki tarah) — but code me nahi
5. Push karne ke baad GitHub Actions deploy live (~1-2 min), user ko live verify bolo

**Yaad rakh:**
- Mai opencode hoon (GLM-5.2), Claude nahi. Claude ki MEMORY.md update nahi
  karta — usko alag rakho. Ye file mere specific context ke liye hai.
- User/chat Hindi/English mix me baat karta hai — mai bhi usi style me reply.
- User ne bola tha "tum bhi GitHub pe apni yaadasht wali file bana lena" —
  ye wahi file hai.

---

## 10. Pending TODOs (from MEMORY.md + recent commits hint)

- [ ] Header/footer fix verify (issue #6 above) — top priority stand
- [ ] Design premium feel (issue #1, #3)
- [ ] Trending badge resize (issue #2)
- [ ] SEO content broaden (issue #4)
- [ ] Category color consistency (issue #5)
- [ ] Rewarded video ad (Adsterra/Monetag account approval intezar)
- [ ] Google OAuth creds setup (real client_id/secret in Supabase Dashboard)
- [ ] Coupon redemption UI — auth-widget.js me partial? verify
- [ ] More image/PDF tools (compress/resize/merge/split/watermark — some done per recent commits)
- [ ] Real AdSense/revenue ads — `ads-manager.js` stale, needs cleanup
- [ ] i18n (Hindi support) — greenfield
- [ ] Non-Gemini providers ko support karne ke liye Edge Function me
      branching add karna (text-to-image etc.) — greenfield
