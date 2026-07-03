# NexiTool.pro Project Memory

## Project Overview
- **Project**: NexiTool.pro - Free online tools website
- **Status**: Phase 1 complete & deployed on GitHub Pages
- **Repository**: https://github.com/pratiksolanki0703-cmd/nexitool-pro
- **Live Site**: https://nexitool.pro (GitHub Pages)

## ⚠️ OPEN ISSUES from live-site review (2026-07-03) — NOT fixed, read this first
After the header/footer path fix + content rewrite in commit `72b1f52`, the user
reviewed the actual LIVE deployed site and reported these are still broken/unfinished.
**Do not claim any of these are fixed without the user confirming on the live site —
local `curl`/HTTP-200 checks are not sufficient proof (they only proved files are
reachable, not that the JS actually renders correctly in a real browser).**

1. **Style still looks cheap/AI-generated, not premium.** Two CSS rewrites (v2, v3)
   were not enough — needs a real design pass, not another palette swap.
2. **Trending badge is oversized** — big enough that it visually covers/overwhelms
   the tool card it's on. Needs to shrink to a normal small badge.
3. **Site still reads as a copy of text2tool.in**, despite two CSS rewrites and a full
   content/SEO/icon rewrite. This complaint has persisted through multiple fix
   attempts — likely needs real structural/layout differentiation, not just
   color/copy substitution.
4. **SEO content is too narrow.** Homepage SEO section + meta descriptions only
   mention "Image and PDF tools," but many more tool categories are planned (see
   the Coin/Credit Economy section below — server-side AI tools are coming). SEO
   copy needs to scale to that without a rewrite per new category, and generally
   needs to be much stronger.
5. **Category color inconsistency.** PDF tool card shows pink on the outside
   (card border) but red on the inside (icon) — no single consistent accent color
   per category. Every category needs ONE color used everywhere it appears.
6. **Header/footer STILL doesn't load on inner pages — only the homepage works.**
   The relative-path fix below was verified only via local server + curl, which does
   NOT prove real browser rendering on the actual GitHub Pages deployment. Root
   cause is still unconfirmed on tool pages (image-tools, pdf-tools) — re-investigate
   from scratch, don't assume the prior fix actually worked.
7. **Missing pages entirely**: About page, Privacy Policy page, likely Terms/Contact
   too — none of these exist yet.

Next step when resuming work: re-verify #6 first (the fix claim was wrong once
already), then work through the rest of this list in order. Confirm fixes on the
live site before marking anything done.

## Current State (as of 2026-07-03)
- ✅ Static website built with vanilla HTML/CSS/JS
- ✅ Image tools section (`/tools/image-tools/`)
- ✅ PDF tools section (`/tools/pdf-tools/`)
- ✅ Header & Footer components (with animations)
- ✅ GitHub Pages deployment working
- ✅ 404 errors fixed + header/footer loading issue resolved (commit 37b3f5d)
- ✅ Mobile responsive design
- ✅ SEO setup (sitemap.xml, robots.txt, favicon)
- ⚠️ Header/footer path fix attempted (2026-07-03, commit `72b1f52`) — site has NO
  CNAME, so it's served from a GitHub Pages *project subpath*, not the domain root.
  Absolute paths like `/components/header.html` 404 there. Changed `js/script.js` to
  use relative `../`-prefixed paths computed from folder depth, and reconciled
  `js/favicon.js`'s separate outdated depth logic to match. **User reports this is
  STILL broken on inner pages as of the same day — see Open Issues #6 above. Treat
  as unresolved, not fixed.**
- ✅ All internal links use explicit `.html` extensions for now (GitHub Pages testing).
  This is TEMPORARY — once hosted on Netlify, pretty URLs will be handled via
  `_redirects`, and `.html` will be dropped again.
- ✅ Original content pass (2026-07-03): rewrote ALL user-facing copy, SEO text,
  schema.org descriptions/FAQs, and icon choices across `index.html` and all 3 tool
  pages so nothing reads as copied from text2tool.in. Also diversified tool icons in
  `js/tools-data.js` (was `image-down`/`file-edit`/`file-down`, now
  `shrink`/`tag`/`file-archive`). Replaced emoji feature-grid icons with Lucide icons
  using the site's own neon color palette. Fixed `tools/tool-style.css`'s dead
  `var(--accent, var(--brand-primary))` fallback (that CSS var didn't exist in the v3
  palette) to `var(--accent, var(--primary-cyan))`. Removed leftover `style.css.backup`.
  **IMPORTANT STANDING RULE**: do not copy any wording, icon choices, or structure
  from text2tool.in going forward — always write original copy.

## Key Files & Structure
```
/
├── index.html              # Main homepage
├── style.css              # Global styles
├── js/
│   ├── script.js          # Main app logic
│   ├── tools-data.js      # Tools list data
│   ├── blogs-data.js      # Blog/content data
│   ├── header-animation.js
│   └── ads-manager.js
├── components/
│   ├── header.html
│   └── footer.html
├── tools/
│   ├── image-tools/       # Image conversion tools
│   ├── pdf-tools/         # PDF manipulation tools
│   └── tool-style.css
└── admin/
    └── generator.html     # Admin tool generator page
```

