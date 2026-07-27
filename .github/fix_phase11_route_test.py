#!/usr/bin/env python3
from pathlib import Path

path = Path('tests/js/effective-route-registry.test.mjs')
text = path.read_text(encoding='utf-8')
old = 'effective.effectiveRegistryDiagnostics.appliedCount'
new = 'effective.effectiveRegistryDiagnostics.appliedOverrideCount'
if old in text:
    path.write_text(text.replace(old, new, 1), encoding='utf-8')
    print('Updated applied override diagnostic assertion')
elif new in text:
    print('Assertion already current')
else:
    raise SystemExit('Expected diagnostic assertion marker is unavailable')
