# Kandan Legacy Migration Contract

Target legacy site: `kandan.omsaravanabhava.org`
Source product: OmSaravanaBhava

## Non-negotiable rules
- Preserve devotional content and repository history; migration is additive and reversible.
- Do not delete verified Murugan literature, temple, pilgrimage, song, mantra, source or legal content as part of rebranding.
- Do not commit credentials, private user data, signing material or secrets.
- Existing repository defects must not be hidden by a rename: manifest, service worker/offline behaviour, sitemap coverage, client-generated detail routes and placeholder temple-history content require remediation evidence.
- Preserve source/provenance and responsible non-guarantee disclaimers.
- Use this migration branch and PR workflow; do not rewrite `main` history.
- DNS/Cloudflare cutover occurs only after repository validation.

## Migration phases
1. Legacy domain and Kandan branding baseline.
2. Repair known manifest/PWA/sitemap/placeholder defects.
3. SEO/legal/content brand sweep.
4. Build, route, offline and content-integrity validation.
5. DNS cutover and live smoke test.
6. Keep the future OmSaravanaBhava hi-tech flagship separate.
