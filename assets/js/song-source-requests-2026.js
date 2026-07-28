(() => {
  'use strict';

  const root = document.querySelector('[data-source-request-app]');
  if (!root) return;

  const PRIORITY_KEY = 'osb-phase15-song-source-priorities';
  const byId = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
  const label = value => ({
    'source-needed': 'Exact edition needed',
    'rights-and-source-needed': 'Source + rights needed',
    'identity-disambiguation-needed': 'Title identity review'
  }[value] || value);
  const getPriorities = () => {
    try {
      const value = JSON.parse(localStorage.getItem(PRIORITY_KEY) || '[]');
      return new Set(Array.isArray(value) ? value : []);
    } catch {
      return new Set();
    }
  };
  const savePriorities = priorities => {
    try { localStorage.setItem(PRIORITY_KEY, JSON.stringify([...priorities])); } catch {}
  };

  const state = {records: [], requirements: [], priorities: getPriorities()};

  const render = () => {
    const query = byId('requestQuery').value.trim().toLocaleLowerCase();
    const status = byId('requestStatus').value;
    const localOnly = byId('priorityOnly').checked;
    const records = state.records.filter(item => {
      const text = `${item.titleTa} ${item.titleEn} ${item.category}`.toLocaleLowerCase();
      return (!query || text.includes(query)) &&
        (!status || item.status === status) &&
        (!localOnly || state.priorities.has(item.id));
    });
    byId('requestCount').textContent = `${records.length} of ${state.records.length} missing-song identities shown.`;
    byId('requestGrid').innerHTML = records.length ? records.map(item => {
      const saved = state.priorities.has(item.id);
      return `<article class="request-card">
        <div class="request-card-meta"><span>${escapeHtml(item.category)}</span><span>${escapeHtml(label(item.status))}</span></div>
        <h3 lang="ta">${escapeHtml(item.titleTa)}</h3>
        <h4>${escapeHtml(item.titleEn)}</h4>
        <p>No lyrics or recording is published until the exact work and rights are verified.</p>
        <div class="request-card-actions">
          <button type="button" data-priority-id="${escapeHtml(item.id)}" aria-pressed="${saved}">${saved ? '★ Local priority' : '☆ Prioritise locally'}</button>
          <button type="button" data-copy-song="${escapeHtml(item.id)}">Copy evidence request</button>
        </div>
      </article>`;
    }).join('') : '<article class="request-card empty"><h3>No source request matched.</h3><p>Clear the filters to see all missing-song identities.</p></article>';
    byId('requestGrid').setAttribute('aria-busy', 'false');
  };

  const evidenceTemplate = item => [
    'Om Saravana Bhava — song source evidence',
    `Song: ${item ? `${item.titleTa} / ${item.titleEn}` : '[exact Tamil and English title]'}`,
    'Alternate title/spelling:',
    'Author / lyricist / traditional attribution:',
    'Edition / publisher / archive:',
    'Source URL or source-image reference:',
    'Text redistribution permission or public-domain evidence:',
    'Recording owner and permission (if audio is proposed):',
    'Contributor notes:'
  ].join('\n');

  const copyText = async (text, message) => {
    try {
      await navigator.clipboard.writeText(text);
      byId('copyStatus').textContent = message;
    } catch {
      byId('copyStatus').textContent = 'Clipboard access was blocked. Open Contact and paste the evidence fields manually.';
    }
  };

  root.addEventListener('click', event => {
    const priority = event.target.closest('[data-priority-id]');
    if (priority) {
      const id = priority.dataset.priorityId;
      state.priorities.has(id) ? state.priorities.delete(id) : state.priorities.add(id);
      savePriorities(state.priorities);
      render();
    }
    const copy = event.target.closest('[data-copy-song]');
    if (copy) {
      const item = state.records.find(record => record.id === copy.dataset.copySong);
      copyText(evidenceTemplate(item), `Evidence template copied for ${item?.titleEn || 'the selected song'}.`);
    }
  });

  ['requestQuery', 'requestStatus', 'priorityOnly'].forEach(id => {
    byId(id)?.addEventListener(id === 'requestQuery' ? 'input' : 'change', render);
  });
  byId('clearRequestFilters')?.addEventListener('click', () => {
    byId('requestQuery').value = '';
    byId('requestStatus').value = '';
    byId('priorityOnly').checked = false;
    render();
    byId('requestQuery').focus();
  });
  byId('copyEvidenceTemplate')?.addEventListener('click', () => {
    copyText(evidenceTemplate(null), 'Blank evidence template copied.');
  });

  const load = async () => {
    try {
      const response = await fetch('data/song-source-requests.json', {
        cache: 'default', credentials: 'same-origin', headers: {Accept: 'application/json'}
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      state.records = Array.isArray(data.records) ? data.records : [];
      state.requirements = Array.isArray(data.evidenceRequirements) ? data.evidenceRequirements : [];
      const statuses = [...new Set(state.records.map(item => item.status))].sort();
      byId('requestStatus').innerHTML = '<option value="">All statuses</option>' +
        statuses.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(label(value))}</option>`).join('');
      byId('evidenceRequirements').innerHTML = state.requirements.map(item => `<li>${escapeHtml(item)}</li>`).join('');
      const query = new URLSearchParams(location.search).get('q');
      if (query) byId('requestQuery').value = query;
      render();
    } catch (error) {
      console.error(error);
      byId('requestCount').textContent = 'The missing-song source queue could not be loaded.';
      byId('requestGrid').innerHTML = '<article class="request-card empty" role="alert"><h3>Source queue unavailable.</h3><p>Use Content Completeness or Contact to review missing material.</p></article>';
      byId('requestGrid').setAttribute('aria-busy', 'false');
    }
  };

  load();
})();
