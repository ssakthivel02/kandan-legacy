#!/usr/bin/env python3
"""Phase H: build a deterministic GitHub Pages artifact without deleting repository files.

The repository remains the complete source/evidence store. The `_site` artifact contains
root public HTML routes, governed nested routes, sitemap routes, runtime essentials, and
all statically discoverable local dependencies. Internal reports, tools, tests and Git
metadata are never copied into the Pages artifact unless a public file explicitly and
validly depends on them, which is treated as an error by validation.
"""

from __future__ import annotations

from collections import deque
from pathlib import Path
from urllib.parse import unquote, urlsplit
import hashlib
import json
import re
import shutil
import xml.etree.ElementTree as ET

ROOT = Path('.').resolve()
OUT = ROOT / '_site'
REPORT = ROOT / 'reports/phase-h-deployment'

EXCLUDED_PREFIXES = (
    '.git/', '.github/', 'tools/', 'tests/', 'fixtures/', 'reports/',
    'artifacts/', 'docs/', 'roadmap/', '.venv/', 'venv/', 'node_modules/',
    '_site/', 'release-evidence/', 'production-evidence/'
)
SPECIAL_ROOT_FILES = {
    'CNAME', '.nojekyll', 'robots.txt', 'service-worker.js', 'sw.js',
    'manifest.json', 'site.webmanifest', 'browserconfig.xml',
    'sitemap.xml', 'sitemap-songs.xml', 'sitemap-platform.xml',
    'favicon.svg', 'favicon.ico', 'deployment-info.json'
}
ROOT_PUBLIC_SUFFIXES = {
    '.html', '.htm', '.xml', '.webmanifest', '.svg', '.ico'
}
TEXT_SUFFIXES = {
    '.html', '.htm', '.css', '.js', '.mjs', '.cjs', '.json', '.xml',
    '.webmanifest', '.txt', '.csv', '.md', '.yml', '.yaml'
}
REFERENCE_SUFFIXES = (
    'html?', 'css', 'js', 'mjs', 'cjs', 'json', 'xml', 'webmanifest',
    'png', 'jpe?g', 'webp', 'gif', 'svg', 'ico', 'mp3', 'm4a', 'ogg',
    'wav', 'aac', 'flac', 'pdf', 'txt', 'csv', 'woff2?', 'ttf', 'map'
)
REFERENCE_RE = re.compile(
    rf'''(?:href|src|poster|action|data-src|data-href)\s*=\s*["']([^"']+)["']|'''
    rf'''url\(\s*["']?([^\)"']+)|'''
    rf'''(?:import\s*(?:[^"']*?from\s*)?|fetch\s*\(|new\s+URL\s*\(|["'])'''
    rf'''((?:/|\.{1,2}/|[a-zA-Z0-9_-]+/)[^"'\s?#)]*\.(?:{'|'.join(REFERENCE_SUFFIXES)})(?:[?#][^"')\s]*)?)''',
    re.IGNORECASE,
)
MAX_TEXT_BYTES = 12 * 1024 * 1024


def rel(path: Path) -> str:
    return path.resolve().relative_to(ROOT).as_posix()


def excluded(key: str) -> bool:
    clean = key.lstrip('./')
    return any(
        clean == prefix.rstrip('/') or clean.startswith(prefix)
        for prefix in EXCLUDED_PREFIXES
    )


def load_json(relative: str, default):
    path = ROOT / relative
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError):
        return default


def route_to_key(value: object) -> str:
    raw = str(value or '').strip()
    if not raw:
        return ''
    parsed = urlsplit(raw)
    path = unquote(parsed.path or '')
    if not path or path == '/':
        return 'index.html'
    clean = path.lstrip('/')
    if clean.endswith('/'):
        clean += 'index.html'
    elif not Path(clean).suffix:
        clean += '.html'
    return clean


def add_if_public(key: str, selected: set[str], queue: deque[str]) -> bool:
    clean = key.replace('\\', '/').lstrip('/')
    if not clean or excluded(clean):
        return False
    path = ROOT / clean
    try:
        path.resolve().relative_to(ROOT)
    except (OSError, ValueError):
        return False
    if not path.is_file() or clean in selected:
        return False
    selected.add(clean)
    queue.append(clean)
    return True


def candidate_keys(source_key: str, raw: str) -> list[str]:
    value = str(raw or '').strip()
    if not value or value.startswith(
        ('#', 'mailto:', 'tel:', 'javascript:', 'data:', '//')
    ):
        return []
    parsed = urlsplit(value)
    if parsed.scheme or parsed.netloc:
        return []
    path_text = unquote(parsed.path or '')
    if not path_text:
        return []
    source = ROOT / source_key
    target = (
        ROOT / path_text.lstrip('/')
        if path_text.startswith('/')
        else source.parent / path_text
    )
    try:
        target = target.resolve()
        target.relative_to(ROOT)
    except (OSError, ValueError):
        return []
    candidates = [rel(target)]
    if path_text.endswith('/'):
        candidates.append((Path(rel(target)) / 'index.html').as_posix())
    elif not target.suffix:
        candidates.extend([
            f'{rel(target)}.html',
            (Path(rel(target)) / 'index.html').as_posix(),
        ])
    return list(dict.fromkeys(candidates))


