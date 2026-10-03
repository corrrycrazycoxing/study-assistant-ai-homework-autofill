# Start here when continuing in another chat

Repository: https://github.com/corrrycrazycoxing/study-assistant-extension
Current source version: 2.5.7. The local checkout folder may still be named 2.5.0; manifest.json is authoritative.

## Already implemented
- Pearson printed question/subpart labels, paired Above/Below preview tables, dropdown handling and question-level Final check/Next.
- McGraw visible responsive navigation, native worksheet/journal cells and multiple transaction tabs. Final submission stays manual.
- Side panel settings, walkthrough/skip, progress display, answer editing, linked AI tabs and optional background operation.
- 2.5.0 AI timing estimates, popup pacing choices, response detection and validation improvements.
- 2.5.1 privacy/terms and Chrome update notice (not automatic updates for unpacked installs).
- 2.5.2 portable regression tests, version/help cleanup, tagged ZIP release tooling.

## Outstanding work — do not claim complete
1. Canvas and MindTap Guided Answers browser fixtures passed on October 3. McGraw worksheet checks passed. Recheck the compact on-page overlay in an installed Chrome build; the synthetic fixtures do not load the shared panel monitor.
2. Live assignment entry/navigation and live chatbot round trips remain incompletely verified. Use non-graded fixtures first; record exact live checks if performed.
3. Google Docs companion was a separate experimental prototype, not merged here. Its source was outside this repo and actual Docs insertion was not verified. Recover and inspect it before any integration; do not claim it ships in this extension.
4. Picture-question uploads and Canvas New Quizzes are experimental.
5. Accessibility, third-party asset licensing and public-distribution review remain in PUBLISHING.md. No Chrome Web Store publication was requested here.

- 2.5.4 makes AI homework autofill explicit in the name, description and README.

## Current publication status
Version 2.5.7 is locally built but publication must be verified separately. Version 2.5.5 is published and independently verified with the installable ZIP (900,134 bytes). Source/tag commit: 0dbe56a55c40f2b94c8b1bc1496ac7c97f20ac2c. It fixes Pearson completed-control detection and updates the shared pace UI/panel scrolling. GitHub About and topics were successfully updated through the signed-in Safari owner UI. The description now explicitly says AI homework autofill. Read DECISIONS.md for evidence and remaining limitations.

## Verification and release procedure
Run `node scripts/check.cjs`, `python3 scripts/package.py v2.5.7`, and `git diff --check`. Tests cover mocked timing/relay/security/update lifecycle; browser fixtures are in docs/.
For future versions update manifest, visible badges, CHANGELOG.md and RELEASE-NOTES.md. Inspect remote changes, run checks, review diff/secrets, commit, show hash, push source and a matching version tag. Run `python3 scripts/publish-release.py` to publish the ZIP after pushing the tag. Confirm the release asset before reporting publication. Never replace an existing tag.
Update this file with actual results and remaining work each turn. The owner authorized source pushes and matching GitHub releases for requested updates; this does not authorize unrelated features or store submission.
