# Bhullar Dairy Farm Dashboard

A command dashboard for Bhullar Dairy Farm — Punjab Operations. Track cattle inventory, milk yield, health alerts, genetics, and farm revenue from a single PWA-ready interface.

## Key Technologies

- **React** — UI framework
- **Tailwind CSS** — Utility-first styling with a custom "Aero" design system
- **Recharts** — Data visualization for milk yield and analytics
- **Framer Motion** — Animations and transitions
- **shadcn/ui** — Accessible component primitives via Radix UI
- **Wouter** — Lightweight client-side routing
- **Vite** — Build tooling

## Features

- **Overview** — Farm KPIs, revenue summary, and alerts at a glance
- **Cattle** — Herd roster with individual animal profiles
- **Milk** — Daily and monthly yield tracking
- **Health** — Vaccination records and health alerts
- **Genetics** — Breeding records and lineage
- **Analytics** — Charts and trend analysis
- **Calendar** — Scheduled tasks and events
- **Settings** — Farm configuration and preferences

## Running Locally

The site is a pre-built static SPA — no build step is required after cloning.

To serve it locally:

```bash
npx serve .
```

Or open `index.html` directly in any modern browser.

## Deployment

Deployed to Netlify as a static site. All routes fall back to `index.html` for client-side routing. Assets under `/assets/` are cached with immutable headers; the service worker (`sw.js`) is served with `no-cache`.
