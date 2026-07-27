
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
const html=fs.readFileSync('operations-observability.html','utf8');
const app=fs.readFileSync('assets/js/operations-observability.mjs','utf8');
const data=fs.readFileSync('assets/js/operations-observability-data.mjs','utf8');
test('dashboard is noindex and accessible',()=>{assert.match(html,/noindex,nofollow/);assert.match(html,/skip-link/);assert.match(html,/aria-live="polite"/);assert.match(html,/<caption>/);});
test('dashboard has no analytics or browser storage writes',()=>{assert.doesNotMatch(app,/localStorage\.setItem|document\.cookie|gtag\(|analytics/i);assert.match(data,/credentials: 'omit'/);});
test('dashboard loads all operational contracts',()=>{for(const path of ['summary.json','route-health.json','pwa-health.json','deployment-attestation.json','check-catalog.json']) assert.match(data,new RegExp(path.replace('.','\.')));});
test('dashboard identifies current deployment and historical governance baseline',()=>{assert.match(html,/data-release="251"/);assert.match(html,/opsBaselineRelease/);assert.match(app,/assertAligned/);assert.doesNotMatch(app,/Release 244/);});
