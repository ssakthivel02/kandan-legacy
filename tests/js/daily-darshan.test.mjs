import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  EXPORT_SCHEMA,
  buildHistoryExport,
  buildShareText,
  chooseDailyRecord,
  distinctPracticeDays,
  localDateKey,
  normalisePeriod,
  sanitiseCompletion,
  sanitiseHistory
} from '../../assets/js/daily-darshan-core.mjs';

const read = path => readFile(new URL('../../' + path, import.meta.url), 'utf8');
const json = async path => JSON.parse(await read(path));

test('Phase 17 daily records resolve only governed mantra, song and temple identities', async () => {
  const [config, mantras, playlist, search] = await Promise.all([
    json('data/daily-darshan.json'),
    json('data/murugan-mantras.json'),
    json('data/read-aloud-playlist.json'),
    json('data/search-index.json')
  ]);
  assert.equal(config.release, 'phase17');
  assert.equal(config.records.length, 6);
  assert.equal(new Set(config.records.map(item => item.id)).size, 6);
  const publishedMantras = new Set(
    mantras.filter(item => item.status === 'published').map(item => item.id)
  );
  const governedSongs = new Map(playlist.map(item => [item.id, item]));
  const governedTemples = new Map(
    search.filter(item => item.kind === 'Temple').map(item => [item.id, item])
  );
  for (const record of config.records) {
    assert.ok(publishedMantras.has(record.mantraId));
    assert.match(
      governedSongs.get(record.songId)?.publicationStatus || '',
      /^published/
    );
    assert.equal(governedTemples.get(record.templeId)?.route, record.templeRoute);
    assert.equal(governedTemples.get(record.templeId)?.status, 'published-source-linked');
  }
  assert.match(config.practiceBoundary, /not astrology, prophecy/i);
});

test('daily selection is deterministic for a local calendar date', async () => {
  const config = await json('data/daily-darshan.json');
  const morning = new Date(2026, 6, 28, 1, 10);
  const evening = new Date(2026, 6, 28, 22, 40);
  assert.equal(localDateKey(morning), '2026-07-28');
  assert.equal(
    chooseDailyRecord(config.records, morning).id,
    chooseDailyRecord(config.records, evening).id
  );
});

test('completion history rejects tampering, deduplicates and exports no sacred text', async () => {
  const config = await json('data/daily-darshan.json');
  const ids = config.records.map(item => item.id);
  const valid = {
    dateKey: '2026-07-28',
    recordId: ids[0],
    period: 'morning',
    completedAt: '2026-07-28T08:15:00.000Z',
    speechText: 'must not survive'
  };
  assert.deepEqual(
    sanitiseCompletion(valid, ids),
    {
      dateKey: valid.dateKey,
      recordId: valid.recordId,
      period: valid.period,
      completedAt: valid.completedAt
    }
  );
  assert.equal(
    sanitiseCompletion({...valid, recordId: 'unverified'}, ids),
    null
  );
  assert.equal(
    sanitiseCompletion({...valid, completedAt: 'not-a-date'}, ids),
    null
  );
  const history = sanitiseHistory([valid, valid, {...valid, period: 'evening'}], ids);
  assert.equal(history.length, 2);
  assert.equal(distinctPracticeDays(history), 1);
  const exported = buildHistoryExport(history, ids);
  assert.equal(exported.schema, EXPORT_SCHEMA);
  assert.equal(exported.containsSacredText, false);
  assert.doesNotMatch(JSON.stringify(exported), /must not survive|speechText|textTa/);
});

test('shared summary identifies the route without sharing sacred text or private history', async () => {
  const config = await json('data/daily-darshan.json');
  const record = config.records[0];
  const shared = buildShareText({
    dateKey: '2026-07-28',
    period: normalisePeriod('evening'),
    record
  });
  assert.match(shared, /Daily Murugan Darshan/);
  assert.match(shared, /daily\.html/);
  assert.match(shared, new RegExp(record.templeNameEn));
  assert.doesNotMatch(shared, /reflectionTa|actionTa|speechText|completedAt/);
});

test('daily UI is Tamil-first, lifecycle-safe and accessibility-aware', async () => {
  const [html, script, css] = await Promise.all([
    read('daily.html'),
    read('assets/js/daily-darshan-2026.mjs'),
    read('assets/css/daily-darshan-2026.css')
  ]);
  assert.match(html, /data-daily-darshan/);
  assert.match(html, /role="progressbar"/);
  assert.match(html, /not astrology, prophecy/i);
  assert.match(script, /osb-phase17-daily-darshan-history/);
  assert.match(script, /SpeechSynthesisUtterance/);
  assert.match(script, /navigator\.share/);
  assert.doesNotMatch(script, /sendBeacon|XMLHttpRequest|https?:\/\//);
  assert.ok(
    script.indexOf('const stopSpeech =') <
      script.indexOf("addEventListener('pagehide', stopSpeech"),
    'speech lifecycle handler must be registered after stopSpeech exists'
  );
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /forced-colors:active/);
}
);
