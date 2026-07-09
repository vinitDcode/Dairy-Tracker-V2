---
name: Bhullar Dairy DOM patching
description: Retheme approach for pre-built React SPA (read-only bundle) with hardcoded neon colors using CSS selectors + MutationObserver JS patching.
---

## The problem
The React bundle (`public/assets/index-CrpyjvbJ.js`) has neon green `#39FF14` and cyan `#00E5FF` hardcoded as both inline `style` props and Tailwind arbitrary-value classes (`bg-[#39FF14]`). CSS variable overrides alone are insufficient.

## Critical finding: Chrome hex normalization
Chrome normalizes hex colors in inline `style` *attributes* to `rgb()` notation in the DOM:
- `#39FF14` → `rgb(57, 255, 20)` in DOM
- `#00E5FF` → `rgb(0, 229, 255)` in DOM

**CSS `[style*="#39FF14"]` selectors FAIL. Use `[style*="57, 255, 20"]` instead.**

Tailwind *class* strings are NOT normalized — `[class*="39FF14"]` works correctly.

## Solution architecture

### Layer 1: CSS variables (aero.js `applyVars`)
Override `--primary`, `--accent`, `--background`, etc. on the `.dark` element and `:root`.

### Layer 2: CSS selectors (aero.css sections 24-26)
- `[class*="39FF14"]` — catches Tailwind arbitrary classes (not normalized)
- `[style*="57, 255, 20"]` — catches box-shadow glow, text color, etc. (RGB form)
- `[style*="linear-gradient"][style*="57, 255, 20"]` — FAB/gradient backgrounds
- `[style*="229, 255)"]` — catches cyan rgba in backgrounds (partial match)

### Layer 3: JS DOM patching (aero.js `patchEl` + MutationObserver)
Read actual style via `el.style.background` (returns browser-normalized RGB form).
Use `subCyan()` and `subGreen()` helpers that **preserve rgba opacity** when converting:
- `rgba(0, 229, 255, 0.08)` → `rgba(107, 173, 122, 0.08)` ✓ (not solid `#6BAD7A`)
- Done via regex replace of just the RGB triple, keeping the alpha channel

Changing `el.style.background` also **de-selects** CSS `[style*="229, 255)"]` rules — no conflict.

## Sequence: CSS fires first (may flash), then JS fixes it
CSS rules apply immediately (may briefly show solid colors). MutationObserver runs ~next frame and calls `patchEl()`, which converts to rgba form. The style attribute change removes the CSS selector match. Final state is correct.

## Files
- `public/aero.js` — v8+: TOKEN, CSS_VARS, patchEl (subCyan/subGreen helpers), patchClass, applyTheme, MutationObserver, dismissSplash
- `public/aero.css` — v6+: design tokens, sections 1-26 including RGB-based inline style selectors
- `public/theme-bootstrap.js` — syncs `data-aero-theme` on `<html>` with React's `.dark` class
- `public/patch.css` — DO NOT MODIFY (critical overflow/scroll/z-index)
- `public/sw.js` — service worker; BYPASS_CACHE list includes all patch files

**Why:** CSS !important from external stylesheets beats normal inline styles, but NOT inline styles set via `el.style`. JS patchEl sets inline styles directly → wins after removing CSS selector match.
