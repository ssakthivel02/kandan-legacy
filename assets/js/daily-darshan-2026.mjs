import {
  buildHistoryExport,
  buildShareText,
  chooseDailyRecord,
  distinctPracticeDays,
  localDateKey,
  normalisePeriod,
  sanitiseHistory
} from './daily-darshan-core.mjs';

const root = document.querySelector('[data-daily-darshan]');

if (root) {
  const STORAGE = Object.freeze({
    history: 'osb-phase17-daily-darshan-history',
    period: 'osb-phase17-daily-darshan-period'
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
    record: null,
    mantras: [],
    songs: [],
    period: normalisePeriod(readLocal(STORAGE.period, 'morning')),
    steps: new Set(),
    speaking: ''
  };

  const stopSpeech = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    state.speaking = '';
    for (const id of ['listenMantra', 'listenSong']) {
      const button = byId(id);
      if (!button) continue;
      button.setAttribute('aria-pressed', 'false');
      button.textContent = 'தமிழில் கேட்க · Listen';
    }
  };

  const recordIds = () => state.config?.records.map(item => item.id) || [];
  const history = () => sanitiseHistory(
    readLocal(STORAGE.history, []),
    recordIds()
  );

  const renderRhythm = () => {
    const entries = history();
    const todayKey = localDateKey();
    const today = entries.filter(item => item.dateKey === todayKey);
    byId('completedPractices').textContent = String(entries.length);
    byId('practiceDays').textContent = String(distinctPracticeDays(entries));
    byId('todayCompletions').textContent =
      `${new Set(today.map(item => item.period)).size}/2`;
  };

  const selectedPeriod = () =>
    state.config.periods.find(item => item.id === state.period) ||
    state.config.periods[0];

  const renderPeriod = () => {
    const period = selectedPeriod();
    byId('periodTitleTa').textContent = period.titleTa;
    byId('periodTitleEn').textContent = period.titleEn;
    byId('periodIntroTa').textContent = period.introTa;
    byId('periodIntroEn').textContent = period.introEn;
    root.querySelectorAll('[data-period]').forEach(button => {
      button.setAttribute(
        'aria-pressed',
        button.dataset.period === state.period ? 'true' : 'false'
      );
    });
    state.steps.clear();
    root.querySelectorAll('[data-step]').forEach(button => {
      button.setAttribute('aria-pressed', 'false');
    });
    renderProgress();
  };

  const renderProgress = () => {
    const count = state.steps.size;
    const progress = byId('ritualProgress');
    progress.setAttribute('aria-valuenow', String(count));
    progress.setAttribute('aria-label', `${count} of 3 practice steps complete`);
    progress.querySelector('i').style.width = `${Math.round(count / 3 * 100)}%`;
    byId('ritualStatus').textContent = count === 3
      ? 'This devotional moment is complete on this device. அரோகரா.'
      : count
        ? `${3 - count} gentle step${3 - count === 1 ? '' : 's'} remaining.`
        : 'Choose a step when you are ready.';
  };

  const recordCompletion = () => {
    if (state.steps.size !== 3) return;
    const dateKey = localDateKey();
    const entries = history();
    const exists = entries.some(
      item => item.dateKey === dateKey && item.period === state.period
    );
    if (!exists) {
      entries.unshift({
        dateKey,
        recordId: state.record.id,
        period: state.period,
        completedAt: new Date().toISOString()
      });
      writeLocal(STORAGE.history, sanitiseHistory(entries, recordIds()));
    }
    renderRhythm();
  };

  const choosePeriod = value => {
    state.period = normalisePeriod(value);
    writeLocal(STORAGE.period, state.period);
    stopSpeech();
    renderPeriod();
  };

  const speak = (kind, buttonId) => {
    const source = kind === 'mantra'
      ? state.mantras.find(item => item.id === state.record.mantraId)?.textTa
      : state.songs.find(item => item.id === state.record.songId)?.speechText;
    const button = byId(buttonId);
    if (!source || !button) return;
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      byId('ritualStatus').textContent =
        'Tamil device read-aloud is unavailable in this browser.';
      return;
    }
    if (state.speaking === kind) {
      stopSpeech();
      return;
    }
    stopSpeech();
    const utterance = new SpeechSynthesisUtterance(source);
    utterance.lang = 'ta-IN';
    utterance.rate = .82;
    utterance.onend = stopSpeech;
    utterance.onerror = stopSpeech;
    state.speaking = kind;
    button.setAttribute('aria-pressed', 'true');
    button.textContent = 'நிறுத்து · Stop';
    window.speechSynthesis.speak(utterance);
  };

  const exportHistory = () => {
    const payload = buildHistoryExport(history(), recordIds());
    const blob = new Blob(
      [JSON.stringify(payload, null, 2)],
      {type: 'application/json'}
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download =
      `om-saravana-bhava-daily-history-${localDateKey()}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    byId('rhythmStatus').textContent =
      'Completion metadata exported without sacred text or personal notes.';
  };

  const clearHistory = () => {
    try {
      localStorage.removeItem(STORAGE.history);
    } catch {}
    renderRhythm();
    byId('rhythmStatus').textContent = 'Local daily-practice history cleared.';
  };

  const share = async () => {
    const text = buildShareText({
      dateKey: localDateKey(),
      period: state.period,
      record: state.record
    });
    try {
      if ('share' in navigator) {
        await navigator.share({
          title: 'Daily Murugan Darshan',
          text,
          url: location.href
        });
        byId('rhythmStatus').textContent = 'Public daily route shared.';
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        byId('rhythmStatus').textContent =
          'Public daily summary copied. Sacred text and history were excluded.';
      } else {
        byId('rhythmStatus').textContent =
          'Sharing is unavailable in this browser. Copy the page address instead.';
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        byId('rhythmStatus').textContent =
          'The public route was not shared. No private data left this browser.';
      }
    }
  };

  const renderContent = () => {
    const record = state.record;
    const mantra = state.mantras.find(item => item.id === record.mantraId);
    const song = state.songs.find(item => item.id === record.songId);
    byId('todayDate').textContent = new Intl.DateTimeFormat(
      document.documentElement.lang || 'ta',
      {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'}
    ).format(new Date());
    byId('todayThemeTa').textContent = record.themeTa;
    byId('todayThemeEn').textContent = record.themeEn;
    byId('todayTempleTa').textContent = record.templeNameTa;
    byId('todayTempleEn').textContent = record.templeNameEn;
    byId('todayTempleRoute').href = record.templeRoute;
    const image = byId('todayTempleImage');
    image.src = record.templeImage;
    image.alt = `${record.templeNameEn} Murugan temple visual`;
    byId('todayReflectionTa').textContent = record.reflectionTa;
    byId('todayReflectionEn').textContent = record.reflectionEn;
    byId('todayActionTa').textContent = record.actionTa;
    byId('todayActionEn').textContent = record.actionEn;
    byId('todayMantraTa').textContent = mantra.titleTa;
    byId('todayMantraEn').textContent = `${mantra.titleEn} · ${mantra.category}`;
    byId('todaySongTa').textContent = song.titleTa;
    byId('todaySongEn').textContent = song.titleEn;
    byId('todaySongRoute').href = song.route;
    byId('periodChoices').innerHTML = state.config.periods.map(period => `
      <button type="button" data-period="${escapeHtml(period.id)}"
        aria-pressed="${period.id === state.period ? 'true' : 'false'}">
        <span lang="ta">${escapeHtml(period.titleTa)}</span> ·
        <span>${escapeHtml(period.titleEn)}</span>
      </button>
    `).join('');
    renderPeriod();
    renderRhythm();
  };

  root.addEventListener('click', event => {
    const period = event.target.closest('[data-period]');
    if (period) choosePeriod(period.dataset.period);
    const step = event.target.closest('[data-step]');
    if (step) {
      const id = step.dataset.step;
      if (state.steps.has(id)) state.steps.delete(id);
      else state.steps.add(id);
      step.setAttribute(
        'aria-pressed',
        state.steps.has(id) ? 'true' : 'false'
      );
      renderProgress();
      recordCompletion();
    }
  });
  byId('listenMantra')?.addEventListener(
    'click',
    () => speak('mantra', 'listenMantra')
  );
  byId('listenSong')?.addEventListener(
    'click',
    () => speak('song', 'listenSong')
  );
  byId('shareDarshan')?.addEventListener('click', share);
  byId('exportDarshan')?.addEventListener('click', exportHistory);
  byId('clearDarshan')?.addEventListener('click', clearHistory);
  addEventListener('pagehide', stopSpeech, {once: true});

  const load = async () => {
    const request = path => fetch(path, {
      cache: 'default',
      credentials: 'same-origin',
      headers: {Accept: 'application/json'}
    }).then(response => {
      if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
      return response.json();
    });
    try {
      const [config, mantras, songs, search] = await Promise.all([
        request('data/daily-darshan.json'),
        request('data/murugan-mantras.json'),
        request('data/read-aloud-playlist.json'),
        request('data/search-index.json')
      ]);
      const mantraMap = new Map(
        (Array.isArray(mantras) ? mantras : [])
          .filter(item => item.status === 'published' && item.textTa)
          .map(item => [item.id, item])
      );
      const songMap = new Map(
        (Array.isArray(songs) ? songs : [])
          .filter(item => /^published/.test(item.publicationStatus || '') &&
            item.playbackMode === 'device-tts' &&
            item.speechText)
          .map(item => [item.id, item])
      );
      const templeMap = new Map(
        (Array.isArray(search) ? search : [])
          .filter(item => item.kind === 'Temple' &&
            item.status === 'published-source-linked')
          .map(item => [item.id, item])
      );
      const validRecords = (config.records || []).filter(record =>
        mantraMap.has(record.mantraId) &&
        songMap.has(record.songId) &&
        templeMap.get(record.templeId)?.route === record.templeRoute
      );
      if (validRecords.length !== 6) {
        throw new Error('The six governed daily records are unavailable.');
      }
      state.config = {...config, records: validRecords};
      state.mantras = [...mantraMap.values()];
      state.songs = [...songMap.values()];
      state.record = chooseDailyRecord(validRecords);
      renderContent();
      root.removeAttribute('data-loading');
    } catch (error) {
      console.error(error);
      byId('darshanLoadStatus').textContent =
        'Today’s governed practice could not be loaded. Open the mantra, song or temple libraries directly.';
      byId('darshanLoadStatus').hidden = false;
    }
  };

  load();
}
