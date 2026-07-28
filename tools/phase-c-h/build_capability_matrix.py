#!/usr/bin/env python3
"""Audit planned OmSaravanaBhava capabilities against actual connected routes.

The matrix answers a different question from file reachability: did an intended user
capability receive a real page, governed registry entry, visible hub link and deployment
path? It does not generate content or delete files.
"""

from __future__ import annotations

from pathlib import Path
import json
import re

ROOT = Path('.').resolve()
OUT = ROOT / 'data/platform-capability-matrix.json'
REPORT = ROOT / 'reports/phase-c-h-capability-matrix'

CAPABILITIES = [
    ('devotional-home', 'Devotional cinematic home', ['index.html'], 'Experience'),
    ('daily-darshan', 'Daily governed Murugan practice', ['daily.html'], 'Devotional'),
    ('song-library', 'Murugan Song Library', ['murugan-song-library.html'], 'Devotional'),
    ('thiruppugazh-reader', 'Thiruppugazh reader and discovery', ['thiruppugazh.html'], 'Devotional'),
    ('kavasam-prayers', 'Kavasam, slokas and prayers', ['sloka-library.html'], 'Devotional'),
    ('classical-literature', 'Classical Murugan literature', ['literature/thirumurugatruppadai.html', 'research-library.html'], 'Literature'),
    ('arupadai-veedu', 'Arupadai Veedu visual journey', ['temples.html', 'arupadai-veedu.html'], 'Temples'),
    ('temple-encyclopedia', 'Temple encyclopedia and research', ['temple-encyclopedia.html'], 'Temples'),
    ('pilgrimage-maps', 'Pilgrimage planner, maps and travel guidance', ['pilgrimage-planner.html', 'murugan-map.html', 'temple-travel-guidance.html'], 'Temples'),
    ('festival-calendar', 'Festivals and calendar', ['festivals.html', 'festival-calendar.html'], 'Festivals'),
    ('panchangam-framework', 'Panchangam verification framework', ['panchangam-framework.html'], 'Festivals'),
    ('audio-rights', 'Rights-aware audio and device read-aloud', ['audio-library.html'], 'Audio'),
    ('media-gallery', 'Devotional gallery with provenance', ['gallery.html', 'media-gallery.html', 'visual-gallery.html'], 'Media'),
    ('local-search', 'Tamil-English local search', ['ai-search.html'], 'Search'),
    ('knowledge-graph', 'Knowledge graph and cross references', ['knowledge-graph.html', 'knowledge-graph-explorer.html', 'cross-references.html'], 'Knowledge'),
    ('timeline-stories', 'Murugan timeline and stories', ['murugan-timeline.html', 'murugan-timeline-v2.html'], 'Knowledge'),
    ('learning-centre', 'Learning, quizzes and family pathways', ['learning-center.html', 'learning-paths.html', 'learning-quiz.html'], 'Learning'),
    ('apps-downloads', 'Apps and downloads gateway', ['apps.html', 'downloads.html', 'app.html'], 'Product'),
    ('personal-library', 'Browser-local personal library', ['personal-library.html'], 'Personal'),
    ('reading-tools', 'Reading workspace, notes and print', ['reading-workspace.html', 'reading-notes.html', 'print-pdf.html'], 'Personal'),
    ('collections-planner', 'Collections and practice planner', ['devotional-collections.html', 'devotional-practice-planner.html'], 'Personal'),
    ('data-portability', 'Browser-local data export and restore', ['personal-data.html'], 'Personal'),
    ('accessibility', 'Accessibility preferences and statement', ['accessibility.html'], 'Governance'),
    ('offline-pwa', 'Offline and installable PWA', ['apps.html', 'offline.html', 'manifest.json', 'service-worker.js'], 'Platform'),
    ('source-governance', 'Sources and publication boundaries', ['sources.html', 'source-catalog.html', 'content-status.html'], 'Governance'),
    ('route-recovery', 'Route recovery and canonical aliases', ['route-recovery.html', '404.html'], 'Platform'),
    ('content-completeness', 'Content completeness and research queue', ['content-completeness.html'], 'Governance'),
    ('privacy-legal', 'Privacy, terms and legal boundaries', ['privacy.html', 'terms.html'], 'Governance'),
    ('about-contact', 'About and contact routes', ['about.html', 'contact.html'], 'Community'),
    ('faq-support', 'FAQ and support routes', ['faq.html', 'support.html', 'help.html'], 'Community'),
    ('operations-health', 'Operations and production health evidence', ['operations-observability.html', 'production-audit.html', 'maintenance.html'], 'Operations'),
    ('performance-quality', 'Performance, accessibility and regression gates', ['performance.html', 'production-audit.html', 'content-status.html'], 'Operations'),
    ('complete-directory', 'Complete governed route directory', ['site-directory.html', 'platform-hub.html'], 'Platform'),
]

