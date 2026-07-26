# Phase 8 — Personal Reading and Browser-Local Tools

## Scope

- Premium treatment for personal reading, notes, collections, devotional planning and personal-data routes.
- Browser-local privacy boundaries preserved.
- Existing routes, IDs, scripts, localStorage behaviour, JSON, service-worker files and workflows preserved.

## Applied pages

- `reading-workspace.html`
- `personal-library.html`
- `reading-notes.html`
- `devotional-collections.html`
- `devotional-practice-planner.html`
- `personal-data.html`

## Validation

- Scoped body class: `osb-phase8`
- Scoped stylesheet: `assets/css/phase8-personal-tools-2026.css?v=20260727-1`
- Global CSS and JavaScript references present exactly once.
- Global JavaScript passed `node --check`.
- `git diff --check` passed.
- Temporary deployment automation removed before review.
