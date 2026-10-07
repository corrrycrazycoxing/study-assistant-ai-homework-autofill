# Development decisions and handoffs

## October 6, 2026 — Restore top-hung pace controls and support Aplia table inputs

**Intent:** Keep the familiar pace choices visible without covering the middle of assignments, and make the inspected numeric table question eligible for field-by-field answer assistance.

**Changed:** The shared pace controls now mount at the top-level MindTap page (above its embedded Aplia frame) and render as separate cards on a transparent strip; other adapters keep the shared top-mounted bar. A fresh reload during a saved Grade It Now/next-question transition reconnects and resumes Auto; a refresh at another point stops for review. Numeric completion checks reject non-numeric placeholders such as a bare `%`, while preserving valid numbers, including zero and formatted values. Aplia question selection clears stale done keys when fields remain blank. Table answer labels expand multi-row/colspan headers so repeated row labels resolve to distinct years and columns, for example `Streaming services · 2023 · Cost · (Dollars)`.

**Live evidence and limits:** Computer inspection of the open MindTap Aplia question found 16 numeric text inputs (14 blank and two `%` suffix defaults), a four-option checkbox group, an editable Save & Continue action and a three-row `thead` with merged year headers. No field was changed and no assignment was submitted. The page is still running installed 2.7.3; final source behavior has not been reloaded or live-verified.

**Checks:** `node tests/mindtap-fields.cjs`, `node tests/universal-pacing.cjs`, `node tests/mindtap-course.cjs`, `node scripts/check.cjs`, and `git diff --check` pass. The top-frame bar and automatic refresh recovery need a live Chrome check before release; the version stays unchanged pending that verification.

## October 6, 2026 — Updater help discoverability and release refresh (2.7.2)

**Intent:** Make updater instructions reachable even when the panel believes no newer release exists, and let users clear stale release status themselves.

**Changed:** Added a persistent **How to update** action beside the installed/latest version line. It opens the in-panel guide directly at “Update an unpacked installation.” The panel’s **Refresh** button now also bypasses the cached GitHub release result and checks GitHub immediately.