VISIBLE_HUBS = [
    'index.html', 'platform-hub.html', 'site-directory.html',
    'murugan-song-library.html', 'explore.html', 'discovery.html'
]


def load_json(relative: str, default):
    try:
        return json.loads((ROOT / relative).read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError):
        return default


def route(path: str) -> str:
    return '/' if path == 'index.html' else '/' + path


def registry_paths() -> set[str]:
    output: set[str] = set()
    for filename, key in (
        ('data/site-routes.json', 'routes'),
        ('data/site-routes-additions.json', 'records'),
        ('data/site-routes-effective-overrides.json', 'records'),
    ):
        payload = load_json(filename, {})
        for item in payload.get(key, []) if isinstance(payload, dict) else []:
            value = str(item.get('path') or '').strip()
            if value:
                output.add(value if value.startswith('/') else '/' + value)
    return output


def hub_text() -> dict[str, str]:
    output = {}
    for filename in VISIBLE_HUBS:
        path = ROOT / filename
        try:
            output[filename] = path.read_text(encoding='utf-8', errors='ignore')
        except OSError:
            output[filename] = ''
    return output


def main() -> None:
    governed = registry_paths()
    hubs = hub_text()
    records = []
    for capability_id, title, candidates, category in CAPABILITIES:
        existing = [candidate for candidate in candidates if (ROOT / candidate).is_file()]
        governed_candidates = [candidate for candidate in existing if route(candidate) in governed]
        visible = [
            hub for hub, text in hubs.items()
            if any(
                re.search(
                    rf'''(?:href|src)\s*=\s*["'][^"']*{re.escape(candidate)}(?:[?#][^"']*)?["']''',
                    text,
                    re.IGNORECASE
                )
                for candidate in existing
            )
        ]
        if existing and governed_candidates and visible:
            status = 'connected'
        elif existing and governed_candidates:
            status = 'governed-not-prominent'
        elif existing:
            status = 'exists-not-governed'
        else:
            status = 'missing-capability-route'
        records.append({
            'id': capability_id,
            'title': title,
            'category': category,
            'candidateRoutes': candidates,
            'existingFiles': existing,
            'governedFiles': governed_candidates,
            'visibleFromHubs': visible,
            'status': status,
            'nextAction': {
                'connected': 'Maintain validation, sources and user experience.',
                'governed-not-prominent': 'Add the capability to the most relevant purpose-led hub.',
                'exists-not-governed': 'Review content quality, then register the canonical route.',
                'missing-capability-route': 'Confirm whether this remains in scope; collect requirements and create a governed route only when useful.'
            }[status]
        })

    counts = {}
    for record in records:
        counts[record['status']] = counts.get(record['status'], 0) + 1
    missing = [record for record in records if record['status'] == 'missing-capability-route']
    ungoverned = [record for record in records if record['status'] == 'exists-not-governed']
    hidden = [record for record in records if record['status'] == 'governed-not-prominent']

    payload = {
        'release': 246,
        'generated': '2026-07-22',
        'purpose': 'planned-versus-connected-capability-audit',
        'safety': {'filesDeleted': 0, 'contentGenerated': 0},
        'capabilityCount': len(records),
        'statusCounts': counts,
        'records': records,
        'priorityQueues': {
            'missingCapabilityRoutes': [record['id'] for record in missing],
            'existingButUngoverned': [record['id'] for record in ungoverned],
            'governedButNotProminent': [record['id'] for record in hidden],
        },
        'principle': 'A capability is complete only when it has a useful page, a governed route, a visible purpose-led entry point and production validation.'
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    REPORT.mkdir(parents=True, exist_ok=True)
    lines = [
        '# Phase C-H — Planned vs Connected Capability Matrix',
        '',
        '- Repository files deleted: **0**',
        f'- Capabilities audited: **{len(records)}**',
    ]
    for status, count in sorted(counts.items()):
        lines.append(f'- **{status}:** {count}')
    lines += ['', '## Highest-priority queues', '']
    for label, queue in payload['priorityQueues'].items():
        lines.append(f'- **{label}:** {", ".join(queue) if queue else "None"}')
    lines += [
        '',
        'A file existing in GitHub is not the same as a finished capability. The route must be governed, visible from the correct hub and validated in production.',
    ]
    (REPORT / 'SUMMARY.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    (REPORT / 'research-and-design-queue.json').write_text(
        json.dumps({
            'missing': missing,
            'ungoverned': ungoverned,
            'notProminent': hidden
        }, ensure_ascii=False, indent=2) + '\n',
        encoding='utf-8'
    )
    print(json.dumps({'capabilities': len(records), 'counts': counts}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
