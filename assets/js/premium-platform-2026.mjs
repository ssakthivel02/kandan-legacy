import {loadEffectiveRouteRegistry} from './effective-route-registry.mjs';

export const RELEASE = 246;
export const RECENT_KEY = 'osb-recent-routes-v2';

const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const byId = id => document.getElementById(id);

const safeStorage = {
  get(key, fallback = []) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || 'null');
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Browser-local enhancement remains optional.
    }
  }
};

const normalisePath = value => {
  try {
    const url = new URL(value, location.origin);
    return url.origin === location.origin
      ? url.pathname.replace(/\/index\.html$/, '/')
      : '';
  } catch {
    return '';
  }
};

const create = (tag, options = {}) => {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.attributes) {
    Object.entries(options.attributes).forEach(([name, value]) => {
      node.setAttribute(name, String(value));
    });
  }
  return node;
};

const installScrollProgress = () => {
  const bar = create('div', {
    className: 'osb-scroll-progress',
    attributes: {'aria-hidden': 'true'}
  });
  document.body.appendChild(bar);
  const update = () => {
    const maximum = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const percent = Math.min(100, Math.max(0, scrollY / maximum * 100));
    bar.style.setProperty('--osb-scroll', `${percent}%`);
  };
  addEventListener('scroll', update, {passive: true});
  addEventListener('resize', update, {passive: true});
  update();
};

const installNetworkState = () => {
  const status = create('div', {
    className: 'osb-network-state',
    attributes: {
      role: 'status',
      'aria-live': 'polite',
      'data-online': String(navigator.onLine),
      'data-visible': 'false'
    }
  });
  document.body.appendChild(status);
  let timer;
  const show = online => {
    clearTimeout(timer);
    status.dataset.online = String(online);
    status.dataset.visible = 'true';
    status.textContent = online
      ? 'Connection restored. Local routes remain available.'
      : 'Offline mode. Cached and browser-local features remain available.';
    timer = setTimeout(() => {
      status.dataset.visible = 'false';
    }, online ? 2800 : 6000);
  };
  addEventListener('online', () => show(true));
  addEventListener('offline', () => show(false));
  if (!navigator.onLine) show(false);
};

const installReveal = () => {
  const candidates = document.querySelectorAll(
    '[data-reveal],.premium-card,.collection-card,.platform-tool-grid a,.song-card,.features article'
  );
  candidates.forEach(node => node.setAttribute('data-reveal', ''));
  if (reducedMotion || !('IntersectionObserver' in globalThis)) {
    candidates.forEach(node => node.dataset.visible = 'true');
    document.documentElement.dataset.revealReady = 'true';
    return;
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.dataset.visible = 'true';
        observer.unobserve(entry.target);
      }
    });
  }, {rootMargin: '0px 0px -8% 0px', threshold: .08});
  candidates.forEach(node => observer.observe(node));
  document.documentElement.dataset.revealReady = 'true';
};

const installSpotlights = () => {
  if (reducedMotion || matchMedia('(pointer: coarse)').matches) return;
  document.querySelectorAll(
    '.premium-card,.collection-card,.platform-tool-grid a,.song-card'
  ).forEach(node => {
    node.setAttribute('data-spotlight', '');
    node.addEventListener('pointermove', event => {
      const rect = node.getBoundingClientRect();
      node.style.setProperty('--spot-x', `${event.clientX - rect.left}px`);
      node.style.setProperty('--spot-y', `${event.clientY - rect.top}px`);
    }, {passive: true});
  });
};

const rememberCurrentRoute = routes => {
  const current = normalisePath(location.href);
  const record = routes.find(item => normalisePath(item.path) === current);
  if (!record || record.status === 'milestone') return;
  const previous = safeStorage.get(RECENT_KEY, []);
  const next = [
    {
      path: record.path,
      titleTa: record.titleTa || '',
      titleEn: record.titleEn || record.path,
      category: record.category || 'Route',
      visitedAt: new Date().toISOString()
    },
    ...previous.filter(item => normalisePath(item.path) !== current)
  ].slice(0, 12);
  safeStorage.set(RECENT_KEY, next);
};

const routeSearchText = route => [
  route.path,
  route.titleTa,
  route.titleEn,
  route.category,
  route.status,
  route.summary
].filter(Boolean).join(' ').toLocaleLowerCase();

