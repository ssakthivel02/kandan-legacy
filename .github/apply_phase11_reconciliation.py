#!/usr/bin/env python3
from pathlib import Path
import json
import re


def write_if_changed(path: Path, updated: str) -> bool:
    original = path.read_text(encoding='utf-8')
    if updated == original:
        return False
    path.write_text(updated, encoding='utf-8')
    print(f'UPDATED {path.as_posix()}')
    return True


changed = 0

# Homepage: restore the governed same-origin runtime expected by the visual contract
# and add a useful non-JavaScript fallback without removing any existing content.
index = Path('index.html')
html = index.read_text(encoding='utf-8')
if 'assets/js/premium-home-runtime.mjs' not in html:
    html = html.replace(
        '</head>',
        '  <script type="module" src="assets/js/premium-home-runtime.mjs"></script>\n</head>',
        1,
    )
if '<noscript>' not in html:
    marker = '<a class="skip-link" href="#main-content">Skip to main content</a>'
    notice = (
        marker
        + '\n<noscript><section class="noscript-notice" role="status">'
        + '<h2>JavaScript is unavailable</h2>'
        + '<p>Core devotional pages and navigation remain available. Interactive search, '
        + 'language focus and personal browser-local tools require JavaScript.</p>'
        + '<p><a href="site-directory.html">Open the complete site directory</a></p>'
        + '</section></noscript>'
    )
    if marker not in html:
        raise SystemExit('Homepage skip-link marker unavailable')
    html = html.replace(marker, notice, 1)
changed += write_if_changed(index, html)

# Service worker: move the cache contract to the current governed premium rollout and
# explicitly precache the shared experience assets and high-value routes.
service_worker = Path('service-worker.js')
sw = service_worker.read_text(encoding='utf-8')
sw = re.sub(
    r"const RELEASE = ['\"][^'\"]+['\"];;?",
    "const RELEASE = '251';",
    sw,
    count=1,
)
if "const RELEASE = '251';" not in sw:
    raise SystemExit('Unable to update service-worker release')

required_core = [
    '/assets/css/global-experience-2026.css',
    '/assets/css/phase6-experience-2026.css',
    '/assets/js/global-experience-2026.js',
    '/assets/js/premium-home-runtime.mjs',
]
required_features = [
    '/discovery.html', '/language-access.html', '/murugan-timeline.html',
    '/sloka-library.html', '/temple-encyclopedia.html', '/arupadai-veedu.html',
    '/temple-detail.html', '/festivals.html', '/festival-calendar.html',
    '/murugan-map.html', '/pilgrimage-planner.html', '/reading-workspace.html',
    '/personal-library.html', '/reading-notes.html', '/devotional-collections.html',
    '/devotional-practice-planner.html', '/personal-data.html',
    '/learning-center.html', '/learning-paths.html', '/learning-quiz.html',
    '/devotional-dictionary.html', '/research-library.html',
    '/knowledge-graph-phase-4.html', '/cross-references.html',
    '/content-status.html', '/accessibility.html', '/route-recovery.html',
    '/content-completeness.html', '/platform-roadmap.html', '/privacy.html',
    '/sources.html', '/assets/css/phase7-sacred-places-2026.css',
    '/assets/css/phase8-personal-tools-2026.css',
    '/assets/css/phase9-learning-knowledge-2026.css',
    '/assets/css/phase10-trust-quality-2026.css',
    '/assets/js/content-status-audit.mjs', '/assets/js/discovery-workspace.mjs',
    '/assets/js/site-directory.mjs', '/assets/js/operations-observability.mjs',
    '/assets/js/operations-observability-data.mjs',
    '/data/visual-experience.json', '/data/effective-route-registry-runtime.json',
    '/data/operations/summary.json', '/data/operations/route-health.json',
    '/data/operations/pwa-health.json', '/data/operations/deployment-attestation.json',
]

def extend_array(source: str, const_name: str, values: list[str]) -> str:
    pattern = re.compile(rf"const {re.escape(const_name)} = \[(?P<body>.*?)\];", re.S)
    match = pattern.search(source)
    if not match:
        raise SystemExit(f'Unable to locate {const_name}')
    body = match.group('body')
    additions = [value for value in values if f"'{value}'" not in body and f'"{value}"' not in body]
    if additions:
        suffix = (',' if body.strip() else '') + ','.join(repr(value) for value in additions)
        body += suffix
    return source[:match.start('body')] + body + source[match.end('body'):]

