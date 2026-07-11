# Netlify deploy folder

This folder is a self-contained, pre-built copy of the Bhullar Dairy Farm
Dashboard — no build step, no `pnpm install`, no environment variables
required. Netlify (or any static host) can serve it as-is.

## Deploying on Netlify

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. In Netlify: **Add new site → Import an existing project → GitHub** → pick this repo.
3. Netlify will read `netlify.toml` from the repo root and auto-fill:
   - Base directory: `netlify-deploy`
   - Build command: *(empty)*
   - Publish directory: `netlify-deploy`
4. Click **Deploy**. No env vars, no build minutes spent — it's just static files + a SPA redirect.

## Keeping this folder in sync

The real source of truth is `artifacts/file-viewer/public/` (customization
layer: `aero.css`, `aero.js`, `patch.css`, etc.) and
`artifacts/file-viewer/index.html`. The compiled React bundle itself lives
in `artifacts/file-viewer/public/assets/` and is read-only.

Whenever you change any of those files in the Replit workspace, re-sync this
folder before pushing to GitHub:

```bash
cp -r artifacts/file-viewer/public/. netlify-deploy/
cp artifacts/file-viewer/index.html netlify-deploy/index.html
```

(Two files that live in the app's `public/` folder in this repo — SQL schema
files — are intentionally **not** copied here or served by the Replit dev
server anymore; they were moved to `supabase/schema/` since a public web
root is the wrong place for database schema.)

## Data & backend

All app data is stored in the browser (`localStorage`). Supabase is used
only for optional Google sign-in and cross-device cloud sync, using the
public anon key already committed in `supabase-config.js` (safe to expose —
it has no write access without a signed-in user, enforced by Supabase RLS).
