/* ═══════════════════════════════════════════════════════════
   BHULLAR DAIRY — THEME BOOTSTRAP  v10  (neon green)
   Runs SYNCHRONOUSLY before React paints.
   • Sets html[data-aero-theme] to prevent flash
   • Injects branded splash screen with neon green logo
   CSP: script-src 'self' — no unsafe-inline needed.
═══════════════════════════════════════════════════════════ */
(function () {

  /* ── 1. THEME DETECTION ───────────────────────────────── */
  var s;
  try { s = JSON.parse(localStorage.getItem('bdf_dark')); } catch (e) {}
  var isDark = (s !== false);
  var theme  = isDark ? 'dark' : 'light';

  var BG_DARK  = '#120a04';
  var BG_LIGHT = '#f4faf4';

  document.documentElement.setAttribute('data-aero-theme', theme);
  document.documentElement.style.setProperty('background-color', isDark ? BG_DARK : BG_LIGHT, 'important');

  /* Keep data-aero-theme synced when React toggles .dark */
  var _obs = new MutationObserver(function () {
    var root = document.querySelector('.aero-bg');
    if (!root) return;
    var nd = root.classList.contains('dark');
    var nt = nd ? 'dark' : 'light';
    if (document.documentElement.getAttribute('data-aero-theme') !== nt) {
      document.documentElement.setAttribute('data-aero-theme', nt);
      document.documentElement.style.setProperty('background-color', nd ? BG_DARK : BG_LIGHT, 'important');
      document.body.style.setProperty('background-color', nd ? BG_DARK : BG_LIGHT, 'important');
    }
  });
  _obs.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['class'] });

  /* ── 2. SPLASH SCREEN ─────────────────────────────────── */
  var splashBg  = isDark
    ? 'linear-gradient(145deg, #0a1a0a 0%, #120a04 50%, #0d160a 100%)'
    : 'linear-gradient(145deg, #edfeed 0%, #f4faf4 50%, #e8f5e8 100%)';
  var textColor = isDark ? '#e8f5e2' : '#0a3010';
  var subColor  = isDark ? 'rgba(232,245,226,0.55)' : 'rgba(10,48,16,0.55)';
  var glowColor = isDark ? 'rgba(57,255,20,0.22)' : 'rgba(26,122,16,0.18)';
  var neonGreen = isDark ? '#39FF14' : '#1a7a10';
  var neonCyan  = isDark ? '#00E5FF' : '#0077aa';

  var splash = document.createElement('div');
  splash.id = 'bdf-splash';
  splash.setAttribute('aria-hidden', 'true');
  splash.innerHTML = [
    '<style>',
    '#bdf-splash{',
      'position:fixed;inset:0;z-index:99999;',
      'display:flex;flex-direction:column;align-items:center;justify-content:center;',
      'background:' + splashBg + ';',
      'transition:opacity 0.55s cubic-bezier(0.4,0,0.2,1);',
      'pointer-events:none;',
    '}',
    '#bdf-splash.fade-out{opacity:0;}',
    '#bdf-splash-logo{',
      'width:88px;height:88px;',
      'border-radius:24px;',
      'background:' + (isDark ? 'rgba(57,255,20,0.08)' : 'rgba(26,122,16,0.09)') + ';',
      'border:1.5px solid ' + (isDark ? 'rgba(57,255,20,0.28)' : 'rgba(26,122,16,0.24)') + ';',
      'display:flex;align-items:center;justify-content:center;',
      'box-shadow:0 0 48px ' + glowColor + ',0 8px 32px rgba(0,0,0,' + (isDark ? '0.55' : '0.10') + ');',
      'margin-bottom:24px;',
      'animation:splashPop 0.6s cubic-bezier(0.34,1.56,0.64,1) both;',
    '}',
    '#bdf-splash-name{',
      'font-family:"DM Sans",-apple-system,sans-serif;',
      'font-size:22px;font-weight:700;letter-spacing:-0.02em;',
      'color:' + textColor + ';',
      'animation:splashFadeUp 0.5s 0.15s cubic-bezier(0.22,1,0.36,1) both;',
    '}',
    '#bdf-splash-sub{',
      'font-family:"DM Sans",-apple-system,sans-serif;',
      'font-size:12px;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;',
      'color:' + subColor + ';margin-top:6px;',
      'animation:splashFadeUp 0.5s 0.25s cubic-bezier(0.22,1,0.36,1) both;',
    '}',
    '#bdf-splash-bar{',
      'width:48px;height:3px;border-radius:2px;margin-top:28px;overflow:hidden;',
      'background:' + (isDark ? 'rgba(57,255,20,0.14)' : 'rgba(26,122,16,0.12)') + ';',
      'animation:splashFadeUp 0.5s 0.35s cubic-bezier(0.22,1,0.36,1) both;',
    '}',
    '#bdf-splash-bar-fill{',
      'height:100%;width:0;border-radius:2px;',
      'background:linear-gradient(90deg,' + neonGreen + ',' + neonCyan + ');',
      'box-shadow:0 0 8px ' + glowColor + ';',
      'animation:splashLoad 1.1s 0.4s cubic-bezier(0.4,0,0.2,1) forwards;',
    '}',
    '@keyframes splashPop{from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}}',
    '@keyframes splashFadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}',
    '@keyframes splashLoad{from{width:0}to{width:100%}}',
    '</style>',
    '<div id="bdf-splash-logo">',
      '<svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">',
        '<path d="M26 6C26 6 10 20 10 32C10 40.837 17.163 48 26 48C34.837 48 42 40.837 42 32C42 20 26 6 26 6Z"',
          'fill="' + (isDark ? 'rgba(57,255,20,0.14)' : 'rgba(26,122,16,0.12)') + '"',
          'stroke="' + neonGreen + '" stroke-width="1.5"/>',
        '<path d="M26 13C26 13 16 23 16 31C16 36.523 20.477 41 26 41C31.523 41 36 36.523 36 31C36 23 26 13 26 13Z"',
          'fill="' + (isDark ? 'rgba(0,229,255,0.18)' : 'rgba(26,122,16,0.16)') + '"/>',
        '<circle cx="21" cy="26" r="2.5" fill="' + (isDark ? 'rgba(200,255,200,0.80)' : 'rgba(255,255,255,0.85)') + '"/>',
        '<path d="M30 22 Q33 27 31 32" stroke="' + (isDark ? 'rgba(57,255,20,0.45)' : 'rgba(26,122,16,0.35)') + '"',
          'stroke-width="1.5" stroke-linecap="round"/>',
      '</svg>',
    '</div>',
    '<div id="bdf-splash-name">Bhullar Dairy Farm</div>',
    '<div id="bdf-splash-sub">Punjab Operations</div>',
    '<div id="bdf-splash-bar"><div id="bdf-splash-bar-fill"></div></div>',
  ].join('');

  document.documentElement.appendChild(splash);

})();
