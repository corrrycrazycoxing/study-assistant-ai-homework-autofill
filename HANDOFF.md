# Start here when continuing in another chat

## MindTap Course Mode visibility and warning — 2.7.1 update

The 2.7.1 patch keeps the course-mode overlay out of the way on solo assignment pages. It is available on the course activity outline, collapsed until opened, hidden while the queue works inside an assignment, and shown again at the review checkpoint. The status distinguishes a single assignment view from an outline with no matching not-started work. Opening Course Mode displays a prominent warning to verify each assignment’s results and completion status in MindTap, then review and submit assignments manually. The first-use acknowledgement version is unchanged. The help page and walkthrough explain the show/hide behavior.

The user screenshot showed the MindTap single-assignment summary and a floating Course Mode card. An eligible untouched activity was not available, so the live queue was not started. Synthetic coverage checks outline detection (including hidden stale controls), solo-page hiding, collapsed default, the prominent warning and the existing queue gate. `node tests/mindtap-course.cjs`, `node scripts/check.cjs`, `git diff --check`, and a credential/private-key pattern scan passed. `python3 scripts/package.py v2.7.1` passed; the ZIP has 67 entries, manifest version 2.7.1, and SHA-256 `7f144ad1b25fc202ced3f97905bf31ec4af8ff59185c9a382de831990ec5dfb4`. Live queue verification remains outstanding. GitHub fetch failed because DNS could not resolve `github.com`, so publication is pending network access.

## MindTap Course Mode and universal pacing — 2.7.0 released

`shared/mindtap-course.js` scans Cengage's top-level MindTap outline and admits visible assessment activities explicitly marked `Not started`. The fixed course card defaults to **Apply It** activities marked `COUNTS TOWARDS GRADE`. Optional checkboxes add Study It, Learn It and Other sections, including explicit `PRACTICE` activities. Reading/media, quizzes, tests, exams, submitted and in-progress work remain excluded. The background queues selected items in outline order and `content-scripts/mindtap.js` hands each assignment to the existing Aplia flow. After each question flow it pauses for the owner to review and submit with MindTap, then confirm continuation. Skips are reported with per-item reopen links. The final assignment submit control is never activated.

The Instant, Timed and Human pace and working-speed preferences are shared across supported platforms; platform-specific pause and answer settings stay separate. McGraw's answer-check transition handling and updater/panel updates are also part of this pending 2.7.0 candidate. Version labels and install instructions must stay synchronized across the README, guide, settings and on-page adapters.

**Verification:** `node tests/mindtap-course.cjs` and the full `node scripts/check.cjs` suite passed after the latest category change. `python3 scripts/package.py v2.7.0` built `dist/study-assistant-2.7.0.zip`; package integrity, runtime inclusion and manifest/version-label checks passed. `git diff --check` and a secret-pattern scan of 32 changed files passed. The live MindTap outline was inspected read-only; no eligible Apply It item was available, so no live assignment was opened or changed. `docs/mindtap-course-mock.html` and synthetic DOM tests cover selection; browser security policy rejected opening the local file, so visual/browser-level mock verification and live end-to-end MindTap validation remain outstanding. Do not describe the release as fully live-tested.

**Publication:** Published on October 6, 2026. Repository: https://github.com/corrrycrazycoxing/study-assistant-ai-homework-autofill . Release: https://github.com/corrrycrazycoxing/study-assistant-ai-homework-autofill/releases/tag/v2.7.0 . Source commit: `8ad0c6b2293040c90dd446d908aac66439fec27d`; tag `v2.7.0` points to that release commit. GitHub confirmed the public `study-assistant-2.7.0.zip` asset (929,487 bytes; SHA-256 `731ceb9b6a51931ec74790c64fb1a66e38c653af9d62d788cbd1be8c47991e39`). No Chrome Web Store submission was made. The visual mock and live assignment-flow verification limits above still apply.

## Pearson Full Course Mode — 2.6.0
`content-scripts/pearson-course.js` owns the assignment-list, overview and start-gate UI. `content-scripts/pearson-course-shell.js` displays the collapsed launcher in the top-level Pearson course page, fixed at the viewport corner. `background/pearson-course.js` tracks the queue and review list; `content-scripts/pearson.js` runs the per-question flow. It reads each visible score callback, includes only confirmed 0% homework/lesson items, and starts them through Pearson's Start action or first question link. Scored, resumed or unclear items and exams/quizzes stay unopened. Question work continues when required media is pending; the final review links to the assignment so the user can verify it. Course Mode uses Pearson Save between assignments and never final Submit. Skipped questions are reported in the end-of-run review.

The local simulator is [docs/pearson-course-mock.html](docs/pearson-course-mock.html). `node scripts/check.cjs` passes, including `tests/pearson-course-e2e.cjs`, which drives the production background queue through eligibility, Start/question-link entry, question skip, Save, next assignment, pending-media review and completion. The same test exercises the mock controls in a DOM double and checks the final review overlay. Other regression tests cover question navigation, dropdowns, score parsing and chatbot refresh/return. No live Pearson course run was verified.

**Verification limit:** This is synthetic verification, not a live Pearson course run. The browser-use tool blocked opening the mock through its local-file URL policy, so no browser-rendered mock screenshot or browser-level click test is claimed. The published release notes disclose that the live course path remains unverified.

Repository: https://github.com/corrrycrazycoxing/study-assistant-ai-homework-autofill
Latest published version: 2.6.0. Release: https://github.com/corrrycrazycoxing/study-assistant-ai-homework-autofill/releases/tag/v2.6.0. Download: https://github.com/corrrycrazycoxing/study-assistant-ai-homework-autofill/releases/download/v2.6.0/study-assistant-2.6.0.zip. Release source commit: `34f7e1cebb745f23ae6bc7108d27283cb6ee3604` (tag `v2.6.0`). `manifest.json` is authoritative for the working version.

## Latest update
Version 2.6.0 adds Pearson Full Course Mode for confirmed zero-score, unstarted homework and lessons. It enters through Start or a first question link, continues question work while tracking pending media for the final review, saves between assignments, and leaves final submission manual. The standalone mock and full synthetic test suite pass; a live course run was not verified. The release ZIP is published at https://github.com/corrrycrazycoxing/study-assistant-ai-homework-autofill/releases/download/v2.6.0/study-assistant-2.6.0.zip.

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
