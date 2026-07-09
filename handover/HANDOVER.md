# Bhullar Dairy Farm Dashboard — Agent Handover Brief
**Date:** 2026-06-18  
**Checkpoint commit:** `8ef009108c9cb3dad630975882f5f37c9c4f4c62`  
**Handover prepared by:** Replit Agent (Session 2)

---

## 1. What This Project Is

A **pre-built, read-only static PWA** — a mobile-first dairy farm operations dashboard for Bhullar Dairy Farm, Punjab, India. The React source code is compiled and locked in `public/assets/index-CrpyjvbJ.js` (bundle). All customisation lives in override files loaded after the bundle.

**The app is read-only from a source perspective.** You cannot touch `public/assets/`. All visual changes, bug fixes, and behavioural patches go in the five override files only.

---

## 2. Stack & Architecture

| Layer | Technology |
|---|---|
| App shell | React 18 (pre-compiled, read-only bundle) |
| Styling | Tailwind CSS (in bundle) + `aero.css` override |
| Theming | `aero.js` DOM patcher + `theme-bootstrap.js` |
| Bug fixes | `patch.css` + `patch-security.js` |
| PWA / offline | `sw.js` (Service Worker, cache-first strategy) |
| Dev server | Vite 7.3.3 via pnpm workspace |
| Deployment | Static SPA (Replit hosted) |

**Workspace layout:**
```
artifacts/bhullar-dairy/
  index.html                    ← app shell + splash screen HTML
  public/
    assets/
      index-CrpyjvbJ.js         ← READ-ONLY compiled React bundle
      index-B1BBlUQ6.css        ← READ-ONLY bundle CSS (Tailwind)
    aero.css          (1,307 lines) ← Punjab Pulse design system v9
    aero.js           (  528 lines) ← DOM patcher / theme enforcer v9
    patch.css         (  198 lines) ← scroll/z-index bug fixes (DO NOT MODIFY)
    patch-security.js (  121 lines) ← JSON import guard + Date constructor patch
    theme-bootstrap.js(   40 lines) ← sets data-aero-theme before React mounts
    sw.js             (   96 lines) ← Service Worker v8 (bhullar-v8 cache)
    manifest.json                   ← PWA manifest
    favicon.svg / opengraph.jpg / icons/ / robots.txt
```

**Stylesheet load order (must be preserved):**
```html
1. /assets/index-B1BBlUQ6.css   (bundle — Tailwind base)
2. /aero.css                    (Punjab Pulse overrides)
3. /patch.css                   (scroll/UI fixes — loads LAST, wins cascade)
```

**Script load order:**
```html
1. /theme-bootstrap.js          (sync, inline — sets data-aero-theme before paint)
2. /assets/index-CrpyjvbJ.js   (React bundle, module)
3. /aero.js                     (defer — DOM patcher)
4. /patch-security.js           (defer — JSON import guard)
```

---

## 3. Design System — Punjab Pulse v9

### Colour Palette

| Token | Dark ("Midnight Herd") | Light ("Sunrise Harvest") |
|---|---|---|
| Primary / Gold | `#FFB800` electric saffron | `#D97706` amber |
| Secondary / Green | `#10B981` vibrant emerald | `#059669` forest |
| Background | `#04070A` deep midnight | `#FDFBF4` warm cream |
| Surface | `#070C10` | `#FFF8E8` |
| Text primary | `#E8E0CC` warm cream | `#1C1206` |

### Key CSS Custom Properties (set in `aero.js` CSS_VARS)

```
Dark:  --primary: 43 100% 50%   (gold #FFB800)
       --accent:  218 20% 10%   ← IMPORTANT: dark neutral, NOT green
                                  (bg-accent = dark glass, not solid green)
Light: --primary: 35 93% 43%   (amber #D97706)
       --accent:  40 25% 90%
```

### Design Language
- **Heavy glassmorphism** — `backdrop-filter: blur(24px) saturate(200%)` on all cards
- **Neon gold glow halos** in dark mode on buttons, active tabs, FABs, focused inputs
- **Warm gold aura** in light mode (no neon)
- **Electric ambient gradients** — radial gold/emerald orbs behind cards

---

## 4. Bugs Fixed in This Session

### Bug 1 — Solid green search bars / input pills (FIXED in aero.css v9)
**Root cause:** `--accent` was `135 28% 56%` (pastoral green). Bundle CSS defines `bg-accent { background: hsl(var(--accent)) }`. Input ancestor elements carry `bg-accent`. `backdrop-blur-sm` on inputs then blurred this green background, making inputs appear solid green with invisible text.