## Next Phase Tasks (TODO)
- [x] Fix header/footer loading issues
- [x] Create unique custom design (not copied from text2tool.in)
- [ ] Add more image tools (compress, resize, format conversion)
- [ ] Add more PDF tools (merge, split, watermark)
- [ ] Implement ads system (currently stubbed in ads-manager.js)
- [ ] Add analytics/tracking
- [ ] Blog system implementation
- [ ] User feedback/rating system
- [ ] Internationalization (i18n) for Hindi/other languages
- [ ] **Coin/credit economy (planned, NOT started — see below)**

## Planned: Coin/Credit Economy (2026-07-03, planning only, not implemented)
NexiTool.pro is **not** 100% browser-side (text2tool.in, our sister site, is 100%
browser-side + no login — don't claim that for NexiTool). NexiTool mixes:
- **Browser-side tools** (image compressor, image rename, PDF compressor, etc.) —
  always free, never cost coins.
- **Server-side tools** (text-to-voice, text-to-image, AI chat, AI code, etc.) — cost
  real backend/API credits, so they will deduct user coins.

Model (no real-money payment on this site):
- Passive earning: while active on-site with ads visible, +8 coins every 30 seconds.
- Active earning: "Earn Credit" button → watch a rewarded video ad → +30 coins.
- Server-side tool usage deducts coins; browser-side tools never do.
- Login required (Google + Email only, to start) so coins can attach to an account.
- Coins/credits live in **Supabase**, server-side only — never trust client state.
- Anti-abuse: Supabase-enforced cap of **max 90 coins/minute/user**; earning stops
  immediately if the user runs an adblocker or leaves the tab/site.
- No paid "buy credits" option on NexiTool.pro itself — if there's enough traffic and
  demand later, a **separate new website** will be built for that, keeping NexiTool
  purely ad/coin-funded.

Status: brain-dump from the user, explicitly not to be coded yet. No Supabase, auth,
or coin logic exists in this repo. Revisit this section when asked to build it.

### Per-tool/per-model pricing + coupon architecture (discussed 2026-07-03, planning only)
- **Model/price**: hybrid, not a Supabase fetch on every page load. Model `id`/`name`/
  `cost` live hardcoded in the static site's JS (instant display, zero request) AND the
  same `id`+`cost` live in one flat Supabase `models` table covering ALL model types
  (image, video, text, voice — not split into separate tables per tool). On generate,
  client sends only `model_id` (never a price); an Edge Function looks up the real cost
  from Supabase and checks balance before proceeding. Server never trusts a client-sent
  price. Tradeoff: code and Supabase must both be updated on a price change, or display
  and actual charge can briefly mismatch (cosmetic risk only, not a security hole).
- **Coupons**: two tables — `coupons` (code, credit_value, max_redemptions, expires_at,
  is_active) + `coupon_redemptions` (coupon_id, user_id, redeemed_at, UNIQUE on
  coupon_id+user_id to block double redemption). Redemption via Edge Function/RPC only.
  Admin control: use Supabase's own Table Editor manually at first (no custom panel
  needed yet); build a small internal admin page later, once volume justifies it, and
  even then route writes through a protected Edge Function, never direct table writes
  from the admin's browser. Consider bulk coupon generation when that page gets built.
- **Balance display**: fetch once on login, cache client-side; every earn/spend/redeem
  Edge Function response returns the updated balance so the frontend updates locally
  instead of a separate fetch. The passive-earn tick (+8 coins/30s) doubles as the
  periodic balance sync — no extra polling needed.
- **Rewarded video ad — reward on completion, not a fixed timer**: grant 30 coins only
  on the ad SDK's own "completed" event; ad length is whatever the served ad's real
  duration is (network-decided), not a fixed 30s wait. Close/skip early = no reward.
  Never trust a client-side JS completion event alone (spoofable) — prefer ad networks
  with server-side postback/verification (SSV). Google AdSense (self-serve) has no
  rewarded-video unit for websites (AdMob/mobile-only product) — for web, evaluate
  AdGate Media, OfferToro, AdGem, Notik, Revlum, or Adsterra's rewarded video instead.
