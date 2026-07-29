(() => {
  'use strict';

  const STORAGE = {
    track: 'osb-player-track',
    rate: 'osb-player-rate',
    voice: 'osb-player-voice',
    autoNext: 'osb-player-auto-next'
  };

  const state = {
    tracks: [],
    index: -1,
    chunks: [],
    chunkIndex: 0,
    utterance: null,
    generation: 0,
    startupTimer: null,
    status: 'idle',
    rate: 0.9,
    voiceURI: '',
    autoNext: false
  };

  const el = {};
  const supportsSpeech = () =>
    'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);

  const current = () => state.tracks[state.index] || null;

  const setStatus = message => {
    if (el.status) el.status.textContent = message;
  };

  const clearStartupTimer = () => {
    if (state.startupTimer !== null) {
      window.clearTimeout(state.startupTimer);
      state.startupTimer = null;
    }
  };

  const setPlaybackState = value => {
    state.status = value;
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState =
        value === 'playing' ? 'playing' :
        value === 'paused' ? 'paused' : 'none';
    }
    if (el.play) {
      const playing = value === 'playing';
      el.play.textContent = playing ? '⏸' : '▶';
      el.play.setAttribute('aria-label', playing ? 'Pause read-aloud' : 'Play read-aloud');
      el.play.setAttribute('aria-pressed', playing ? 'true' : 'false');
    }
  };

  const splitText = text => {
    const paragraphs = String(text || '')
      .replace(/\r/g, '')
      .split(/\n\s*\n/)
      .map(value => value.replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    const chunks = [];
    paragraphs.forEach(paragraph => {
      if (paragraph.length <= 650) {
        chunks.push(paragraph);
        return;
      }
      const sentences = paragraph.split(/(?<=[.!?।])\s+|(?<=\n)/).filter(Boolean);
      let buffer = '';
      sentences.forEach(sentence => {
        const candidate = `${buffer} ${sentence}`.trim();
        if (candidate.length > 650 && buffer) {
          chunks.push(buffer);
          buffer = sentence.trim();
        } else {
          buffer = candidate;
        }
      });
      if (buffer) chunks.push(buffer);
    });
    return chunks.length ? chunks : [String(text || '').trim()].filter(Boolean);
  };

  const voices = () => window.speechSynthesis?.getVoices?.() || [];

  const selectedVoice = () => {
    const available = voices();
    return available.find(voice => voice.voiceURI === state.voiceURI)
      || available.find(voice => /^ta(?:-|_)/i.test(voice.lang))
      || available.find(voice => /Tamil/i.test(voice.name))
      || null;
  };

  const populateVoices = () => {
    if (!el.voice) return;
    const available = voices();
    const tamil = available.filter(voice =>
      /^ta(?:-|_)/i.test(voice.lang) || /Tamil/i.test(voice.name)
    );
    const options = tamil.length ? tamil : available;
    el.voice.innerHTML = options.length
      ? options.map(voice =>
          `<option value="${escapeHtml(voice.voiceURI)}">${escapeHtml(voice.name)} · ${escapeHtml(voice.lang)}</option>`
        ).join('')
      : '<option value="">System default voice</option>';

    const preferred = options.find(voice => voice.voiceURI === state.voiceURI)
      || options.find(voice => /^ta(?:-|_)/i.test(voice.lang))
      || options[0];
    if (preferred) {
      state.voiceURI = preferred.voiceURI;
      el.voice.value = preferred.voiceURI;
    }
  };

  const updateMediaMetadata = track => {
    if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined' || !track) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.titleTa,
      artist: track.artist,
      album: track.album,
      artwork: track.artwork
    });
  };

  const renderTrack = () => {
    const track = current();
    if (!track) return;
    document.body.classList.add('osb-player-active');
    if (el.player) el.player.hidden = false;
    if (el.titleTa) el.titleTa.textContent = track.titleTa;
    if (el.titleEn) el.titleEn.textContent = track.titleEn;
    if (el.meta) el.meta.textContent = `${track.artist} · ${track.album}`;
    if (el.position) el.position.textContent = `${state.index + 1} of ${state.tracks.length}`;
    if (el.open) el.open.href = track.route;
    updateMediaMetadata(track);
    localStorage.setItem(STORAGE.track, track.id);
    document.querySelectorAll('[data-player-track]').forEach(button => {
      button.setAttribute(
        'aria-current',
        button.dataset.playerTrack === track.id ? 'true' : 'false'
      );
    });
  };

  const select = (id, options = {}) => {
    const index = state.tracks.findIndex(track => track.id === id);
    if (index < 0) return false;
    stop(false);
    state.index = index;
    state.chunks = splitText(current().speechText);
    state.chunkIndex = 0;
    renderTrack();
    setStatus(`Selected ${current().titleEn}. Press Play to begin.`);
    if (options.play) play();
    return true;
  };

  const speakChunk = () => {
    const track = current();
    if (!track || !state.chunks[state.chunkIndex]) {
      setPlaybackState('idle');
      setStatus('Read-aloud completed.');
      if (state.autoNext) next(true);
      return;
    }

    const generation = state.generation;
    const utterance = new SpeechSynthesisUtterance(state.chunks[state.chunkIndex]);
    const voice = selectedVoice();
    utterance.lang = voice?.lang || 'ta-IN';
    if (voice) utterance.voice = voice;
    utterance.rate = state.rate;
    utterance.pitch = 1;
    state.utterance = utterance;

    utterance.onstart = () => {
      if (generation !== state.generation) return;
      clearStartupTimer();
      setPlaybackState('playing');
      setStatus(
        `Reading section ${state.chunkIndex + 1} of ${state.chunks.length}` +
        (voice ? ` with ${voice.name}.` : '. Install a Tamil voice for better pronunciation.')
      );
    };

    utterance.onend = () => {
      if (generation !== state.generation) return;
      clearStartupTimer();
      state.utterance = null;
      state.chunkIndex += 1;
      speakChunk();
    };

    utterance.onerror = event => {
      if (generation !== state.generation) return;
      clearStartupTimer();
      state.utterance = null;
      if (!['canceled', 'interrupted'].includes(event.error)) {
        setPlaybackState('idle');
        setStatus('The browser could not continue this read-aloud.');
      }
    };

    setStatus('Starting Tamil read-aloud…');
    state.startupTimer = window.setTimeout(() => {
      if (generation !== state.generation || state.status === 'playing') return;
      window.speechSynthesis.cancel();
      state.utterance = null;
      setPlaybackState('idle');
      setStatus(
        'Tamil read-aloud did not start. Enable a device speech voice or try another supported browser.'
      );
    }, 5000);
    try {
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      clearStartupTimer();
      state.utterance = null;
      setPlaybackState('idle');
      setStatus('Tamil read-aloud could not start in this browser.');
    }
  };

  const play = () => {
    if (!supportsSpeech()) {
      setStatus('Tamil read-aloud is not supported by this browser.');
      return;
    }
    if (!current()) {
      if (!state.tracks.length) return;
      select(state.tracks[0].id);
    }
    if (window.speechSynthesis.paused && state.utterance) {
      window.speechSynthesis.resume();
      setPlaybackState('playing');
      setStatus('Read-aloud resumed.');
      return;
    }
    if (state.status === 'playing') {
      pause();
      return;
    }
    if (state.chunkIndex >= state.chunks.length) state.chunkIndex = 0;
    speakChunk();
  };

  const pause = () => {
    if (window.speechSynthesis?.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setPlaybackState('paused');
      setStatus('Read-aloud paused.');
    }
  };

  const stop = (announce = true) => {
    state.generation += 1;
    clearStartupTimer();
    window.speechSynthesis?.cancel?.();
    state.utterance = null;
    state.chunkIndex = 0;
    setPlaybackState('idle');
    if (announce) setStatus('Read-aloud stopped.');
  };

  const move = (direction, autoplay = false) => {
    if (!state.tracks.length) return;
    const nextIndex = state.index < 0
      ? 0
      : (state.index + direction + state.tracks.length) % state.tracks.length;
    select(state.tracks[nextIndex].id, { play: autoplay });
  };

  const next = autoplay => move(1, autoplay);
  const previous = autoplay => move(-1, autoplay);

  const close = () => {
    stop(false);
    if (el.player) el.player.hidden = true;
    document.body.classList.remove('osb-player-active');
    setStatus('');
  };

  const bindMediaSession = () => {
    if (!('mediaSession' in navigator)) return;
    const handlers = {
      play,
      pause,
      stop,
      nexttrack: () => next(true),
      previoustrack: () => previous(true)
    };
    Object.entries(handlers).forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (error) {
        console.debug(`Media Session action unavailable: ${action}`, error);
      }
    });
  };

  const renderQueue = () => {
    if (!el.queue) return;
    el.queue.innerHTML = state.tracks.map((track, index) => `
      <article class="card read-aloud-queue-card">
        <span class="pill">${escapeHtml(track.kind)}</span>
        <span class="pill">${index + 1}</span>
        <h3 lang="ta">${escapeHtml(track.titleTa)}</h3>
        <p>${escapeHtml(track.titleEn)}</p>
        <p class="audio-rights-note">${escapeHtml(track.artist)}</p>
        <div class="audio-card-actions">
          <button type="button" class="btn" data-player-track="${escapeHtml(track.id)}" data-player-mode="play">▶ Play</button>
          <button type="button" class="btn secondary" data-player-track="${escapeHtml(track.id)}" data-player-mode="select">Select</button>
          <a class="btn secondary" href="${escapeHtml(track.route)}">Open text</a>
        </div>
      </article>
    `).join('');
    if (el.queueCount) {
      el.queueCount.textContent = `${state.tracks.length} verified read-aloud items are available.`;
    }
  };

  const bindControls = () => {
    document.addEventListener('click', event => {
      const trackButton = event.target.closest('[data-player-track]');
      if (trackButton) {
        select(trackButton.dataset.playerTrack, {
          play: trackButton.dataset.playerMode === 'play'
        });
      }
    });

    el.play?.addEventListener('click', play);
    el.stop?.addEventListener('click', () => stop(true));
    el.next?.addEventListener('click', () => next(state.status === 'playing'));
    el.previous?.addEventListener('click', () => previous(state.status === 'playing'));
    el.close?.addEventListener('click', close);

    el.rate?.addEventListener('change', () => {
      const rate = Number(el.rate.value);
      state.rate = Number.isFinite(rate) ? rate : 0.9;
      localStorage.setItem(STORAGE.rate, String(state.rate));
      if (state.status === 'playing' || state.status === 'paused') {
        stop(false);
        play();
      }
    });

    el.voice?.addEventListener('change', () => {
      state.voiceURI = el.voice.value;
      localStorage.setItem(STORAGE.voice, state.voiceURI);
      if (state.status === 'playing' || state.status === 'paused') {
        stop(false);
        play();
      }
    });

    el.autoNext?.addEventListener('change', () => {
      state.autoNext = el.autoNext.checked;
      localStorage.setItem(STORAGE.autoNext, state.autoNext ? '1' : '0');
    });

    window.speechSynthesis?.addEventListener?.('voiceschanged', populateVoices);
    window.addEventListener('pagehide', () => stop(false));
  };

  document.addEventListener('DOMContentLoaded', async () => {
    Object.assign(el, {
      player: document.getElementById('osbMediaPlayer'),
      titleTa: document.getElementById('playerTitleTa'),
      titleEn: document.getElementById('playerTitleEn'),
      meta: document.getElementById('playerMeta'),
      position: document.getElementById('playerPosition'),
      status: document.getElementById('playerStatus'),
      play: document.getElementById('playerPlay'),
      stop: document.getElementById('playerStop'),
      next: document.getElementById('playerNext'),
      previous: document.getElementById('playerPrevious'),
      close: document.getElementById('playerClose'),
      open: document.getElementById('playerOpenText'),
      rate: document.getElementById('playerRate'),
      voice: document.getElementById('playerVoice'),
      autoNext: document.getElementById('playerAutoNext'),
      queue: document.getElementById('readAloudQueueGrid'),
      queueCount: document.getElementById('readAloudQueueCount')
    });

    if (!el.player || !el.queue) return;

    try {
      const response = await fetch('data/read-aloud-playlist.json', { cache: 'default' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      state.tracks = await response.json();

      state.rate = Number(localStorage.getItem(STORAGE.rate)) || 0.9;
      state.voiceURI = localStorage.getItem(STORAGE.voice) || '';
      state.autoNext = localStorage.getItem(STORAGE.autoNext) === '1';

      if (el.rate) el.rate.value = String(state.rate);
      if (el.autoNext) el.autoNext.checked = state.autoNext;

      populateVoices();
      renderQueue();
      bindControls();
      bindMediaSession();

      const requested = new URLSearchParams(location.search).get('track');
      const saved = localStorage.getItem(STORAGE.track);
      const initial = requested || saved;
      if (initial && state.tracks.some(track => track.id === initial)) {
        select(initial);
      }
    } catch (error) {
      console.error('Read-aloud playlist failed to initialize:', error);
      if (el.queue) {
        el.queue.innerHTML =
          '<div class="card" role="alert">The verified read-aloud queue could not be loaded.</div>';
      }
      setStatus('The read-aloud player could not be initialized.');
    }
  });

  window.OSBMediaPlayer = { select, play, pause, stop, next, previous };
})();
