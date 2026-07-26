/**
 * OmSaravanaBhava — Premium Pages Interactions 2026
 * Phase 3.1 corrected — idempotent, scoped, non-conflicting.
 *
 * FEATURE OWNERSHIP POLICY
 * ─────────────────────────────────────────────────────────────────────────
 * This file activates a feature ONLY when no existing script already owns it.
 * Ownership is declared via data-osb-*-init attributes on the owning element.
 *
 * release-246.js   owns: mobile nav (.menu-toggle/#site-nav), header scroll ([data-header])
 * release-247.js   owns: mobile nav (.menu/.nav), slider, .reveal IntersectionObserver, temple tilt
 * premium-platform-2026.mjs owns: scroll progress (.osb-scroll-progress), data-reveal/data-visible,
 *                                  Escape (command palette only), Ctrl+K command palette
 * premium-interactions.js  owns: reading progress (.reading-progress dynamically created)
 * reader-experience.js     owns: reading progress localStorage tracking
 * osb44.js                 owns: osb44-page search/filter/sort/pagination
 * media-gallery-2026.mjs   owns: gallery grid, lightbox
 * audio-library.js         owns: audio playback
 * advanced-search.js       owns: AI search
 *
 * This file owns:
 *   - #readingProgress (static bar in HTML, NOT dynamically created by premium-interactions.js)
 *   - #backToTop (static button in HTML)
 *   - smooth anchor scroll (only when no existing smooth scroll is active)
 *   - header scroll state for .site-header (release-246 uses [data-header]; this uses .site-header)
 *
 * IDEMPOTENCY MARKERS
 * ─────────────────────────────────────────────────────────────────────────
 * data-osb-reading-progress-init  — set on #readingProgress when initialised
 * data-osb-back-to-top-init       — set on #backToTop when initialised
 * data-osb-header-scroll-init     — set on .site-header when initialised
 * data-osb-smooth-scroll-init     — set on document.body when initialised
 *
 */

(function () {
  'use strict';

  var REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── GUARD: already initialised? ──────────────────────────────────────── */
  if (document.body.dataset.osbPremiumPagesInit) {
    return;
  }
  document.body.dataset.osbPremiumPagesInit = '1';

  /* ── 1. READING PROGRESS BAR (#readingProgress) ───────────────────────
   *
   * Activates ONLY on the static #readingProgress element placed in HTML.
   * Does NOT create a new element (that is premium-interactions.js territory).
   * Does NOT activate if premium-interactions.js has already attached a
   * scroll listener (detected by checking for .reading-progress in DOM).
   * ─────────────────────────────────────────────────────────────────────── */
  function initReadingProgress() {
    // Existing premium interaction modules own visual reading progress on these pages.
    if (document.querySelector('script[src$="premium-interactions.js"], script[src$="premium-platform-2026.mjs"]')) return;
    var bar = document.getElementById('readingProgress');
    if (!bar) return;
    // Already initialised
    if (bar.dataset.osbReadingProgressInit) return;
    bar.dataset.osbReadingProgressInit = '1';

    if (REDUCED_MOTION) {
      bar.style.display = 'none';
      return;
    }

    function updateProgress() {
      var doc = document.documentElement;
      var scrolled = doc.scrollTop || document.body.scrollTop;
      var total = doc.scrollHeight - doc.clientHeight;
      var pct = total > 0 ? Math.min(100, Math.round((scrolled / total) * 100)) : 0;
      bar.style.width = pct + '%';
      bar.setAttribute('aria-valuenow', pct);
    }

    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress, { passive: true });
    updateProgress();
  }

  /* ── 2. BACK TO TOP (#backToTop) ──────────────────────────────────────
   *
   * Activates ONLY on the static #backToTop element placed in HTML.
   * ─────────────────────────────────────────────────────────────────────── */
  function initBackToTop() {
    var btn = document.getElementById('backToTop');
    if (!btn) return;
    if (btn.dataset.osbBackToTopInit) return;
    btn.dataset.osbBackToTopInit = '1';

    function updateVisibility() {
      var scrolled = document.documentElement.scrollTop || document.body.scrollTop;
      if (scrolled > 400) {
        btn.removeAttribute('hidden');
        btn.classList.add('visible');
      } else {
        btn.setAttribute('hidden', '');
        btn.classList.remove('visible');
      }
    }

    btn.addEventListener('click', function () {
      if (REDUCED_MOTION) {
        window.scrollTo(0, 0);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    window.addEventListener('scroll', updateVisibility, { passive: true });
    updateVisibility();
  }

  /* ── 3. HEADER SCROLL STATE (.site-header) ────────────────────────────
   *
   * release-246.js owns [data-header] → .scrolled.
   * This function targets .site-header elements that do NOT have [data-header]
   * (i.e., pages using release-247/osb44 nav patterns).
   * ─────────────────────────────────────────────────────────────────────── */
  function initHeaderScroll() {
    // release-246.js already handles [data-header] — skip those
    var header = document.querySelector('.site-header:not([data-header])');
    if (!header) return;
    if (header.dataset.osbHeaderScrollInit) return;
    header.dataset.osbHeaderScrollInit = '1';

    function updateHeader() {
      var scrolled = document.documentElement.scrollTop || document.body.scrollTop;
      if (scrolled > 60) {
        header.classList.add('scrolled');
        header.setAttribute('data-scrolled', '');
      } else {
        header.classList.remove('scrolled');
        header.removeAttribute('data-scrolled');
      }
    }

    window.addEventListener('scroll', updateHeader, { passive: true });
    updateHeader();
  }

  /* ── 4. SMOOTH SCROLL FOR ANCHOR LINKS ───────────────────────────────
   *
   * Only activates when CSS scroll-behavior: smooth is not already set
   * on html/body (which would handle it natively).
   * ─────────────────────────────────────────────────────────────────────── */
  function initSmoothScroll() {
    if (REDUCED_MOTION) return;
    if (document.body.dataset.osbSmoothScrollInit) return;

    // Check if CSS already handles smooth scroll
    var htmlStyle = getComputedStyle(document.documentElement);
    var bodyStyle = getComputedStyle(document.body);
    if (htmlStyle.scrollBehavior === 'smooth' || bodyStyle.scrollBehavior === 'smooth') {
      return; // CSS handles it
    }

    document.body.dataset.osbSmoothScrollInit = '1';

    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href^="#"]');
      if (!link) return;
      var id = link.getAttribute('href').slice(1);
      if (!id) return;
      var target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Move focus for accessibility without scrolling again
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
      }
      target.focus({ preventScroll: true });
    });
  }

  /* ── INIT ─────────────────────────────────────────────────────────────── */
  function init() {
    initReadingProgress();
    initBackToTop();
    initHeaderScroll();
    initSmoothScroll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
