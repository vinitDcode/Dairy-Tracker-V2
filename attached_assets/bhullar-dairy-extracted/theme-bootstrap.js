/* Theme bootstrap — runs synchronously before React paints.
   Extracted from inline <script> so Content-Security-Policy
   can use script-src 'self' without requiring 'unsafe-inline'. */
(function(){
  var s;
  try { s = JSON.parse(localStorage.getItem('bdf_dark')); } catch(e) {}
  var d = (s !== false);
  var t = d ? 'dark' : 'light';
  document.documentElement.setAttribute('data-aero-theme', t);
  document.documentElement.style.setProperty('background-color', d ? '#020b0e' : '#ecf2ee', 'important');
  /* Keep data-aero-theme in sync when React toggles .dark on root div */
  var _obs = new MutationObserver(function(){
    var root = document.querySelector('.aero-bg');
    if (!root) return;
    var nd = root.classList.contains('dark');
    var nt = nd ? 'dark' : 'light';
    if (document.documentElement.getAttribute('data-aero-theme') !== nt) {
      document.documentElement.setAttribute('data-aero-theme', nt);
      document.documentElement.style.setProperty('background-color', nd ? '#020b0e' : '#ecf2ee', 'important');
      document.body.style.setProperty('background-color', nd ? '#020b0e' : '#ecf2ee', 'important');
    }
  });
  _obs.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['class'] });
})();
