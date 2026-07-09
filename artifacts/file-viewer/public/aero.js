/* ═══════════════════════════════════════════════════════════
   BHULLAR DAIRY — INTERACTION ENHANCER  v10  (neon green)
   
   Changes from v6:
   - All amber/warm colors replaced with neon green (#39FF14)
     and electric cyan (#00E5FF).
   - Ripple: neon green.
   - Shimmer: green-tinted highlight.
   - Logo: green milk-drop SVG.
   - Theme sync: keeps data-aero-theme in sync with React.
═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Background constants ──────────────────────────────── */
  var BG_DARK  = '#120a04';
  var BG_LIGHT = '#f4faf4';

  /* ── Apply theme to <html> data-attribute ─────────────── */
  function applyTheme() {
    var root   = document.querySelector('.aero-bg');
    var isDark = root ? root.classList.contains('dark') : true;
    var theme  = isDark ? 'dark' : 'light';
    var bg     = isDark ? BG_DARK : BG_LIGHT;
    document.documentElement.setAttribute('data-aero-theme', theme);
    document.documentElement.style.setProperty('background-color', bg, 'important');
    document.body.style.setProperty('background-color', bg, 'important');
  }

  /* ── Theme observer (watches .aero-bg class changes) ──── */
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

  /* ── Splash fade-out ──────────────────────────────────── */
  var splashDismissed = false;
  function dismissSplash() {
    if (splashDismissed) return;
    var splash = document.getElementById('bdf-splash');
    if (!splash) { splashDismissed = true; return; }
    splashDismissed = true;
    setTimeout(function () {
      splash.classList.add('fade-out');
      splash.addEventListener('transitionend', function () {
        if (splash.parentNode) splash.parentNode.removeChild(splash);
      }, { once: true });
      setTimeout(function () {
        if (splash && splash.parentNode) splash.parentNode.removeChild(splash);
      }, 800);
    }, 900);
  }

  /* ── Neon green SVG logo injection ───────────────────────
     Injects a milk-drop SVG into the header brand area.
  ─────────────────────────────────────────────────────────── */
  var logoInjected = false;
  function injectLogo() {
    if (logoInjected) return;
    var header = document.querySelector('header');
    if (!header) return;

    var existingIcon = header.querySelector('svg:first-of-type, img[alt*="logo"], [class*="logo"]');
    if (existingIcon && existingIcon.dataset.bdfLogo) return;

    var ns  = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', '36');
    svg.setAttribute('height', '36');
    svg.setAttribute('viewBox', '0 0 36 36');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('aria-label', 'Bhullar Dairy Farm logo');
    svg.setAttribute('role', 'img');
    svg.dataset.bdfLogo = '1';
    svg.style.cssText = 'flex-shrink:0;display:block;';

    var isDark  = document.documentElement.getAttribute('data-aero-theme') !== 'light';
    var accent  = isDark ? '#39FF14' : '#1a7a10';
    var fill1   = isDark ? 'rgba(57,255,20,0.14)' : 'rgba(26,122,16,0.12)';
    var fill2   = isDark ? 'rgba(0,229,255,0.20)' : 'rgba(26,122,16,0.18)';
    var spark   = isDark ? 'rgba(200,255,200,0.80)' : 'rgba(255,255,255,0.90)';
    var line    = isDark ? 'rgba(57,255,20,0.40)' : 'rgba(26,122,16,0.35)';

    svg.innerHTML = [
      '<path d="M18 4C18 4 6 14 6 22C6 28.627 11.373 34 18 34C24.627 34 30 28.627 30 22C30 14 18 4 18 4Z"',
        'fill="' + fill1 + '" stroke="' + accent + '" stroke-width="1.4"/>',
      '<path d="M18 10C18 10 10 18 10 23C10 27.418 13.582 31 18 31C22.418 31 26 27.418 26 23C26 18 18 10 18 10Z"',
        'fill="' + fill2 + '"/>',
      '<circle cx="14" cy="19" r="2.5" fill="' + spark + '"/>',
      '<path d="M22 15 Q25 19 23 24" stroke="' + line + '" stroke-width="1.4" stroke-linecap="round"/>',
    ].join('');

    if (existingIcon && existingIcon !== svg) {
      var isGeneric = !existingIcon.dataset.bdfLogo &&
        (existingIcon.tagName === 'svg') &&
        existingIcon.getAttribute('width') &&
        parseInt(existingIcon.getAttribute('width')) < 60;
      if (isGeneric) {
        existingIcon.parentNode.replaceChild(svg, existingIcon);
        logoInjected = true;
        return;
      }
    }

    header.insertBefore(svg, header.firstChild);
    logoInjected = true;
  }

  /* ── Neon green ripple ────────────────────────────────── */
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
    var r    = document.createElement('span');
    var size = Math.max(rect.width, rect.height);
    var isDark = document.documentElement.getAttribute('data-aero-theme') !== 'light';
    var rColor = isDark ? 'rgba(57,255,20,0.12)' : 'rgba(26,122,16,0.10)';
    Object.assign(r.style, {
      position:     'absolute',
      width:        size + 'px',
      height:       size + 'px',
      left:         (e.clientX - rect.left - size / 2) + 'px',
      top:          (e.clientY - rect.top  - size / 2) + 'px',
      borderRadius: '50%',
      background:   rColor,
      transform:    'scale(0)',
      animation:    '_ripple 0.50s cubic-bezier(0.22,1,0.36,1) forwards',
      pointerEvents: 'none',
      zIndex:       '9',
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

  /* ── Shimmer on glass cards (neon green) ─────────────── */
  function addShimmer(el) {
    if (el.dataset.shim) return; el.dataset.shim = '1';
    var sh = document.createElement('div');
    Object.assign(sh.style, {
      position:   'absolute', top: '0', left: '-80%',
      width:      '50%',      height: '100%',
      background: 'linear-gradient(105deg,transparent 20%,rgba(57,255,20,0.04) 50%,transparent 80%)',
      transform:  'skewX(-12deg)',
      transition: 'left 0.68s ease',
      pointerEvents: 'none', zIndex: '1', borderRadius: 'inherit',
    });
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.style.overflow = 'hidden';
    el.appendChild(sh);
    el.addEventListener('mouseenter', function () { sh.style.left = '140%'; });
    el.addEventListener('mouseleave', function () {
      sh.style.transition = 'none'; sh.style.left = '-80%';
      requestAnimationFrame(function () { sh.style.transition = 'left 0.68s ease'; });
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
          'opacity 0.30s cubic-bezier(0.22,1,0.36,1) ' + delay + 'ms,' +
          'transform 0.30s cubic-bezier(0.22,1,0.36,1) ' + delay + 'ms';
        el.style.opacity   = '1';
        el.style.transform = 'translateY(0)';
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
    if (!logoInjected && root.querySelector && root.querySelector('header')) {
      injectLogo();
    }
  }

  /* ── Main MutationObserver ────────────────────────────── */
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
          dismissSplash();
        }
      });
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });

  /* ── Tab switch: reset animation stagger ─────────────── */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[role="tab"],nav a,nav button,header button,header [role="button"],header [class*="cursor-pointer"]');
    if (t) {
      seq = 0;
      setTimeout(function () {
        document.querySelectorAll('.glass-card').forEach(addShimmer);
      }, 80);
    }
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
      injectLogo();
      process(document.body);
      dismissSplash();
    }
  });
  initObs.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });

  /* Safety timeout */
  setTimeout(function () {
    initObs.disconnect();
    attachThemeObs();
    injectLogo();
    process(document.body);
    dismissSplash();
  }, 1800);

})();
