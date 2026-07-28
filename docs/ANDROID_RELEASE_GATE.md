# Android Release Gate — Saravana Bhava 1.1.0

This gate prevents source changes, signing changes and Play Console changes from being mixed into one uncontrolled task.

## Gate 1 — Source identity

Required:

- package `com.saravanabhava.murugan`
- version `1.1.0`
- versionCode `37`
- Expo SDK family `56`
- Expo project ID `566820f6-a72c-491a-9fb4-f4eb238bcaa6`

Stop when any value differs unexpectedly.

## Gate 2 — Clean source validation

Run from a clean extraction:

```bash
npm ci --legacy-peer-deps
npx expo install --check
npx expo-doctor
npx tsc --noEmit
npm run lint
npm test -- --runInBand
npx expo export --platform android --clear
```

Required:

- dependencies aligned
- Expo Doctor all checks pass
- TypeScript exit code 0
- lint exit code 0
- all original and added tests pass
- Android export completes

Do not run `npm audit fix --force` during release recovery.

## Gate 3 — Expo and Android credential access

Run:

```bash
npx eas-cli@latest whoami
npx eas-cli@latest project:info
npx eas-cli@latest credentials --platform android
```

Required:

- the account can access the existing Expo project
- the expected project ID is returned
- an existing Android production credential is confirmed

Do not run `eas init`, transfer the project, change the package or generate a new production keystore to bypass an access failure.

## Gate 4 — Preview APK

Build a preview APK only after Gates 1–3 pass.

Required device checks:

1. cold start
2. Home
3. devotional library
4. Kanda Sashti Kavasam
5. Vel Maaral
6. Guided Search in Tamil
7. Guided Search in English
8. transliterated query
9. temple list
10. temple detail
11. external map action
12. bookmark add/remove
13. restart persistence
14. Tamil narration start/stop
15. missing Tamil voice handling
16. Settings
17. Delete All Data confirmation
18. Android Back behaviour
19. offline launch after an online visit
20. close and reopen

Each failure report must include screen, action, expected result, actual result, device/Android version and screenshot.

## Gate 5 — Production AAB

Build the production AAB from the exact source commit used for the passing preview APK.

Record:

- source commit
- EAS build ID
- AAB download URL
- artifact SHA-256
- package/version/versionCode
- signing credential fingerprint

Do not submit automatically.

## Gate 6 — Google Play Internal Testing

Required:

- versionCode is unused
- AAB upload succeeds
- Play App Signing accepts the upload credential
- Data Safety answers match the app behaviour
- privacy-policy URL is public
- internal tester can install the Play-distributed build
- critical device regression passes again

## Gate 7 — Production promotion

Production promotion requires explicit approval after Internal Testing evidence is complete.

A source validation, Expo export, preview APK or locally installed build alone is not production approval.
