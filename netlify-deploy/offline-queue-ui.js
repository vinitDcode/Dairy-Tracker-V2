/* ═══════════════════════════════════════════════════════════════════
   BHULLAR DAIRY — OFFLINE QUEUE UI  v1
   
   Listens for service worker messages about queued/flushed Supabase
   mutations and shows a non-intrusive toast banner so the farmer
   always knows whether their saves are pending or confirmed.
   
   Works alongside sw.js Background Sync queue.
═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  if (!('serviceWorker' in navigator)) return;

  /* ── STYLES ──────────────────────────────────────────────────── */
  var style = document.createElement('style');
  style.textContent = [
    '#bdf-sync-bar{',
      'position:fixed;bottom:calc(70px + env(safe-area-inset-bottom,0px));left:50%;',
      'transform:translateX(-50%) translateY(20px);',
      'display:flex;align-items:center;gap:8px;',
      'padding:9px 16px;border-radius:100px;',
      'font-family:"DM Sans",-apple-system,system-ui,sans-serif;',
      'font-size:13px;font-weight:600;',
      'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);',
      'border:1px solid rgba(255,255,255,0.12);',
      'box-shadow:0 8px 32px rgba(0,0,0,0.45);',
      'z-index:9998;pointer-events:none;',
      'opacity:0;transition:opacity .25s,transform .25s;',
      'white-space:nowrap;',
    '}',
    '#bdf-sync-bar.bdf-visible{opacity:1;transform:translateX(-50%) translateY(0);}',
    '#bdf-sync-bar.bdf-queued{background:rgba(30,20,8,0.88);color:#FFD600;}',
    '#bdf-sync-bar.bdf-flushed{background:rgba(8,22,10,0.88);color:#4ADE80;}',
    '#bdf-sync-bar.bdf-offline{background:rgba(22,8,8,0.88);color:#FF6B6B;}',
  ].join('');
  document.head.appendChild(style);

  /* ── BANNER ELEMENT ──────────────────────────────────────────── */
  var bar = document.createElement('div');
  bar.id = 'bdf-sync-bar';
  bar.setAttribute('role', 'status');
  bar.setAttribute('aria-live', 'polite');
  document.body.appendChild(bar);

  var _hideTimer = null;

  function showBar(icon, text, state, duration) {
    bar.textContent = icon + '\u00A0' + text;
    bar.className = 'bdf-visible bdf-' + state;
    clearTimeout(_hideTimer);
    if (duration) {
      _hideTimer = setTimeout(function () {
        bar.className = bar.className.replace('bdf-visible', '').trim();
      }, duration);
    }
  }

  /* ── SERVICE WORKER MESSAGE LISTENER ─────────────────────────── */
  navigator.serviceWorker.addEventListener('message', function (e) {
    if (!e.data) return;

    if (e.data.type === 'BDF_MUTATION_QUEUED') {
      showBar('📶', 'Offline — saved locally, will sync when connected', 'queued', 6000);
    }

    if (e.data.type === 'BDF_SYNC_FLUSHED') {
      showBar('✅', 'Synced to cloud', 'flushed', 4000);
    }
  });

  /* ── ONLINE / OFFLINE NATIVE EVENTS ──────────────────────────── */
  window.addEventListener('offline', function () {
    showBar('📴', 'No connection — changes saved locally', 'offline', 0 /* persist */);
  });

  window.addEventListener('online', function () {
    /* Tell the service worker to flush the queue immediately */
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'BDF_FLUSH_NOW' });
    }
    showBar('🛜', 'Back online — syncing...', 'flushed', 3500);
  });

  /* ── QUEUE COUNT BADGE (requests SW for count on load) ───────── */
  navigator.serviceWorker.ready.then(function () {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'BDF_QUEUE_COUNT' });
    }
  });

  navigator.serviceWorker.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'BDF_QUEUE_COUNT_REPLY' && e.data.count > 0) {
      showBar('⏳', e.data.count + ' change' + (e.data.count > 1 ? 's' : '') + ' pending sync', 'queued', 6000);
    }
  });

})();