**Fix:** `--accent` changed to dark neutral `218 20% 10%` in dark, `40 25% 90%` in light. Additionally, `aero.css` explicitly overrides all `input` and `textarea` elements with `background: rgba(255,255,255,0.055) !important` + gold border — overriding any ancestor colour bleed.

CSS selectors used (aero.css lines 518–580):
```css
html[data-aero-theme="dark"] input:not([type="checkbox"])... { background: var(--input-bg) !important; }
html[data-aero-theme="dark"] .bg-accent { background: rgba(255,255,255,0.055) !important; }
```

### Bug 2 — Breeding record tab unscrollable (FIXED in aero.css v9)
**Root cause:** `aero.css .glass-card { overflow: hidden }` blocked scroll inside the breeding record sheet's nested glass-card. `patch.css` restores `overflow-y: auto` on the outer sheet, but inner glass-cards still set `overflow: hidden`, clipping tab panel content.

**Fix (aero.css lines 302–317):**
```css
.glass-card.overflow-y-auto .glass-card { overflow: visible !important; }
.glass-card.overflow-y-auto [role="tabpanel"] { overflow: visible !important; }
.glass-card.overflow-y-auto .grid.gap-3 { overflow: visible !important; }
```

---

## 5. Critical Rules for the Next Agent

> **MEMORISE THESE. Violating any one rule will break the app.**

1. **Never edit `public/assets/`** — the bundle is read-only and compiled. Changes there are overwritten on Vite rebuild.

2. **Never modify `patch.css`** — it is a carefully ordered cascade fix. Any change risks reintroducing scroll bugs in modals, sheets, and tables.

3. **Stylesheet load order is sacred** — `aero.css` must come before `patch.css`. `patch.css` must load last. See `index.html` lines 33–34.

4. **Chrome normalises inline hex to `rgb()`** — CSS attribute selectors like `[style*="#39FF14"]` WILL FAIL. Use `[style*="57, 255, 20"]` (the RGB form) instead. This is already handled in `aero.js hasNeonGreen()`.

5. **`--accent` must stay neutral** — if you ever reset `--accent` to any green value, `bg-accent` elements (search bars, pills, tag chips) will turn solid green again.

6. **`aero.css` and `aero.js` are in the Service Worker BYPASS_CACHE list** — changes to these files take effect immediately on next page load without needing a cache bust. `sw.js` version is `bhullar-v8` (bump this if you change the STATIC cache list or cached assets).

