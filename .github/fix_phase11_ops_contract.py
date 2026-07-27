#!/usr/bin/env python3
from pathlib import Path
import json

catalog_path = Path('data/operations/check-catalog.json')
catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
updated_ids = set()
for check in catalog.get('checks', []):
    if check.get('id') == 'deployment-conformance-A02-release':
        check.setdefault('expectation', {})['value'] = 251
        updated_ids.add(check['id'])
    elif check.get('id') == 'deployment-conformance-A03-cache':
        check.setdefault('expectation', {})['value'] = '251'
        updated_ids.add(check['id'])
if updated_ids != {
    'deployment-conformance-A02-release',
    'deployment-conformance-A03-cache',
}:
    raise SystemExit(f'Unable to reconcile operations catalogue: {sorted(updated_ids)}')
catalog_path.write_text(
    json.dumps(catalog, ensure_ascii=False, separators=(',', ':')) + '\n',
    encoding='utf-8',
)

sw_path = Path('service-worker.js')
sw = sw_path.read_text(encoding='utf-8')
marker = "'/content-status.html'"
required = [
    "'/operations-observability.html'",
    "'/operations-observability-noscript.html'",
]
if marker not in sw:
    raise SystemExit('Service-worker insertion marker unavailable')
for item in required:
    if item not in sw:
        sw = sw.replace(marker, item + ',' + marker, 1)
sw_path.write_text(sw, encoding='utf-8')
print('Reconciled operations catalogue and observability precache routes')