- **Ad-blocker check + completion verification (proposed flow)**: planned networks are
  **Adsterra and/or Monetag** for rewarded video. On "Watch Ad" click: first detect via
  JS whether the ad script actually loaded (adblock check — SDK object on `window`
  after a timeout, or the network's own built-in detection API); if blocked, show a
  custom modal asking to disable the ad-blocker instead of loading the ad. Only trigger
  the ad if not blocked. For completion: both networks' rewarded formats expose a
  function/Promise that resolves only on genuine full completion (not on early
  close/skip) — credit coins only from that resolution, never a generic "closed" event.
  This is still client-side JS (not fully tamper-proof) — prefer server-side postback
  (S2S) if the network offers it even for small publishers; otherwise the existing
  90-coins/minute cap bounds abuse impact, and since coins have no real-money cashout,
  perfect fraud-proofing is lower priority than a real cashout site — acceptable for v1.
- **Idea (not yet implemented): earn-while-you-wait during AI generation.** While a
  server-side generation job (image/video model) is processing, optionally suggest a
  rewarded-video popup so the user can earn coins during the wait. The generation job
  must always run independently in the background regardless of ad-watching — never
  gate the result on watching an ad. Only show the prompt when expected wait time is
  long enough to matter (per-model typical duration).
- **Supabase access status**: assistant confirmed it CAN control Supabase (schema, RLS,
  edge functions, auth) once given real access (token/API keys/CLI login) — no MCP tool
  or stored credentials exist yet. User said "ha vo access me de dunga" (will provide
  access) — **promised but not yet given** as of last check. Verify before assuming.
- **Manual new-tool-page process + how identity/coins tie to a request**: (1) insert a
  row in Supabase `models` table (id/name/cost/type); (2) mirror same id+cost in static
  JS; (3) build a new HTML tool page (same pattern as `admin/generator.html`); (4) gate
  it behind Supabase Auth login; (5) on Generate, client sends only `model_id` + input
  to an Edge Function — never a user_id, never a price. **Identity mechanism**: user_id
  is never passed as a parameter (spoofable) — Supabase Auth issues a JWT on login, the
  client attaches it automatically to Edge Function calls, and the Edge Function
  verifies the JWT server-side to derive the real trusted user_id. All coin
  deduction/crediting ties to that verified identity only. (6) Edge Function looks up
  real cost by `model_id`, checks balance, atomically deducts if sufficient, calls the
  AI provider (API key stays server-side), returns result + updated balance. (7) Add
  the tool's card/link to the homepage/nav.

## Design Updates (2026-07-03)

### Style v3 - Completely Unique & Bold Design
**FINAL ORIGINAL DESIGN - NOT based on text2tool.in:**

**Vibrant Neon Aesthetic:**
- ✅ Neon primary colors: Green (#00ff88), Cyan (#00d4ff), Purple (#7c3aed)
- ✅ Vibrant accents: Pink, Orange, Yellow
- ✅ Completely different visual language from text2tool.in
- ✅ Glowing effects and neon shadows throughout
- ✅ Custom gradients everywhere

**Cards & Components:**
- ✅ Unique card design with top/left borders (not all-around)
- ✅ Gradient card backgrounds with neon glow
- ✅ Smooth cubic-bezier transitions (0.4s timing)
- ✅ Cards lift up 6px on hover with scale effect
- ✅ Shine effect animation passes through cards
- ✅ Color-coded by category with unique accent system

**Typography & Text:**
- ✅ Bold uppercase section titles with letter-spacing
- ✅ Heavy font weights (800-900) for prominence
- ✅ Neon green section indicators with glow
- ✅ Custom monospace fonts for badges/tags

**Animations & Effects:**
- ✅ Bounce ball logo animation on hover
- ✅ Flicker effects on trending badges
- ✅ Gradient shimmer on cards
- ✅ Underline animations on nav links
- ✅ Smooth slide down animations
- ✅ Custom cubic-bezier curves for elegance

**Unique Elements:**
- ✅ Neon border on header & footer (not subtle)
- ✅ Glowing search input with cyan focus state
- ✅ Section separators with animated neon dots
- ✅ Neon-colored link arrows in footer
- ✅ Gradient hero background blob effect
- ✅ Bold uppercase category tags

**Original Color System:**
```
Primary: #00ff88 (Neon Green)
Secondary: #00d4ff (Cyan)
Accents: Purple, Pink, Orange, Yellow
No soft/muted colors - everything is bold
```

### Header/Footer Fix (superseded — see Current State above for the real fix)
The `/components/header.html` absolute-path approach mentioned in an earlier version
of this file was WRONG and caused the header/footer to break sitewide (no CNAME means
the site lives at a GitHub Pages subpath, not the domain root). The actual fix uses
relative `../`-prefixed paths in `js/script.js`.

## Recent Commits
1. `37b3f5d` - Fix 404s and header/footer load failure on GitHub Pages
2. `e926b97` - Phase 1: NexiTool.pro static site (Image + PDF tools)
(See `git log` for commits after this file was last updated.)

## Development Notes
- No build system (pure static HTML/CSS/JS)
- GitHub Pages compatible (Jekyll disabled with .nojekyll)
- Netlify redirects configured (_redirects file)
- Git user: Solanki Pratik (pratik@nexitool.pro)

## Access & Deployment
- GitHub Remote: https://github.com/pratiksolanki0703-cmd/nexitool-pro
- Branch: master (main development)
- Deployment: Automatic via GitHub Pages on master branch push
- Status: Working & Live ✅

---
**Last Updated**: 2026-07-03
**Updated By**: Claude (Haiku 4.5)