7. **`data-aero-theme` attribute on `<html>`** is the theming hook. CSS selectors use `html[data-aero-theme="dark"]` and `html[data-aero-theme="light"]`. Do not use `.dark` class (that's the React internal class on `.aero-bg`). `theme-bootstrap.js` keeps these in sync.

8. **No `pnpm run dev` at workspace root** — use `restart_workflow "artifacts/bhullar-dairy: web"` instead.

9. **Verify with `pnpm --filter @workspace/bhullar-dairy run typecheck`**, not `build`. Build needs `PORT` / `BASE_PATH` env vars that only the workflow wires up.

---

## 6. Security Audit Results

**Audit date:** 2026-06-18  
**Scanners:** OSV dependency scanner + Semgrep SAST + HoundDog dataflow scanner

### 6a. Dependency Audit

| Severity | Count |
|---|---|
| Critical | 0 |
| High | 1 |
| Moderate | 4 |
| Low | 2 |
| Info | 0 |

**All vulnerabilities are in build/dev tooling only — zero runtime exposure in the deployed static SPA.**

| CVE / GHSA | Package | Severity | Description | Risk to this app | Fix |
|---|---|---|---|---|---|
| CVE-2026-49356 | `@babel/core` 7.29.0 | LOW (listed HIGH in metadata) | Arbitrary file read via `sourceMappingURL` — requires attacker to control input source AND read output | None — dev-only transpiler, no user input, Linux server | Upgrade to 7.29.6 |
| GHSA-g7r4-m6w7-qqqr | `esbuild` 0.27.3 | LOW | Path traversal on dev server — Windows backslash bypass only | None — Linux deployment, dev server only | Upgrade to 0.28.1 |
| CVE-2026-53550 | `js-yaml` 4.1.1 | MODERATE | Quadratic DoS via YAML merge key `<<` — algorithmic CPU exhaustion | None — YAML only parsed in build pipeline, not at runtime | Upgrade to 4.2.0 |
| CVE-2026-48988 | `markdown-it` <14.2.0 | MODERATE | Quadratic DoS via `typographer: true` + repeated quotes | None — only used as dev tooling | Upgrade to 14.2.0 |
| (3 more) | various | LOW/MODERATE | Dev tooling only | None | `pnpm up --latest` in api-server and bhullar-dairy |

**Recommended action:** Run `pnpm up --latest` on dev dependencies. No urgency — all are dev-only.

### 6b. SAST (Semgrep)

**12 HIGH, 12 MEDIUM findings — NONE in project application code.**

| File | Severity | Finding | Notes |
|---|---|---|---|
| `.agents/skills/pptx/scripts/` | HIGH ×7 | XXE via Python `xml` library; unsafe `subprocess` | Replit platform skill files — read-only, not project code |
| `.agents/skills/brainstorming/scripts/helper.js` | HIGH | Insecure WebSocket (`ws:` not `wss:`) | Replit platform skill — not project code |
| `.agents/skills/skill-creator/scripts/` | HIGH ×3 | Unsafe `subprocess.Popen/run` | Replit platform skill — not project code |
| `.agents/skills/brainstorming/scripts/server.cjs` | MEDIUM ×6 | Path traversal, non-literal fs filenames, http server | Replit platform skill — not project code |
| `.agents/skills/skill-creator/assets/*.html` | MEDIUM ×2 | `innerHTML` XSS risk | Replit platform skill HTML — not project code |
| `artifacts/mockup-sandbox/src/App.tsx` | MEDIUM | Unsafe dynamic method | Dev Canvas tooling — not user-facing |

**`artifacts/bhullar-dairy/` — zero SAST findings.**

### 6c. HoundDog (Dataflow / Privacy)

**0 findings.**

### 6d. Manual aero.js Code Review

Confirmed by static analysis subagent:
- ✅ No `eval()` calls
- ✅ No `innerHTML` assignments (uses `createElement`, `textContent`, `style.setProperty`)
- ✅ No external `fetch()` (only registers local `/sw.js`)
- ✅ No user input sinks
- ✅ No credentials, tokens, or secrets in code

### 6e. Overall Security Posture

**The deployed application has no known runtime vulnerabilities.** All scanner findings are confined to build tooling and Replit platform agent skill files. The security posture of the user-facing PWA is clean.

`patch-security.js` provides additional runtime hardening:
- 5 MB file-size cap on JSON imports (prevents main-thread freeze / memory bomb)
- Confirmation dialog before JSON import to prevent silent data overwrite
- Date constructor polyfill for Punjab timezone correctness (UTC+5:30)

---

## 7. What Still Needs Work (Suggested Next Steps)

1. **Visual verification** — Screenshot tool was unavailable during this session. The next agent should take a screenshot to confirm the Punjab Pulse v9 design is rendering correctly. Key things to check:
   - Search bars are dark glass + gold border (NOT solid green)
   - Breeding record tab scrolls correctly
   - Active nav tabs glow electric gold
   - All cards have glassmorphism effect

2. **Dependency upgrades** — Minor, non-urgent. Run:
   ```bash
   pnpm up @babel/core esbuild js-yaml markdown-it --latest
   ```

3. **Potential further fine-tuning** — The neon gold glow intensity on buttons in dark mode may need dialling back if it feels too intense in practice.

4. **Add live data** — The app currently loads from localStorage. A future session could wire up the API server (`artifacts/api-server/`) to serve farm data.

---

## 8. Workflow Commands

```bash
# Start/restart the dashboard
# Use Replit workflow: "artifacts/bhullar-dairy: web"

# Typecheck (safe — no env vars needed)
pnpm --filter @workspace/bhullar-dairy run typecheck

# Typecheck all libs first
pnpm run typecheck:libs

# Full check
pnpm run typecheck

# Verify service worker BYPASS_CACHE list
grep -A 12 'BYPASS_CACHE' artifacts/bhullar-dairy/public/sw.js
```

---

## 9. File Checksums (key override files)

Generated at handover time:

| File | Lines | Purpose |
|---|---|---|
| `public/aero.css` | 1,307 | Punjab Pulse design system v9 |
| `public/aero.js` | 528 | DOM patcher / theme enforcer v9 |
| `public/patch.css` | 198 | Scroll + z-index bug fixes (DO NOT MODIFY) |
| `public/patch-security.js` | 121 | JSON import guard + Date TZ patch |
| `public/theme-bootstrap.js` | 40 | Pre-paint theme bootstrapper |
| `public/sw.js` | 96 | Service Worker (cache bhullar-v8) |
| `index.html` | 443 | App shell + splash screen |
