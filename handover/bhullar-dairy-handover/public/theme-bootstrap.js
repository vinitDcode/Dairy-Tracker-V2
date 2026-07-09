/* Theme bootstrap — runs synchronously before React paints.
   Extracted from inline <script> so Content-Security-Policy
   can use script-src 'self' without requiring 'unsafe-inline'.
   Golden Pasture palette — v6 */
(function(){
  var DARK_BG  = '#0B0E09';
  var LIGHT_BG = '#FAF7F0';

  var s;
  try { s = JSON.parse(localStorage.getItem('bdf_dark')); } catch(e) {}
  var d = (s !== false);
  var t = d ? 'dark' : 'light';
  var bg = d ? DARK_BG : LIGHT_BG;

  document.documentElement.setAttribute('data-aero-theme', t);
  document.documentElement.style.setProperty('background-color', bg, 'important');

  /* Keep data-aero-theme in sync when React toggles .dark on .aero-bg */
  var _obs = new MutationObserver(function(){
    var root = document.querySelector('.aero-bg');
    if (!root) return;
    var nd = root.classList.contains('dark');
    var nt = nd ? 'dark' : 'light';
    var nbg = nd ? DARK_BG : LIGHT_BG;
    if (document.documentElement.getAttribute('data-aero-theme') !== nt) {
      document.documentElement.setAttribute('data-aero-theme', nt);
      document.documentElement.style.setProperty('background-color', nbg, 'important');
      document.body.style.setProperty('background-color', nbg, 'important');
      /* Update splash orb colors on theme switch */
      var splash = document.getElementById('bdf-splash');
      if (splash) {
        splash.style.backgroundColor = nbg;
      }
    }
  });
  _obs.observe(document.documentElement, {
    subtree: true, attributes: true, attributeFilter: ['class']
  });
})();
