import {
  ALLOWED_TARGETS,
  buildHistoryExport,
  normaliseCount,
  normaliseTarget,
  sanitiseHistory
} from './mantra-practice-core.mjs';

const root = document.querySelector('[data-mantra-practice]');

if (root) {
  const STORAGE = Object.freeze({
    history: 'osb-phase16-mantra-history',
    preferences: 'osb-phase16-mantra-preferences'
  });
  const byId = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? '').replace(
    /[&<>"']/g,
    character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]
  );
  const readLocal = (key, fallback) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value ?? fallback;
    } catch {
      return fallback;
    }
  };
  const writeLocal = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  };
  const state = {
    config: null,
    mantras: [],
    selectedId: '',
    target: ALLOWED_TARGETS[0],
    count: 0,
    completionRecorded: false,
    speaking: false
  };

  const selectedMantra = () =>
    state.mantras.find(item => item.id === state.selectedId);

  const stopSpeech = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    state.speaking = false;
    const button = byId('speakMantra');
    if (button) {
      button.setAttribute('aria-pressed', 'false');
      button.textContent = 'தமிழில் கேட்க · Listen';
    }
  };

  const savePreferences = () => writeLocal(STORAGE.preferences, {
    mantraId: state.selectedId,
    target: state.target,
    vibration: byId('vibrationEnabled')?.checked === true
  });

  const history = () => sanitiseHistory(
    readLocal(STORAGE.history, []),
    state.mantras.map(item => item.id)
  );

  const renderHistory = () => {
    const list = byId('sessionHistory');
    const sessions = history();
    byId('historyCount').textContent = String(sessions.length);
    list.innerHTML = sessions.length
      ? sessions.slice(0, 12).map(session => {
        const mantra = state.mantras.find(item => item.id === session.mantraId);
        const date = new Date(session.completedAt);
        return `<li>
          <span><strong lang="ta">${escapeHtml(mantra?.titleTa || session.mantraId)}</strong>
          <small>${escapeHtml(mantra?.titleEn || '')}</small></span>
          <span><strong>${session.target}</strong><small>${escapeHtml(date.toLocaleDateString())}</small></span>
        </li>`;
      }).join('')
      : '<li class="empty">No completed sessions on this device.</li>';
  };

  const renderCounter = () => {
    state.count = normaliseCount(state.count, state.target);
    const percentage = Math.round((state.count / state.target) * 100);
    byId('countValue').textContent = String(state.count);
    byId('targetValue').textContent = String(state.target);
    byId('counterProgress').style.setProperty('--progress', `${percentage * 3.6}deg`);
    byId('counterProgress').setAttribute('aria-valuemax', String(state.target));
    byId('counterProgress').setAttribute('aria-valuenow', String(state.count));
    byId('counterProgress').setAttribute(
      'aria-label',
      `${state.count} of ${state.target} repetitions`
    );
    byId('addCount').disabled = state.count >= state.target;
    byId('subtractCount').disabled = state.count === 0;
    byId('sessionStatus').textContent = state.count >= state.target
      ? 'Session complete on this device. அரோகரா.'
      : `${state.target - state.count} repetitions remaining.`;
  };

  const recordCompletion = () => {
    if (state.completionRecorded || state.count !== state.target) return;
    state.completionRecorded = true;
    const sessions = history();
    sessions.unshift({
      mantraId: state.selectedId,
      target: state.target,
      count: state.target,
      completedAt: new Date().toISOString()
    });
    writeLocal(
      STORAGE.history,
      sanitiseHistory(sessions, state.mantras.map(item => item.id))
    );
    renderHistory();
  };

  const vibrate = () => {
    if (byId('vibrationEnabled')?.checked && 'vibrate' in navigator) {
      navigator.vibrate(18);
    }
  };

  const changeCount = delta => {
    const before = state.count;
    state.count = normaliseCount(state.count + delta, state.target);
    if (state.count !== before) vibrate();
    renderCounter();
    recordCompletion();
  };

  const resetSession = () => {
    state.count = 0;
    state.completionRecorded = false;
    renderCounter();
    byId('sessionStatus').textContent = 'Current count reset. History was not changed.';
  };

  const chooseMantra = id => {
    if (!state.mantras.some(item => item.id === id)) return;
    stopSpeech();
    state.selectedId = id;
    resetSession();
    root.querySelectorAll('[data-mantra-id]').forEach(button => {
      const selected = button.dataset.mantraId === id;
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
    const mantra = selectedMantra();
    byId('activeMantraTa').textContent = mantra.titleTa;
    byId('activeMantraEn').textContent = mantra.titleEn;
    byId('activeMantraCategory').textContent = mantra.category;
    savePreferences();
  };

  const speak = () => {
    const mantra = selectedMantra();
    if (!mantra?.textTa) return;
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      byId('sessionStatus').textContent =
        'Tamil device read-aloud is unavailable in this browser.';
      return;
    }
    if (state.speaking) {
      stopSpeech();
      return;
    }
    stopSpeech();
    const utterance = new SpeechSynthesisUtterance(mantra.textTa);
    utterance.lang = 'ta-IN';
    utterance.rate = .78;
    utterance.onend = stopSpeech;
    utterance.onerror = stopSpeech;
    state.speaking = true;
    byId('speakMantra').setAttribute('aria-pressed', 'true');
    byId('speakMantra').textContent = 'நிறுத்து · Stop';
    window.speechSynthesis.speak(utterance);
  };

  const renderMantras = () => {
    byId('mantraChoices').innerHTML = state.mantras.map((mantra, index) => `
      <button type="button" data-mantra-id="${escapeHtml(mantra.id)}"
        aria-pressed="${index === 0 ? 'true' : 'false'}">
        <span lang="ta">${escapeHtml(mantra.titleTa)}</span>
        <small>${escapeHtml(mantra.titleEn)} · ${escapeHtml(mantra.category)}</small>
      </button>
    `).join('');
  };

  const renderTargets = () => {
    byId('targetChoices').innerHTML = state.config.allowedTargets.map(target => `
      <button type="button" data-target="${target}"
        aria-pressed="${target === state.target ? 'true' : 'false'}">${target}</button>
    `).join('');
  };

  const exportHistory = () => {
    const payload = buildHistoryExport(
      history(),
      state.mantras.map(item => item.id)
    );
    const blob = new Blob(
      [JSON.stringify(payload, null, 2)],
      {type: 'application/json'}
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `om-saravana-bhava-mantra-history-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    byId('historyStatus').textContent =
      'Session metadata exported. Sacred mantra text is not included.';
  };

  const clearHistory = () => {
    try {
      localStorage.removeItem(STORAGE.history);
    } catch {}
    renderHistory();
    byId('historyStatus').textContent = 'Local mantra session history cleared.';
  };

  root.addEventListener('click', event => {
    const mantraButton = event.target.closest('[data-mantra-id]');
    if (mantraButton) chooseMantra(mantraButton.dataset.mantraId);
    const targetButton = event.target.closest('[data-target]');
    if (targetButton) {
      state.target = normaliseTarget(targetButton.dataset.target);
      state.count = 0;
      state.completionRecorded = false;
      root.querySelectorAll('[data-target]').forEach(button => {
        button.setAttribute(
          'aria-pressed',
          button.dataset.target === String(state.target) ? 'true' : 'false'
        );
      });
      renderCounter();
      savePreferences();
    }
  });
  byId('addCount')?.addEventListener('click', () => changeCount(1));
  byId('subtractCount')?.addEventListener('click', () => changeCount(-1));
  byId('resetSession')?.addEventListener('click', resetSession);
  byId('speakMantra')?.addEventListener('click', speak);
  byId('vibrationEnabled')?.addEventListener('change', savePreferences);
  byId('exportHistory')?.addEventListener('click', exportHistory);
  byId('clearHistory')?.addEventListener('click', clearHistory);
  addEventListener('pagehide', stopSpeech, {once: true});

  const load = async () => {
    try {
      const request = path => fetch(path, {
        cache: 'default',
        credentials: 'same-origin',
        headers: {Accept: 'application/json'}
      }).then(response => {
        if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
        return response.json();
      });
      const [config, records] = await Promise.all([
        request('data/mantra-practice.json'),
        request('data/murugan-mantras.json')
      ]);
      const allowedIds = new Set(config.mantraIds || []);
      state.mantras = (Array.isArray(records) ? records : []).filter(
        item => item?.status === 'published' &&
          allowedIds.has(item.id) &&
          item.textTa
      );
      if (state.mantras.length !== 6) {
        throw new Error('The six governed mantra records are unavailable.');
      }
      state.config = config;
      const preferences = readLocal(STORAGE.preferences, {});
      state.target = normaliseTarget(preferences.target);
      state.selectedId = state.mantras.some(
        item => item.id === preferences.mantraId
      ) ? preferences.mantraId : state.mantras[0].id;
      byId('vibrationEnabled').checked = preferences.vibration === true;
      renderMantras();
      renderTargets();
      chooseMantra(state.selectedId);
      renderHistory();
      root.removeAttribute('data-loading');
    } catch (error) {
      console.error(error);
      byId('practiceLoadStatus').textContent =
        'The governed mantra practice data could not be loaded. Open the source collection instead.';
      byId('practiceLoadStatus').hidden = false;
    }
  };

  load();
}
