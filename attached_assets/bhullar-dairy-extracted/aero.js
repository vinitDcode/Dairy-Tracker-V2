/* ═══════════════════════════════════════════════════════════
   BHULLAR DAIRY — INTERACTION ENHANCER  v5
   Bridges React's .dark class to html[data-aero-theme].
   
   Changes from v4:
   - Removed ?autotab= URL handler (was debug/screenshots only,
     created an unnecessary URL-driven DOM automation surface)
   - Fixed MutationObserver: removed subtree attributes watching
     (was firing on every class change anywhere in the app, causing
     jank). Theme is now observed only on the .aero-bg element via
     a dedicated, narrowly-scoped themeObs.
   - Removed duplicated bootstrap logic (theme is set by the
     inline script in index.html before first paint; aero.js only
     needs to attach the live observer after React mounts).
═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Apply theme to <html> data-attribute ─────────────── */
  function applyTheme() {
    var root = document.querySelector('.aero-bg');
    var isDark = root ? root.classList.contains('dark') : false;
    var theme = isDark ? 'dark' : 'light';
    var bg    = isDark ? '#020b0e' : '#ecf2ee';
    document.documentElement.setAttribute('data-aero-theme', theme);
    document.documentElement.style.setProperty('background-color', bg, 'important');
    document.body.style.setProperty('background-color', bg, 'important');
  }

  /* ── Narrowly-scoped theme observer (only .aero-bg class) ─ */
  var themeObs = new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) {
      if (muts[i].type === 'attributes' && muts[i].attributeName === 'class') {
        applyTheme();
        break;
      }
    }
  });

  function attachThemeObs() {
    var root = document.querySelector('.aero-bg');
    if (root && !root._themeObAttached) {
      root._themeObAttached = true;
      themeObs.observe(root, { attributes: true, attributeFilter: ['class'] });
      applyTheme();
    }
  }

  /* ── Ripple ───────────────────────────────────────────── */
  var rippleKfInjected = false;
  function injectRippleKf() {
    if (rippleKfInjected) return; rippleKfInjected = true;
    var s = document.createElement('style');
    s.textContent = '@keyframes _ripple{to{transform:scale(2.8);opacity:0}}';
    document.head.appendChild(s);
  }

  function ripple(e) {
    var btn = e.currentTarget;
    if (!btn) return;
    injectRippleKf();
    var rect = btn.getBoundingClientRect();
    var r = document.createElement('span');
    var size = Math.max(rect.width, rect.height);
    Object.assign(r.style, {
      position: 'absolute',
      width: size + 'px', height: size + 'px',
      left: (e.clientX - rect.left - size / 2) + 'px',
      top:  (e.clientY - rect.top  - size / 2) + 'px',
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.10)',
      transform: 'scale(0)',
      animation: '_ripple 0.45s cubic-bezier(0.22,1,0.36,1) forwards',
      pointerEvents: 'none', zIndex: '9',
    });
    if (getComputedStyle(btn).position === 'static') btn.style.position = 'relative';
    btn.style.overflow = 'hidden';
    btn.appendChild(r);
    r.addEventListener('animationend', function () { r.remove(); }, { once: true });
  }

  function attachRipples(root) {
    (root || document).querySelectorAll('button:not([data-rpl])').forEach(function (btn) {
      btn.dataset.rpl = '1';
      btn.addEventListener('click', ripple);
    });
  }

  /* ── Shimmer on glass cards ───────────────────────────── */
  function addShimmer(el) {
    if (el.dataset.shim) return; el.dataset.shim = '1';
    var sh = document.createElement('div');
    Object.assign(sh.style, {
      position: 'absolute', top: '0', left: '-80%',
      width: '50%', height: '100%',
      background: 'linear-gradient(105deg,transparent 20%,rgba(255,255,255,0.04) 50%,transparent 80%)',
      transform: 'skewX(-12deg)',
      transition: 'left 0.65s ease',
      pointerEvents: 'none', zIndex: '1', borderRadius: 'inherit',
    });
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.style.overflow = 'hidden';
    el.appendChild(sh);
    el.addEventListener('mouseenter', function () { sh.style.left = '140%'; });
    el.addEventListener('mouseleave', function () {
      sh.style.transition = 'none'; sh.style.left = '-80%';
      requestAnimationFrame(function () { sh.style.transition = 'left 0.65s ease'; });
    });
  }

  /* ── Smooth fade-up entrance ──────────────────────────── */
  var seq = 0;
  function animIn(el) {
    if (el.dataset.ai || el.closest('[class*="nav"]') || el.closest('header')) return;
    el.dataset.ai = '1';
    if (isInsideOverlay(el)) return;
    var delay = Math.min(seq * 40, 280); seq++;
    el.style.cssText += ';opacity:0;transform:translateY(8px);transition:none';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.style.transition =
          'opacity 0.28s cubic-bezier(0.22,1,0.36,1) ' + delay + 'ms,' +
          'transform 0.28s cubic-bezier(0.22,1,0.36,1) ' + delay + 'ms';
        el.style.opacity = '1'; el.style.transform = 'translateY(0)';
      });
    });
  }

  function isInsideOverlay(el) {
    var p = el.parentElement;
    while (p && p !== document.body) {
      var cls = (p.className && typeof p.className === 'string') ? p.className : '';
      if (cls.indexOf('fixed') !== -1 && cls.indexOf('inset') !== -1) return true;
      p = p.parentElement;
    }
    return false;
  }

  /* ── Process new DOM nodes ────────────────────────────── */
  function process(root) {
    root.querySelectorAll('.glass-card').forEach(addShimmer);
    root.querySelectorAll('.glass-card,[class*="card"]:not(nav *)').forEach(animIn);
    attachRipples(root);
  }

  /* ── Main MutationObserver — childList only, no attribute watching ──
     The previous version watched attributes on the entire body subtree,
     firing on every class change (every React state update). This caused
     jank on data-heavy renders. Theme attribute changes are now handled
     exclusively by the dedicated themeObs on .aero-bg only.
  ────────────────────────────────────────────────────────────────── */
  var mo = new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) {
      var m = muts[i];
      if (m.type !== 'childList') continue;
      m.addedNodes.forEach(function (n) {
        if (n.nodeType !== 1) return;
        if (n.parentElement === document.body) { seq = 0; }
        process(n);
        if (n.classList && n.classList.contains('glass-card')) addShimmer(n);
        if (n.classList && n.classList.contains('aero-bg')) {
          attachThemeObs();
        }
      });
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });

  /* ── Tab / header button switch: reset stagger ─────────── */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[role="tab"],nav a,nav button,header button,header [role="button"],header [class*="cursor-pointer"]');
    if (t) { seq = 0; setTimeout(function () {
      document.querySelectorAll('.glass-card').forEach(addShimmer);
    }, 80); }
  }, true);

  /* ── PWA Service Worker ───────────────────────────────── */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').then(function (reg) {
        console.log('[SW] Registered, scope:', reg.scope);
      }).catch(function (err) {
        console.warn('[SW] Registration failed:', err);
      });
    });
  }

  /* ── Initial pass once React renders ─────────────────── */
  var initObs = new MutationObserver(function () {
    if (document.querySelector('.aero-bg')) {
      initObs.disconnect();
      attachThemeObs();
      process(document.body);
    }
  });
  initObs.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
  setTimeout(function () {
    initObs.disconnect();
    attachThemeObs();
    process(document.body);
  }, 1200);
})();
