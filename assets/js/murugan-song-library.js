(() => {
  'use strict';

  const state = {collections: [], songs: [], playlist: []};
  const PRAYER_QUEUE_KEY = 'osb-prayer-queue';
  const byId = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
  const labels = {
    original_tamil: 'Original Tamil',
    easy_reading_tamil: 'Easy-reading Tamil',
    transliteration: 'Transliteration',
    meaning: 'Meaning',
    audio: 'Audio / Read aloud',
    source: 'Source record'
  };

  const renderStats = collections => {
    const published = collections.filter(item => item.status === 'published-source-linked').length;
    const partial = collections.filter(item => item.status === 'partial-reviewed').length;
    const registers = collections.filter(item => item.status === 'source-register').length;
    const stats = [
      [collections.length, 'Governed collections'],
      [published, 'Published full-song libraries'],
      [partial, 'Bounded reviewed extracts'],
      [registers, 'Source registers awaiting text']
    ];
    byId('songStats').innerHTML = stats.map(([value, label]) =>
      `<article class="song-stat"><strong>${value}</strong><span>${escapeHtml(label)}</span></article>`
    ).join('');
  };

  const card = item => {
    const formats = (item.availableFormats || []).map(format =>
      `<span class="song-format">✓ ${escapeHtml(labels[format] || format)}</span>`
    ).join('');
    return `<article class="song-card">
      <div class="song-meta">
        <span class="song-pill">${escapeHtml(item.category)}</span>
        <span class="song-pill song-state">${escapeHtml(item.statusLabel)}</span>
      </div>
      <h3 lang="ta">${escapeHtml(item.titleTa)}</h3>
      <p class="song-en">${escapeHtml(item.titleEn)}</p>
      <p><small>${escapeHtml(item.author)}</small></p>
      <p class="song-summary">${escapeHtml(item.summary)}</p>
      <div class="song-formats" aria-label="Available formats">${formats || '<span class="song-format">Source review pending</span>'}</div>
      <a href="${escapeHtml(item.route)}">Open governed record</a>
    </article>`;
  };

  const render = () => {
    const query = (byId('songQuery').value || '').trim().toLocaleLowerCase();
    const category = byId('songCategory').value;
    const status = byId('songStatus').value;
    const filtered = state.collections.filter(item => {
      const haystack = [item.titleTa, item.titleEn, item.author, item.category, item.summary, item.statusLabel]
        .join(' ').toLocaleLowerCase();
      return (!query || haystack.includes(query)) &&
        (!category || item.category === category) &&
        (!status || item.status === status);
    });

    byId('songCount').textContent = `${filtered.length} of ${state.collections.length} governed collections shown.`;
    byId('songGrid').innerHTML = filtered.length
      ? filtered.map(card).join('')
      : '<article class="song-panel song-empty"><h3>No governed collection matched this filter.</h3><p>Clear the filters or use the complete site directory.</p></article>';
  };

  const populateSelect = (id, values, defaultLabel) => {
    const select = byId(id);
    select.innerHTML = `<option value="">${escapeHtml(defaultLabel)}</option>` +
      [...new Set(values)].sort((a, b) => a.localeCompare(b)).map(value =>
        `<option value="${escapeHtml(value)}">${escapeHtml(value.replaceAll('-', ' '))}</option>`
      ).join('');
  };

  const load = async () => {
    try {
      const options = {cache: 'default', credentials: 'same-origin', headers: {'Accept': 'application/json'}};
      const [libraryResponse, songsResponse, playlistResponse] = await Promise.all([
        fetch('data/murugan-song-library.json', options),
        fetch('data/thiruppugazh.json', options),
        fetch('data/read-aloud-playlist.json', options)
      ]);
      if (!libraryResponse.ok || !songsResponse.ok || !playlistResponse.ok) throw new Error('A governed song data file could not be loaded.');
      const [data, songs, playlist] = await Promise.all([
        libraryResponse.json(), songsResponse.json(), playlistResponse.json()
      ]);
      state.collections = Array.isArray(data.collections) ? data.collections : [];
      state.songs = Array.isArray(songs) ? songs : [];
      state.playlist = Array.isArray(playlist) ? playlist : [];
      populateSelect('songCategory', state.collections.map(item => item.category), 'All categories');
      populateSelect('songStatus', state.collections.map(item => item.status), 'All publication states');
      renderStats(state.collections);
      render();
      renderVerifiedSongs();
    } catch (error) {
      console.error(error);
      byId('songCount').textContent = 'The governed collection registry could not be loaded.';
      byId('songGrid').innerHTML = '<article class="song-panel song-empty" role="alert">Open Thiruppugazh, Slokas or the Site Directory using the links above.</article>';
    }
  };

  let activeSpeechId = '';
  byId('verifiedSongGrid')?.addEventListener('click', event => {
    const button = event.target.closest('[data-song-listen]');
    if (!button) return;
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      button.textContent = 'Read-aloud unavailable';
      return;
    }
    const item = state.playlist.find(entry => entry.id === button.dataset.songListen);
    if (!item?.speechText) return;
    if (activeSpeechId === item.id) {
      stopSpeech();
      return;
    }
    stopSpeech();
    activeSpeechId = item.id;
    const utterance = new SpeechSynthesisUtterance(item.speechText);
    utterance.lang = item.language || 'ta-IN';
    utterance.rate = .82;
    utterance.onend = stopSpeech;
    utterance.onerror = stopSpeech;
    button.setAttribute('aria-pressed', 'true');
    button.textContent = 'Stop';
    window.speechSynthesis.speak(utterance);
  });
  const stopSpeech = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    activeSpeechId = '';
    document.querySelectorAll('[data-song-listen]').forEach(button => {
      button.setAttribute('aria-pressed', 'false');
      button.textContent = 'Listen in Tamil';
    });
  };
  const getPrayerQueue = () => {
    try {
      const value = JSON.parse(localStorage.getItem(PRAYER_QUEUE_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };
  const renderPrayerQueue = () => {
    const queue = getPrayerQueue();
    if (byId('prayerQueueCount')) byId('prayerQueueCount').textContent = queue.length;
    document.querySelectorAll('[data-song-queue]').forEach(button => {
      const saved = queue.includes(button.dataset.songQueue);
      button.setAttribute('aria-pressed', saved ? 'true' : 'false');
      button.textContent = saved ? '★ In prayer queue' : '☆ Add to prayer queue';
    });
  };
  const setPrayerQueue = queue => {
    try { localStorage.setItem(PRAYER_QUEUE_KEY, JSON.stringify(queue)); } catch {}
    renderPrayerQueue();
  };
  addEventListener('pagehide', stopSpeech, {once: true});
  const renderVerifiedSongs = () => {
    const grid = byId('verifiedSongGrid');
    if (!grid) return;
    const speechByRoute = new Map(state.playlist.map(item => [item.route, item]));
    grid.innerHTML = state.songs.map((song, index) => {
      const speech = speechByRoute.get(song.route);
      return `<article class="verified-song">
        <span class="verified-song-number">Thiruppugazh ${String(index + 6).padStart(4, '0')}</span>
        <h3 lang="ta">${escapeHtml(song.titleTa)}</h3>
        <p class="song-en">${escapeHtml(song.titleEn)}</p>
        <div class="verified-song-actions">
          <a href="${escapeHtml(song.route)}">Read full Tamil</a>
          ${speech?.speechText ? `<button type="button" data-song-listen="${escapeHtml(speech.id)}" aria-pressed="false">Listen in Tamil</button>` : ''}
          ${speech ? `<button type="button" data-song-queue="${escapeHtml(speech.id)}" aria-pressed="false">☆ Add to prayer queue</button>` : ''}
        </div>
      </article>`;
    }).join('');
    grid.setAttribute('aria-busy', 'false');
    byId('verifiedSongCount').textContent = `${state.songs.length} verified full-song routes available.`;
    renderPrayerQueue();
  };

  byId('verifiedSongGrid')?.addEventListener('click', event => {
    const button = event.target.closest('[data-song-queue]');
    if (!button) return;
    const queue = getPrayerQueue();
    const id = button.dataset.songQueue;
    setPrayerQueue(queue.includes(id) ? queue.filter(item => item !== id) : [...queue, id].slice(-24));
  });
  byId('clearPrayerQueue')?.addEventListener('click', () => setPrayerQueue([]));

  ['songQuery', 'songCategory', 'songStatus'].forEach(id => {
    byId(id)?.addEventListener(id === 'songQuery' ? 'input' : 'change', render);
  });
  byId('songClear')?.addEventListener('click', () => {
    byId('songQuery').value = '';
    byId('songCategory').value = '';
    byId('songStatus').value = '';
    render();
    byId('songQuery').focus();
  });

  load();
})();
