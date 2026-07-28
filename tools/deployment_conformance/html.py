"""HTML consumer deployment checks."""

from __future__ import annotations

from pathlib import Path
import re

from .models import Finding


def validate_consumer_html(
    root: Path,
    consumers: dict[str, str],
) -> list[Finding]:
    findings: list[Finding] = []
    for route, module in consumers.items():
        relative = route.lstrip("/")
        path = root / relative
        if not path.is_file():
            findings.append(Finding(relative, "consumer-page", "Consumer page is missing."))
            continue
        source = path.read_text(encoding="utf-8")
        module_path = re.escape(module.lstrip("/"))
        token = re.compile(
            rf"""<script\b(?=[^>]*\btype=['"]module['"])(?=[^>]*\bsrc=['"]{module_path}(?:\?[^'"]+)?['"])[^>]*>""",
            re.IGNORECASE,
        )
        if not token.search(source):
            findings.append(Finding(relative, "consumer-module", f"Expected module reference is missing: {module}"))
        if 'data-release="237"' in source:
            findings.append(Finding(relative, "stale-page-release", "Consumer page still declares Release 237."))
    return findings
