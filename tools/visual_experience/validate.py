from __future__ import annotations

import argparse
import json
from pathlib import Path


def validate(root: Path) -> dict:
    policy = json.loads(
        (root / "policies/visual-experience.json").read_text(encoding="utf-8")
    )
    contract = json.loads(
        (root / "data/visual-experience.json").read_text(encoding="utf-8")
    )
    findings: list[dict[str, str]] = []

    for path in (
        policy["requiredStyles"]
        + policy["requiredModules"]
        + policy["requiredAssets"]
    ):
        if not (root / path).is_file():
            findings.append({"rule": "missing", "path": path})

    index = (root / "index.html").read_text(encoding="utf-8")
    current_homepage_tokens = (
        'class="hero"',
        'class="menu-toggle"',
        'data-header',
        'assets/js/premium-home-runtime.mjs',
        'assets/css/global-experience-2026.css',
        'assets/js/global-experience-2026.js',
    )
    for token in current_homepage_tokens:
        if token not in index:
            findings.append({"rule": "homepage-token", "path": token})

    motion = (root / "assets/css/premium-motion.css").read_text(encoding="utf-8")
    if "prefers-reduced-motion:reduce" not in motion:
        findings.append({"rule": "reduced-motion"})

    global_experience = (
        root / "assets/css/global-experience-2026.css"
    ).read_text(encoding="utf-8")
    if "prefers-reduced-motion:reduce" not in global_experience:
        findings.append({"rule": "global-reduced-motion"})
    if "(pointer:coarse)" not in global_experience:
        findings.append({"rule": "coarse-pointer-boundary"})

    if contract.get("release") != 245:
        findings.append({"rule": "release"})

    if any(
        token in index
        for token in ("googletagmanager", "gtag(", "facebook.net")
    ):
        findings.append({"rule": "tracking"})

    return {
        "release": 245,
        "contractMode": "historical-visual-contract-current-homepage-bindings",
        "status": "PASS" if not findings else "FAIL",
        "findingCount": len(findings),
        "findings": findings,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    args = parser.parse_args()
    report = validate(Path(args.root).resolve())
    print(json.dumps(report, indent=2))
    raise SystemExit(0 if report["status"] == "PASS" else 1)


if __name__ == "__main__":
    main()
