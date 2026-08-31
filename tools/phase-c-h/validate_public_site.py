#!/usr/bin/env python3
"""Validate the Phase H `_site` artifact before GitHub Pages deployment.

This deterministic static gate checks critical-route semantics, required assets/data,
local references, JSON/XML syntax and deployment boundaries. It does not claim formal
WCAG certification or field Core Web Vitals.
"""

from __future__ import annotations

from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import json
import re
import xml.etree.ElementTree as ET

ROOT = Path('.').resolve()
SITE = ROOT / '_site'
REPORT = ROOT / 'reports/phase-h-validation'

CRITICAL_HTML = [
    'index.html', '404.html', 'offline.html', 'murugan-song-library.html',
    'devotional-listening.html', 'mantra-practice.html',
    'daily.html',
    'song-source-requests.html',
    'platform-hub.html', 'platform-roadmap.html', 'route-recovery.html',
    'content-completeness.html', 'site-directory.html', 'ai-search.html',
    'thiruppugazh.html', 'temples.html', 'audio-library.html'
]
REQUIRED_FILES = CRITICAL_HTML + [
    'service-worker.js', 'manifest.json', 'robots.txt', 'sitemap.xml',
    'sitemap-songs.xml', 'sitemap-platform.xml', 'CNAME',
    'assets/css/release-246.css', 'assets/css/premium-platform-2026.css',
    'assets/js/release-246.js', 'assets/js/premium-platform-2026.mjs',
    'assets/js/effective-route-registry.mjs',
    'assets/js/murugan-song-library.js',
    'assets/css/devotional-listening-2026.css',
    'assets/css/song-source-requests-2026.css',
    'assets/js/devotional-listening-2026.js',
    'assets/css/mantra-practice-2026.css',
    'assets/js/mantra-practice-2026.mjs',
    'assets/js/mantra-practice-core.mjs',
    'assets/css/daily-darshan-2026.css',
    'assets/css/phase18-responsive-imagery-2026.css',
    'assets/js/daily-darshan-2026.mjs',
    'assets/js/daily-darshan-core.mjs',
    'assets/js/song-source-requests-2026.js',
    'assets/js/platform-hub-2026.mjs',
    'assets/js/platform-roadmap-2026.mjs',
    'assets/js/route-recovery-2026.mjs',
    'assets/js/content-completeness-2026.mjs',
    'data/site-routes.json', 'data/site-routes-additions.json',
    'data/site-routes-effective-overrides.json', 'data/route-aliases.json',
    'data/route-recovery-summary.json', 'data/content-completeness.json',
    'data/platform-capability-matrix.json',
    'data/murugan-song-library.json', 'data/devotional-listening-paths.json',
    'data/song-source-requests.json', 'data/mantra-practice.json',
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
    'data/murugan-mantras.json', 'data/search-index.json',
    'data/thiruppugazh.json', 'data/read-aloud-playlist.json',
    'data/audio-catalog.json',
    'schemas/murugan-song-record.schema.json',
    'schemas/devotional-listening-path.schema.json',
    'schemas/song-source-request.schema.json',
    'schemas/mantra-practice.schema.json', 'deployment-manifest.json'
    ,'schemas/daily-darshan.schema.json',
    'schemas/responsive-homepage-images.schema.json',
    'schemas/temple-directory.schema.json',
    'schemas/thiruppugazh-corpus-progress.schema.json',
    'assets/css/content-reliability-2026.css',
    'assets/js/content-reliability-2026.mjs',
    'assets/images/homepage-2026/murugan-family-hero-desktop.webp',
    'assets/images/homepage-2026/murugan-family-hero-mobile.webp',
    'assets/images/homepage-2026/song-library.webp',
    'assets/images/homepage-2026/thiruppugazh.webp',
    'assets/images/homepage-2026/sacred-temples.webp',
    'assets/images/homepage-2026/slokas-prayers.webp',
    'assets/images/homepage-2026/palani-pilgrimage.webp',
    'assets/images/homepage-2026/devotional-listening.webp',
    'assets/images/homepage-2026/daily-darshan.webp',
    'assets/images/homepage-2026/mantra-practice.webp'
]
REFERENCE_RE = re.compile(
    r'''(?:href|src|poster|action|data-src|data-href)\s*=\s*["']([^"']+)["']''',
    re.IGNORECASE
)
PLACEHOLDER_LINK_RE = re.compile(
    r'''href\s*=\s*["']#["']''',
    re.IGNORECASE
)


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.lang = ''
        self.title = ''
        self._in_title = False
        self.viewport = False
        self.canonical = ''
        self.description = ''
        self.main_count = 0
        self.h1_count = 0
        self.ids: list[str] = []
        self.images: list[dict[str, str]] = []
        self._interactive: list[dict[str, object]] = []
        self.unnamed_links = 0
        self.unnamed_buttons = 0

    def handle_starttag(
        self,
        tag: str,
        attrs: list[tuple[str, str | None]]
    ) -> None:
        values = {str(key).lower(): str(value or '') for key, value in attrs}
        tag = tag.lower()
        if tag == 'html':
            self.lang = values.get('lang', '')
        elif tag == 'title':
            self._in_title = True
        elif tag == 'meta':
            name = values.get('name', '').lower()
            if name == 'viewport' and values.get('content'):
                self.viewport = True
            elif name == 'description':
                self.description = values.get('content', '')
        elif (
            tag == 'link' and
            'canonical' in values.get('rel', '').lower().split()
        ):
            self.canonical = values.get('href', '')
        elif tag == 'main':
            self.main_count += 1
        elif tag == 'h1':
            self.h1_count += 1
        elif tag == 'img':
            self.images.append(values)

        if values.get('id'):
            self.ids.append(values['id'])
        if tag in {'a', 'button'}:
            self._interactive.append({
                'tag': tag,
                'named': bool(values.get('aria-label') or values.get('title'))
            })

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.title += data
        if data.strip():
            for item in self._interactive:
                item['named'] = True

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if tag == 'title':
            self._in_title = False
        if tag in {'a', 'button'}:
            for index in range(len(self._interactive) - 1, -1, -1):
                item = self._interactive[index]
                if item['tag'] != tag:
                    continue
                self._interactive.pop(index)
                if not item['named']:
                    if tag == 'a':
                        self.unnamed_links += 1
                    else:
                        self.unnamed_buttons += 1
                break


