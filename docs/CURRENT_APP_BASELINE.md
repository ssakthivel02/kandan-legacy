# Saravana Bhava Android App — Current Approved Baseline

Last reviewed: 28 July 2026

## Identity lock

- App: **Saravana Bhava – Murugan Bhakti**
- Package: `com.saravanabhava.murugan`
- App version: `1.1.0`
- Android versionCode: `37`
- Expo SDK family: `56`
- Expo project ID: `566820f6-a72c-491a-9fb4-f4eb238bcaa6`

## Approved data baseline

- Devotional content records: `1,373`
- Murugan temple records: `371`
- Original automated test suites: `5`
- Original automated tests: `51`

## Source-validation evidence

The approved source baseline has reported the following results:

- Expo Doctor: `21/21`
- TypeScript: exit code `0`
- ESLint: exit code `0`
- Jest: `51/51` tests passed
- Android Expo JavaScript export: passed

These results establish a source-validation baseline. They do **not** establish physical-device, Android-signing, Google Play internal-testing or production-release readiness.

## Remaining release gates

1. Confirm access to the existing Expo project.
2. Confirm the existing Android upload credential.
3. Build a signed preview APK from the approved source.
4. Complete physical Android regression testing.
5. Build the production AAB from the same validated source.
6. Upload to Google Play Internal Testing.
7. Verify the Play-distributed build.
8. Promote only after evidence-based approval.

## Prohibited recovery shortcuts

Do not:

- change the package name to bypass an account problem
- create a second EAS project for the existing Play listing
- generate a new production keystore without confirming the existing upload key
- replace Expo SDK 56 during release recovery
- merge a damaged Manus workspace into the approved baseline
- treat an Expo JavaScript export as an APK or AAB
- claim production readiness before device and Play-distribution verification

## Public information pages

- App information: `https://omsaravanabhava.org/android-app.html`
- Privacy: `https://omsaravanabhava.org/privacy.html`
- Local data deletion: `https://omsaravanabhava.org/data-deletion.html`
- Support: `https://omsaravanabhava.org/support.html`
