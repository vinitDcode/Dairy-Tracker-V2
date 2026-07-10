/* ═══════════════════════════════════════════════════════════════════════
   BHULLAR DAIRY — GENETICS INTELLIGENCE  v3
   Reads from app localStorage (bdf_cows / bdf_semen / bdf_lineage / bdf_logs)
   — NO Supabase REST calls for cattle data; Supabase only for weather proxy.
   Injects a card panel directly inside the active Genetics & Breeding tab.
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── CONFIG ─────────────────────────────────────────────────────────── */
  // (Supabase edge-function weather proxy no longer used — Open-Meteo is free/keyless and primary now)

  var DEFAULT_LAT  = 30.9;  // Ludhiana, Punjab
  var DEFAULT_LON  = 75.8;
  var THI_CACHE_KEY = 'gbm_thi_v4'; // bumped — forces fresh fetch after Open-Meteo fix
  var THI_TTL_MS   = 30 * 60 * 1000;
  var HEAT_CYCLE   = 21;
  var WRAPPER_CLS  = 'gbm-wrapper';

  /* ── LOCAL DATA ACCESSORS ───────────────────────────────────────────
   * The SPA stores everything in localStorage under bdf_* keys.
   * All objects are camelCase (tagNumber, lastCalvingDate, etc.)
   */
  function lsGet(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
  }
  function getCows()    { return lsGet('bdf_cows')    || []; }
  function getSemen()   { return lsGet('bdf_semen')   || []; }
  function getLineage() { return lsGet('bdf_lineage') || []; }
  function getLogs()    { return lsGet('bdf_logs')    || []; }

  /* ── ELEMENT BUILDER ────────────────────────────────────────────────
   * @param {string} tag  @param {string} [cls]
   * @param {(Node|string|null)[]} [kids]  @param {Object<string,string>} [attrs]
   * @returns {HTMLElement}
   */
  function el(tag, cls, kids, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if      (k === 'style') n.style.cssText = attrs[k];
      else if (k === 'html')  n.innerHTML = attrs[k];
      else                    n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) {
      if (c == null) return;
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return n;
  }

  /** Safe node remove — no-op if already detached */
  function safeRemove(node) {
    if (node && node.parentNode) node.parentNode.removeChild(node);
  }

  /** Card title helper — consistent structure */
  function cardTitle(icon, text) {
    return el('div', 'gbm-card-title', [
      el('span', 'gbm-icon', [icon]),
      el('span', null, [text]),
    ]);
  }

  /* ── DATE HELPERS ─────────────────────────────────────────────────── */
  function fmtDate(d) {
    try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch (e) { return String(d); }
  }
  function daysFrom(dateStr) {
    if (!dateStr) return null;
    return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  }

  /* ── THI ──────────────────────────────────────────────────────────── */
  function calcTHI(tempC, rh) {
    var f = tempC * 1.8 + 32;
    return Math.round(f - (0.55 - 0.0055 * rh) * (f - 26));
  }
  function thiColor(thi) {
    return thi >= 72 ? '#FF4444' : thi >= 68 ? '#FFD600' : '#39FF14';
  }
  function thiLabel(thi) {
    return thi >= 72 ? 'SEVERE ≥72' : thi >= 68 ? 'MILD 68–71' : 'OPTIMAL <68';
  }

  function loadTHI() {
    try {
      var c = JSON.parse(localStorage.getItem(THI_CACHE_KEY) || 'null');
      if (c && (Date.now() - c.cachedAt) < THI_TTL_MS) return Promise.resolve(c);
    } catch (e) {}

    // Primary: Open-Meteo — completely free, no API key, browser CORS allowed
    var omURL = 'https://api.open-meteo.com/v1/forecast' +
      '?latitude=' + DEFAULT_LAT + '&longitude=' + DEFAULT_LON +
      '&current=temperature_2m,relative_humidity_2m&timezone=Asia%2FKolkata';

    return fetch(omURL)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        var cur  = (data && data.current) || {};
        var rawT = cur.temperature_2m, rawH = cur.relative_humidity_2m;
        if (typeof rawT !== 'number' || typeof rawH !== 'number' || isNaN(rawT) || isNaN(rawH)) {
          throw new Error('Malformed Open-Meteo payload');
        }
        var temp = Math.round(rawT * 10) / 10;
        var rh   = Math.round(rawH);
        var res  = { thi: calcTHI(temp, rh), temp: temp, humidity: rh,
                     synthetic: false, cachedAt: Date.now() };
        localStorage.setItem(THI_CACHE_KEY, JSON.stringify(res));
        return res;
      })
      .catch(function () {
        // Fallback: season-aware estimate for Punjab (only if network fails)
        var m = new Date().getMonth(); // 0-based
        // Punjab seasonal averages: Summer(Mar-Jun) / Monsoon(Jul-Sep) / Winter(Oct-Feb)
        var temp, rh;
        if      (m >= 2 && m <= 5) { temp = 38; rh = 35; }  // Summer: hot, dry
        else if (m >= 6 && m <= 8) { temp = 33; rh = 78; }  // Monsoon: warm, humid
        else                        { temp = 17; rh = 60; }  // Winter: cool
        var res = { thi: calcTHI(temp, rh), temp: temp, humidity: rh,
                    synthetic: true, cachedAt: Date.now() };
        localStorage.setItem(THI_CACHE_KEY, JSON.stringify(res));
        return res;
      });
  }

  /* ── RING SVG ─────────────────────────────────────────────────────── */
  function ring(pct, color) {
    var r = 26, c = 36, circ = 2 * Math.PI * r;
    var fill = (Math.max(0, Math.min(1, pct)) * circ).toFixed(1);
    var d = document.createElement('div');
    d.innerHTML = '<svg width="72" height="72" viewBox="0 0 72 72" style="display:block">' +
      '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="5"/>' +
      '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="5"' +
        ' stroke-linecap="round" stroke-dasharray="' + fill + ' ' + circ.toFixed(1) + '"' +
        ' transform="rotate(-90 ' + c + ' ' + c + ')"/></svg>';
    return d;
  }

  /* ── BAR ──────────────────────────────────────────────────────────── */
  function bar(pct, alert) {
    var fill = el('div', 'gbm-bar-fill' + (alert ? ' gbm-bar-fill--alert' : ''), null,
      { style: '--gbm-w:' + Math.round(Math.max(0, Math.min(100, pct))) + '%' });
    return el('div', 'gbm-bar-track', [fill]);
  }

  /* ── COW TAG DETECTION ──────────────────────────────────────────────
   * Extracts the cow tagNumber from the visible genetics panel text.
   * All searches are scoped to the found panel to avoid cross-modal collisions.
   */
  function extractTag(panel) {
    var txt = (panel && panel.textContent) || '';
    // Primary: "No Genetics Records for BH-001"
    var m = txt.match(/No Genetics Records for\s+(\S+)/i);
    if (m) return m[1];
    // Secondary: look for a heading inside the panel that looks like a cow tag
    if (panel) {
      var heads = panel.querySelectorAll('h1,h2,h3,[class*="font-bold"],[class*="font-semibold"],[class*="text-lg"],[class*="text-xl"]');
      for (var i = 0; i < heads.length; i++) {
        var t = heads[i].textContent.trim().split(/\s/)[0];
        if (/^[A-Za-z]{1,5}[-_]?\d{1,6}$/.test(t) && t.length < 16) return t;
      }
    }
    return null;
  }

  /* ── FIND THE GENETICS PANEL CONTAINER ─────────────────────────────
   * Returns the best injection container when the Genetics tab is active.
   */
  var PANEL_TEXTS = ['Add Breeding Record', 'No Genetics Records', 'Semen Batches', 'AI Semen Batch'];

  /* Listeners attached once at module level so they don't accumulate on re-injection */
  var _listenersAttached = false;

  function findPanel() {
    // 1. Prefer explicit ARIA tabpanel with genetics keywords (most reliable)
    var tabpanels = document.querySelectorAll('[role="tabpanel"]');
    for (var tp = 0; tp < tabpanels.length; tp++) {
      var txt = tabpanels[tp].textContent || '';
      var hasText = PANEL_TEXTS.some(function (p) { return txt.indexOf(p) !== -1; });
      if (!hasText) continue;
      var r = tabpanels[tp].getBoundingClientRect();
      if (r.width > 80 && r.height > 60) return tabpanels[tp];
    }

    // 2. Fallback: find the LARGEST qualifying element that is not the
    //    whole page (capped at 90% viewport in both dimensions).
    //    This targets the tab panel body, not a nested button or pill.
    var vw = window.innerWidth, vh = window.innerHeight;
    var candidates = document.querySelectorAll('div[class],section,article');
    var best = null, bestArea = 0;

    for (var i = 0; i < candidates.length; i++) {
      var c = candidates[i];
      var t = c.textContent || '';
      var ok = PANEL_TEXTS.some(function (p) { return t.indexOf(p) !== -1; });
      if (!ok) continue;

      var rect = c.getBoundingClientRect();
      // Must be meaningfully sized but not the full page
      if (rect.width < 120 || rect.height < 80)         continue;
      if (rect.width > vw * 0.95 && rect.height > vh * 0.90) continue;

      var area = rect.width * rect.height;
      if (area > bestArea) { best = c; bestArea = area; }
    }
    return best;
  }

  /* ═══════════════════════════════════════════════════════════════════
     CARD BUILDERS — all reading from localStorage
  ═══════════════════════════════════════════════════════════════════ */

  /* ── CARD 1: Live THI ─────────────────────────────────────────────── */
  function cardTHI() {
    var card = el('div', 'gbm-card');
    card.appendChild(cardTitle('🌡️', 'Live THI & Heat Stress'));
    var body = el('div', 'gbm-card-body');
    card.appendChild(body);
    var load = el('div', 'gbm-loading', ['Fetching weather…']);
    body.appendChild(load);

    loadTHI().then(function (d) {
      safeRemove(load);
      var thi = d.thi, col = thiColor(thi);
      // Scale: 50 = left edge, 100 = right edge (range 50–100 covers all real THI)
      var pct = Math.min(100, Math.max(0, Math.round((thi - 50) / 50 * 100)));
      var sourceLabel = d.synthetic
        ? '📡 Seasonal estimate'
        : '🛰 Open-Meteo · live';

      // Big THI number display
      var thiBig = el('div', 'gbm-thi-big');
      thiBig.appendChild(el('span', 'gbm-thi-num', [String(thi)], { style: 'color:' + col }));
      thiBig.appendChild(el('span', 'gbm-thi-status', [thiLabel(thi)], { style: 'color:' + col }));
      body.appendChild(thiBig);

      body.appendChild(el('div', 'gbm-row', [
        el('span', 'gbm-label', ['Temperature']),
        el('span', 'gbm-value gbm-mono', [d.temp + ' °C']),
      ]));
      body.appendChild(el('div', 'gbm-row', [
        el('span', 'gbm-label', ['Humidity']),
        el('span', 'gbm-value gbm-mono', [d.humidity + ' %']),
      ]));

      // Gauge with zone markers at 68 and 72
      var gfill = el('div', 'gbm-thi-gauge-fill', null, { style: '--thi-w:' + pct + '%;--thi-color:' + col });
      body.appendChild(el('div', 'gbm-thi-gauge-wrap', [
        el('div', 'gbm-thi-gauge-bar', [gfill]),
        el('div', 'gbm-thi-thresholds', [
          el('span', 'gbm-thi-zone', ['OK'], { style: 'color:rgba(57,255,20,0.6)' }),
          el('span', 'gbm-thi-marker', ['68']),
          el('span', 'gbm-thi-zone', ['MILD'], { style: 'color:rgba(255,214,0,0.7)' }),
          el('span', 'gbm-thi-marker', ['72']),
          el('span', 'gbm-thi-zone', ['SEVERE'], { style: 'color:rgba(255,68,68,0.7)' }),
        ]),
      ]));

      body.appendChild(el('div', 'gbm-row', [
        el('span', 'gbm-label', ['Source']),
        el('span', 'gbm-value gbm-thi-source', [sourceLabel]),
      ]));

      if (thi >= 72) {
        body.appendChild(el('div', 'gbm-alert gbm-alert--danger', [
          el('span', 'gbm-alert-icon', ['🔒']),
          el('div', null, [
            el('strong', null, ['Sexed semen locked — THI ≥ 72']),
            el('br'),
            'Severe heat stress. Use conventional semen only. Activate cooling protocol.',
          ]),
        ]));
      } else if (thi >= 68) {
        body.appendChild(el('div', 'gbm-alert gbm-alert--warn', [
          el('span', 'gbm-alert-icon', ['⚠️']),
          'Mild heat stress (THI ' + thi + '). Monitor closely before inseminating.',
        ]));
      } else {
        body.appendChild(el('div', 'gbm-alert gbm-alert--ok', [
          el('span', 'gbm-alert-icon', ['✅']),
          'Optimal breeding conditions — THI ' + thi + '.',
        ]));
      }
    }).catch(function (e) {
      load.textContent = '⚠ Could not load weather: ' + e.message;
    });

    return card;
  }

  /* ── CARD 2: Cow Profile + Dry-Off ───────────────────────────────── */
  function cardCow(cowTag) {
    var card = el('div', 'gbm-card');
    card.appendChild(cardTitle('🐄', 'Cow Profile & Dry-Off'));
    var body = el('div', 'gbm-card-body');
    card.appendChild(body);

    var cows = getCows();
    var cow = cowTag ? cows.find(function (c) {
      return (c.tagNumber || '').toLowerCase() === cowTag.toLowerCase();
    }) : null;

    if (!cow && cows.length) cow = cows[cows.length - 1]; // fallback: most recent

    if (!cow) {
      body.appendChild(el('p', 'gbm-muted', ['No cattle record found. Add cows in the Cattle tab.']));
      return card;
    }

    body.appendChild(el('div', 'gbm-row', [el('span', 'gbm-label', ['Tag']), el('span', 'gbm-value gbm-mono', [cow.tagNumber || '—'])]));
    body.appendChild(el('div', 'gbm-row', [el('span', 'gbm-label', ['Breed']), el('span', 'gbm-value', [cow.breed || '—'])]));
    body.appendChild(el('div', 'gbm-row', [el('span', 'gbm-label', ['Stage']), el('span', 'gbm-value', [cow.lactationStage || '—'])]));
    body.appendChild(el('div', 'gbm-row', [el('span', 'gbm-label', ['Age']), el('span', 'gbm-value gbm-mono', [cow.age ? cow.age + ' yrs' : '—'])]));

    if (cow.lastCalvingDate) {
      var calved  = new Date(cow.lastCalvingDate);
      var dryStart = new Date(calved);  dryStart.setDate(dryStart.getDate() + 210); // 305d lac → ~7mo
      var nextCalve = new Date(calved); nextCalve.setDate(nextCalve.getDate() + 285); // typical 285d cycle
      var daysToCalve = Math.ceil((nextCalve - new Date()) / 86400000);
      var daysToDry   = Math.ceil((dryStart  - new Date()) / 86400000);
      var inDry = new Date() >= dryStart;

      body.appendChild(el('div', 'gbm-row', [el('span', 'gbm-label', ['Last Calving']), el('span', 'gbm-value gbm-mono', [fmtDate(cow.lastCalvingDate)])]));

      if (inDry) {
        body.appendChild(el('div', 'gbm-alert gbm-alert--urgent', [
          el('span', 'gbm-alert-icon', ['🛑']),
          el('div', null, [el('strong', null, ['DRY PERIOD — halt milking']), el('br'), 'Calving est. ' + fmtDate(nextCalve)]),
        ]));
      } else if (daysToDry <= 14) {
        body.appendChild(el('div', 'gbm-alert gbm-alert--warn', [
          el('span', 'gbm-alert-icon', ['⚠️']),
          'Dry-off in ' + daysToDry + ' day(s) — prepare transition diet.',
        ]));
      } else {
        body.appendChild(el('div', 'gbm-alert gbm-alert--ok', [
          el('span', 'gbm-alert-icon', ['✅']),
          (daysToCalve > 0 ? daysToCalve + ' days to estimated calving.' : 'Calving due soon.'),
        ]));
      }
    } else {
      body.appendChild(el('p', 'gbm-muted', ['No calving date recorded — dry-off cannot be calculated.']));
    }

    return card;
  }

  /* ── CARD 3: Semen Inventory ──────────────────────────────────────── */
  function cardSemen() {
    var card = el('div', 'gbm-card');
    card.appendChild(cardTitle('🧬', 'Semen Inventory & Alerts'));
    var body = el('div', 'gbm-card-body');
    card.appendChild(body);

    var batches = getSemen();
    if (!batches.length) {
      body.appendChild(el('p', 'gbm-muted', ['No semen batches. Add one via "AI Semen Batch +" above.']));
      return card;
    }

    var flagged  = batches.filter(function (b) { return b.flagged; });
    var ok       = batches.filter(function (b) { return !b.flagged; });

    if (flagged.length) {
      body.appendChild(el('div', 'gbm-alert gbm-alert--danger', [
        el('span', 'gbm-alert-icon', ['🚫']),
        el('div', null, [
          el('strong', null, [flagged.length + ' batch(es) AUTO-FLAGGED']),
          el('br'),
          flagged.map(function (b) { return (b.bullName || 'Unknown') + ': ' + (b.flagReason || 'low ROI'); }).join(' · '),
        ]),
      ]));
    }

    ok.slice(0, 3).forEach(function (b, i) {
      var score = parseFloat(String(b.traitScore)) || 0;
      var pct   = Math.round((score / 10) * 100);
      var row = el('div', 'gbm-bull-row' + (i === 0 ? ' gbm-bull-row--top' : ''));
      row.appendChild(el('div', 'gbm-bull-header', [
        el('span', 'gbm-bull-rank', ['#' + (i + 1)]),
        el('span', 'gbm-bull-name', [b.bullName || 'Bull']),
        el('span', 'gbm-bull-units', ['₹' + (b.costPerDose || '?') + '/dose']),
      ]));
      row.appendChild(el('div', 'gbm-bull-meta', [
        el('span', null, [b.breed || '—']),
        el('span', 'gbm-bull-score-label', ['Merit: ' + score + '/10 (' + pct + '%)']),
      ]));
      row.appendChild(bar(pct, false));
      body.appendChild(row);
    });

    if (ok.length > 3) body.appendChild(el('p', 'gbm-muted', ['+ ' + (ok.length - 3) + ' more batches available.']));

    return card;
  }

  /* ── CARD 4: Breeding ROI Analytics ──────────────────────────────── */
  function cardROI(cowTag) {
    var card = el('div', 'gbm-card');
    card.appendChild(cardTitle('📊', 'Breeding ROI & Outcomes'));
    var body = el('div', 'gbm-card-body');
    card.appendChild(body);

    var cows    = getCows();
    var semen   = getSemen();
    var lineage = getLineage();

    var cow = cowTag ? cows.find(function (c) {
      return (c.tagNumber || '').toLowerCase() === cowTag.toLowerCase();
    }) : null;
    if (!cow && cows.length) cow = cows[cows.length - 1];

    var records = cow ? lineage.filter(function (l) { return l.damId === cow.id; }) : lineage;

    if (!records.length) {
      body.appendChild(el('p', 'gbm-muted', [cow ? 'No breeding records for this cow yet.' : 'No breeding records in farm.']));
      return card;
    }

    // Aggregate per sire batch
    var byBatch = {};
    records.forEach(function (r) {
      var batch = semen.find(function (s) { return s.id === r.sireId; });
      var key   = r.sireId || 'unknown';
      if (!byBatch[key]) byBatch[key] = { name: batch ? batch.bullName : 'Unknown', total: 0, cost: 0, roi: 0, roiCount: 0 };
      byBatch[key].total++;
      byBatch[key].cost += (batch ? (parseFloat(batch.costPerDose) || 0) * (parseInt(r.dosesUsed) || 1) : 0);
      if (r.roi && r.hasEnoughData) { byBatch[key].roi += (r.roi || 0); byBatch[key].roiCount++; }
    });

    var totalCost = records.reduce(function (acc, r) {
      var b = semen.find(function (s) { return s.id === r.sireId; });
      return acc + (b ? (parseFloat(b.costPerDose) || 0) * (parseInt(r.dosesUsed) || 1) : 0);
    }, 0);

    body.appendChild(el('div', 'gbm-row', [
      el('span', 'gbm-label', ['Total AI Events']),
      el('span', 'gbm-value gbm-mono', [String(records.length)]),
    ]));
    body.appendChild(el('div', 'gbm-row', [
      el('span', 'gbm-label', ['Total AI Cost']),
      el('span', 'gbm-value gbm-mono', ['₹' + totalCost.toLocaleString('en-IN')]),
    ]));

    Object.keys(byBatch).slice(0, 4).forEach(function (key) {
      var b       = byBatch[key];
      var avgROI  = b.roiCount ? Math.round(b.roi / b.roiCount) : null;
      var isLow   = avgROI !== null && avgROI < 0;
      var roiStr  = avgROI !== null ? (avgROI >= 0 ? '+' : '') + avgROI + '%' : 'Insufficient data';

      var row = el('div', 'gbm-stat-row' + (isLow ? ' gbm-stat-row--alert' : ''));
      row.appendChild(el('div', 'gbm-stat-header', [
        el('span', 'gbm-stat-name', [(isLow ? '⚠ ' : '✓ ') + b.name]),
        el('span', 'gbm-stat-pct gbm-mono' + (isLow ? ' gbm-stat-pct--alert' : ''), [b.total + ' AI · ROI ' + roiStr]),
      ]));
      body.appendChild(row);
    });

    return card;
  }

  /* ── CARD 5: Heat Cycle ───────────────────────────────────────────── */
  function cardHeat(cowTag) {
    var card = el('div', 'gbm-card');
    card.appendChild(cardTitle('🔥', 'Heat Cycle Tracker'));
    var body = el('div', 'gbm-card-body');
    card.appendChild(body);

    var cows    = getCows();
    var lineage = getLineage();

    var cow = cowTag ? cows.find(function (c) {
      return (c.tagNumber || '').toLowerCase() === cowTag.toLowerCase();
    }) : null;
    if (!cow && cows.length) cow = cows[cows.length - 1];

    // Last AI event date for this cow
    var cowRecords = cow ? lineage.filter(function (l) { return l.damId === cow.id; }) : [];
    var lastAI = cowRecords.length
      ? cowRecords.sort(function (a, b) { return (b.aiDate || b.id || '') > (a.aiDate || a.id || '') ? 1 : -1; })[0]
      : null;

    // Use lastCalvingDate or last AI event to estimate next heat
    var refDate = (lastAI && lastAI.aiDate) ? new Date(lastAI.aiDate)
                : (cow && cow.lastCalvingDate)  ? new Date(cow.lastCalvingDate)
                : null;

    var daysLeft = null, nextHeat = null, urgent = false;
    if (refDate) {
      var daysSince = Math.floor((new Date() - refDate) / 86400000);
      var cyclePos  = daysSince % HEAT_CYCLE;
      // cyclePos === 0 means heat is due today (0 days remaining), not 21
      var remaining = (cyclePos === 0 && daysSince > 0) ? 0 : (HEAT_CYCLE - cyclePos);
      daysLeft = remaining;
      nextHeat = new Date(); nextHeat.setDate(nextHeat.getDate() + remaining);
      urgent   = remaining <= 3;
    }

    if (urgent) {
      body.appendChild(el('div', 'gbm-alert gbm-alert--urgent', [
        el('span', 'gbm-alert-icon', ['⚡']),
        el('strong', null, ['Heat imminent in ' + daysLeft + ' day(s) — prepare AI.']),
      ]));
    }

    var flex = el('div', 'gbm-heat-flex');
    var col  = urgent ? '#FF4444' : '#39FF14';
    var ringWrap = el('div', 'gbm-ring-wrap', [
      ring(daysLeft !== null ? (HEAT_CYCLE - daysLeft) / HEAT_CYCLE : 0, col),
      el('div', 'gbm-ring-overlay', [
        el('div', 'gbm-ring-num' + (urgent ? ' gbm-ring-num--urgent' : ''), [daysLeft !== null ? String(daysLeft) : '—']),
        el('div', 'gbm-ring-sub', ['days to heat']),
      ]),
    ]);
    flex.appendChild(ringWrap);

    var details = el('div', 'gbm-heat-details');
    details.appendChild(el('div', 'gbm-row', [el('span', 'gbm-label', ['Cycle']), el('span', 'gbm-value gbm-mono', [HEAT_CYCLE + ' days'])]));
    details.appendChild(el('div', 'gbm-row', [el('span', 'gbm-label', ['Next Heat']), el('span', 'gbm-value gbm-mono', [nextHeat ? fmtDate(nextHeat) : '—'])]));
    details.appendChild(el('div', 'gbm-row', [el('span', 'gbm-label', ['±2 Window']), el('span', 'gbm-value gbm-mono', [daysLeft !== null ? 'Day ' + Math.max(0, daysLeft - 2) + '–' + (daysLeft + 2) : '—'])]));
    details.appendChild(el('div', 'gbm-row', [el('span', 'gbm-label', ['Ref Date']), el('span', 'gbm-value gbm-mono', [refDate ? fmtDate(refDate) : '—'])]));
    flex.appendChild(details);
    body.appendChild(flex);

    if (!refDate) body.appendChild(el('p', 'gbm-muted', ['Add a calving date or AI record to enable heat prediction.']));

    return card;
  }

  /* ── CARD 6: AM/PM Action Alert ───────────────────────────────────── */
  function cardAmPm() {
    var card = el('div', 'gbm-card');
    card.appendChild(cardTitle('🕐', 'AM / PM Action Alert'));
    var body = el('div', 'gbm-card-body');
    card.appendChild(body);

    // Determine time of day
    var hour = new Date().getHours();
    var isAM = hour < 12;
    var actionTime = isAM ? 'Same-day PM · 2 – 6 PM' : 'Next-day AM · 6 – 10 AM';
    var tomorrow   = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);

    body.appendChild(el('div', 'gbm-ampm-banner gbm-ampm--' + (isAM ? 'am' : 'pm'), [
      el('div', 'gbm-ampm-detect-row', [
        el('span', 'gbm-ampm-badge', [(isAM ? '☀️ AM' : '🌆 PM') + ' — now (' + hour.toString().padStart(2, '0') + ':00)']),
        el('span', 'gbm-ampm-date', [fmtDate(new Date())]),
      ]),
      el('div', 'gbm-ampm-arrow', ['↓']),
      el('div', 'gbm-ampm-action-row', [
        el('span', null, [isAM ? '🌅' : '🌙']),
        el('div', null, [el('strong', null, ['Schedule AI — ' + actionTime + ' · ' + fmtDate(isAM ? new Date() : tomorrow)])]),
      ]),
    ]));
    body.appendChild(el('p', 'gbm-ampm-note', ['💡 Optimal conception: inseminate 12–18 hrs after heat detection.']));

    return card;
  }

  /* ═══════════════════════════════════════════════════════════════════
     INJECT — build the wrapper and prepend to the panel
  ═══════════════════════════════════════════════════════════════════ */
  function inject(panel) {
    // Avoid double-injection
    if (panel.querySelector('.' + WRAPPER_CLS)) return;

    var cowTag = extractTag(panel);
    var wrapper = el('div', WRAPPER_CLS);

    wrapper.appendChild(el('div', 'gbm-offline-banner' + (navigator.onLine ? ' gbm-hidden' : ''), [
      '📶 Offline — some live data may be unavailable.',
    ]));
    // Listeners are attached only once at module level (see bottom of file)

    wrapper.appendChild(el('div', 'gbm-header', [
      el('span', 'gbm-header-line'),
      el('span', 'gbm-header-text', ['🧠 Genetics Intelligence']),
      el('span', 'gbm-header-line'),
    ]));

    var grid = el('div', 'gbm-grid');
    [
      cardTHI(),
      cardCow(cowTag),
      cardSemen(),
      cardROI(cowTag),
      cardHeat(cowTag),
      cardAmPm(),
    ].forEach(function (c) { if (c) grid.appendChild(c); });
    wrapper.appendChild(grid);

    // Inject at the very top of the panel
    if (panel.firstChild) {
      panel.insertBefore(wrapper, panel.firstChild);
    } else {
      panel.appendChild(wrapper);
    }

    forceScrollableAncestor(panel);
  }

  /* ── FORCE SCROLL — belt-and-braces ──────────────────────────────────
   * The Genetics tab lives inside the cow-detail sheet, whose scroll
   * container combines a base "overflow-hidden" utility class with an
   * "overflow-y-auto" override at the same CSS specificity. Depending on
   * Tailwind's generated rule order, "overflow-hidden" can win the
   * cascade and silently disable scrolling — worse once this module
   * adds a full card grid that makes the panel taller than the sheet.
   * Setting the properties inline with `!important` always wins over
   * any stylesheet rule (short of another inline style), so this
   * guarantees scrolling regardless of build/cascade order.
   */
  function forceScrollableAncestor(panel) {
    var node = panel;
    var depth = 0;
    while (node && node !== document.body && depth < 8) {
      var cls = node.className && node.className.baseVal !== undefined
        ? node.className.baseVal // SVG elements (unlikely here, defensive)
        : node.className;
      if (typeof cls === 'string' && /(^|\s)overflow-y-auto(\s|$)/.test(cls)) {
        node.style.setProperty('overflow-y', 'auto', 'important');
        node.style.setProperty('-webkit-overflow-scrolling', 'touch', 'important');
        node.style.setProperty('overscroll-behavior-y', 'contain', 'important');
        return;
      }
      node = node.parentElement;
      depth++;
    }
  }

  /* ── DETECTION LOOP ────────────────────────────────────────────────
   * Polls after a tab click or mutation to find and inject the panel.
   */
  function tryInject() {
    var panel = findPanel();
    if (!panel) return false;
    inject(panel);
    return true;
  }

  function pollInject(maxAttempts) {
    // Remove stale wrappers first
    document.querySelectorAll('.' + WRAPPER_CLS).forEach(function (w) { w.remove(); });
    var attempts = 0;
    // First attempt immediately
    if (tryInject()) return;
    var iv = setInterval(function () {
      if (tryInject() || ++attempts >= (maxAttempts || 20)) clearInterval(iv);
    }, 200);
  }

  // ── ONE-TIME online/offline banner handlers ────────────────────────
  // Attached here (not inside inject()) so they don't accumulate on re-injection.
  function updateBanners(online) {
    document.querySelectorAll('.gbm-offline-banner').forEach(function (b) {
      b.classList.toggle('gbm-hidden', online);
    });
  }
  if (!_listenersAttached) {
    _listenersAttached = true;
    window.addEventListener('online',  function () { updateBanners(true);  });
    window.addEventListener('offline', function () { updateBanners(false); });
  }

  // Listen for tab clicks containing "Genetic"
  document.addEventListener('click', function (e) {
    var t = e.target;
    while (t && t !== document.body) {
      if ((t.textContent || '').indexOf('Genetic') !== -1 &&
          (t.tagName === 'BUTTON' || t.tagName === 'LI' || t.getAttribute('role') === 'tab' ||
           (t.className && /tab/i.test(t.className)))) {
        setTimeout(function () { pollInject(25); }, 250);
        return;
      }
      t = t.parentElement;
    }
  }, true);

  // Mutation observer: react to new DOM content with genetics keywords
  // IMPORTANT: ignore mutations that originate from our own injected wrapper
  // (e.g. the "AI Semen Batch" empty-state text) — otherwise inject() causes
  // a mutation that re-triggers this observer, which removes+reinserts the
  // wrapper again, forever. That churn at the top of the panel also kept
  // resetting scroll position back to the top.
  new MutationObserver(function (muts) {
    for (var i = 0; i < muts.length; i++) {
      for (var j = 0; j < muts[i].addedNodes.length; j++) {
        var n = muts[i].addedNodes[j];
        if (n.nodeType !== 1) continue;
        if (n.classList && n.classList.contains(WRAPPER_CLS)) continue;
        if (n.closest && n.closest('.' + WRAPPER_CLS)) continue;
        var txt = n.textContent || '';
        if (PANEL_TEXTS.some(function (p) { return txt.indexOf(p) !== -1; })) {
          setTimeout(function () { pollInject(15); }, 80);
          return;
        }
      }
    }
  }).observe(document.body, { childList: true, subtree: true });

  // Attempt on first load (handles already-open genetics views)
  setTimeout(function () { tryInject(); }, 800);

})();
