---
name: Bhullar Dairy glass-card CSS & JS-only mobile detection
description: Two related structural bugs found and fixed in the Bhullar Dairy Farm app's theming layer (aero.css/patch.css) — read before touching mobile layout, dropdowns, or responsive behavior in this app.
---

## `.glass-card` must not force position/overflow unconditionally
`aero.css` has a shared `.glass-card` class reused by many unrelated components
(dashboard stat cards, cattle-detail cards, and floating menus/dropdowns alike).
It used to unconditionally force `position: relative; overflow: hidden` on
every element with that class.

**Why this broke things:** any dropdown/menu/tooltip/popover that reused
`.glass-card` for styling but needed `position: absolute` or `fixed` to float
got silently forced back to `relative` (theme selector's specificity beat the
plain Tailwind `.absolute` utility), and the blanket `overflow: hidden` clipped
any floating menu rendered *inside* another `.glass-card` container — this
surfaced as doubled/ghosted dropdown renders and broken menus across many
unrelated tabs, not just the one first reported.

**How to apply:** any shared "card" utility class that many components reuse
must not force layout-affecting properties (`position`, `overflow`) — guard
those rules with `:not([class*="absolute"]):not([class*="fixed"])` so
components that opt into their own positioning keep control. Styling-only
properties (background, blur, border, shadow) are safe to force globally.

## Mobile/desktop layout switch is pure JS — has no CSS safety net
This app's `useIsMobile`-style hook decides mobile vs. desktop rendering via
`window.innerWidth < 768` in JS — there is no CSS breakpoint fallback, and
(before this fix) no global `overflow-x: hidden` guard on `html`/`body`/`#root`.

**Why this matters:** if literally any single element anywhere in the app
(a table, long string, fixed-width badge/chart) overflows horizontally past
the screen width, the mobile browser widens its layout viewport to
accommodate it instead of clipping — which pushes `window.innerWidth` past
768 and flips the *entire app*, every tab, to the desktop layout, which is
itself wider, compounding the horizontal scroll.

**How to apply:** any app that branches its whole layout on a JS viewport-width
check needs a hard `overflow-x: hidden; max-width: 100vw;` guard on
`html, body, #root` (or equivalent root containers) as a non-negotiable
baseline — one overflowing element anywhere should never be able to flip the
detected device class for the whole app. Keep this guard general (root-level
only), not on every card, or it reintroduces the dropdown-clipping bug above.