def extract_references(text: str) -> list[str]:
    references: list[str] = []
    for match in REFERENCE_RE.finditer(text):
        for value in match.groups():
            if value:
                references.append(value.strip())
                break
    return references


def initial_selection() -> tuple[set[str], deque[str]]:
    selected: set[str] = set()
    queue: deque[str] = deque()

    # Preserve all root HTML routes, including legacy release showcase URLs.
    for path in ROOT.iterdir():
        if not path.is_file():
            continue
        if (
            path.name in SPECIAL_ROOT_FILES or
            path.suffix.lower() in ROOT_PUBLIC_SUFFIXES
        ):
            add_if_public(path.name, selected, queue)

    # Add all governed historical/addition/override routes and source data paths.
    for registry_path, array_key in (
        ('data/site-routes.json', 'routes'),
        ('data/site-routes-additions.json', 'records'),
        ('data/site-routes-effective-overrides.json', 'records'),
    ):
        payload = load_json(registry_path, {})
        records = payload.get(array_key, []) if isinstance(payload, dict) else []
        for record in records:
            add_if_public(route_to_key(record.get('path')), selected, queue)
            source_data = route_to_key(record.get('sourceDataPath'))
            if source_data:
                add_if_public(source_data, selected, queue)

    # Add all explicit sitemap routes.
    for sitemap_name in (
        'sitemap.xml', 'sitemap-songs.xml', 'sitemap-platform.xml'
    ):
        sitemap = ROOT / sitemap_name
        if not sitemap.is_file():
            continue
        try:
            root = ET.fromstring(
                sitemap.read_text(encoding='utf-8', errors='ignore')
            )
        except (OSError, ET.ParseError):
            continue
        for node in root.findall('.//{*}loc'):
            add_if_public(route_to_key(node.text), selected, queue)

    # Essential data dependencies that are loaded dynamically.
    for key in (
        'data/site-routes.json',
        'data/site-routes-additions.json',
        'data/site-routes-effective-overrides.json',
        'data/route-aliases.json',
        'data/route-recovery-summary.json',
        'data/content-completeness.json',
        'data/platform-capability-matrix.json',
        'data/murugan-song-library.json',
        'data/devotional-listening-paths.json',
        'data/song-source-requests.json',
        'data/mantra-practice.json',
        'data/daily-darshan.json',
        'data/responsive-homepage-images.json',
        'data/reading-notes.json',
        'data/reading-workspace.json',
        'data/effective-route-registry-runtime.json',
        'data/temple-directory.json',
        'data/phase19-content-reliability.json',
        'data/phase20-content-expansion.json',
        'data/thiruppugazh-corpus-progress.json',
        'data/temples/index.json',
        'data/temples/regional/index.json',
        'data/murugan-mantras.json',
        'data/search-index.json',
        'data/thiruppugazh.json',
        'data/read-aloud-playlist.json',
        'data/audio-catalog.json',
        'schemas/murugan-song-record.schema.json',
        'schemas/devotional-listening-path.schema.json',
        'schemas/song-source-request.schema.json',
        'schemas/mantra-practice.schema.json',
        'schemas/daily-darshan.schema.json',
        'schemas/responsive-homepage-images.schema.json',
        'schemas/temple-directory.schema.json',
        'schemas/thiruppugazh-corpus-progress.schema.json',
        'assets/css/content-reliability-2026.css',
        'assets/js/content-reliability-2026.mjs',
        'assets/css/mantra-practice-2026.css',
        'assets/js/mantra-practice-2026.mjs',
        'assets/js/mantra-practice-core.mjs',
        'assets/css/daily-darshan-2026.css',
        'assets/js/daily-darshan-2026.mjs',
        'assets/js/daily-darshan-core.mjs',
        'assets/css/phase18-responsive-imagery-2026.css',
        'assets/images/homepage-2026/murugan-family-hero-desktop.webp',
        'assets/images/homepage-2026/murugan-family-hero-mobile.webp',
        'assets/images/homepage-2026/song-library.webp',
        'assets/images/homepage-2026/thiruppugazh.webp',
        'assets/images/homepage-2026/sacred-temples.webp',
        'assets/images/homepage-2026/slokas-prayers.webp',
        'assets/images/homepage-2026/palani-pilgrimage.webp',
        'assets/images/homepage-2026/devotional-listening.webp',
        'assets/images/homepage-2026/daily-darshan.webp',
        'assets/images/homepage-2026/mantra-practice.webp',
        'icons/icon-192.png',
        'icons/icon-512.png',
    ):
        add_if_public(key, selected, queue)

    regional = load_json('data/temples/regional/index.json', {})
    for record in regional.get('records', []):
        temple_id = str(record.get('id') or '').strip()
        if temple_id:
            add_if_public(
                f'data/temples/regional/{temple_id}.json',
                selected,
                queue
            )

    return selected, queue