def read_text(path: Path) -> str:
    return path.read_text(encoding='utf-8', errors='ignore')


def resolve_reference(source: Path, raw: str) -> Path | None:
    value = raw.strip()
    if not value or value.startswith(
        ('#', 'mailto:', 'tel:', 'javascript:', 'data:', '//')
    ):
        return None
    parsed = urlsplit(value)
    if parsed.scheme or parsed.netloc:
        return None
    path_text = unquote(parsed.path or '')
    if not path_text:
        return None
    target = (
        SITE / path_text.lstrip('/')
        if path_text.startswith('/')
        else source.parent / path_text
    ).resolve()
    try:
        target.relative_to(SITE.resolve())
    except ValueError:
        return None
    if path_text.endswith('/'):
        target = target / 'index.html'
    elif not target.suffix:
        html = target.with_suffix('.html')
        index = target / 'index.html'
        if html.is_file():
            target = html
        elif index.is_file():
            target = index
    return target


def validate_page(key: str) -> tuple[list[str], list[str], dict[str, object]]:
    errors: list[str] = []
    warnings: list[str] = []
    path = SITE / key
    text = read_text(path)
    parser = PageParser()
    try:
        parser.feed(text)
    except Exception as error:
        errors.append(f'{key}: HTML parser error: {error}')

    if not parser.lang:
        errors.append(f'{key}: missing html lang')
    if not parser.title.strip():
        errors.append(f'{key}: missing title')
    if not parser.viewport:
        errors.append(f'{key}: missing viewport meta')
    if not parser.description.strip():
        warnings.append(f'{key}: missing meta description')
    if key not in {'404.html', 'offline.html'} and not parser.canonical:
        errors.append(f'{key}: missing canonical link')
    if parser.main_count != 1:
        errors.append(
            f'{key}: expected exactly one main element, found '
            f'{parser.main_count}'
        )
    if parser.h1_count != 1:
        errors.append(
            f'{key}: expected exactly one h1, found {parser.h1_count}'
        )

    duplicate_ids = [
        item for item, count in Counter(parser.ids).items() if count > 1
    ]
    if duplicate_ids:
        errors.append(f'{key}: duplicate IDs: {duplicate_ids[:20]}')
    if parser.unnamed_links or parser.unnamed_buttons:
        errors.append(
            f'{key}: unnamed links={parser.unnamed_links}, '
            f'buttons={parser.unnamed_buttons}'
        )

    for image in parser.images:
        if 'alt' not in image:
            errors.append(
                f'{key}: image missing alt: '
                f'{image.get("src", "unknown")[:160]}'
            )
        if image.get('loading') == 'lazy' and not image.get('src'):
            errors.append(f'{key}: lazy image missing src')

    broken = []
    for match in REFERENCE_RE.finditer(text):
        reference = match.group(1)
        target = resolve_reference(path, reference)
        if target is not None and not target.is_file():
            broken.append(reference)
    if broken:
        errors.append(
            f'{key}: {len(broken)} broken local references: {broken[:20]}'
        )

    if PLACEHOLDER_LINK_RE.search(text):
        warnings.append(f'{key}: contains href="#" placeholder link')
    if any(
        marker in text.lower()
        for marker in ('lorem ipsum', 'todo: replace', 'dummy content')
    ):
        errors.append(f'{key}: contains prohibited placeholder marker')

    return errors, warnings, {
        'lang': parser.lang,
        'title': parser.title.strip(),
        'mainCount': parser.main_count,
        'h1Count': parser.h1_count,
        'imageCount': len(parser.images),
        'brokenReferences': len(broken),
    }


