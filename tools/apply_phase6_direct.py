#!/usr/bin/env python3
"""Apply Om Saravana Bhava Phase 6 safely and idempotently.

This script is designed for GitHub Actions. It preserves existing routes and
behaviour while adding the shared premium experience to priority pages.
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GLOBAL_CSS = ROOT / "assets/css/global-experience-2026.css"
GLOBAL_JS = ROOT / "assets/js/global-experience-2026.js"
PHASE_CSS = ROOT / "assets/css/phase6-experience-2026.css"

TARGETS = [
    "index.html",
    "discovery.html",
    "language-access.html",
    "murugan-timeline.html",
    "platform-hub.html",
    "sloka-library.html",
    "temples.html",
    "thiruppugazh.html",
    "murugan-song-library.html",
    "gallery.html",
    "audio-library.html",
    "explore.html",
    "ai-search.html",
    "apps.html",
    "about.html",
    "help-centre.html",
    "privacy.html",
    "sources.html",
]

GLOBAL_CSS_HREF = "assets/css/global-experience-2026.css?v=20260726-4"
PHASE_CSS_HREF = "assets/css/phase6-experience-2026.css?v=20260726-1"
GLOBAL_JS_SRC = "assets/js/global-experience-2026.js?v=20260726-4"

INLINE_BRAND_SVG = r'''<svg viewBox="0 0 128 128" aria-hidden="true" focusable="false"><defs><linearGradient id="osbMedallion" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff9e8"/><stop offset="1" stop-color="#ffd77a"/></linearGradient><linearGradient id="osbVelGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3ad"/><stop offset=".45" stop-color="#f2bd54"/><stop offset="1" stop-color="#b86a08"/></linearGradient><linearGradient id="osbFeather" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#59e1ca"/><stop offset=".48" stop-color="#1686a5"/><stop offset="1" stop-color="#143a7d"/></linearGradient></defs><circle cx="64" cy="64" r="59" fill="url(#osbMedallion)" stroke="#d89618" stroke-width="6"/><circle cx="64" cy="64" r="50" fill="#fff8e7" stroke="#8f2436" stroke-opacity=".22" stroke-width="2"/><path d="M30 96C22 72 29 39 53 23C47 48 53 70 70 91C57 106 43 109 30 96Z" fill="none" stroke="url(#osbFeather)" stroke-width="10" stroke-linecap="round"/><path d="M34 91C41 69 48 50 57 35" fill="none" stroke="#0d566f" stroke-width="3" stroke-linecap="round"/><ellipse cx="49" cy="52" rx="15" ry="20" transform="rotate(-25 49 52)" fill="#176b82" stroke="#0d3f6d" stroke-width="3"/><ellipse cx="49" cy="52" rx="9" ry="12" transform="rotate(-25 49 52)" fill="#f2bd54"/><ellipse cx="49" cy="52" rx="4" ry="7" transform="rotate(-25 49 52)" fill="#8f2436"/><path d="M83 17C80 29 74 38 65 45L76 52L70 61L78 69L71 78L77 86L72 95L76 105H96L100 95L95 86L101 78L94 69L102 61L96 52L107 45C98 38 92 29 89 17Z" fill="url(#osbVelGold)" stroke="#8a4d05" stroke-width="3" stroke-linejoin="round"/><path d="M86 34V104" stroke="#8a4d05" stroke-width="4" stroke-linecap="round"/><path d="M75 105H98" stroke="#8f2436" stroke-width="6" stroke-linecap="round"/><circle cx="86" cy="24" r="4" fill="#fff8d5"/></svg>'''

PHASE6_CSS = r'''/* Om Saravana Bhava — Phase 6 global experience rollout */
body.osb-phase6{
  --osb-r6-radius:22px;
  --osb-r6-shadow:0 18px 50px rgba(20,12,8,.13);
  text-rendering:optimizeLegibility;
  -webkit-font-smoothing:antialiased;
}
body.osb-phase6 main{isolation:isolate}
body.osb-phase6 .hero,
body.osb-phase6 .page-hero,
body.osb-phase6 .premium-hero{position:relative;overflow:hidden}
body.osb-phase6 .card,
body.osb-phase6 article,
body.osb-phase6 .result-card,
body.osb-phase6 .tool-card{
  border-radius:var(--osb-r6-radius);
  transition:transform .24s ease,border-color .24s ease,box-shadow .24s ease;
}
body.osb-phase6 .card:hover,
body.osb-phase6 .result-card:hover,
body.osb-phase6 .tool-card:hover{
  transform:translateY(-3px);
  border-color:rgba(242,189,84,.42);
  box-shadow:var(--osb-r6-shadow);
}
body.osb-phase6 img{height:auto}
body.osb-phase6 button,
body.osb-phase6 .btn,
body.osb-phase6 [role="button"]{min-height:44px}
body.osb-phase6 :focus-visible{outline:3px solid #f2bd54;outline-offset:3px}
@media(prefers-reduced-motion:reduce){
  body.osb-phase6 *{scroll-behavior:auto!important;transition-duration:.01ms!important}
}
'''


def add_body_class(html: str, class_name: str) -> str:
    match = re.search(r"<body(?P<attrs>[^>]*)>", html, flags=re.I)
    if not match:
        raise ValueError("Missing <body> element")
    attrs = match.group("attrs")
    quoted = re.search(r'class\s*=\s*(["\'])(.*?)\1', attrs, flags=re.I | re.S)
    if quoted:
        current = quoted.group(2).split()
        if class_name not in current:
            current.append(class_name)
        replacement = f'class="{" ".join(current)}"'
        attrs = attrs[: quoted.start()] + replacement + attrs[quoted.end() :]
    else:
        attrs += f' class="{class_name}"'
    return html[: match.start()] + f"<body{attrs}>" + html[match.end() :]


def ensure_stylesheet(html: str, href: str) -> str:
    base = href.split("?", 1)[0]
    pattern = re.compile(re.escape(base) + r'(?:\?v=[^"\'>\s]+)?')
    if pattern.search(html):
        return pattern.sub(href, html)
    if "</head>" not in html.lower():
        raise ValueError("Missing </head>")
    return re.sub(
        r"</head>",
        f'  <link rel="stylesheet" href="{href}">\n</head>',
        html,
        count=1,
        flags=re.I,
    )


def ensure_script(html: str, src: str) -> str:
    base = src.split("?", 1)[0]
    pattern = re.compile(re.escape(base) + r'(?:\?v=[^"\'>\s]+)?')
    if pattern.search(html):
        return pattern.sub(src, html)
    if "</body>" not in html.lower():
        raise ValueError("Missing </body>")
    return re.sub(
        r"</body>",
        f'  <script defer src="{src}"></script>\n</body>',
        html,
        count=1,
        flags=re.I,
    )


def update_global_assets() -> None:
    css = GLOBAL_CSS.read_text(encoding="utf-8")
    svg_rule = ".osb-brand-symbol svg{width:100%;height:100%;display:block;overflow:visible}"
    if svg_rule not in css:
        css = css.rstrip() + "\n" + svg_rule + "\n"
    GLOBAL_CSS.write_text(css, encoding="utf-8", newline="\n")

    js = GLOBAL_JS.read_text(encoding="utf-8")
    brand_pattern = re.compile(r"const brand=\(\)=>\{.*?\};\s*const setMode=", re.S)
    replacement = (
        "const brand=()=>{const b=document.querySelector('.brand');if(!b)return;"
        "let m=b.querySelector('.brand-mark');"
        "if(!m){m=document.createElement('span');m.className='osb-brand-symbol';"
        "m.setAttribute('aria-hidden','true');b.prepend(m)}"
        "else{m.classList.add('osb-brand-symbol')}"
        f"m.innerHTML=`{INLINE_BRAND_SVG}`"
        "};const setMode="
    )
    if not brand_pattern.search(js):
        raise ValueError("Unable to locate the existing brand initializer")
    js = brand_pattern.sub(replacement, js, count=1)
    GLOBAL_JS.write_text(js, encoding="utf-8", newline="\n")


def main() -> None:
    update_global_assets()
    PHASE_CSS.parent.mkdir(parents=True, exist_ok=True)
    PHASE_CSS.write_text(PHASE6_CSS, encoding="utf-8", newline="\n")

    changed: list[str] = []
    skipped: list[str] = []
    for relative in TARGETS:
        path = ROOT / relative
        if not path.exists():
            skipped.append(relative)
            continue
        html = path.read_text(encoding="utf-8")
        html = add_body_class(html, "osb-phase6")
        html = ensure_stylesheet(html, GLOBAL_CSS_HREF)
        html = ensure_stylesheet(html, PHASE_CSS_HREF)
        html = ensure_script(html, GLOBAL_JS_SRC)
        path.write_text(html, encoding="utf-8", newline="\n")
        changed.append(relative)

    if not changed:
        raise RuntimeError("No Phase 6 target pages were found")

    print(f"Phase 6 applied to {len(changed)} pages")
    if skipped:
        print("Skipped optional missing pages:")
        for item in skipped:
            print(f"  - {item}")


if __name__ == "__main__":
    main()