def discover_dependencies(
    selected: set[str],
    queue: deque[str]
) -> list[dict[str, str]]:
    unresolved: list[dict[str, str]] = []
    while queue:
        source_key = queue.popleft()
        source = ROOT / source_key
        if source.suffix.lower() not in TEXT_SUFFIXES:
            continue
        try:
            if source.stat().st_size > MAX_TEXT_BYTES:
                continue
            text = source.read_text(encoding='utf-8', errors='ignore')
        except OSError:
            continue
        for reference in extract_references(text):
            candidates = candidate_keys(source_key, reference)
            existing = [
                key for key in candidates
                if (ROOT / key).is_file() and not excluded(key)
            ]
            if existing:
                add_if_public(existing[0], selected, queue)
            elif candidates:
                unresolved.append({
                    'source': source_key,
                    'reference': reference,
                    'candidate': candidates[0]
                })
    return unresolved


def copy_selected(selected: set[str]) -> tuple[int, int]:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    files = 0
    bytes_total = 0
    for key in sorted(selected):
        source = ROOT / key
        if not source.is_file():
            continue
        destination = OUT / key
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
        files += 1
        bytes_total += source.stat().st_size
    (OUT / '.nojekyll').write_text('', encoding='utf-8')
    return files, bytes_total


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    selected, queue = initial_selection()
    unresolved = discover_dependencies(selected, queue)
    file_count, bytes_total = copy_selected(selected)

    critical = [
        'index.html', '404.html', 'offline.html',
        'murugan-song-library.html', 'devotional-listening.html',
        'mantra-practice.html',
        'daily.html',
        'song-source-requests.html', 'platform-hub.html',
        'platform-roadmap.html', 'route-recovery.html',
        'content-completeness.html', 'site-directory.html', 'ai-search.html',
        'thiruppugazh.html', 'temples.html', 'audio-library.html',
        'service-worker.js', 'manifest.json', 'robots.txt', 'sitemap.xml',
        'sitemap-platform.xml', 'CNAME'
    ]
    missing_critical = [
        key for key in critical if not (OUT / key).is_file()
    ]

    manifest = {
        'release': 246,
        'generatedBy': 'tools/phase-c-h/build_public_site.py',
        'strategy': (
            'root-public-routes-plus-governed-routes-plus-'
            'recursive-local-dependencies'
        ),
        'repositoryFilesDeleted': 0,
        'selectedFiles': file_count,
        'selectedBytes': bytes_total,
        'missingCriticalFiles': missing_critical,
        'unresolvedDependencyReferences': len(unresolved),
        'criticalFiles': {
            key: {
                'present': (OUT / key).is_file(),
                'sha256': (
                    sha256_file(OUT / key)
                    if (OUT / key).is_file()
                    else None
                )
            }
            for key in critical
        },
        'excludedSourcePrefixes': list(EXCLUDED_PREFIXES),
        'limitations': [
            'The Pages artifact is a deployment product, not a deletion list.',
            'Release evidence and internal tooling stay in the repository.',
            'Dynamic dependencies must be declared through routes, data records or static paths.',
        ]
    }
    (OUT / 'deployment-manifest.json').write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + '\n',
        encoding='utf-8'
    )
    (OUT / 'deployment-info.json').write_text(
        json.dumps({
            'status': 'ok' if not missing_critical else 'blocked',
            'service': 'OmSaravanaBhava GitHub Pages',
            'environment': 'production',
            'version': '246-phase-c-h',
            'files': file_count,
            'buildStrategy': manifest['strategy']
        }, ensure_ascii=False, indent=2) + '\n',
        encoding='utf-8'
    )

    REPORT.mkdir(parents=True, exist_ok=True)
    (REPORT / 'unresolved-deployment-dependencies.json').write_text(
        json.dumps(
            unresolved[:5000],
            ensure_ascii=False,
            indent=2
        ) + '\n',
        encoding='utf-8'
    )
    (REPORT / 'SUMMARY.md').write_text(
        '\n'.join([
            '# Phase H — Deterministic Public Build',
            '',
            '- Repository files deleted: **0**',
            f'- Files selected for Pages artifact: **{file_count}**',
            f'- Artifact bytes before compression: **{bytes_total}**',
            f'- Missing critical files: **{len(missing_critical)}**',
            (
                '- Unresolved statically discoverable dependencies: '
                f'**{len(unresolved)}**'
            ),
            '',
            'The build preserves root public routes and recursively copies their actual local dependencies. Internal evidence remains in GitHub but outside the public artifact.',
        ]) + '\n',
        encoding='utf-8'
    )

    if missing_critical:
        raise SystemExit(
            f'Missing critical public files: {missing_critical}'
        )
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