const installCommandPalette = async () => {
  const trigger = create('button', {
    className: 'osb-command-trigger',
    attributes: {
      type: 'button',
      'aria-haspopup': 'dialog',
      'aria-expanded': 'false',
      'aria-controls': 'osb-command-dialog'
    }
  });
  const triggerText = create('span', {text: 'Search every route'});
  const key = create('kbd', {text: navigator.platform.includes('Mac') ? '⌘ K' : 'Ctrl K'});
  trigger.append(triggerText, key);

  const backdrop = create('div', {
    className: 'osb-command-backdrop',
    attributes: {'data-open': 'false'}
  });
  const dialog = create('section', {
    className: 'osb-command-dialog',
    attributes: {
      id: 'osb-command-dialog',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'osb-command-label'
    }
  });
  const header = create('div', {className: 'osb-command-header'});
  const input = create('input', {
    attributes: {
      id: 'osb-command-label',
      type: 'search',
      placeholder: 'திருப்புகழ், Palani, audio, source…',
      autocomplete: 'off',
      'aria-label': 'Search all governed routes'
    }
  });
  const close = create('button', {
    className: 'osb-command-close',
    text: 'Esc',
    attributes: {type: 'button', 'aria-label': 'Close route search'}
  });
  const results = create('div', {
    className: 'osb-command-results',
    attributes: {role: 'listbox', 'aria-label': 'Governed route results'}
  });
  header.append(input, close);
  dialog.append(header, results);
  backdrop.appendChild(dialog);
  document.body.append(trigger, backdrop);

  let routes = [];
  try {
    const registry = await loadEffectiveRouteRegistry();
    routes = (registry.routes || []).filter(route =>
      route.path && !['milestone'].includes(route.status)
    );
    rememberCurrentRoute(routes);
  } catch (error) {
    console.warn('[OmSaravanaBhava] Command registry unavailable', error);
  }

  let activeIndex = 0;
  let rendered = [];
  const open = () => {
    backdrop.dataset.open = 'true';
    trigger.setAttribute('aria-expanded', 'true');
    document.documentElement.style.overflow = 'hidden';
    input.value = '';
    activeIndex = 0;
    render();
    requestAnimationFrame(() => input.focus());
  };
  const hide = () => {
    backdrop.dataset.open = 'false';
    trigger.setAttribute('aria-expanded', 'false');
    document.documentElement.style.overflow = '';
    trigger.focus();
  };
  const highlight = () => {
    results.querySelectorAll('.osb-command-result').forEach((node, index) => {
      node.dataset.active = String(index === activeIndex);
      if (index === activeIndex) node.scrollIntoView({block: 'nearest'});
    });
  };
  const resultNode = route => {
    const link = create('a', {
      className: 'osb-command-result',
      attributes: {href: route.path, role: 'option'}
    });
    const title = create('strong', {
      text: route.titleTa
        ? `${route.titleTa} · ${route.titleEn || ''}`
        : route.titleEn || route.path
    });
    const summary = create('small', {
      text: route.summary || route.path
    });
    const badge = create('span', {
      text: route.category || route.status || 'Route'
    });
    link.append(title, summary, badge);
    return link;
  };
  const render = () => {
    const query = input.value.trim().toLocaleLowerCase();
    const recent = safeStorage.get(RECENT_KEY, []);
    const recentPaths = new Set(recent.map(item => normalisePath(item.path)));
    rendered = (query
      ? routes.filter(route => routeSearchText(route).includes(query))
      : [
          ...recent.map(item => routes.find(route =>
            normalisePath(route.path) === normalisePath(item.path)
          )).filter(Boolean),
          ...routes.filter(route => !recentPaths.has(normalisePath(route.path)))
        ]
    ).slice(0, 14);
    activeIndex = Math.min(activeIndex, Math.max(0, rendered.length - 1));
    results.replaceChildren();
    if (!rendered.length) {
      results.appendChild(create('div', {
        className: 'osb-command-empty',
        text: 'No governed route matched. Try a Tamil or English title.'
      }));
      return;
    }
    rendered.forEach(route => results.appendChild(resultNode(route)));
    highlight();
  };

  trigger.addEventListener('click', open);
  close.addEventListener('click', hide);
  input.addEventListener('input', render);
  backdrop.addEventListener('pointerdown', event => {
    if (event.target === backdrop) hide();
  });
  document.addEventListener('keydown', event => {
    const command = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
    const slash = event.key === '/' && !/input|textarea|select/i.test(document.activeElement?.tagName || '');
    if (command || slash) {
      event.preventDefault();
      backdrop.dataset.open === 'true' ? hide() : open();
      return;
    }
    if (backdrop.dataset.open !== 'true') return;
    if (event.key === 'Escape') {
      event.preventDefault();
      hide();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      activeIndex = Math.min(rendered.length - 1, activeIndex + 1);
      highlight();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      activeIndex = Math.max(0, activeIndex - 1);
      highlight();
    } else if (event.key === 'Enter' && rendered[activeIndex]) {
      event.preventDefault();
      location.href = rendered[activeIndex].path;
    }
  });
};

export const initialisePremiumPlatform = async () => {
  document.documentElement.dataset.premiumPlatformRelease = String(RELEASE);
  installScrollProgress();
  installNetworkState();
  installReveal();
  installSpotlights();
  await installCommandPalette();
  globalThis.dispatchEvent(new CustomEvent('osb:premium-platform-ready', {
    detail: {release: RELEASE}
  }));
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialisePremiumPlatform, {once: true});
} else {
  initialisePremiumPlatform();
}
