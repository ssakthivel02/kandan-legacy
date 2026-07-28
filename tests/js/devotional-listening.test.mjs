import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read = path => readFile(new URL('../../' + path, import.meta.url), 'utf8');
const json = async path => JSON.parse(await read(path));

test('devotional listening publishes six bounded Tamil-first paths', async () => {
  const [html, data] = await Promise.all([
    read('devotional-listening.html'),
    json('data/devotional-listening-paths.json')
  ]);
  assert.equal(data.release, 'phase15');
  assert.equal(data.paths.length, 6);
  assert.match(data.audioBoundary, /device text-to-speech/i);
  assert.match(html, /data-listening-app/);
  assert.match(html, /not prophecy/i);
  assert.match(html, /stored only on this device/i);
  assert.doesNotMatch(JSON.stringify(data), /miracle|prediction|guarantee/i);
});

test('every listening track resolves to the governed read-aloud playlist', async () => {
  const [data, playlist] = await Promise.all([
    json('data/devotional-listening-paths.json'),
    json('data/read-aloud-playlist.json')
  ]);
  const governed = new Set(playlist.map(item => item.id));
  const referenced = data.paths.flatMap(path => path.steps.map(step => step.trackId).filter(Boolean));
  assert.ok(referenced.length >= 10);
  for (const id of referenced) assert.ok(governed.has(id), `missing governed playlist record: ${id}`);
});

test('listening runtime is local, accessible and lifecycle-safe', async () => {
  const script = await read('assets/js/devotional-listening-2026.js');
  const css = await read('assets/css/devotional-listening-2026.css');
  assert.match(script, /SpeechSynthesisUtterance/);
  assert.match(script, /ta-IN/);
  assert.match(script, /osb-phase15-private-practice-note/);
  assert.doesNotMatch(script, /https?:\/\//);
  assert.ok(
    script.indexOf('const stopSpeech =') < script.indexOf("addEventListener('pagehide', stopSpeech"),
    'stopSpeech must be initialized before lifecycle registration'
  );
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /forced-colors:active/);
});
