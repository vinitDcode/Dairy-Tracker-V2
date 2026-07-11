/* ════════════════════════════════════════════════════════════════════
   BHULLAR DAIRY — SECURITY & DATA-SAFETY PATCH  v3
   
   PHASE 1 (v1): JSON import confirm+size-cap, Date timezone fix
   PHASE 2 (v2): —
   PHASE 3 (v3): Zero-Trust Input Validation Layer
     — Lightweight Zod-equivalent schema guard for every form field
     — Intercepts submit events in capture phase (before React)
     — Validates tagNumber, dates, numeric ranges, text length
     — Shows inline validation errors without breaking React state
════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════════
     BLOCK 1 — JSON import: confirmation dialog + 5 MB size cap
  ══════════════════════════════════════════════════════════════ */
  var MAX_JSON_BYTES = 5 * 1024 * 1024; // 5 MB

  document.addEventListener('change', function (e) {
    var input = e.target;
    if (
      !input ||
      input.tagName !== 'INPUT' ||
      input.type !== 'file' ||
      !input.accept ||
      input.accept.indexOf('.json') === -1
    ) return;

    var file = input.files && input.files[0];
    if (!file) return;

    if (file.size > MAX_JSON_BYTES) {
      alert(
        'Import failed: file is too large.\n\n' +
        'File: ' + file.name + ' (' + (file.size / 1024 / 1024).toFixed(1) + ' MB)\n' +
        'Maximum allowed size: 5 MB.\n\n' +
        'Please export your data again from a working device and try with that file.'
      );
      input.value = '';
      e.stopImmediatePropagation();
      return;
    }

    var ok = window.confirm(
      'Import farm data from "' + file.name + '"?\n\n' +
      '⚠️  WARNING — This will permanently replace ALL current data:\n' +
      '  • Cattle records\n' +
      '  • Milk logs\n' +
      '  • Health & vaccination records\n' +
      '  • Genetics / lineage records\n' +
      '  • Monthly targets & settings\n\n' +
      'Your cloud backup will also be overwritten.\n' +
      'There is no undo.\n\n' +
      'Proceed with import?'
    );

    if (!ok) {
      input.value = '';
      e.stopImmediatePropagation();
      return;
    }
  }, true);


  /* ══════════════════════════════════════════════════════════════
     BLOCK 2 — Date constructor timezone patch (UTC→local midnight)
     "YYYY-MM-DD" strings are parsed as UTC by spec; for Punjab
     (UTC+5:30) this causes ±1 day off-by-one errors in vaccine
     and calving reminders. Patched to always treat bare date
     strings as local midnight without affecting other usages.
  ══════════════════════════════════════════════════════════════ */
  (function patchDateConstructor() {
    var OrigDate  = window.Date;
    var DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

    function PatchedDate() {
      var args = Array.prototype.slice.call(arguments);
      if (args.length === 1 && typeof args[0] === 'string' && DATE_ONLY.test(args[0])) {
        args[0] = args[0] + 'T00:00:00';
      }
      if (this instanceof PatchedDate) {
        return new (Function.prototype.bind.apply(OrigDate, [null].concat(args)))();
      }
      return new (Function.prototype.bind.apply(OrigDate, [null].concat(args)))();
    }

    Object.getOwnPropertyNames(OrigDate).forEach(function (key) {
      try {
        if (key !== 'length' && key !== 'name' && key !== 'prototype') {
          PatchedDate[key] = OrigDate[key];
        }
      } catch (ex) {}
    });
    PatchedDate.prototype = OrigDate.prototype;

    try { window.Date = PatchedDate; } catch (ex) {}
  })();


  /* ══════════════════════════════════════════════════════════════
     BLOCK 3 — ZERO-TRUST INPUT VALIDATION LAYER  (Zod-equivalent)
     
     WHY HERE: The compiled bundle (public/assets/index-*.js) is
     read-only — we cannot add Zod schema validation to the React
     component source. This intercepts form submit events in the
     capture phase (before React's delegated handlers at #root),
     validates all known field patterns, and prevents submission +
     shows an inline error if validation fails.
     
     SCHEMAS defined below mirror the business rules documented in
     supabase-migration-v2.sql and the app's own localStorage shape.
  ══════════════════════════════════════════════════════════════ */
  (function initInputValidation() {

    /* ── Inline error banner styles ─────────────────────────── */
    var css = document.createElement('style');
    css.textContent = [
      '.bdf-val-error{',
        'display:block;margin-top:4px;padding:6px 10px;',
        'background:rgba(220,38,38,0.12);border:1px solid rgba(220,38,38,0.4);',
        'border-radius:6px;color:#FCA5A5;font-size:12px;line-height:1.4;',
        'font-family:"DM Sans",-apple-system,system-ui,sans-serif;',
      '}',
      'input.bdf-invalid,select.bdf-invalid,textarea.bdf-invalid{',
        'outline:2px solid rgba(220,38,38,0.7) !important;',
        'outline-offset:1px !important;',
      '}',
    ].join('');
    document.head.appendChild(css);

    /* ── Schema definitions ─────────────────────────────────── */
    /*
      Each entry: { test(val) → bool, message }
      Matched by input name/id/placeholder/aria-label heuristics.
    */
    var SCHEMAS = {
      /* Tag / ear-tag number: alphanumeric, 1–20 chars */
      tagNumber: {
        pattern: /^[A-Za-z0-9\-]{1,20}$/,
        message: 'Tag number must be 1–20 alphanumeric characters (hyphens allowed).',
      },
      /* Breed: letters + spaces, 2–40 chars */
      breed: {
        pattern: /^[A-Za-z\s]{2,40}$/,
        message: 'Breed must be 2–40 letters.',
      },
      /* Age in years: 0–30 */
      age: {
        test: function (v) { var n = Number(v); return !isNaN(n) && n >= 0 && n <= 30; },
        message: 'Age must be a number between 0 and 30.',
      },
      /* Milk yield (litres): 0–200 */
      yield: {
        test: function (v) { var n = Number(v); return !isNaN(n) && n >= 0 && n <= 200; },
        message: 'Yield must be between 0 and 200 litres.',
      },
      /* Fat %: 0–12 */
      fat: {
        test: function (v) { var n = Number(v); return !isNaN(n) && n >= 0 && n <= 12; },
        message: 'Fat % must be between 0 and 12.',
      },
      /* Semen trait score: 1–10 */
      traitScore: {
        test: function (v) { var n = Number(v); return !isNaN(n) && n >= 1 && n <= 10; },
        message: 'Trait score must be between 1 and 10.',
      },
      /* Cost per dose: 0–999999 */
      costPerDose: {
        test: function (v) { var n = Number(v); return !isNaN(n) && n >= 0 && n <= 999999; },
        message: 'Cost per dose must be a positive number.',
      },
      /* Generic date field: must be a valid date */
      date: {
        test: function (v) {
          if (!v) return false;
          var d = new Date(v);
          return !isNaN(d.getTime());
        },
        message: 'Please enter a valid date.',
      },
      /* Bull name: printable chars, 2–80 */
      bullName: {
        pattern: /^[\x20-\x7E\u0900-\u097F]{2,80}$/,
        message: 'Bull name must be 2–80 characters.',
      },
      /* Notes / free text: max 1000 chars */
      notes: {
        test: function (v) { return v.length <= 1000; },
        message: 'Notes must be 1000 characters or fewer.',
      },
    };

    /* ── Heuristic: map input attributes to a schema key ─────── */
    var FIELD_HINTS = [
      { keys: ['tagnumber', 'tag', 'eartag'],            schema: 'tagNumber' },
      { keys: ['breed'],                                  schema: 'breed' },
      { keys: ['age'],                                    schema: 'age' },
      { keys: ['yield', 'liters', 'litres', 'milk'],     schema: 'yield' },
      { keys: ['fat'],                                    schema: 'fat' },
      { keys: ['traitscore', 'trait', 'score'],          schema: 'traitScore' },
      { keys: ['costperdose', 'cost', 'price'],          schema: 'costPerDose' },
      { keys: ['date', 'calving', 'vaccination', 'batch', 'born'], schema: 'date' },
      { keys: ['bullname', 'sire', 'bull'],              schema: 'bullName' },
      { keys: ['notes', 'reason', 'remarks', 'flagreason'], schema: 'notes' },
    ];

    function getSchemaKey(input) {
      var candidates = [
        (input.name  || '').toLowerCase(),
        (input.id    || '').toLowerCase(),
        (input.placeholder || '').toLowerCase(),
        (input.getAttribute('aria-label') || '').toLowerCase(),
        (input.getAttribute('data-field')  || '').toLowerCase(),
      ];
      for (var i = 0; i < FIELD_HINTS.length; i++) {
        var hint = FIELD_HINTS[i];
        for (var j = 0; j < candidates.length; j++) {
          for (var k = 0; k < hint.keys.length; k++) {
            if (candidates[j].indexOf(hint.keys[k]) !== -1) {
              return hint.schema;
            }
          }
        }
      }
      return null;
    }

    /* ── Validate a single input → null | error string ───────── */
    function validateInput(input) {
      var val = (input.value || '').trim();
      /* Skip empty non-required fields */
      if (!val && !input.required) return null;
      /* Skip file / checkbox / radio — handled elsewhere */
      if (input.type === 'file' || input.type === 'checkbox' || input.type === 'radio') return null;

      var schemaKey = getSchemaKey(input);
      if (!schemaKey) return null;

      var schema = SCHEMAS[schemaKey];
      var valid = schema.pattern
        ? schema.pattern.test(val)
        : schema.test(val);

      return valid ? null : schema.message;
    }

    /* ── Show / clear inline error ───────────────────────────── */
    function showError(input, message) {
      clearError(input);
      input.classList.add('bdf-invalid');
      var err = document.createElement('span');
      err.className  = 'bdf-val-error';
      err.textContent = message;
      err.setAttribute('role', 'alert');
      err.id = 'bdf-err-' + (input.id || Math.random().toString(36).slice(2));
      input.setAttribute('aria-describedby', err.id);
      /* Insert after the input, or after its parent label wrapper */
      var anchor = input.closest('label') || input;
      if (anchor.nextSibling) {
        anchor.parentNode.insertBefore(err, anchor.nextSibling);
      } else {
        anchor.parentNode.appendChild(err);
      }
    }

    function clearError(input) {
      input.classList.remove('bdf-invalid');
      var errId = 'bdf-err-' + (input.id || '');
      if (errId !== 'bdf-err-') {
        var existing = document.getElementById(errId);
        if (existing) existing.parentNode.removeChild(existing);
      }
      /* Also clear any error injected after the same input */
      var next = (input.closest('label') || input).nextSibling;
      if (next && next.classList && next.classList.contains('bdf-val-error')) {
        next.parentNode.removeChild(next);
      }
    }

    /* ── Live feedback on blur ───────────────────────────────── */
    document.addEventListener('blur', function (e) {
      var input = e.target;
      if (!input || !input.tagName || !/^(INPUT|SELECT|TEXTAREA)$/.test(input.tagName)) return;
      if (!getSchemaKey(input)) return;

      var err = validateInput(input);
      if (err) showError(input, err);
      else clearError(input);
    }, true);

    /* ── Clear error on focus ────────────────────────────────── */
    document.addEventListener('focus', function (e) {
      var input = e.target;
      if (!input || !input.tagName || !/^(INPUT|SELECT|TEXTAREA)$/.test(input.tagName)) return;
      clearError(input);
    }, true);

    /* ── Block form submission if any field fails schema ─────── */
    document.addEventListener('submit', function (e) {
      var form = e.target;
      if (!form || form.tagName !== 'FORM') return;

      var inputs = form.querySelectorAll('input, select, textarea');
      var firstBad = null;

      for (var i = 0; i < inputs.length; i++) {
        var inp  = inputs[i];
        var err  = validateInput(inp);
        if (err) {
          showError(inp, err);
          if (!firstBad) firstBad = inp;
        } else {
          clearError(inp);
        }
      }

      if (firstBad) {
        e.preventDefault();
        e.stopImmediatePropagation();
        firstBad.focus();
      }
    }, true);

    /* ── Also intercept React synthetic submit via button click ─
       React apps often submit via button[type=submit] click rather
       than a native form submit event. We validate on the submit
       event above — this ensures consistency with React's handler. */
    document.addEventListener('click', function (e) {
      var btn = e.target;
      if (!btn) return;
      /* Walk up to find a submit button */
      var node = btn;
      while (node && node !== document.body) {
        if (node.tagName === 'BUTTON' && node.type === 'submit') {
          var form = node.closest('form');
          if (form) {
            var inputs = form.querySelectorAll('input, select, textarea');
            var firstBad = null;
            for (var i = 0; i < inputs.length; i++) {
              var err = validateInput(inputs[i]);
              if (err) {
                showError(inputs[i], err);
                if (!firstBad) firstBad = inputs[i];
              } else {
                clearError(inputs[i]);
              }
            }
            if (firstBad) {
              e.preventDefault();
              e.stopImmediatePropagation();
              firstBad.focus();
            }
          }
          return;
        }
        node = node.parentElement;
      }
    }, true);

  })();

})();
