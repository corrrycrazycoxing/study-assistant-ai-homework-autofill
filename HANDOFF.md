# Start here when continuing in another chat

Repository: https://github.com/corrrycrazycoxing/study-assistant-ai-homework-autofill
Current source version: 2.5.12. The local checkout folder name may lag; manifest.json is authoritative.

## Latest update
Version 2.5.12 fixes Pearson MyLab custom dropdowns by loading the Dojo choices before opening and clicking an exact option. On the reported live question, FL3/FL4/FL5 accepted smaller/smaller/critical value and Pearson enabled Check answer. We did not press Check answer, submit or advance. The exact bridge path has a regression test and full repository checks pass. The installed unpacked extension in Chrome was loaded from ~/Downloads/Study-Assistant-2.5.11, so the 2.5.12 package itself has not been installed or tested end to end in Chrome. Do not claim live AI-to-grade verification. Published main and v2.5.12 at d8ad4d3a139dca29cdd802c627dd76c251f4ded9. GitHub confirmed a public release with study-assistant-2.5.12.zip (900,883 bytes): https://github.com/corrrycrazycoxing/study-assistant-ai-homework-autofill/releases/tag/v2.5.12 .

Version 2.5.11 changes the GitHub repository slug to study-assistant-ai-homework-autofill and updates the remote, links, updater and release script. No runtime behavior change. Published main and v2.5.11 at d88058652d7c6115f05e36d5efa4c33bf9583402. GitHub confirmed the public release and uploaded study-assistant-2.5.11.zip (900,134 bytes): https://github.com/corrrycrazycoxing/study-assistant-ai-homework-autofill/releases/tag/v2.5.11 .

Version 2.5.10 updates the public README to show recent releases first and archives old feature notes under docs/FEATURE-HISTORY.md. This is documentation-only; extension behavior is unchanged. Published main and v2.5.10 at 521e17bde617a7353eeb3c24a749ae4169730e63. GitHub confirmed the public release and uploaded study-assistant-2.5.10.zip (899,989 bytes): https://github.com/corrrycrazycoxing/study-assistant-ai-homework-autofill/releases/tag/v2.5.10 .

Version 2.5.9 fixes Pearson custom dropdown menu-label matching observed on a live confidence-interval question, adds a compact attention link to the side panel, returns from requested AI-tab reloads, and shortens the mode walkthrough. Node checks and synthetic browser fixtures passed. Live answer entry was not performed. Published main and tag v2.5.9 at bce79a54f99e59335043614c0d3f4612428a4830. GitHub confirmed the public release and uploaded study-assistant-2.5.9.zip (904,408 bytes): https://github.com/corrrycrazycoxing/study-assistant-ai-homework-autofill/releases/tag/v2.5.9 .

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
Version 2.5.7 was published and independently verified at commit 546d959ecdcf22156b14f43f2fc5326c57cb14d2 with uploaded study-assistant-2.5.7.zip (904,171 bytes): https://github.com/corrrycrazycoxing/study-assistant-ai-homework-autofill/releases/tag/v2.5.7 . Version 2.5.8 is published and independently verified with uploaded study-assistant-2.5.8.zip (903,659 bytes): https://github.com/corrrycrazycoxing/study-assistant-ai-homework-autofill/releases/tag/v2.5.8 . Source/tag commit: 181891d7ffd26b0771005068c6f9dc512185975e. This release removes the publication and cross-chat sections from the public README and built-in guide.

## Verification and release procedure
Run `node scripts/check.cjs`, `python3 scripts/package.py v2.5.12`, and `git diff --check`. Tests cover mocked timing/relay/security/update lifecycle; browser fixtures are in docs/.
For future versions update manifest, visible badges, CHANGELOG.md and RELEASE-NOTES.md. Inspect remote changes, run checks, review diff/secrets, commit, show hash, push source and a matching version tag. Run `python3 scripts/publish-release.py` to publish the ZIP after pushing the tag. Confirm the release asset before reporting publication. Never replace an existing tag.
Update this file with actual results and remaining work each turn. The owner authorized source pushes and matching GitHub releases for requested updates; this does not authorize unrelated features or store submission.
