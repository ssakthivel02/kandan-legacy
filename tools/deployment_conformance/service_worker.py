"""Service-worker deployment checks."""

from __future__ import annotations

import re

from .models import Finding

RELEASE_PATTERN = re.compile(r"const RELEASE = ['\"](?P<value>\d+)['\"]")


def validate_service_worker(
    source: str,
    contract: dict,
    path: str = "service-worker.js",
) -> list[Finding]:
    findings: list[Finding] = []
    match = RELEASE_PATTERN.search(source)
    expected = str(contract.get("expectedCacheRelease", ""))
    if not match or match.group("value") != expected:
        findings.append(Finding(path, "cache-release", f"Service worker cache release must be {expected}."))
    for url in contract.get("requiredPrecacheUrls", []):
        versioned_url = re.compile(
            rf"""(?P<quote>['"]){re.escape(url)}(?:\?[^'"]+)?(?P=quote)"""
        )
        if not versioned_url.search(source):
            findings.append(Finding(path, "required-precache", f"Required precache URL is missing: {url}"))
    for url in contract.get("forbiddenPrecacheUrls", []):
        if f'"{url}"' in source or f"'{url}'" in source:
            findings.append(Finding(path, "forbidden-precache", f"Retired precache URL remains: {url}"))
    return findings
