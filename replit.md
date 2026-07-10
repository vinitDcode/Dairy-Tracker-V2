# Bhullar Dairy Farm Dashboard

A mobile-first dairy farm operations dashboard (cattle, milk yield, health alerts, revenue) for Bhullar Dairy Farm, Punjab, India.

## Run & Operate

- The app runs via the `artifacts/file-viewer: web` workflow (Vite dev server on the port Replit assigns). Restart it after changing anything under `artifacts/file-viewer/public/`.
- `pnpm --filter @workspace/file-viewer run typecheck` — safe typecheck (no env vars needed)
- `pnpm run typecheck` — full typecheck across all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9, Vite 7
- App shell is a **pre-built, read-only React bundle** (`public/assets/index-CrpyjvbJ.js` + `.css`) — `src/` is an unused scaffold, not part of the render path
- All customization/theming/bug-fixes go through override files loaded after the bundle: `public/theme-bootstrap.js`, `public/aero.js`, `public/aero.css`, `public/patch.css`, `public/patch-security.js`
- Data: fully localStorage-based (`bdf_cows`, `bdf_semen`, `bdf_lineage`, `bdf_logs`, `bdf_vac`, `bdf_diagnoses`, `bdf_dark`); Supabase is used only for optional cloud sync (`farm_data` table) and Google OAuth sign-in
- PWA: `public/sw.js` service worker, `public/manifest.json`

## Where things live

- `artifacts/file-viewer/index.html` — app shell + splash screen container
- `artifacts/file-viewer/public/assets/` — READ-ONLY compiled bundle, never edit
- `artifacts/file-viewer/public/{aero.js,aero.css,theme-bootstrap.js,patch.css,patch-security.js}` — the only editable customization surface
- `handover/HANDOVER.md` — prior session's architecture/design-system notes (may describe an older gold theme; current theme is neon green — treat as historical context, not current truth)

## Architecture decisions

- App ships as a pre-compiled bundle with no accessible React source, so error handling is done via a window-level crash guard (`public/error-resilience.js`) instead of React error boundaries.
- `theme-bootstrap.js` injects a branded splash screen synchronously before React paints; `aero.js` dismisses it once `.aero-bg` appears in the DOM, with a hard 1800ms safety-timeout fallback so it always disappears even if detection fails.

## Product

Track cattle records, daily milk yield/fat%, health/vaccination alerts, semen/breeding (genetics) intelligence, and revenue — all stored locally in the browser, with optional Google sign-in for cross-device cloud sync.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
