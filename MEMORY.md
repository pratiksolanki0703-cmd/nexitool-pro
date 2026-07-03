# NexiTool.pro Project Memory

## Project Overview
- **Project**: NexiTool.pro - Free online tools website
- **Status**: Phase 1 complete & deployed on GitHub Pages
- **Repository**: https://github.com/pratiksolanki0703-cmd/nexitool-pro
- **Live Site**: https://nexitool.pro (GitHub Pages)

## Current State (as of 2026-07-03)
- ✅ Static website built with vanilla HTML/CSS/JS
- ✅ Image tools section (`/tools/image-tools/`)
- ✅ PDF tools section (`/tools/pdf-tools/`)
- ✅ Header & Footer components (with animations)
- ✅ GitHub Pages deployment working
- ✅ 404 errors fixed + header/footer loading issue resolved (commit 37b3f5d)
- ✅ Mobile responsive design
- ✅ SEO setup (sitemap.xml, robots.txt, favicon)
- ✅ Header/footer real root-cause fix (2026-07-03): site has NO CNAME, so it's served
  from a GitHub Pages *project subpath*, not the domain root. Absolute paths like
  `/components/header.html` 404 there. Fixed `js/script.js` to use relative
  `../`-prefixed paths computed from folder depth. `js/favicon.js` had its own
  separate, outdated pretty-URL-guessing depth logic — reconciled to the same simple
  `pathParts.length - 1` calculation.
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
