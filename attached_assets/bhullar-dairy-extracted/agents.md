# AGENTS.md — Bhullar Dairy Farm Dashboard

## Project Architecture

This is a **pre-built static single-page application** (SPA). The source code (React/TypeScript/Vite) is included for reference but the site is served directly from the pre-compiled assets in the repo root — no build step runs on Netlify.

## Key Directories

```
/                        # Netlify publish root (static site)
├── index.html           # SPA entry point; links to /assets/* bundles
├── assets/
│   ├── index-*.js       # Compiled React bundle (hashed filename)
│   └── index-*.css      # Compiled CSS bundle (hashed filename)
├── icons/               # PWA icon set (72px–512px PNG)
├── aero.css             # "Aero" custom design system CSS
├── aero.js              # Aero JS utilities
├── sw.js                # Service worker for PWA offline support
├── manifest.json        # PWA web app manifest
├── favicon.svg          # Site favicon
├── netlify.toml         # Netlify config: SPA redirect + cache headers
│
└── src/                 # Source code (reference only — not built by Netlify)
    ├── App.tsx           # Root component + router
    ├── components/
    │   ├── tabs/         # One component per dashboard tab
    │   ├── ui/           # shadcn/ui component primitives
    │   └── layout/       # Shell layout (sidebar, header)
    ├── hooks/
    │   └── use-farm-store.ts  # Global state (Zustand-style store)
    ├── lib/
    │   ├── types.ts      # Shared TypeScript types
    │   ├── calculations.ts    # Business logic (yields, revenue)
    │   └── seed-data.ts  # Demo/seed data for the dashboard
    └── pages/
        └── not-found.tsx
```

## Netlify Configuration

`netlify.toml` sets:
- **publish = "."** — serves the repo root directly
- **SPA redirect** — `/* → /index.html` (status 200) for client-side routing
- **Cache headers** — `/assets/*` gets `immutable` long-lived caching; `/sw.js` gets `no-cache`

## Coding Conventions

- Components live in `src/components/tabs/` (one file per tab) and `src/components/ui/` (primitives).
- State is managed via a single store in `src/hooks/use-farm-store.ts`.
- Styling uses Tailwind CSS utility classes with the custom Aero design system overlaid via `aero.css`.
- The app uses `wouter` for routing (lightweight, no React Router dependency).

## Non-Obvious Decisions

- **Pre-built static**: The site ships compiled JS/CSS with content-hashed filenames. To update the UI, rebuild the Vite project and replace the files in `/assets/` and `index.html`.
- **Aero design system**: `aero.css` and `aero.js` provide the custom glassmorphism/dark-mode aesthetic on top of Tailwind. The `data-aero-theme` attribute on `<html>` drives dark/light theming, toggled by a MutationObserver in `index.html`.
- **PWA**: `sw.js` + `manifest.json` make this installable as a mobile app. The service worker is intentionally served with `no-cache` so updates propagate immediately.
