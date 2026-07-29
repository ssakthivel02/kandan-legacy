import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

import {
  matchesStaticRecord,
  normaliseText
} from '../../assets/js/content-reliability-2026.mjs';

const read = path =>
  readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('text matching is case-insensitive and Tamil-safe', () => {
  assert.equal(normaliseText('  MURUGAN முருகன்  '), 'murugan முருகன்');
  assert.equal(
    matchesStaticRecord(
      {searchText: 'மருதமலை Marudhamalai Coimbatore', category: 'Hill temple'},
      {query: 'மருதமலை', category: 'Hill temple'}
    ),
    true
  );
});

test('category and query filters both fail closed', () => {
  const record = {
    searchText: 'Ettukudi Nagapattinam',
    category: 'Village temple'
  };
  assert.equal(matchesStaticRecord(record, {query: 'Erode'}), false);
  assert.equal(
    matchesStaticRecord(record, {category: 'Hill temple'}),
    false
  );
});

test('Thiruppugazh initial HTML contains all 12 verified cards', async () => {
  const html = await read('thiruppugazh.html');
  assert.equal(
    (html.match(/<article[^>]+data-song-card/g) || []).length,
    12
  );
  assert.match(html, /12 of 12 verified songs shown/);
  assert.doesNotMatch(html, /Loading verified songs/);
});

test('temple initial HTML contains 18 bounded regional records', async () => {
  const html = await read('temples.html');
  assert.equal(
    (html.match(/<article[^>]+data-regional-temple/g) || []).length,
    18
  );
  assert.match(html, /identity-verified directory entries/);
  assert.match(html, /Narrative and visitor details under review/);
});

test('Phase 20 corpus accounting distinguishes publication from backlog', async () => {
  const progress = JSON.parse(await read('data/thiruppugazh-corpus-progress.json'));
  assert.equal(progress.programmeTarget, 1300);
  assert.equal(progress.published.count, 12);
  assert.equal(progress.quarantinedOcrDrafts.count, 39);
  assert.equal(progress.excludedEmptyShells.count, 18);
  assert.equal(progress.calculationPolicy.completionPercentagePublished, false);
});

test('audio copy and runtime expose the real 4 plus 12 queue and startup failures', async () => {
  const [html, playlist, runtime] = await Promise.all([
    read('audio-library.html'),
    read('data/read-aloud-playlist.json').then(JSON.parse),
    read('assets/js/media-session-player.js')
  ]);
  assert.equal(playlist.length, 16);
  assert.equal(playlist.filter(item => item.kind === 'Thiruppugazh').length, 12);
  assert.match(html, /four mantra or Kavasam records plus twelve Thiruppugazh songs/);
  assert.match(runtime, /Starting Tamil read-aloud/);
  assert.match(runtime, /did not start/);
  assert.match(runtime, /startupTimer/);
});

test('reveal content is visible until JavaScript enhancement is ready', async () => {
  const css = await read('assets/css/premium-platform-2026.css');
  const runtime = await read('assets/js/premium-home-runtime.mjs');
  const platform = await read('assets/js/premium-platform-2026.mjs');
  assert.match(css, /\[data-reveal\]\{opacity:1;transform:none/);
  assert.match(css, /data-reveal-ready="true"/);
  assert.match(runtime, /node\.dataset\.visible='true'/);
  assert.match(platform, /'\[data-reveal\],\.premium-card/);
});

test('reader experience is loaded as a module on every consumer page', async () => {
  for (const page of [
    'thiruppugazh.html',
    'murugan-mantras.html',
    'sloka-library.html'
  ]) {
    const html = await read(page);
    assert.match(
      html,
      /<script type="module" src="assets\/js\/reader-experience\.js"><\/script>/
    );
  }
});