**Checks/publication:** `node scripts/check.cjs`, `git diff --check`, and the credential/private-key pattern scan passed. `python3 scripts/package.py v2.7.2` passed; the 67-file archive passed ZIP integrity, manifest and updater-feature checks (930,990 bytes, SHA-256 `a34aa3d2d79571f6bb57ba986e75ada7269cc0d739c1f304b061408b4de2ffd1`). Published on GitHub as [v2.7.2](https://github.com/corrrycrazycoxing/study-assistant-ai-homework-autofill/releases/tag/v2.7.2); GitHub confirms the versioned ZIP asset. Release commit: `aa1cfc7738d61c06682eb09ddb621a411b263410`.

## October 6, 2026 — MindTap Course Mode visibility and warning (2.7.1)

**Intent:** Keep Course Mode off individual assignments unless a course-level queue is active, minimize obstruction on the course activity list, and make the important verification warning visible inside Course Mode.

**Changed:** The MindTap overlay is hidden on solo assignment views and active assignment work, then reappears at course-level review checkpoints. It is collapsed by default on the course activity list. Outline detection ignores hidden stale controls and identifies the actual activity list; a solo assignment is no longer mislabeled as an empty queue. The opened Course Mode panel now has a prominent warning to verify each assignment's results and completion status in MindTap, and to review and submit each assignment manually. Updated Help and walkthrough text. The existing first-use acknowledgement version is unchanged.

**Evidence/limits:** The attached screenshot shows the MindTap chapter assignment summary, not the course activity list. No untouched eligible activity is available to test the full live queue. Automated tests cover hidden/visible outline detection, collapsed UI, solo-page hiding, the prominent warning and the existing queue flow. A live queue run remains unverified.

**Checks/publication:** `node tests/mindtap-course.cjs` and `node scripts/check.cjs` passed. `git diff --check` and the credential/private-key pattern scan passed. `python3 scripts/package.py v2.7.1` passed; the 67-entry archive passed ZIP integrity and manifest/feature checks (930,615 bytes, SHA-256 `7f144ad1b25fc202ced3f97905bf31ec4af8ff59185c9a382de831990ec5dfb4`). Published on GitHub as [v2.7.1](https://github.com/corrrycrazycoxing/study-assistant-ai-homework-autofill/releases/tag/v2.7.1), asset verified at the versioned download URL. Source release commit: `06d7950595a868b283506bc692b666c5029b5faf`. Live queue behavior remains unverified because no untouched eligible activity was available.

## October 5, 2026 — Pearson Full Course Mode and local test site (2.6.0)

**Intent:** Add a Pearson assignments-page queue for unstarted homework and lessons, ordered as shown, with an option to continue past skipped questions. Exams and practice exams are excluded. The queue may enter an eligible assignment through Start or its first question link, while Resume, scored, and unclear items remain untouched. Final assignment submission stays manual.

**Test site:** Added `docs/pearson-course-mock.html` and `.js`, a Pearson-style course/assignment/player fixture with completed, untouched, started and exam rows, a linked-data unsupported question, pending media, Save and next-assignment transitions, and a large final review dialog. `tests/pearson-course-e2e.cjs` drives the production background queue and uses a DOM double to click through the mock UI. The mock never contacts Pearson or submits an assignment.

**Media handling:** Question work can proceed regardless of media order. Pending media is tracked separately, and the final review links to the exact assignment for verification. Pearson may update media credit after its route returns, including when the tab appears blank, so the UI advises checking the status; the extension never assumes the return alone proves completion.

**Live evidence/limit:** The score callback was previously read on Pearson without opening an assignment. The live course has no untouched assignment left for a full run. The browser-use tool blocked opening the mock as a local-file tab, so mock verification was run in Node, not a real browser. The package and live Go → Save → next-assignment path have not been verified against Pearson. Release notes and README disclose this limit.

**Publication:** Published 2.6.0 from commit `34f7e1cebb745f23ae6bc7108d27283cb6ee3604`, tag `v2.6.0`, with the ZIP attached: https://github.com/corrrycrazycoxing/study-assistant-ai-homework-autofill/releases/tag/v2.6.0

**Checks:** `tests/pearson-course-e2e.cjs`, `tests/pearson-course.cjs`, `tests/pearson-result-next.cjs`, full `node scripts/check.cjs`, package validation and `git diff --check` pass. GitHub confirms the main commit, `v2.6.0` tag and public release ZIP.

## October 2, 2026 — 2.5.2 release preparation

**What changed:** Corrected visible 2.5.0/2.5.1 badges to 2.5.2 and updated the walkthrough/help for four pace modes. Brought timing, AI relay and security regression tests into the repository. Added a checked ZIP packager, direct release script, release notes, and HANDOFF.md.

**Why:** The newer 2.5.0 work added Human pace, but the tour still described three modes. Tests had lived in another chat's local work directory, making continuation from GitHub incomplete. The repository needed a repeatable package and a record of verified versus unfinished work.

**Checks:** `node scripts/check.cjs`, `python3 scripts/package.py v2.5.2`, `git diff --check`, ZIP manifest/integrity assertions, and a secret-pattern scan passed. These use mocks and local fixtures; no new live assignment or provider round trip was verified.

**Git state:** `main` and tag `v2.5.2` were pushed at `5f765f3da3c3a461e968fa1c853b87fab0ba49b6`. The local ZIP is `dist/study-assistant-2.5.2.zip` (ignored by Git). GitHub release creation failed due to the local Python certificate chain. A retry requiring elevated network access was rejected because the automatic approval review was unavailable at the current usage limit. GitHub's release-by-tag API returned 404. **The 2.5.2 release and downloadable ZIP are not published.**

**Release choice:** A workflow-based release was attempted, but the existing Git token lacks permission to add `.github/workflows/release.yml`; GitHub rejected that push. We removed the workflow and pushed a direct release script instead. Do not reintroduce workflow files with the same token. Once permitted, configure the script to use the system trust bundle on macOS, re-run checks, and publish/verify the existing tag's release. Do not replace the tag or claim release success until the asset is visible.

**Outstanding product work:** See HANDOFF.md. Prioritize portable Canvas/MindTap fixture verification, then live provider checks. The Google Docs companion is a separate experimental prototype and is not in this repository.

### Publication completed later on October 2, 2026

The `v2.5.2` release was published and independently confirmed through GitHub's release API. It contains `study-assistant-2.5.2.zip` (898,135 bytes, SHA-256 `a9a10b9b0071f654af531903bd9f1ab32c5b103270dd5be5589eed331ccd89a0`). Release: https://github.com/corrrycrazycoxing/study-assistant-ai-homework-autofill/releases/tag/v2.5.2 . The tagged extension remains commit `5f765f3da3c3a461e968fa1c853b87fab0ba49b6`; later `main` commits only changed handoff documentation and release tooling.

## October 2, 2026 — 2.5.3 installation clarity

**What changed:** Put a direct installable ZIP link and four Chrome setup steps at the top of the repository README. Updated the manifest and visible version labels to 2.5.3.

**Why:** The repository home page showed 2.5.2 and a generic release link, but the actual ZIP and `Load unpacked` setup were hard to find. GitHub's source download is not the intended extension package.

**Checks and publication:** Node regression tests, JavaScript syntax, ZIP manifest/integrity, `git diff --check` and secret-pattern scan passed. Commit `cc482ceb5e8c0dc84650cc1e036829790f27e10a` was pushed to `main` and tagged `v2.5.3`. GitHub independently confirmed the public release and uploaded `study-assistant-2.5.3.zip` asset (898,414 bytes) at https://github.com/corrrycrazycoxing/study-assistant-ai-homework-autofill/releases/tag/v2.5.3 . The extension's answer and navigation logic was not changed.

## October 2, 2026 — 2.5.4 clear product description

**What changed:** Renamed the extension to “Study Assistant — AI Homework Autofill” and described supported platforms and AI tabs in the manifest and README. The repository URL remains stable.

**Why:** The old name listed websites but did not state that the extension autofills supported homework fields, making the main function hard to find or understand.

**Checks and publication:** Node regression tests, JavaScript syntax, ZIP integrity, `git diff --check` and a secret-pattern scan passed. Commit `0178f849f6c7358977be74846a07774e89738c3f` was pushed as `v2.5.4`. GitHub independently confirmed the public release and `study-assistant-2.5.4.zip` asset (898,588 bytes): https://github.com/corrrycrazycoxing/study-assistant-ai-homework-autofill/releases/tag/v2.5.4 . No answer or automation behavior changed.

**GitHub About remains:** The separate repository description still reads “Privacy-focused Chrome extension for guided study assistance on Pearson, McGraw Hill, Canvas, and MindTap.” The existing publishing token returned HTTP 403 for the repository-settings API, and the open Chrome GitHub page was signed out. Suggested replacement: “AI homework autofill Chrome extension for supported McGraw Connect, Pearson MyLab, Canvas and MindTap questions.” Repository topics can also be added by an admin: `chrome-extension`, `homework-autofill`, `ai-study-assistant`, `mcgraw-connect`, `pearson-mylab`, `canvas-lms`, `mindtap`. Do not claim these settings were changed.


## October 3, 2026 — 2.5.5 Pearson controls and compact modes

**Why:** The live Pearson page had graded dropdowns and radio buttons from earlier parts alongside three active dropdowns. Collection skipped the graded controls, but completeness counted their wrappers, falsely stopping with “not captured.”

**Changed:** Both paths now use the same active-control predicate. Added regression cases for graded versus editable dropdowns, numeric editors and choices. Removed the sticky assistant control deck. Shared on-page pace selection uses four icon radio buttons and a separate speed button group; keyboard navigation and saved preference keys are retained. Human pace has a distinct vector icon in settings/setup/help. No timing behavior changed.

**Evidence:** Live read-only Pearson inspection confirmed the graded `answered` dropdowns and disabled radio inputs. Syntax and repository regression tests passed. Live autofill/check remains unverified after the fix.

**Repository metadata:** Saved and visually verified the GitHub About description in Safari: “AI homework autofill Chrome extension for supported McGraw Connect, Pearson MyLab, Canvas and MindTap questions.” Topics: chrome-extension, homework-autofill, ai-study-assistant, mcgraw-connect, pearson-mylabs, canvas-lms, mindtap. This supersedes the prior blocked About note.

**Updates:** User asked about automatic updates outside the Web Store. Explained a permanent unpacked folder plus a separate updater could reduce installation to a Chrome Reload click. No updater or scheduled update task has been implemented.

**Publication verified:** main and v2.5.5 were pushed at 0dbe56a55c40f2b94c8b1bc1496ac7c97f20ac2c. GitHub release-by-tag independently returned draft=false and study-assistant-2.5.5.zip (900,134 bytes). Release: https://github.com/corrrycrazycoxing/study-assistant-ai-homework-autofill/releases/tag/v2.5.5 .

## October 3, 2026 — 2.5.8 public documentation cleanup

**Why:** The README's publication question and cross-chat maintenance directions were distracting in the public view.

**Changed:** Removed both sections from README.md and the copied publication question from the built-in guide. Kept the operational details in PUBLISHING.md, HANDOFF.md, DECISIONS.md, and AGENTS.md. No answer behavior changed.

**Checks and publication:** Node regression and syntax checks, ZIP integrity, and git diff checks passed. Commit 181891d7ffd26b0771005068c6f9dc512185975e was pushed to main and tagged v2.5.8. GitHub confirmed a public release and uploaded study-assistant-2.5.8.zip (903,659 bytes): https://github.com/corrrycrazycoxing/study-assistant-ai-homework-autofill/releases/tag/v2.5.8 .

## October 3, 2026 — 2.5.9 Pearson dropdown and attention handling

**Why:** Pearson displayed an open Dojo menu but the extension reported that it did not open. Live read-only inspection showed each option row includes hidden arrow text, which broke exact row-text matching.

**Changed:** Match the visible `.dijitMenuItemLabel` within the specific menu owned by the dropdown, then verify Pearson’s selected display. The compact assistant labels attention and opens the side panel. A requested AI-tab reload now visits that tab, reloads it and returns to the original tab unless the user switches away. The walkthrough focuses on one mode card and removes a redundant icon legend.

**Evidence:** Node checks and synthetic Pearson/panel browser fixtures passed. The live Pearson menu structure was inspected; no answer was entered in the live assignment during verification.

**Publication:** main and v2.5.9 pushed at bce79a54f99e59335043614c0d3f4612428a4830. GitHub confirmed a public release with the 904,408-byte installable ZIP.

## October 3, 2026 — 2.5.10 release visibility

**Why:** The GitHub README still led with 2.5.0 after installation, making newer published releases look absent even though CHANGELOG.md and the 2.5.9 release were current.

**Changed:** Added recent-version notes near the README top, archived older feature narrative, linked changelog/releases, and corrected stale descriptions. No runtime logic changed.

**Verification and publication:** Node checks, ZIP integrity, and diff check passed. Commit 521e17bde617a7353eeb3c24a749ae4169730e63 was pushed to main and tagged v2.5.10. GitHub confirmed a public release with the 899,989-byte installable ZIP.

## October 3, 2026 — 2.5.11 repository rename

**Why:** The owner chose “Study Assistant — AI Homework Autofill.” GitHub had already renamed the repository with a trailing hyphen; we normalized the slug to study-assistant-ai-homework-autofill.

**Changed:** Updated origin, hardcoded repository links, update helper and release script. No runtime logic changed.

**Verification and publication:** Node checks, ZIP integrity, diff check and renamed-remote fetch passed. Commit d88058652d7c6115f05e36d5efa4c33bf9583402 was pushed to main and tagged v2.5.11. GitHub confirmed a public release with the 900,134-byte ZIP.

## October 3, 2026 — 2.5.12 Pearson dropdown loading

**Why:** Version 2.5.9 improved label matching but the live Pearson `xl.player.controls.Fillin` menu did not open through `HTMLElement.click()` or synthetic mouse events. Calling `openDropDown()` before loading showed only an empty placeholder.

**Changed:** The existing MAIN-world Pearson bridge now calls `loadDropDown()` when needed, opens the menu, selects one exact visible option, and verifies the displayed field. The isolated content script requests one dropdown choice at a time and stops before checking on a mismatch.

**Evidence and limits:** DevTools on the reported live question showed `loadDropDown()` populated all choices. The sequence selected smaller, smaller and critical value across FL3–FL5; Pearson's Check answer control became available. No grading or submission was triggered. The new bridge regression and repository tests passed. The built 2.5.12 extension was not installed in Chrome during this check.

**Publication:** Commit d8ad4d3a139dca29cdd802c627dd76c251f4ded9 was pushed to main and tagged v2.5.12. GitHub confirmed the public release and 900,883-byte installable ZIP at https://github.com/corrrycrazycoxing/study-assistant-ai-homework-autofill/releases/tag/v2.5.12 .


## October 6, 2026 — MindTap Course Mode and universal pacing (2.7.0)

**Intent:** Add a course queue for MindTap while keeping final assignment submission under the student's control. Apply It is the useful default because it is marked as grade-counting. Other section checkboxes let users opt into Study It, Learn It and Other activity types without putting those into every default run.

**Changed:** Added an outline scanner, eligibility filter, native activity launch and sequential queue. Only visible assessment activities explicitly marked Not started can enter. Apply It needs the grade-counting marker; selected optional sections can include grade-counting or explicit practice items. Media/reading, quizzes, tests, exams, submitted and in-progress activities are excluded. The course queue waits at each assignment overview for review/submission and continuation; unsupported assignments are listed as skipped with reopen buttons. Instant, Timed and Human pace preferences are shared across platforms. Synced the 2.7.0 install/version labels and public release descriptions.

**Evidence/limits:** MindTap's live outline markup and category labels were inspected read-only; the open course had no untouched Apply It activity, and no assignment was opened, answered, graded or submitted. Synthetic scanner/queue regression tests and the repository suite pass. A local mock page is included; browser security policy blocked opening the local file, so visual mock verification and live end-to-end queue validation are not done. This candidate must not be described as fully live-verified.

**Checks:** `node tests/mindtap-course.cjs`, `node scripts/check.cjs`, and `python3 scripts/package.py v2.7.0` passed; package includes the matching 2.7.0 manifest and ZIP integrity checks. `git diff --check` and a changed-file secret-pattern scan passed. After GitHub access became available, `origin/main` was fetched and confirmed at the expected base before committing; the `v2.7.0` tag did not previously exist.

**Publication:** Commit `8ad0c6b2293040c90dd446d908aac66439fec27d` and tag `v2.7.0` were pushed to `main` and GitHub. The public release and matching `study-assistant-2.7.0.zip` (929,487 bytes, SHA-256 `731ceb9b6a51931ec74790c64fb1a66e38c653af9d62d788cbd1be8c47991e39`) were verified at https://github.com/corrrycrazycoxing/study-assistant-ai-homework-autofill/releases/tag/v2.7.0 . Browser-level mock verification and live end-to-end MindTap assignment validation remain outstanding as documented above.
