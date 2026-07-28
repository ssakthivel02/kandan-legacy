(() => {
  'use strict';

  const root = document.documentElement;
  const languageKey = 'osb-language-focus-v1';
  const brandAsset = '/assets/images/brand-vel-mayil.svg?v=20260727-1';

  if (root.dataset.osbGlobalExperienceInit === '1') return;
  root.dataset.osbGlobalExperienceInit = '1';
  root.classList.add('osb-global-experience');

  const initialiseBrand = () => {
    const brand = document.querySelector('.brand');
    if (!brand) return;

    let mark = brand.querySelector('.brand-mark');
    if (!mark) {
      mark = document.createElement('span');
      mark.className = 'osb-brand-symbol';
      mark.setAttribute('aria-hidden', 'true');
      brand.prepend(mark);
    } else {
      mark.classList.add('osb-brand-symbol');
    }

    const image = document.createElement('img');
    image.src = brandAsset;
    image.alt = '';
    image.width = 50;
    image.height = 50;
    image.decoding = 'async';
    image.addEventListener('error', () => {
      mark.dataset.brandFallback = 'true';
      mark.textContent = 'வேல்';
    }, { once: true });
    mark.replaceChildren(image);
  };

  const setLanguageMode = (value) => {
    const mode = ['bilingual', 'ta', 'en'].includes(value) ? value : 'bilingual';
    if (mode === 'bilingual') root.removeAttribute('data-language-focus');
    else root.dataset.languageFocus = mode;

    try {
      localStorage.setItem(languageKey, mode);
    } catch {
      // Language preference remains session-only when storage is unavailable.
    }

    document.querySelectorAll('.osb-language-option').forEach((option) => {
      option.setAttribute('aria-pressed', option.dataset.languageMode === mode ? 'true' : 'false');
    });
  };

  const initialiseLanguageControl = () => {
    if (document.querySelector('[data-osb-language-control]')) return;
    const header = document.querySelector('.site-header') || document.querySelector('.nav .nav-inner') || document.querySelector('.nav-inner');
    if (!header) return;

    const shell = document.createElement('div');
    shell.className = 'osb-language-shell';
    shell.dataset.osbLanguageControl = '1';

    const button = document.createElement('button');
    button.className = 'osb-language-button';
    button.type = 'button';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', 'osb-language-panel');
    button.setAttribute('aria-label', 'Language and reading focus');
    button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg><span class="osb-language-label">Language</span>';

    const panel = document.createElement('div');
    panel.className = 'osb-language-panel';
    panel.id = 'osb-language-panel';
    panel.hidden = true;
    panel.innerHTML = '<strong>Language &amp; reading focus</strong><small>This control does not invent automatic devotional translations. Tamil and English remain the governed bilingual source.</small><div class="osb-language-options"><button class="osb-language-option" type="button" data-language-mode="bilingual">தமிழ் + English</button><button class="osb-language-option" type="button" data-language-mode="ta">தமிழ் focus</button><button class="osb-language-option" type="button" data-language-mode="en">English focus</button><a class="osb-language-more" href="language-access.html">International language roadmap <span aria-hidden="true">→</span></a></div>';

    shell.append(button, panel);
    if (header.matches('.site-header')) header.insertBefore(shell, header.querySelector('.menu-toggle') || null);
    else header.appendChild(shell);

    const close = () => {
      panel.hidden = true;
      button.setAttribute('aria-expanded', 'false');
    };

    button.addEventListener('click', () => {
      const opening = panel.hidden;
      panel.hidden = !opening;
      button.setAttribute('aria-expanded', opening ? 'true' : 'false');
      if (opening) panel.querySelector('button,a')?.focus();
    });

    panel.addEventListener('click', (event) => {
      const option = event.target.closest('[data-language-mode]');
      if (!option) return;
      setLanguageMode(option.dataset.languageMode);
      close();
      button.focus();
    });

    document.addEventListener('click', (event) => {
      if (!shell.contains(event.target)) close();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !panel.hidden) {
        close();
        button.focus();
      }
    });

    let initial = 'bilingual';
    try {
      initial = localStorage.getItem(languageKey) || 'bilingual';
    } catch {
      // Use bilingual default.
    }
    setLanguageMode(initial);
  };

  const alignGuidedSearchLabels = () => {
    document.querySelectorAll('a[href$="ai-search.html"]').forEach((link) => {
      link.setAttribute('aria-label', 'Open Saravana Bhava Guided Search');

      const exactText = link.textContent.trim();
      if (exactText === 'AI Search' || exactText === 'AI Guide') {
        link.textContent = 'Guided Search';
      }

      link.querySelectorAll('b,span,strong').forEach((node) => {
        const text = node.textContent.trim();
        if (text === 'AI Search' || text === 'AI Guide') node.textContent = 'Guided Search';
      });

      link.querySelectorAll('small').forEach((node) => {
        if (node.textContent.trim() === 'Private local search') node.textContent = 'Bundled local search';
      });
    });
  };

  const exposeAndroidApp = () => {
    document.querySelectorAll('.site-nav, .nav .links').forEach((navigation) => {
      if (navigation.querySelector('a[href$="android-app.html"]')) return;
      if (navigation.querySelectorAll(':scope > a').length >= 12) return;

      const link = document.createElement('a');
      link.href = 'android-app.html';
      link.textContent = 'Android App';
      link.setAttribute('aria-label', 'Saravana Bhava Android app information');

      const supportLink = navigation.querySelector('a[href$="support.html"], a[href$="privacy.html"]');
      if (supportLink) navigation.insertBefore(link, supportLink);
      else navigation.appendChild(link);
    });
  };

  const initialiseGuidedSearchAction = () => {
    if (location.pathname.endsWith('/ai-search.html') || document.querySelector('[data-osb-ai-fab]')) return;

    const link = document.createElement('a');
    link.className = 'osb-ai-fab';
    link.href = 'ai-search.html';
    link.dataset.osbAiFab = '1';
    link.setAttribute('aria-label', 'Open Saravana Bhava Guided Search');
    link.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l1.9 5.1L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.9L12 2Zm6 12 1.1 2.9L22 18l-2.9 1.1L18 22l-1.1-2.9L14 18l2.9-1.1L18 14Z"/></svg><span>Guided Search</span>';
    document.body.appendChild(link);
  };

  const initialisePointerAmbience = () => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(pointer: fine)').matches) return;

    let frame = 0;
    let x = innerWidth / 2;
    let y = innerHeight * 0.2;

    const paint = () => {
      frame = 0;
      root.style.setProperty('--osb-pointer-x', `${x}px`);
      root.style.setProperty('--osb-pointer-y', `${y}px`);
    };

    addEventListener('pointermove', (event) => {
      x = event.clientX;
      y = event.clientY;
      if (!frame) frame = requestAnimationFrame(paint);
    }, { passive: true });
  };

  const initialise = () => {
    initialiseBrand();
    initialiseLanguageControl();
    alignGuidedSearchLabels();
    exposeAndroidApp();
    initialiseGuidedSearchAction();
    initialisePointerAmbience();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialise, { once: true });
  else initialise();
})();