def main() -> None:
    errors: list[str] = []
    warnings: list[str] = []
    page_results: dict[str, object] = {}

    if not SITE.is_dir():
        raise SystemExit(
            '_site does not exist; run build_public_site.py first'
        )

    missing = [key for key in REQUIRED_FILES if not (SITE / key).is_file()]
    errors.extend(f'Missing required public file: {key}' for key in missing)

    for key in CRITICAL_HTML:
        if not (SITE / key).is_file():
            continue
        page_errors, page_warnings, details = validate_page(key)
        errors.extend(page_errors)
        warnings.extend(page_warnings)
        page_results[key] = details

    json_checked = 0
    for path in SITE.rglob('*.json'):
        try:
            json.loads(read_text(path))
            json_checked += 1
        except json.JSONDecodeError as error:
            errors.append(
                f'{path.relative_to(SITE)}: invalid JSON: {error}'
            )

    xml_checked = 0
    for key in (
        'sitemap.xml', 'sitemap-songs.xml', 'sitemap-platform.xml',
        'browserconfig.xml'
    ):
        path = SITE / key
        if not path.is_file():
            continue
        try:
            ET.fromstring(read_text(path))
            xml_checked += 1
        except ET.ParseError as error:
            errors.append(f'{key}: invalid XML: {error}')

    try:
        deployment = json.loads(
            read_text(SITE / 'deployment-manifest.json')
        )
        if deployment.get('repositoryFilesDeleted') != 0:
            errors.append(
                'deployment-manifest.json: repositoryFilesDeleted must be zero'
            )
        if deployment.get('missingCriticalFiles'):
            errors.append(
                'deployment-manifest.json reports missing critical files'
            )
    except (OSError, json.JSONDecodeError) as error:
        errors.append(f'deployment-manifest.json unavailable: {error}')

    service_worker = SITE / 'service-worker.js'
    if service_worker.is_file():
        text = read_text(service_worker)
        for required in (
            'murugan-song-library.html', 'platform-hub.html',
            'devotional-listening.html', 'song-source-requests.html',
            'mantra-practice.html',
            'daily.html',
            'platform-roadmap.html', 'route-recovery.html',
            'content-completeness.html', 'premium-platform-2026'
            ,'content-reliability-2026',
            'data/reading-workspace.json',
            'data/effective-route-registry-runtime.json',
            'data/temple-directory.json'
        ):
            if required not in text:
                warnings.append(
                    'service-worker.js does not explicitly precache '
                    f'{required}'
                )

    cname = (
        (SITE / 'CNAME').read_text(
            encoding='utf-8', errors='ignore'
        ).strip()
        if (SITE / 'CNAME').is_file()
        else ''
    )
    expected_cname = 'kandan.omsaravanabhava.org'
    if cname != expected_cname:
        errors.append(
            f'CNAME must be {expected_cname}, found {cname!r}'
        )

    summary = {
        'release': 246,
        'gate': 'Phase H static production validation',
        'formalWcagCertificationClaimed': False,
        'fieldCoreWebVitalsClaimed': False,
        'criticalPagesChecked': len(page_results),
        'jsonFilesChecked': json_checked,
        'xmlFilesChecked': xml_checked,
        'errors': len(errors),
        'warnings': len(warnings),
        'passed': not errors,
        'pageResults': page_results,
    }
    REPORT.mkdir(parents=True, exist_ok=True)
    (REPORT / 'validation-result.json').write_text(
        json.dumps(
            {
                **summary,
                'errorDetails': errors,
                'warningDetails': warnings
            },
            ensure_ascii=False,
            indent=2
        ) + '\n',
        encoding='utf-8'
    )
    lines = [
        '# Phase H — Static Production Validation',
        '',
        f'- Passed: **{summary["passed"]}**',
        f'- Critical pages checked: **{len(page_results)}**',
        f'- JSON files checked: **{json_checked}**',
        f'- XML files checked: **{xml_checked}**',
        f'- Errors: **{len(errors)}**',
        f'- Warnings: **{len(warnings)}**',
        '',
        'This static gate does not claim formal WCAG certification or field Core Web Vitals. Those require additional automated and real-user measurement.',
    ]
    if errors:
        lines += ['', '## Errors', ''] + [
            f'- {item}' for item in errors[:200]
        ]
    if warnings:
        lines += ['', '## Warnings', ''] + [
            f'- {item}' for item in warnings[:200]
        ]
    (REPORT / 'SUMMARY.md').write_text(
        '\n'.join(lines) + '\n',
        encoding='utf-8'
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if errors:
        raise SystemExit(
            f'Phase H validation failed with {len(errors)} error(s)'
        )


if __name__ == '__main__':
    main()
