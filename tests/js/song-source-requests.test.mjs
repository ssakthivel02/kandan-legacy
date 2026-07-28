import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read = path => readFile(new URL('../../' + path, import.meta.url), 'utf8');
const json = async path => JSON.parse(await read(path));

test('missing-song queue contains identities only, never lyrics or recordings', async () => {
  const data = await json('data/song-source-requests.json');
  assert.equal(data.recordCount, 14);
  assert.equal(data.records.length, 14);
  assert.match(data.publicationBoundary, /not published lyrics/i);
  const serialized = JSON.stringify(data);
  assert.doesNotMatch(serialized, /speechText|lyricsText|audioUrl|mp3|youtube/i);
  assert.equal(new Set(data.records.map(item => item.id)).size, data.records.length);
  assert.ok(data.records.every(item => item.status.includes('needed')));
});

test('source-request experience is searchable, private and evidence-led', async () => {
  const [html, script] = await Promise.all([
    read('song-source-requests.html'),
    read('assets/js/song-source-requests-2026.js')
  ]);
  assert.match(html, /0 unverified lyrics published/);
  assert.match(html, /0 commercial recordings copied/);
  assert.match(script, /osb-phase15-song-source-priorities/);
  assert.match(script, /navigator\.clipboard/);
  assert.match(script, /new URLSearchParams\(location\.search\)/);
  assert.doesNotMatch(script, /XMLHttpRequest|sendBeacon|https?:\/\//);
});

test('AI-assisted search labels missing songs as source requests', async () => {
  const [html, script] = await Promise.all([
    read('ai-search.html'),
    read('assets/js/advanced-search.js')
  ]);
  assert.match(html, /AI-assisted local discovery/);
  assert.match(script, /data\/song-source-requests\.json/);
  assert.match(script, /Song Source Request/);
  assert.match(script, /no lyrics or recording are claimed/i);
});
