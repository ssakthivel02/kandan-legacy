import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  ALLOWED_TARGETS,
  EXPORT_SCHEMA,
  buildHistoryExport,
  normaliseCount,
  normaliseTarget,
  sanitiseHistory,
  sanitiseSession
} from '../../assets/js/mantra-practice-core.mjs';

const read = path => readFile(new URL('../../' + path, import.meta.url), 'utf8');
const json = async path => JSON.parse(await read(path));
const ids = [
  'om-saravanabhava',
  'kanda-gayatri',
  'vel-vel',
  'skanda-sharanam',
  'shanmuga-sharanam',
  'muruga-sharanam'
];

test('Phase 16 uses six existing published mantra records and five bounded targets', async () => {
  const [config, mantras] = await Promise.all([
    json('data/mantra-practice.json'),
    json('data/murugan-mantras.json')
  ]);
  assert.equal(config.release, 'phase16');
  assert.deepEqual(config.allowedTargets, ALLOWED_TARGETS);
  assert.deepEqual(config.mantraIds, ids);
  const published = new Map(mantras.map(item => [item.id, item]));
  for (const id of config.mantraIds) {
    assert.equal(published.get(id)?.status, 'published');
    assert.ok(published.get(id)?.textTa);
  }
  assert.match(config.practiceBoundary, /not a measure of spiritual merit/i);
});

test('counter values are bounded and unsafe stored values are rejected', () => {
  assert.equal(normaliseTarget(108), 108);
  assert.equal(normaliseTarget(1000), 6);
  assert.equal(normaliseCount(-9, 27), 0);
  assert.equal(normaliseCount(999, 27), 27);
  const completedAt = '2026-07-28T10:00:00.000Z';
  assert.deepEqual(
    sanitiseSession({mantraId: ids[0], target: 12, count: 12, completedAt}, ids),
    {mantraId: ids[0], target: 12, count: 12, completedAt}
  );
  assert.equal(
    sanitiseSession({mantraId: 'unverified', target: 12, count: 12, completedAt}, ids),
    null
  );
  assert.equal(
    sanitiseSession({mantraId: ids[0], target: 12, count: 11, completedAt}, ids),
    null
  );
});

test('session history is deduplicated, bounded and exports no sacred text', () => {
  const valid = {
    mantraId: ids[0],
    target: 6,
    count: 6,
    completedAt: '2026-07-28T10:00:00.000Z',
    textTa: 'must not survive'
  };
  const history = sanitiseHistory([valid, valid], ids);
  assert.equal(history.length, 1);
  const exported = buildHistoryExport(history, ids);
  assert.equal(exported.schema, EXPORT_SCHEMA);
  assert.equal(exported.containsSacredText, false);
  assert.doesNotMatch(JSON.stringify(exported), /must not survive|textTa|speechText/);
});

test('practice UI is local, lifecycle-safe and accessibility-aware', async () => {
  const [html, script, css] = await Promise.all([
    read('mantra-practice.html'),
    read('assets/js/mantra-practice-2026.mjs'),
    read('assets/css/mantra-practice-2026.css')
  ]);
  assert.match(html, /data-mantra-practice/);
  assert.match(html, /role="progressbar"/);
  assert.match(html, /not a score of spiritual merit/i);
  assert.match(script, /SpeechSynthesisUtterance/);
  assert.match(script, /navigator\.vibrate/);
  assert.match(script, /osb-phase16-mantra-history/);
  assert.doesNotMatch(script, /sendBeacon|XMLHttpRequest|https?:\/\//);
  assert.ok(
    script.indexOf('const stopSpeech =') <
      script.indexOf("addEventListener('pagehide', stopSpeech"),
    'speech lifecycle handler must be registered after stopSpeech exists'
  );
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /forced-colors:active/);
});
