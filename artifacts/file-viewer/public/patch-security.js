/* ════════════════════════════════════════════════════════════════════
   BHULLAR DAIRY — SECURITY & DATA-SAFETY PATCH
   Addresses audit findings that cannot be fixed in the compiled bundle.
════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── FIX: JSON import — confirmation dialog + size cap ──────────────
     The compiled bundle's Import JSON handler does no confirmation and
     no file-size check. A malicious or accidental import silently
     overwrites all farm data AND the cloud backup with no undo path.

     Strategy: intercept the native 'change' event on document in the
     capture phase (fires before React's delegated handler at #root).
     Show a synchronous confirm() dialog. On cancel or bad size, reset
     the input and call stopImmediatePropagation() so React never sees
     the event.
  ────────────────────────────────────────────────────────────────── */
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

    /* Size guard — prevents main-thread freeze from huge/malicious files */
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

    /* Confirmation — prevent silent overwrite of all farm data */
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

    /* Let the React onChange handler run normally */
  }, true /* capture = true → runs before React's delegated handler */);


  /* ── FIX: Vaccination timezone bug ────────────────────────────────
     Date-only strings like "2026-06-16" are parsed by JS as UTC
     midnight, not local midnight. For Punjab (UTC+5:30) this creates
     a ~5.5-hour mismatch that can flip "days remaining" by ±1 around
     the boundary day.

     Patch: expose a global helper that the compiled code could
     theoretically call — but since we cannot patch compiled bundle
     internals, this is a best-effort polyfill that normalises any
     date-only string passed to new Date() by rewriting the native
     Date constructor to treat "YYYY-MM-DD" strings as local midnight.

     Scope: ONLY bare date strings (10-char ISO-8601 date-only format).
     All other Date usages are unaffected.
  ────────────────────────────────────────────────────────────────── */
  (function patchDateConstructor() {
    var OrigDate = window.Date;
    var DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

    function PatchedDate() {
      var args = Array.prototype.slice.call(arguments);
      /* If called with a single bare date string "YYYY-MM-DD", parse
         as LOCAL midnight by appending "T00:00:00" (no Z / offset). */
      if (args.length === 1 && typeof args[0] === 'string' && DATE_ONLY.test(args[0])) {
        args[0] = args[0] + 'T00:00:00';
      }
      /* new Date(...) — must use Reflect.construct to properly subclass */
      if (this instanceof PatchedDate) {
        return new (Function.prototype.bind.apply(OrigDate, [null].concat(args)))();
      }
      return new (Function.prototype.bind.apply(OrigDate, [null].concat(args)))();
    }

    /* Copy all static methods (Date.now, Date.parse, Date.UTC) */
    Object.getOwnPropertyNames(OrigDate).forEach(function (key) {
      try {
        if (key !== 'length' && key !== 'name' && key !== 'prototype') {
          PatchedDate[key] = OrigDate[key];
        }
      } catch (ex) { /* non-writable properties — skip */ }
    });
    PatchedDate.prototype = OrigDate.prototype;

    try {
      window.Date = PatchedDate;
    } catch (ex) {
      /* Some strict environments prevent reassigning Date — fail silently */
    }
  })();

})();
