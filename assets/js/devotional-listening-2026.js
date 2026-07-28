(() => {
  'use strict';

  const root = document.querySelector('[data-listening-app]');
  if (!root) return;

  const STORAGE = {
    note: 'osb-phase15-private-practice-note',
    completions: 'osb-phase15-practice-completions',
    queue: 'osb-prayer-queue'
  };
  const byId = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
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
    paths: [],
    playlist: [],
    selected: null,
    completeSteps: new Set(),
    activeTrackId: ''
  };

  const stopSpeech = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    state.activeTrackId = '';
    root.querySelectorAll('[data-listen-track]').forEach(button => {
      button.setAttribute('aria-pressed', 'false');
      button.textContent = 'Listen in Tamil';
    });
  };

  const speak = trackId => {
    const button = root.querySelector(`[data-listen-track="${CSS.escape(trackId)}"]`);
    const track = state.playlist.find(item => item.id === trackId);
    if (!track?.speechText || !button) return;
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      byId('practiceStatus').textContent = 'Tamil device read-aloud is unavailable in this browser.';
      return;
    }
    if (state.activeTrackId === trackId) {
      stopSpeech();
      return;
    }
    stopSpeech();
    const utterance = new SpeechSynthesisUtterance(track.speechText);
    utterance.lang = track.language || 'ta-IN';
    utterance.rate = .82;
    utterance.onend = stopSpeech;
    utterance.onerror = stopSpeech;
    state.activeTrackId = trackId;
    button.setAttribute('aria-pressed', 'true');
    button.textContent = 'Stop';
    window.speechSynthesis.speak(utterance);
  };

  const trackFor = id => state.playlist.find(item => item.id === id);

  const renderPaths = () => {
    const grid = byId('pathGrid');
    grid.innerHTML = state.paths.map(path => `
      <article class="path-card accent-${escapeHtml(path.accent)}">
        <span class="path-time">${escapeHtml(path.minutes)} min</span>
        <h3 lang="ta">${escapeHtml(path.titleTa)}</h3>
        <h4>${escapeHtml(path.titleEn)}</h4>
        <p>${escapeHtml(path.intention)}</p>
        <span>${path.steps.length} gentle steps</span>
        <button type="button" data-select-path="${escapeHtml(path.id)}">Begin this path</button>
      </article>
    `).join('');
    grid.setAttribute('aria-busy', 'false');
  };

  const updateProgress = () => {
    const total = state.selected?.steps.length || 0;
    const complete = state.completeSteps.size;
    byId('progressLabel').textContent = `${complete} of ${total} steps complete`;
    byId('progressBar').style.width = `${total ? (complete / total) * 100 : 0}%`;
    root.querySelectorAll('[data-complete-step]').forEach(button => {
      const done = state.completeSteps.has(Number(button.dataset.completeStep));
      button.setAttribute('aria-pressed', done ? 'true' : 'false');
      button.textContent = done ? 'Completed' : 'Mark complete';
    });
  };

  const stepMarkup = (step, index) => {
    const track = step.trackId ? trackFor(step.trackId) : null;
    const isPlayable = step.type === 'listen' && track?.speechText;
    const route = track?.route;
    return `<li class="practice-step type-${escapeHtml(step.type)}">
      <span class="step-number">${index + 1}</span>
      <div>
        <span class="step-type">${escapeHtml(step.type)}</span>
        <h3 lang="ta">${escapeHtml(step.titleTa)}</h3>
        <h4>${escapeHtml(step.titleEn)}</h4>
        ${step.instructionTa ? `<p lang="ta">${escapeHtml(step.instructionTa)}</p>` : ''}
        ${step.instructionEn ? `<p>${escapeHtml(step.instructionEn)}</p>` : ''}
        <div class="step-actions">
          ${isPlayable ? `<button type="button" data-listen-track="${escapeHtml(track.id)}" aria-pressed="false">Listen in Tamil</button>` : ''}
          ${route ? `<a href="${escapeHtml(route)}">${step.type === 'read' ? 'Open verified Tamil' : 'Open source record'}</a>` : ''}
          <button type="button" data-complete-step="${index}" aria-pressed="false">Mark complete</button>
        </div>
      </div>
    </li>`;
  };

  const selectPath = id => {
    const path = state.paths.find(item => item.id === id);
    if (!path) return;
    stopSpeech();
    state.selected = path;
    state.completeSteps.clear();
    byId('practiceKicker').textContent = `${path.minutes} minutes · ${path.titleEn}`;
    byId('practice-heading').textContent = path.titleTa;
    byId('practiceIntention').textContent = path.intention;
    byId('practiceSteps').innerHTML = path.steps.map(stepMarkup).join('');
    byId('practice').hidden = false;
    byId('practiceStatus').textContent = '';
    updateProgress();
    byId('practice').scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
  };

  const completePractice = () => {
    if (!state.selected) return;
    state.selected.steps.forEach((_, index) => state.completeSteps.add(index));
    updateProgress();
    const history = readLocal(STORAGE.completions, []);
    const date = new Date().toISOString().slice(0, 10);
    history.push({pathId: state.selected.id, date});
    writeLocal(STORAGE.completions, history.slice(-120));
    byId('practiceStatus').textContent = 'Practice completed on this device. அரோகரா.';
    renderSummary();
  };

  const renderSummary = () => {
    const history = readLocal(STORAGE.completions, []);
    const queue = readLocal(STORAGE.queue, []);
    byId('practiceCount').textContent = history.length;
    byId('practiceDays').textContent = new Set(history.map(item => item.date).filter(Boolean)).size;
    byId('queuedSongs').textContent = Array.isArray(queue) ? queue.length : 0;
  };

  root.addEventListener('click', event => {
    const pathButton = event.target.closest('[data-select-path]');
    if (pathButton) selectPath(pathButton.dataset.selectPath);
    const listenButton = event.target.closest('[data-listen-track]');
    if (listenButton) speak(listenButton.dataset.listenTrack);
    const stepButton = event.target.closest('[data-complete-step]');
    if (stepButton) {
      const index = Number(stepButton.dataset.completeStep);
      state.completeSteps.has(index) ? state.completeSteps.delete(index) : state.completeSteps.add(index);
      updateProgress();
    }
  });

  byId('stopListening')?.addEventListener('click', stopSpeech);
  byId('completePractice')?.addEventListener('click', completePractice);
  byId('closePractice')?.addEventListener('click', () => {
    stopSpeech();
    byId('practice').hidden = true;
    byId('choose-path').scrollIntoView({behavior: 'auto'});
  });
  byId('savePracticeNote')?.addEventListener('click', () => {
    const note = byId('practiceNote').value.trim();
    const saved = writeLocal(STORAGE.note, note);
    byId('noteStatus').textContent = saved ? 'Saved only in this browser.' : 'This browser blocked local saving.';
  });
  byId('clearPracticeNote')?.addEventListener('click', () => {
    byId('practiceNote').value = '';
    try { localStorage.removeItem(STORAGE.note); } catch {}
    byId('noteStatus').textContent = 'Private note cleared.';
  });
  addEventListener('pagehide', stopSpeech, {once: true});

  const load = async () => {
    try {
      const options = {cache: 'default', credentials: 'same-origin', headers: {Accept: 'application/json'}};
      const [pathResponse, playlistResponse] = await Promise.all([
        fetch('data/devotional-listening-paths.json', options),
        fetch('data/read-aloud-playlist.json', options)
      ]);
      if (!pathResponse.ok || !playlistResponse.ok) throw new Error('Devotional listening data could not be loaded.');
      const [pathData, playlist] = await Promise.all([pathResponse.json(), playlistResponse.json()]);
      state.paths = Array.isArray(pathData.paths) ? pathData.paths : [];
      state.playlist = Array.isArray(playlist) ? playlist : [];
      renderPaths();
      byId('practiceNote').value = String(readLocal(STORAGE.note, ''));
      renderSummary();
    } catch (error) {
      console.error(error);
      byId('pathGrid').innerHTML = '<article class="path-card error" role="alert"><h3>Listening paths are temporarily unavailable.</h3><p>Use the verified Song Library or Audio Library instead.</p><a href="murugan-song-library.html">Open Song Library</a></article>';
      byId('pathGrid').setAttribute('aria-busy', 'false');
    }
  };

  load();
})();
