#!/usr/bin/env python3
from pathlib import Path
import re

TARGETS = [
    "reading-workspace.html",
    "personal-library.html",
    "reading-notes.html",
    "devotional-collections.html",
    "devotional-practice-planner.html",
    "personal-data.html",
]
BODY_CLASS = "osb-phase8"
GLOBAL_CSS = "assets/css/global-experience-2026.css?v=20260726-4"
GLOBAL_JS = "assets/js/global-experience-2026.js?v=20260726-4"
PHASE_CSS = "assets/css/phase8-personal-tools-2026.css?v=20260727-1"


def ensure_body_class(html: str) -> str:
    match = re.search(r"<body(?P<attrs>[^>]*)>", html, flags=re.I)
    if not match:
        raise ValueError("missing body element")
    attrs = match.group("attrs")
    class_match = re.search(r'class\s*=\s*(["\'])(.*?)\1', attrs, flags=re.I | re.S)
    if class_match:
        classes = class_match.group(2).split()
        if BODY_CLASS not in classes:
            classes.append(BODY_CLASS)
            attrs = attrs[:class_match.start()] + f'class="{" ".join(classes)}"' + attrs[class_match.end():]
    else:
        attrs += f' class="{BODY_CLASS}"'
    return html[:match.start()] + f"<body{attrs}>" + html[match.end():]


def ensure_asset(html: str, asset: str, tag: str, close_tag: str) -> str:
    base = asset.split("?", 1)[0]
    pattern = re.compile(re.escape(base) + r'(?:\?v=[^"\'>\s]+)?', flags=re.I)
    if pattern.search(html):
        return pattern.sub(asset, html)
    if close_tag not in html:
        raise ValueError(f"missing {close_tag}")
    return html.replace(close_tag, f"  {tag.format(asset=asset)}\n{close_tag}", 1)


changed, skipped = [], []
for relative in TARGETS:
    path = Path(relative)
    if not path.exists():
        skipped.append(relative)
        continue
    original = path.read_text(encoding="utf-8")
    updated = ensure_body_class(original)
    updated = ensure_asset(updated, GLOBAL_CSS, '<link rel="stylesheet" href="{asset}">', "</head>")
    updated = ensure_asset(updated, PHASE_CSS, '<link rel="stylesheet" href="{asset}">', "</head>")
    updated = ensure_asset(updated, GLOBAL_JS, '<script defer src="{asset}"></script>', "</body>")
    if updated != original:
        path.write_text(updated, encoding="utf-8")
        changed.append(relative)

if not changed:
    raise SystemExit("Phase 8 made no changes")

for relative in changed:
    text = Path(relative).read_text(encoding="utf-8")
    assert text.count(PHASE_CSS) == 1, relative
    assert text.count(GLOBAL_CSS) == 1, relative
    assert text.count(GLOBAL_JS) == 1, relative
    assert BODY_CLASS in text, relative

print(f"Phase 8 changed {len(changed)} files")
for item in changed:
    print(f"CHANGED {item}")
for item in skipped:
    print(f"SKIPPED {item}")
