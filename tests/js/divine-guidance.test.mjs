import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read = path => readFile(new URL('../../' + path, import.meta.url), 'utf8');

test('homepage exposes bounded interactive Murugan guidance', async () => {
  const html = await read('index.html');
  assert.match(html, /data-divine-guidance/);
  assert.match(html, /Devotional reflection—not prophecy/);
  assert.match(html, /data-guidance-intent="courage"/);
  assert.match(html, /divine-guidance-2026\.js/);
  assert.match(html, /devotional-listening\.html/);
});

test('guidance read-aloud is local and Tamil', async () => {
  const script = await read('assets/js/divine-guidance-2026.js');
  assert.match(script, /SpeechSynthesisUtterance/);
  assert.match(script, /ta-IN/);
  assert.doesNotMatch(script, /fetch\(|https?:\/\//);
});

test('guidance motion respects reduced-motion preference', async () => {
  const css = await read('assets/css/divine-guidance-2026.css');
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test('song library exposes governed full songs and one active reader', async () => {
  const html = await read('murugan-song-library.html');
  const script = await read('assets/js/murugan-song-library.js');
  const builder = await read('tools/phase-c-h/build_public_site.py');
  const validator = await read('tools/phase-c-h/validate_public_site.py');
  assert.match(html, /id="verifiedSongGrid"/);
  assert.match(html, /12 complete Thiruppugazh songs/);
  assert.match(html, /murugan-song-library\.js\?v=20260728-3/);
  assert.match(script, /data\/thiruppugazh\.json/);
  assert.match(script, /data\/read-aloud-playlist\.json/);
  assert.match(builder, /data\/read-aloud-playlist\.json/);
  assert.match(validator, /data\/read-aloud-playlist\.json/);
  assert.match(script, /speechSynthesis\.cancel/);
  assert.match(script, /osb-prayer-queue/);
  assert.match(html, /song-source-requests\.html/);
  assert.ok(
    script.indexOf("const stopSpeech =") < script.indexOf("addEventListener('pagehide', stopSpeech"),
    'stopSpeech must be initialized before the pagehide listener is registered'
  );
});