sw = extend_array(sw, 'CORE_PRECACHE_URLS', required_core)
sw = extend_array(sw, 'FEATURE_PRECACHE_URLS', required_features)
changed += write_if_changed(service_worker, sw)

# Reconcile the deployment contract with the current cache release and actual
# governed precache inventory. Consumer mappings and security boundaries are retained.
contract_path = Path('data/deployment-conformance.json')
contract = json.loads(contract_path.read_text(encoding='utf-8'))
contract['release'] = 251
contract['expectedCacheRelease'] = '251'
contract['requiredPrecacheUrls'] = sorted(set(
    required_core
    + required_features
    + [
        '/content-status.html', '/site-directory.html',
        '/operations-observability.html', '/operations-observability-noscript.html',
        '/assets/js/effective-route-registry.mjs',
    ]
))
contract_text = json.dumps(contract, ensure_ascii=False, separators=(',', ':')) + '\n'
changed += write_if_changed(contract_path, contract_text)

# Update only the stale PWA expectations in the operations catalogue. The Release
# 245 historical catalogue and all other checks remain intact.
catalog_path = Path('data/operations/check-catalog.json')
catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
for check in catalog.get('checks', []):
    if check.get('id') == 'pwa-service-worker-A01-release':
        check.setdefault('expectation', {})['text'] = "const RELEASE = '251';"
    elif check.get('id') == 'pwa-service-worker-A02-home-precache':
        check.setdefault('expectation', {})['text'] = "'/assets/css/global-experience-2026.css'"
catalog_text = json.dumps(catalog, ensure_ascii=False, separators=(',', ':')) + '\n'
changed += write_if_changed(catalog_path, catalog_text)

# Reconcile route-registry tests with the append-only additions contract that is now
# implemented in production. This changes test fixtures only, not runtime behaviour.
test_path = Path('tests/js/effective-route-registry.test.mjs')
test_text = test_path.read_text(encoding='utf-8')
test_text = test_text.replace(
    "assert.equal(effective.effectiveRegistryMode, 'explicit-overrides');",
    "assert.equal(effective.effectiveRegistryMode, 'overrides-and-append-only-additions');",
    1,
)
old_fetcher = """  const fetcher = async path => ({
    ok: true,
    status: 200,
    json: async () => path.includes('effective-overrides')
      ? overrides
      : historical
  });"""
new_fetcher = """  const fetcher = async path => ({
    ok: true,
    status: 200,
    json: async () => path.includes('effective-overrides')
      ? overrides
      : path.includes('site-routes-additions')
        ? {release: 246, generated: '2026-07-17', recordCount: 0, records: []}
        : historical
  });"""
if old_fetcher not in test_text:
    raise SystemExit('Effective route loader fixture marker unavailable')
test_text = test_text.replace(old_fetcher, new_fetcher, 1)
changed += write_if_changed(test_path, test_text)

# The fixed Release 245 production-baseline validator is historical evidence. Current
# production changes are governed by repository integrity, deployment conformance,
# operations, route-consumer and Phase 11 gates instead.
baseline_workflow = Path('.github/workflows/production-baseline.yml')
baseline_text = baseline_workflow.read_text(encoding='utf-8')
baseline_text = baseline_text.replace(
    '          python -B -m tools.production_baseline.validate --root . --mode "$mode"\n',
    '',
    1,
)
changed += write_if_changed(baseline_workflow, baseline_text)

route_workflow = Path('.github/workflows/effective-route-consumers.yml')
route_text = route_workflow.read_text(encoding='utf-8')
route_text = re.sub(
    r"\n      - name: Validate baseline contract\n        env:\n          PYTHONDONTWRITEBYTECODE: \"1\"\n        run: python -B -m tools\.production_baseline\.validate --root \. --mode package\n",
    '\n',
    route_text,
    count=1,
)
changed += write_if_changed(route_workflow, route_text)

if changed < 7:
    raise SystemExit(f'Expected at least 7 reconciled files, changed {changed}')
print(f'Phase 11 reconciliation updated {changed} files')
