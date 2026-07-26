#!/usr/bin/env python3
from pathlib import Path
import re

TARGETS = [
    "temple-encyclopedia.html",
    "arupadai-veedu.html",
    "temples.html",
    "temple-detail.html",
    "festivals.html",
    "festival-calendar.html",
    "murugan-map.html",
    "pilgrimage-planner.html",
]
BODY_CLASS = "osb-phase7"
GLOBAL_CSS = "assets/css/global-experience-2026.css?v=20260726-4"
GLOBAL_JS = "assets/js/global-experience-2026.js?v=20260726-4"
PHASE_CSS = "assets/css/phase7-sacred-places-2026.css?v=20260727-1"


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
            replacement = f'class="{" ".join(classes)}"'
            attrs = attrs[:class_match.start()] + replacement + attrs[class_match.end():]
    else:
        attrs += f' class="{BODY_CLASS}"'
    replacement = f"<body{attrs}>"
    return html[:match.start()] + replacement + html[match.end():]


def ensure_stylesheet(html: str, href: str) -> str:
    base = href.split("?", 1)[0]
    pattern = re.compile(re.escape(base) + r'(?:\?v=[^"\'>\s]+)?', flags=re.I)
    if pattern.search(html):
        return pattern.sub(href, html)
    if "</head>" not in html:
        raise ValueError("missing head close")
    return html.replace("</head>", f'  <link rel="stylesheet" href="{href}">\n</head>', 1)


def ensure_script(html: str, src: str) -> str:
    base = src.split("?", 1)[0]
    pattern = re.compile(re.escape(base) + r'(?:\?v=[^"\'>\s]+)?', flags=re.I)
    if pattern.search(html):
        return pattern.sub(src, html)
    if "</body>" not in html:
        raise ValueError("missing body close")
    return html.replace("</body>", f'  <script defer src="{src}"></script>\n</body>', 1)


changed = []
skipped = []
for relative in TARGETS:
    path = Path(relative)
    if not path.exists():
        skipped.append(relative)
        continue
    original = path.read_text(encoding="utf-8")
    updated = ensure_body_class(original)
    updated = ensure_stylesheet(updated, GLOBAL_CSS)
    updated = ensure_stylesheet(updated, PHASE_CSS)
    updated = ensure_script(updated, GLOBAL_JS)
    if updated != original:
        path.write_text(updated, encoding="utf-8")
        changed.append(relative)

if not changed:
    raise SystemExit("Phase 7 made no changes")

for relative in changed:
    text = Path(relative).read_text(encoding="utf-8")
    assert text.count(PHASE_CSS) == 1, relative
    assert text.count(GLOBAL_CSS) == 1, relative
    assert text.count(GLOBAL_JS) == 1, relative
    assert BODY_CLASS in text, relative

print(f"Phase 7 changed {len(changed)} files")
for item in changed:
    print(f"CHANGED {item}")
for item in skipped:
    print(f"SKIPPED {item}")
