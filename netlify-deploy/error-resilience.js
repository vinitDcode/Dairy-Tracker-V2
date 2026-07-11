/* ════════════════════════════════════════════════════════════════════
   BHULLAR DAIRY — GLOBAL ERROR RESILIENCE
   ════════════════════════════════════════════════════════════════════
   Why this exists instead of React <ErrorBoundary> components:
   This app ships as a pre-built, minified bundle
   (public/assets/index-*.js) — there is no editable component tree to
   wrap individual tabs with React error boundaries. src/App.tsx is an
   unused scaffold; it is not part of the render path (index.html loads
   the compiled bundle directly).

   This is the closest equivalent achievable without rebuilding the
   app from source: a window-level crash guard that
     1. Catches uncaught exceptions and unhandled promise rejections
        anywhere in the compiled bundle.
     2. Freezes the broken UI behind a full-screen fallback instead of
        leaving a half-crashed screen or a blank white page.
     3. Gives the user a working "Retry" button (reloads the app) and
        a "Copy error details" action for bug reports — never a dead
        end.
   It does NOT try to catch errors per-tab (impossible without source
   access) — it catches them at the top level, which is the same
   safety net React's own top-level error boundary would provide.
════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var shown = false;
  var pendingError = null;

  function fallbackUI(message, stack) {
    if (shown) return;

    // <body> may not exist yet if this fires from a synchronous <head>
    // script (e.g. theme-bootstrap.js) that throws before parsing
    // reaches <body>. Queue the error and render once the DOM is ready
    // instead of throwing here (which would silently swallow the guard).
    if (!document.body) {
      pendingError = { message: message, stack: stack };
      document.addEventListener('DOMContentLoaded', function retry() {
        document.removeEventListener('DOMContentLoaded', retry);
        if (pendingError) {
          var pe = pendingError;
          pendingError = null;
          fallbackUI(pe.message, pe.stack);
        }
      });
      return;
    }

    try {
      renderOverlay(message, stack);
      shown = true; // only latch after a successful mount
    } catch (renderErr) {
      // If the overlay itself fails to build/mount, don't suppress future
      // attempts — leave `shown` false so a later error can retry.
    }
  }

  function renderOverlay(message, stack) {
    var overlay = document.createElement('div');
    overlay.id = 'bdf-crash-guard';
    overlay.setAttribute('role', 'alertdialog');
    overlay.setAttribute('aria-live', 'assertive');
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:2147483647',
      'display:flex', 'align-items:center', 'justify-content:center',
      'padding:24px', 'background:rgba(8,5,2,0.94)',
      'backdrop-filter:blur(6px)', '-webkit-backdrop-filter:blur(6px)',
      'font-family:"DM Sans",-apple-system,system-ui,sans-serif',
    ].join(';');

    var card = document.createElement('div');
    card.style.cssText = [
      'max-width:420px', 'width:100%',
      'background:#160f08', 'border:1px solid rgba(255,120,40,0.35)',
      'border-radius:16px', 'padding:24px', 'color:#f0e0c8',
      'box-shadow:0 20px 60px rgba(0,0,0,0.6)',
    ].join(';');

    var title = document.createElement('div');
    title.textContent = '⚠️ Something went wrong';
    title.style.cssText = 'font-size:17px;font-weight:700;margin-bottom:8px;color:#ff9a4a;';

    var body = document.createElement('div');
    body.textContent = 'The app hit an unexpected error and stopped responding. Your data in this browser is untouched — you can safely retry.';
    body.style.cssText = 'font-size:13px;line-height:1.5;color:#d8c8ae;margin-bottom:18px;';

    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:10px;';

    var retryBtn = document.createElement('button');
    retryBtn.textContent = 'Retry';
    retryBtn.type = 'button';
    retryBtn.style.cssText = [
      'flex:1', 'min-height:44px', 'border-radius:10px', 'border:none',
      'background:#39FF14', 'color:#0a1a06', 'font-weight:700', 'font-size:14px',
      'cursor:pointer',
    ].join(';');
    retryBtn.onclick = function () {
      try { window.location.reload(); } catch (e) { window.location.href = window.location.href; }
    };

    var copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy error details';
    copyBtn.type = 'button';
    copyBtn.style.cssText = [
      'flex:1', 'min-height:44px', 'border-radius:10px',
      'border:1px solid rgba(255,255,255,0.18)', 'background:transparent',
      'color:#d8c8ae', 'font-weight:600', 'font-size:13px', 'cursor:pointer',
    ].join(';');
    copyBtn.onclick = function () {
      var details = (message || 'Unknown error') + '\n\n' + (stack || '(no stack trace)');
      var done = function () {
        copyBtn.textContent = 'Copied ✓';
        setTimeout(function () { copyBtn.textContent = 'Copy error details'; }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(details).then(done).catch(function () { fallbackCopy(details, done); });
      } else {
        fallbackCopy(details, done);
      }
    };

    function fallbackCopy(text, done) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      done();
    }

    btnRow.appendChild(retryBtn);
    btnRow.appendChild(copyBtn);
    card.appendChild(title);
    card.appendChild(body);
    card.appendChild(btnRow);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  window.addEventListener('error', function (e) {
    fallbackUI(e.message, e.error && e.error.stack);
  });

  window.addEventListener('unhandledrejection', function (e) {
    var reason = e.reason;
    var msg = reason && reason.message ? reason.message : String(reason);
    var stack = reason && reason.stack;
    fallbackUI(msg, stack);
  });
})();
