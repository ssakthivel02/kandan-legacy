#!/usr/bin/env python3
"""Validate the Phase 6-10 premium rollout in the built GitHub Pages artifact.

This deterministic gate verifies the scoped page classes, CSS/JavaScript references,
inline Vel-Mayil emblem, language/AI controls and the resilient Discovery fallback.
It does not claim formal WCAG certification or field Core Web Vitals.
"""

from __future__ import annotations

from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
import json
import re

ROOT = Path('.').resolve()
SITE = ROOT / '_site'
REPORT = ROOT / 'reports/phase-11-premium-rollout'
GLOBAL_CSS = 'assets/css/global-experience-2026.css'
GLOBAL_JS = 'assets/js/global-experience-2026.js'

PHASES = {
    6: {
        'class': 'osb-phase6',
        'css': 'assets/css/phase6-experience-2026.css',
        'pages': [
            'index.html', 'discovery.html', 'language-access.html',
            'murugan-timeline.html', 'platform-hub.html', 'sloka-library.html',
            'temples.html', 'thiruppugazh.html', 'murugan-song-library.html',
            'gallery.html', 'audio-library.html', 'explore.html', 'ai-search.html',
            'apps.html', 'about.html', 'help-centre.html', 'privacy.html',
            'sources.html'
        ],
    },
    7: {
        'class': 'osb-phase7',
        'css': 'assets/css/phase7-sacred-places-2026.css',
        'pages': [
            'temple-encyclopedia.html', 'arupadai-veedu.html', 'temples.html',
            'temple-detail.html', 'festivals.html', 'festival-calendar.html',
            'murugan-map.html', 'pilgrimage-planner.html'
        ],
    },
    8: {
        'class': 'osb-phase8',
        'css': 'assets/css/phase8-personal-tools-2026.css',
        'pages': [
            'reading-workspace.html', 'personal-library.html',
            'reading-notes.html', 'devotional-collections.html',
            'devotional-practice-planner.html', 'personal-data.html'
        ],
    },
    9: {
        'class': 'osb-phase9',
        'css': 'assets/css/phase9-learning-knowledge-2026.css',
        'pages': [
            'learning-center.html', 'learning-paths.html', 'learning-quiz.html',
            'devotional-dictionary.html', 'research-library.html',
            'knowledge-graph-phase-4.html', 'cross-references.html'
        ],
    },
    10: {
        'class': 'osb-phase10',
        'css': 'assets/css/phase10-trust-quality-2026.css',
        'pages': [
            'site-directory.html', 'content-status.html', 'accessibility.html',
            'route-recovery.html', 'content-completeness.html',
            'platform-roadmap.html', 'help-centre.html', 'privacy.html',
            'sources.html', 'about.html'
        ],
    },
}


class PremiumPageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.body_classes: set[str] = set()
        self.ids: list[str] = []
        self.main_count = 0
        self.title_count = 0
        self.stylesheets: list[str] = []
        self.scripts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {str(key).lower(): str(value or '') for key, value in attrs}
        tag = tag.lower()
        if tag == 'body':
            self.body_classes.update(values.get('class', '').split())
        elif tag == 'main':
            self.main_count += 1
        elif tag == 'title':
            self.title_count += 1
        elif tag == 'link' and 'stylesheet' in values.get('rel', '').lower().split():
            self.stylesheets.append(values.get('href', '').split('?', 1)[0])
        elif tag == 'script' and values.get('src'):
            self.scripts.append(values['src'].split('?', 1)[0])
        if values.get('id'):
            self.ids.append(values['id'])


def read_text(path: Path) -> str:
    return path.read_text(encoding='utf-8', errors='ignore')


def validate_page(
    relative: str,
    phase_number: int,
    phase_class: str,
    phase_css: str,
) -> tuple[list[str], list[str], dict[str, object]]:
    errors: list[str] = []
    warnings: list[str] = []
    path = SITE / relative
    if not path.is_file():
        return [f'Phase {phase_number}: missing page {relative}'], warnings, {}

    parser = PremiumPageParser()
    text = read_text(path)
    try:
        parser.feed(text)
    except Exception as error:
        errors.append(f'{relative}: HTML parser error: {error}')

    if phase_class not in parser.body_classes:
        errors.append(f'{relative}: missing body class {phase_class}')
    if parser.stylesheets.count(phase_css) != 1:
        errors.append(
            f'{relative}: expected one {phase_css} reference, found '
            f'{parser.stylesheets.count(phase_css)}'
        )
    if parser.stylesheets.count(GLOBAL_CSS) != 1:
        errors.append(
            f'{relative}: expected one global CSS reference, found '
            f'{parser.stylesheets.count(GLOBAL_CSS)}'
        )
    if parser.scripts.count(GLOBAL_JS) != 1:
        errors.append(
            f'{relative}: expected one global JS reference, found '
            f'{parser.scripts.count(GLOBAL_JS)}'
        )
    if parser.main_count != 1:
        errors.append(f'{relative}: expected one main element, found {parser.main_count}')
    if parser.title_count != 1:
        errors.append(f'{relative}: expected one title element, found {parser.title_count}')

    duplicates = [item for item, count in Counter(parser.ids).items() if count > 1]
    if duplicates:
        errors.append(f'{relative}: duplicate IDs {duplicates[:20]}')

    if 'osb-ai-fab' in text and relative == 'ai-search.html':
        warnings.append('ai-search.html contains an AI FAB marker although the runtime should suppress it')

    return errors, warnings, {
        'phase': phase_number,
        'bodyClasses': sorted(parser.body_classes),
        'mainCount': parser.main_count,
        'titleCount': parser.title_count,
        'duplicateIds': len(duplicates),
    }


