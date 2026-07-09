/* ═══════════════════════════════════════════════════════════
   BHULLAR DAIRY — INTERACTION ENHANCER  v9
   "Punjab Pulse" edition

   PALETTE:
   Dark  "Midnight Herd":    electric gold #FFB800, emerald #10B981, midnight #04070A
   Light "Sunrise Harvest":  amber gold #D97706, forest green #059669, cream #FDFBF4

   FIXES: inputs dark-glass, breeding record scroll, neon glow system.
═══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Palette tokens ───────────────────────────────────── */
  var TOKEN = {
    dark: {
      gold:      '#FFB800',
      goldMid:   '#E89000',
      goldDark:  '#CC7500',
      green:     '#10B981',
      greenDark: '#059669',
      glow:      'rgba(255,184,0,',
      bg:        '#04070A',
      card:      '#0C1418',
    },
    light: {
      gold:      '#D97706',
      goldMid:   '#B45309',
      goldDark:  '#92400E',
      green:     '#059669',
      greenDark: '#047857',
      glow:      'rgba(217,119,6,',
      bg:        '#FDFBF4',
      card:      '#FFFFFF',
    }
  };

  /* ── CSS custom property palette ──────────────────────── */
  var CSS_VARS = {
    dark: {
      '--background':                   '222 18% 4%',
      '--foreground':                   '42 50% 90%',
      '--card':                         '210 20% 7%',
      '--card-foreground':              '42 50% 90%',
      '--card-border':                  '210 18% 12%',
      '--popover':                      '210 20% 7%',
      '--popover-foreground':           '42 50% 90%',
      '--popover-border':               '210 18% 12%',
      '--sidebar':                      '220 18% 6%',
      '--sidebar-foreground':           '42 50% 90%',
      '--sidebar-border':               '210 18% 12%',
      '--primary':                      '43 100% 50%',
      '--primary-foreground':           '30 10% 6%',
      '--secondary':                    '210 18% 12%',
      '--secondary-foreground':         '42 40% 82%',
      /* accent = dark neutral so bg-accent becomes a dark glass panel, not solid green */
      '--accent':                       '218 20% 10%',
      '--accent-foreground':            '42 50% 90%',
      '--muted':                        '215 16% 11%',
      '--muted-foreground':             '215 8% 55%',
      '--sidebar-primary':              '43 100% 50%',
      '--sidebar-primary-foreground':   '30 10% 6%',
      '--sidebar-accent':               '218 20% 10%',
      '--sidebar-accent-foreground':    '42 50% 90%',
      '--sidebar-ring':                 '43 100% 50%',
      '--input':                        '215 18% 13%',
      '--ring':                         '43 100% 50%',
      '--border':                       '215 16% 13%',
      '--chart-1':                      '43 100% 50%',
      '--chart-2':                      '160 80% 40%',
      '--chart-3':                      '200 85% 48%',
      '--chart-4':                      '25 92% 52%',
      '--chart-5':                      '50 85% 55%',
    },
    light: {
      '--background':                   '48 55% 99%',
      '--foreground':                   '30 40% 10%',
      '--card':                         '0 0% 100%',
      '--card-foreground':              '30 40% 10%',
      '--card-border':                  '40 22% 86%',
      '--popover':                      '0 0% 100%',
      '--popover-foreground':           '30 40% 10%',
      '--popover-border':               '40 22% 86%',
      '--sidebar':                      '40 28% 94%',
      '--sidebar-foreground':           '30 40% 10%',
      '--sidebar-border':               '40 22% 86%',
      '--primary':                      '35 93% 43%',
      '--primary-foreground':           '0 0% 100%',
      '--secondary':                    '40 22% 92%',
      '--secondary-foreground':         '30 35% 18%',
      '--accent':                       '40 25% 90%',
      '--accent-foreground':            '30 40% 10%',
      '--muted':                        '42 22% 93%',
      '--muted-foreground':             '38 16% 50%',
      '--sidebar-primary':              '35 93% 43%',
      '--sidebar-primary-foreground':   '0 0% 100%',
      '--sidebar-accent':               '40 25% 90%',
      '--sidebar-accent-foreground':    '30 40% 10%',
      '--sidebar-ring':                 '35 93% 43%',
      '--input':                        '40 20% 86%',
      '--ring':                         '35 93% 43%',
      '--border':                       '40 20% 86%',
      '--chart-1':                      '35 93% 43%',
      '--chart-2':                      '160 84% 28%',
      '--chart-3':                      '200 80% 38%',
      '--chart-4':                      '25 90% 46%',
      '--chart-5':                      '50 80% 44%',
    }
  };

  /* ── Apply CSS vars to element via JS ─────────────────── */
  function applyVars(el, tokens) {
    if (!el) return;
    var keys = Object.keys(tokens);
    for (var i = 0; i < keys.length; i++) {
      el.style.setProperty(keys[i], tokens[keys[i]]);
    }
  }

  /* ── Color detection helpers ──────────────────────────── */
  function hasNeonGreen(s) {
    return s && (
      s.indexOf('57, 255, 20') !== -1 ||
      s.indexOf('57,255,20')   !== -1 ||
      s.indexOf('43, 204, 16') !== -1 ||
      s.indexOf('34, 153, 11') !== -1
    );
  }
  function hasNeonCyan(s) {
    return s && (
      s.indexOf('0, 229, 255') !== -1 ||
      s.indexOf('0,229,255')   !== -1
    );
  }

  /* ── Color replacement helpers ────────────────────────── */
  function subCyan(s, goldHex, goldRgb) {
    if (!s || !hasNeonCyan(s)) return s;
    return s
      .replace(/rgba\(\s*0\s*,\s*229\s*,\s*255\s*,\s*([^)]+)\)/gi, function(_, a) {
        return 'rgba(' + goldRgb + ',' + a + ')';
      })
      .replace(/rgb\(\s*0\s*,\s*229\s*,\s*255\s*\)/gi, goldHex);
  }

  function subGreen(s, goldHex, goldMidHex, goldDarkHex, goldRgb) {
    if (!s || !hasNeonGreen(s)) return s;
    return s
      .replace(/rgba\(\s*57\s*,\s*255\s*,\s*20\s*,\s*([^)]+)\)/gi, function(_, a) {
        return 'rgba(' + goldRgb + ',' + a + ')';
      })
      .replace(/rgba\(\s*43\s*,\s*204\s*,\s*16\s*,\s*([^)]+)\)/gi, function(_, a) {
        return 'rgba(232,146,0,' + a + ')';
      })
      .replace(/rgba\(\s*34\s*,\s*153\s*,\s*11\s*,\s*([^)]+)\)/gi, function(_, a) {
        return 'rgba(200,116,0,' + a + ')';
      })
      .replace(/rgb\(\s*57\s*,\s*255\s*,\s*20\s*\)/gi, goldHex)
      .replace(/rgb\(\s*43\s*,\s*204\s*,\s*16\s*\)/gi, goldMidHex)
      .replace(/rgb\(\s*34\s*,\s*153\s*,\s*11\s*\)/gi, goldDarkHex);
  }

  /* ── Patch element inline styles ──────────────────────── */
  function patchEl(el, t) {
    var isDark  = (t === TOKEN.dark);
    var goldHex = isDark ? '#FFB800' : '#D97706';
    var goldMid = isDark ? '#E89000' : '#B45309';
    var goldDrk = isDark ? '#CC7500' : '#92400E';
    var goldRgb = isDark ? '255,184,0' : '217,119,6';

    var bg     = el.style.background || '';
    var bgIm   = el.style.backgroundImage || '';
    var col    = el.style.color || '';
    var shadow = el.style.boxShadow || '';
    var fill   = el.style.webkitTextFillColor || '';
    var border = el.style.border || '';
    var outline = el.style.outline || '';

    /* Neon green → electric gold */
    if (hasNeonGreen(bg)) {
      if (bg.indexOf('linear-gradient') !== -1) {
        el.style.background = subGreen(bg, goldHex, goldMid, goldDrk, goldRgb);
        el.style.color = isDark ? '#04070A' : '#FDFBF4';
      } else if (bg.indexOf('rgba') !== -1 || bg.indexOf('rgb(') !== -1) {
        el.style.background = subGreen(bg, goldHex, goldMid, goldDrk, goldRgb);
      }
    }
    if (hasNeonGreen(bgIm)) {
      el.style.backgroundImage = subGreen(bgIm, goldHex, goldMid, goldDrk, goldRgb);
    }
    if (hasNeonGreen(col)) {
      el.style.color = goldHex;
    }
    if (hasNeonGreen(fill)) {
      el.style.setProperty('-webkit-text-fill-color', goldHex, 'important');
    }

    /* Neon cyan → electric gold (for secondary accents) */
    if (hasNeonCyan(bg)) {
      if (bg.indexOf('linear-gradient') !== -1) {
        el.style.background = subCyan(bg, goldHex, goldRgb);
        el.style.color = isDark ? '#04070A' : '#FDFBF4';
      } else if (bg.indexOf('rgba') !== -1 || bg.indexOf('rgb(') !== -1) {
        el.style.background = subCyan(bg, goldHex, goldRgb);
      }
    }
    if (hasNeonCyan(col)) {
      el.style.color = isDark ? '#10B981' : '#059669';
    }
    if (hasNeonCyan(fill)) {
      el.style.setProperty('-webkit-text-fill-color', isDark ? '#10B981' : '#059669', 'important');
    }

    /* Neon box-shadows → gold neon glow */
    if (shadow && hasNeonGreen(shadow)) {
      el.style.boxShadow = isDark
        ? '0 0 0 1px rgba(255,184,0,0.45),0 0 24px rgba(255,184,0,0.35),0 8px 28px rgba(0,0,0,0.55)'
        : '0 0 0 1px rgba(217,119,6,0.30),0 0 16px rgba(217,119,6,0.22),0 6px 22px rgba(100,70,10,0.28)';
    }
    if (shadow && hasNeonCyan(shadow)) {
      el.style.boxShadow = isDark
        ? '0 0 0 1px rgba(16,185,129,0.40),0 0 20px rgba(16,185,129,0.28),0 6px 22px rgba(0,0,0,0.50)'
        : '0 0 0 1px rgba(5,150,105,0.28),0 0 12px rgba(5,150,105,0.18),0 4px 16px rgba(0,80,50,0.18)';
    }

    /* Border color overrides */
    if (border && (hasNeonGreen(border) || hasNeonCyan(border))) {
      el.style.border = '1px solid ' + (isDark ? 'rgba(255,184,0,0.30)' : 'rgba(217,119,6,0.28)');
    }
  }

  /* ── Patch element classes ────────────────────────────── */
  function patchClass(el, t) {
    var isDark = (t === TOKEN.dark);
    var cls = el.className || '';
    if (typeof cls !== 'string') return;

    /* bg-[#39FF14] arbitrary Tailwind → gold gradient */
    if (cls.indexOf('39FF14') !== -1 || cls.indexOf('39ff14') !== -1) {
      el.style.setProperty('background', isDark
        ? 'linear-gradient(135deg,#FFB800 0%,#E89000 100%)'
        : 'linear-gradient(135deg,#D97706 0%,#B45309 100%)', 'important');
      el.style.setProperty('color', isDark ? '#04070A' : '#FDFBF4', 'important');
      el.style.setProperty('box-shadow', isDark
        ? '0 0 0 1px rgba(255,184,0,0.50),0 0 24px rgba(255,184,0,0.38),0 4px 16px rgba(0,0,0,0.50)'
        : '0 0 0 1px rgba(217,119,6,0.30),0 0 16px rgba(217,119,6,0.22),0 4px 14px rgba(100,70,10,0.25)', 'important');
    }

    /* text-[#39FF14] → gold text */
    if (cls.indexOf('text-[#39FF14]') !== -1 || cls.indexOf('text-[#39ff14]') !== -1) {
      el.style.setProperty('color', isDark ? '#FFB800' : '#D97706', 'important');
    }

    /* bg-[#00E5FF] or any class containing 00E5FF → glass emerald instead of solid cyan */
    if (cls.indexOf('00E5FF') !== -1 || cls.indexOf('00e5ff') !== -1) {
      el.style.setProperty('background', isDark
        ? 'rgba(16,185,129,0.12)'
        : 'rgba(5,150,105,0.10)', 'important');
      el.style.setProperty('border', isDark
        ? '1px solid rgba(16,185,129,0.35)'
        : '1px solid rgba(5,150,105,0.30)', 'important');
      el.style.setProperty('color', isDark ? '#34D399' : '#059669', 'important');
      el.style.setProperty('box-shadow', isDark
        ? '0 0 0 1px rgba(16,185,129,0.18),0 0 12px rgba(16,185,129,0.10)'
        : '0 0 0 1px rgba(5,150,105,0.14),0 0 8px rgba(5,150,105,0.08)', 'important');
    }
  }

  /* ── Apply theme CSS vars + class toggles ─────────────── */
  function applyTheme() {
    var root   = document.documentElement;
    var isDark = root.getAttribute('data-aero-theme') !== 'light';
    var aero   = document.querySelector('.aero-bg');
    if (!aero) return;

    /* Sync Tailwind dark class */
    if (isDark) {
      aero.classList.add('dark');
    } else {
      aero.classList.remove('dark');
    }

    /* Apply CSS vars to both html and aero-bg root */
    var vars = isDark ? CSS_VARS.dark : CSS_VARS.light;
    applyVars(root, vars);
    applyVars(aero, vars);

    /* Re-patch all inline-styled and class-based elements */
    var t = isDark ? TOKEN.dark : TOKEN.light;
    document.querySelectorAll('[style]').forEach(function(el) { patchEl(el, t); });
    document.querySelectorAll('[class]').forEach(function(el) { patchClass(el, t); });
    patchFabs(document, isDark);
  }

  /* ── FAB / primary button direct patch ───────────────── */
  function patchFabs(root, isDark) {
    var fabs = (root || document).querySelectorAll(
      'button[class*="fixed"][class*="rounded-full"],' +
      'button[class*="bottom"][class*="rounded-full"]'
    );
    fabs.forEach(function(fab) {
      if (isDark) {
        fab.style.background = 'linear-gradient(135deg,#FFB800 0%,#E89000 55%,#CC7500 100%)';
        fab.style.color = '#04070A';
        fab.style.boxShadow =
          '0 0 0 1px rgba(255,184,0,0.55),' +
          '0 0 28px rgba(255,184,0,0.42),' +
          '0 0 56px rgba(255,184,0,0.18),' +
          '0 8px 28px rgba(0,0,0,0.60)';
      } else {
        fab.style.background = 'linear-gradient(135deg,#D97706 0%,#B45309 100%)';
        fab.style.color = '#FDFBF4';
        fab.style.boxShadow =
          '0 0 0 1px rgba(217,119,6,0.32),' +
          '0 0 18px rgba(217,119,6,0.22),' +
          '0 6px 22px rgba(100,70,10,0.30)';
      }
    });
  }

  /* ── Theme observer on .aero-bg ──────────────────────── */
  var themeObs = new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) {
      if (muts[i].attributeName === 'class') { applyTheme(); break; }
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

  /* ── Shimmer sweep on glass cards ────────────────────── */
  function addShimmer(el) {
    if (el.dataset.shim) return;
    el.dataset.shim = '1';
    var sh = document.createElement('div');
    Object.assign(sh.style, {
      position:     'absolute',
      top:          '0',
      left:         '-90%',
      width:        '55%',
      height:       '100%',
      background:   'linear-gradient(108deg,transparent 15%,rgba(255,210,80,0.045) 50%,transparent 85%)',
      transform:    'skewX(-14deg)',
      transition:   'left 0.75s cubic-bezier(0.22,1,0.36,1)',
      pointerEvents:'none',
      zIndex:       '2',
      borderRadius: 'inherit',
    });
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.appendChild(sh);
    el.addEventListener('mouseenter', function () { sh.style.left = '150%'; });
    el.addEventListener('mouseleave', function () {
      sh.style.transition = 'none';
      sh.style.left = '-90%';
      requestAnimationFrame(function () {
        sh.style.transition = 'left 0.75s cubic-bezier(0.22,1,0.36,1)';
      });
    });
  }

  /* ── Ripple animation ────────────────────────────────── */
  var rippleKfInjected = false;
  function injectRippleKf() {
    if (rippleKfInjected) return;
    rippleKfInjected = true;
    var s = document.createElement('style');
    s.textContent = '@keyframes _bdfRipple{to{transform:scale(3.2);opacity:0}}';
    document.head.appendChild(s);
  }

  function ripple(e) {
    var btn = e.currentTarget;
    if (!btn) return;
    injectRippleKf();
    var dark = document.documentElement.getAttribute('data-aero-theme') !== 'light';
    var rect = btn.getBoundingClientRect();
    var r    = document.createElement('span');
    var size = Math.max(rect.width, rect.height) * 1.3;
    Object.assign(r.style, {
      position:     'absolute',
      width:        size + 'px',
      height:       size + 'px',
      left:         (e.clientX - rect.left  - size / 2) + 'px',
      top:          (e.clientY - rect.top   - size / 2) + 'px',
      borderRadius: '50%',
      background:   dark
        ? 'radial-gradient(circle,rgba(255,184,0,0.25) 0%,transparent 70%)'
        : 'radial-gradient(circle,rgba(217,119,6,0.18) 0%,transparent 70%)',
      transform:    'scale(0)',
      animation:    '_bdfRipple 0.52s cubic-bezier(0.22,1,0.36,1) forwards',
      pointerEvents:'none',
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

  /* ── Staggered card entrance animation ───────────────── */
  var seq = 0;
  function animIn(el) {
    if (el.dataset.ai || el.closest('[class*="nav"]') || el.closest('header')) return;
    el.dataset.ai = '1';
    var delay = Math.min(seq * 45, 300); seq++;
    el.style.cssText += ';opacity:0;transform:translateY(10px);transition:none';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.style.transition =
          'opacity 0.32s cubic-bezier(0.22,1,0.36,1) ' + delay + 'ms,' +
          'transform 0.32s cubic-bezier(0.22,1,0.36,1) ' + delay + 'ms';
        el.style.opacity   = '1';
        el.style.transform = 'translateY(0)';
      });
    });
  }

  /* ── Splash dismiss ──────────────────────────────────── */
  var splashDone = false;
  function dismissSplash() {
    if (splashDone) return;
    splashDone = true;
    var splash = document.getElementById('bdf-splash');
    if (!splash) return;
    setTimeout(function () {
      splash.classList.add('hidden');
      setTimeout(function () {
        if (splash.parentNode) splash.parentNode.removeChild(splash);
      }, 450);
    }, 80);
  }

  /* ── Process new DOM subtree ─────────────────────────── */
  function process(root) {
    root.querySelectorAll('.glass-card').forEach(addShimmer);
    root.querySelectorAll('.glass-card,[class*="card"]:not(nav *)').forEach(animIn);
    attachRipples(root);
    var isDark = document.documentElement.getAttribute('data-aero-theme') !== 'light';
    var t = isDark ? TOKEN.dark : TOKEN.light;
    root.querySelectorAll('[style]').forEach(function(el) { patchEl(el, t); });
    root.querySelectorAll('[class]').forEach(function(el) { patchClass(el, t); });
    patchFabs(root, isDark);
  }

  /* ── Main MutationObserver ───────────────────────────── */
  var mo = new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) {
      var m = muts[i];
      if (m.type !== 'childList') continue;
      m.addedNodes.forEach(function (n) {
        if (n.nodeType !== 1) return;
        if (n.parentElement === document.body) { seq = 0; }
        process(n);
        if (n.classList && n.classList.contains('aero-bg')) {
          attachThemeObs();
          dismissSplash();
        }
      });
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });

  /* ── Tab click handler ───────────────────────────────── */
  document.addEventListener('click', function (e) {
    var t = e.target.closest(
      '[role="tab"],nav a,nav button,header button,' +
      'header [role="button"],header [class*="cursor-pointer"]'
    );
    if (t) {
      seq = 0;
      setTimeout(function () {
        document.querySelectorAll('.glass-card').forEach(addShimmer);
        applyTheme();
      }, 150);
    }
  }, true);

  /* ── PWA Service Worker ──────────────────────────────── */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js')
        .then(function(r) { console.log('[SW] Registered, scope:', r.scope); })
        .catch(function(e) { console.warn('[SW] Registration failed:', e); });
    });
  }

  /* ── Bootstrap: set light vars immediately on html ───── */
  applyVars(document.documentElement, CSS_VARS.light);

  /* ── initObs: wait for React to mount .aero-bg ──────── */
  var initObs = new MutationObserver(function () {
    if (document.querySelector('.aero-bg')) {
      initObs.disconnect();
      attachThemeObs();
      process(document.body);
      dismissSplash();
    }
  });
  initObs.observe(
    document.getElementById('root') || document.body,
    { childList: true, subtree: true }
  );

  /* ── Fallback sweeps: re-patch after React renders ───── */
  [300, 700, 1400, 2500, 4000].forEach(function (ms) {
    setTimeout(function () {
      if (document.querySelector('.aero-bg')) {
        applyTheme();
      }
      if (ms >= 2000) { initObs.disconnect(); dismissSplash(); }
    }, ms);
  });

})();
