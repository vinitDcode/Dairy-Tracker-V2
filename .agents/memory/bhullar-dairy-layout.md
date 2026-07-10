---
name: Bhullar Dairy project layout
description: Actual paths, workflow, env vars, file roles, and architecture for the Bhullar Dairy Farm Dashboard.
---

## Real artifact path
`artifacts/file-viewer/` — NOT `artifacts/bhullar-dairy/` (handover doc is wrong).

## Workflow
Managed: `artifacts/file-viewer: web`
Port: 23225 (set via artifact.toml [services.env])
**Why:** vite.config.ts hard-throws if PORT or BASE_PATH env vars are missing. The managed artifact workflow injects them automatically from artifact.toml — do NOT create a duplicate manual workflow.

## CRITICAL: SPA Data Architecture
The SPA is FULLY LOCALSTORAGE-based. All cattle/semen/lineage data lives in:
- `bdf_cows`    — [{id, tagNumber, breed, age, lactationStage, lastCalvingDate, coolingStatus}]
- `bdf_semen`   — [{id, bullName, bullCode, breed, traitScore (1–10), costPerDose, providerName, batchDate, notes, flagged, flagReason}]
- `bdf_lineage` — [{id, damId, calfId, sireId, dosesUsed, roi, hasEnoughData}]
- `bdf_logs`    — [{date, yield, liters, fat}]
- `bdf_vac`, `bdf_diagnoses`, `bdf_dark` — other app state

There is ONLY ONE Supabase table used by the SPA: `farm_data` (cloud sync/export).
DO NOT query cattle/semen_inventory/heat_logs/inseminations via Supabase REST — those tables don't exist in production.
Supabase is only valid for the weather-proxy Edge Function (THI live data).

## Field names — camelCase throughout
Cow: tagNumber, lastCalvingDate, breed, age, lactationStage, coolingStatus
Semen: bullName, bullCode, traitScore, costPerDose, providerName, batchDate, flagged, flagReason
Lineage: damId, calfId, sireId, dosesUsed, roi, hasEnoughData

## File roles (load order preserved in index.html)
Sync: theme-bootstrap.js → supabase-config.js
Module: /assets/index-CrpyjvbJ.js (READ-ONLY bundle)
CSS: index-B1BBlUQ6.css → aero.css → patch.css
Defer: genetics-boost.js → aero.js → patch-security.js

Key files:
- `public/genetics-boost.js` — genetics intelligence panel (v3, localStorage-based, 6 cards)
- `public/aero.css` — design system; all .gbm-* styles start at line ~811; :root vars at line 812
- `public/supabase-config.js` — sets window.__BDF_SUPABASE_URL / __BDF_SUPABASE_KEY
- `public/supabase-migration-v2.sql` — Phase 0 SaaS migration (farms table, RLS, indexes, RPC)
- `supabase/functions/weather-proxy/index.ts` — Edge Function (OWM proxy, no key in client)
- `public/sw.js` — service worker; bump CACHE = 'bhullar-vN' after any static file changes (currently v9)
- `public/patch.css` — structural scroll fixes; DO NOT MODIFY
- `public/aero.js` — ripple, logo injection, theme sync

## Genetics panel injection (genetics-boost.js v3)
Detection strategy:
1. Prefer [role="tabpanel"] containing genetics keywords
2. Fallback: largest qualifying element (not the whole viewport)
**Why largest not smallest:** smallest-area strategy lands on nested buttons; we want the outermost tab content container.

Heat cycle math fix:
- `cyclePos = daysSince % 21`
- `remaining = (cyclePos === 0 && daysSince > 0) ? 0 : (21 - cyclePos)` — handles boundary (today = heat due)

online/offline listeners attached once at module level via `_listenersAttached` flag — do not attach inside inject() or they accumulate.

## Splash screen is NOT a bug — screenshot timing artifact
theme-bootstrap.js injects a full-screen branded splash synchronously; aero.js dismisses it once `.aero-bg` appears (or after a hard 1800ms safety timeout no matter what). The Screenshot tool often captures a frame before that timer fires, making the app look permanently stuck on the splash across many repeated screenshots (each is a fresh navigation, not a continued wait).
**Why:** wasted significant time treating this as a hang/auth-lock bug. Confirmed real behavior by temporarily adding `console.log` to aero.js's setTimeout callback and reading it back via the Screenshot tool's browser-console output — logs showed `aero-bg found=true, splash present=false`, i.e. it dismisses correctly.
**How to apply:** if the splash appears stuck in a screenshot, don't assume a real bug — add temporary console.log diagnostics to the relevant public/*.js override file and re-screenshot to see actual runtime state before investigating further. `/favicon.ico` 404 in console logs is also harmless noise (no favicon.ico file, only favicon.svg).

## Critical rules
- Never set -webkit-text-fill-color on broad text selectors (hides numbers)
- patch.css must load LAST (wins cascade for scroll fixes)
- Bump sw.js cache name (bhullar-vN) whenever ANY static file in public/ changes
- Managed workflow injects PORT+BASE_PATH — never recreate a manual duplicate workflow
- The `URL` global must not be shadowed; name Supabase URL vars differently (e.g. SBURL)