def main() -> None:
    errors: list[str] = []
    warnings: list[str] = []
    page_results: dict[str, dict[str, object]] = {}

    if not SITE.is_dir():
        raise SystemExit('_site does not exist; run build_public_site.py first')

    required_assets = [GLOBAL_CSS, GLOBAL_JS] + [
        str(config['css']) for config in PHASES.values()
    ]
    for relative in required_assets:
        if not (SITE / relative).is_file():
            errors.append(f'Missing premium rollout asset: {relative}')

    global_js_path = SITE / GLOBAL_JS
    if global_js_path.is_file():
        global_js_text = read_text(global_js_path)
        for marker in (
            '/assets/images/brand-vel-mayil.svg',
            "m.dataset.brandFallback='true'",
            'data-osb-language-control',
            'osb-ai-fab',
            'osb-global-experience',
        ):
            if marker not in global_js_text:
                errors.append(f'{GLOBAL_JS}: missing runtime marker {marker}')

    global_css_path = SITE / GLOBAL_CSS
    if global_css_path.is_file():
        global_css_text = read_text(global_css_path)
        for marker in (
            '.osb-brand-symbol',
            '.osb-brand-symbol svg',
            '.osb-language-panel',
            '.osb-ai-fab',
            'prefers-reduced-motion',
        ):
            if marker not in global_css_text:
                errors.append(f'{GLOBAL_CSS}: missing style marker {marker}')

    for phase_number, config in PHASES.items():
        phase_class = str(config['class'])
        phase_css = str(config['css'])
        for relative in config['pages']:
            page_errors, page_warnings, details = validate_page(
                relative,
                phase_number,
                phase_class,
                phase_css,
            )
            errors.extend(page_errors)
            warnings.extend(page_warnings)
            page_results.setdefault(relative, {})[f'phase{phase_number}'] = details

    discovery = SITE / 'discovery.html'
    if discovery.is_file():
        discovery_text = read_text(discovery)
        fallback_markers = (
            'network-independent Discovery fallback',
            'built-in-static-fallback',
            'discovery-resilience-2026.mjs',
        )
        if not any(marker in discovery_text for marker in fallback_markers):
            errors.append('discovery.html: resilient fallback marker is missing')

    unique_pages = sorted({page for config in PHASES.values() for page in config['pages']})
    summary = {
        'release': 251,
        'gate': 'Phase 11 premium rollout validation',
        'formalWcagCertificationClaimed': False,
        'fieldCoreWebVitalsClaimed': False,
        'phaseCount': len(PHASES),
        'uniquePagesChecked': len(unique_pages),
        'phasePageAssertions': sum(len(config['pages']) for config in PHASES.values()),
        'errors': len(errors),
        'warnings': len(warnings),
        'passed': not errors,
        'pageResults': page_results,
    }

    REPORT.mkdir(parents=True, exist_ok=True)
    (REPORT / 'validation-result.json').write_text(
        json.dumps(
            {**summary, 'errorDetails': errors, 'warningDetails': warnings},
            ensure_ascii=False,
            indent=2,
        ) + '\n',
        encoding='utf-8',
    )

    lines = [
        '# Phase 11 — Premium Rollout Production Gate',
        '',
        f'- Passed: **{summary["passed"]}**',
        f'- Phases validated: **{summary["phaseCount"]}**',
        f'- Unique pages checked: **{summary["uniquePagesChecked"]}**',
        f'- Phase/page assertions: **{summary["phasePageAssertions"]}**',
        f'- Errors: **{summary["errors"]}**',
        f'- Warnings: **{summary["warnings"]}**',
        '',
        'This gate validates static production structure. It does not claim formal WCAG certification or field Core Web Vitals.',
    ]
    if errors:
        lines += ['', '## Errors', ''] + [f'- {item}' for item in errors[:250]]
    if warnings:
        lines += ['', '## Warnings', ''] + [f'- {item}' for item in warnings[:250]]
    (REPORT / 'SUMMARY.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    if errors:
        raise SystemExit(f'Phase 11 validation failed with {len(errors)} error(s)')


if __name__ == '__main__':
    main()
