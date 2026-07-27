import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clearEffectiveRouteRegistryCache,
  composeEffectiveRegistry,
  createHistoricalFallback,
  loadEffectiveRouteRegistry,
  normaliseRoutePath,
  validateEffectiveOverrides,
  validateHistoricalRegistry
} from '../../assets/js/effective-route-registry.mjs';

const historical = {
  release: 228,
  routes: [
    {
      path: '/literature/a.html',
      titleEn: 'A',
      category: 'Literature',
      status: 'published',
      summary: 'Historical summary'
    },
    {
      path: '/temples/b.html',
      titleEn: 'B',
      category: 'Temples',
      status: 'published',
      summary: 'Temple'
    }
  ]
};

const overrides = {
  release: 234,
  generated: '2026-07-16',
  recordCount: 1,
  records: [
    {
      path: '/literature/a.html',
      status: 'source-register',
      summary: 'Canonical summary',
      readingEligible: false,
      publicationStatusPrevious: 'published'
    }
  ]
};

test('same-origin paths normalise to pathname', () => {
  assert.equal(
    normaliseRoutePath('https://omsaravanabhava.org/a.html?x=1#y'),
    '/a.html'
  );
  assert.equal(
    normaliseRoutePath('https://example.com/a.html'),
    ''
  );
});

test('historical and override validators accept canonical fixtures', () => {
  assert.deepEqual(validateHistoricalRegistry(historical), []);
  assert.deepEqual(validateEffectiveOverrides(overrides), []);
});

test('composition applies exact-path override and preserves metadata', () => {
  const effective = composeEffectiveRegistry(historical, overrides);
  assert.equal(effective.effectiveRegistryMode, 'overrides-and-append-only-additions');
  assert.equal(effective.effectiveRegistryDiagnostics.appliedOverrideCount, 1);
  assert.equal(effective.routes[0].status, 'source-register');
  assert.equal(effective.routes[0].summary, 'Canonical summary');
  assert.equal(effective.routes[0].category, 'Literature');
  assert.equal(effective.routes[0].readingEligible, false);
  assert.equal(effective.routes[0].effectiveOverrideApplied, true);
  assert.equal(effective.routes[1].status, 'published');
});

test('unmatched overrides are reported in deterministic order', () => {
  const payload = {
    release: 234,
    recordCount: 2,
    records: [
      {path: '/z.html', status: 'navigation'},
      {path: '/a.html', status: 'navigation'}
    ]
  };
  const result = composeEffectiveRegistry(
    {release: 228, routes: []},
    payload
  );
  assert.deepEqual(
    result.effectiveRegistryDiagnostics.unmatchedOverrides,
    ['/a.html', '/z.html']
  );
});

test('historical fallback is explicit and preserves routes', () => {
  const fallback = createHistoricalFallback(
    historical,
    new Error('override unavailable')
  );
  assert.equal(fallback.effectiveRegistryMode, 'historical-fallback');
  assert.equal(fallback.routes.length, 2);
  assert.match(
    fallback.effectiveRegistryDiagnostics.warning,
    /override unavailable/
  );
});

test('loader composes explicit registry with mocked fetch', async () => {
  clearEffectiveRouteRegistryCache();
  const fetcher = async path => ({
    ok: true,
    status: 200,
    json: async () => path.includes('effective-overrides')
      ? overrides
      : path.includes('site-routes-additions')
        ? {release: 246, generated: '2026-07-17', recordCount: 0, records: []}
        : historical
  });
  const registry = await loadEffectiveRouteRegistry({
    fetcher,
    cache: false
  });
  assert.equal(registry.routes[0].status, 'source-register');
});

test('loader falls back when override request fails', async () => {
  clearEffectiveRouteRegistryCache();
  const fetcher = async path => {
    if (path.includes('effective-overrides')) {
      return {ok: false, status: 503, json: async () => ({})};
    }
    return {ok: true, status: 200, json: async () => historical};
  };
  const registry = await loadEffectiveRouteRegistry({
    fetcher,
    cache: false
  });
  assert.equal(registry.effectiveRegistryMode, 'historical-fallback');
});

test('strict loader rejects override failure', async () => {
  clearEffectiveRouteRegistryCache();
  const fetcher = async path => {
    if (path.includes('effective-overrides')) {
      return {ok: false, status: 500, json: async () => ({})};
    }
    return {ok: true, status: 200, json: async () => historical};
  };
  await assert.rejects(
    loadEffectiveRouteRegistry({
      fetcher,
      strict: true,
      cache: false
    }),
    /HTTP 500/
  );
});
