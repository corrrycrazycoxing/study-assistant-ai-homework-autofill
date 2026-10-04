# Development decisions and handoffs

Keep this file for future chats and accounts. Add a dated entry after each meaningful update: what changed, why, checks run, what was actually published, and what remains. Do not treat a local commit or tag as a published GitHub release.

## October 2, 2026 — 2.5.2 release preparation

**What changed:** Corrected visible 2.5.0/2.5.1 badges to 2.5.2 and updated the walkthrough/help for four pace modes. Brought timing, AI relay and security regression tests into the repository. Added a checked ZIP packager, direct release script, release notes, and HANDOFF.md.

**Why:** The newer 2.5.0 work added Human pace, but the tour still described three modes. Tests had lived in another chat's local work directory, making continuation from GitHub incomplete. The repository needed a repeatable package and a record of verified versus unfinished work.

**Checks:** `node scripts/check.cjs`, `python3 scripts/package.py v2.5.2`, `git diff --check`, ZIP manifest/integrity assertions, and a secret-pattern scan passed. These use mocks and local fixtures; no new live assignment or provider round trip was verified.

**Git state:** `main` and tag `v2.5.2` were pushed at `5f765f3da3c3a461e968fa1c853b87fab0ba49b6`. The local ZIP is `dist/study-assistant-2.5.2.zip` (ignored by Git). GitHub release creation failed due to the local Python certificate chain. A retry requiring elevated network access was rejected because the automatic approval review was unavailable at the current usage limit. GitHub's release-by-tag API returned 404. **The 2.5.2 release and downloadable ZIP are not published.**

**Release choice:** A workflow-based release was attempted, but the existing Git token lacks permission to add `.github/workflows/release.yml`; GitHub rejected that push. We removed the workflow and pushed a direct release script instead. Do not reintroduce workflow files with the same token. Once permitted, configure the script to use the system trust bundle on macOS, re-run checks, and publish/verify the existing tag's release. Do not replace the tag or claim release success until the asset is visible.

**Outstanding product work:** See HANDOFF.md. Prioritize portable Canvas/MindTap fixture verification, then live provider checks. The Google Docs companion is a separate experimental prototype and is not in this repository.

### Publication completed later on October 2, 2026

The `v2.5.2` release was published and independently confirmed through GitHub's release API. It contains `study-assistant-2.5.2.zip` (898,135 bytes, SHA-256 `a9a10b9b0071f654af531903bd9f1ab32c5b103270dd5be5589eed331ccd89a0`). Release: https://github.com/corrrycrazycoxing/study-assistant-extension/releases/tag/v2.5.2 . The tagged extension remains commit `5f765f3da3c3a461e968fa1c853b87fab0ba49b6`; later `main` commits only changed handoff documentation and release tooling.

## October 2, 2026 — 2.5.3 installation clarity

**What changed:** Put a direct installable ZIP link and four Chrome setup steps at the top of the repository README. Updated the manifest and visible version labels to 2.5.3.

**Why:** The repository home page showed 2.5.2 and a generic release link, but the actual ZIP and `Load unpacked` setup were hard to find. GitHub's source download is not the intended extension package.

**Checks and publication:** Node regression tests, JavaScript syntax, ZIP manifest/integrity, `git diff --check` and secret-pattern scan passed. Commit `cc482ceb5e8c0dc84650cc1e036829790f27e10a` was pushed to `main` and tagged `v2.5.3`. GitHub independently confirmed the public release and uploaded `study-assistant-2.5.3.zip` asset (898,414 bytes) at https://github.com/corrrycrazycoxing/study-assistant-extension/releases/tag/v2.5.3 . The extension's answer and navigation logic was not changed.

## October 2, 2026 — 2.5.4 clear product description

**What changed:** Renamed the extension to “Study Assistant — AI Homework Autofill” and described supported platforms and AI tabs in the manifest and README. The repository URL remains stable.

**Why:** The old name listed websites but did not state that the extension autofills supported homework fields, making the main function hard to find or understand.

**Checks and publication:** Node regression tests, JavaScript syntax, ZIP integrity, `git diff --check` and a secret-pattern scan passed. Commit `0178f849f6c7358977be74846a07774e89738c3f` was pushed as `v2.5.4`. GitHub independently confirmed the public release and `study-assistant-2.5.4.zip` asset (898,588 bytes): https://github.com/corrrycrazycoxing/study-assistant-extension/releases/tag/v2.5.4 . No answer or automation behavior changed.

**GitHub About remains:** The separate repository description still reads “Privacy-focused Chrome extension for guided study assistance on Pearson, McGraw Hill, Canvas, and MindTap.” The existing publishing token returned HTTP 403 for the repository-settings API, and the open Chrome GitHub page was signed out. Suggested replacement: “AI homework autofill Chrome extension for supported McGraw Connect, Pearson MyLab, Canvas and MindTap questions.” Repository topics can also be added by an admin: `chrome-extension`, `homework-autofill`, `ai-study-assistant`, `mcgraw-connect`, `pearson-mylab`, `canvas-lms`, `mindtap`. Do not claim these settings were changed.


## October 3, 2026 — 2.5.5 Pearson controls and compact modes

**Why:** The live Pearson page had graded dropdowns and radio buttons from earlier parts alongside three active dropdowns. Collection skipped the graded controls, but completeness counted their wrappers, falsely stopping with “not captured.”

**Changed:** Both paths now use the same active-control predicate. Added regression cases for graded versus editable dropdowns, numeric editors and choices. Removed the sticky assistant control deck. Shared on-page pace selection uses four icon radio buttons and a separate speed button group; keyboard navigation and saved preference keys are retained. Human pace has a distinct vector icon in settings/setup/help. No timing behavior changed.

**Evidence:** Live read-only Pearson inspection confirmed the graded `answered` dropdowns and disabled radio inputs. Syntax and repository regression tests passed. Live autofill/check remains unverified after the fix.

**Repository metadata:** Saved and visually verified the GitHub About description in Safari: “AI homework autofill Chrome extension for supported McGraw Connect, Pearson MyLab, Canvas and MindTap questions.” Topics: chrome-extension, homework-autofill, ai-study-assistant, mcgraw-connect, pearson-mylabs, canvas-lms, mindtap. This supersedes the prior blocked About note.

**Updates:** User asked about automatic updates outside the Web Store. Explained a permanent unpacked folder plus a separate updater could reduce installation to a Chrome Reload click. No updater or scheduled update task has been implemented.

**Publication verified:** main and v2.5.5 were pushed at 0dbe56a55c40f2b94c8b1bc1496ac7c97f20ac2c. GitHub release-by-tag independently returned draft=false and study-assistant-2.5.5.zip (900,134 bytes). Release: https://github.com/corrrycrazycoxing/study-assistant-extension/releases/tag/v2.5.5 .

## October 3, 2026 — 2.5.8 public documentation cleanup

**Why:** The README's publication question and cross-chat maintenance directions were distracting in the public view.

**Changed:** Removed both sections from README.md and the copied publication question from the built-in guide. Kept the operational details in PUBLISHING.md, HANDOFF.md, DECISIONS.md, and AGENTS.md. No answer behavior changed.

**Checks and publication:** Node regression and syntax checks, ZIP integrity, and git diff checks passed. Commit 181891d7ffd26b0771005068c6f9dc512185975e was pushed to main and tagged v2.5.8. GitHub confirmed a public release and uploaded study-assistant-2.5.8.zip (903,659 bytes): https://github.com/corrrycrazycoxing/study-assistant-extension/releases/tag/v2.5.8 .

## October 3, 2026 — 2.5.9 Pearson dropdown and attention handling

**Why:** Pearson displayed an open Dojo menu but the extension reported that it did not open. Live read-only inspection showed each option row includes hidden arrow text, which broke exact row-text matching.

**Changed:** Match the visible `.dijitMenuItemLabel` within the specific menu owned by the dropdown, then verify Pearson’s selected display. The compact assistant labels attention and opens the side panel. A requested AI-tab reload now visits that tab, reloads it and returns to the original tab unless the user switches away. The walkthrough focuses on one mode card and removes a redundant icon legend.

**Evidence:** Node checks and synthetic Pearson/panel browser fixtures passed. The live Pearson menu structure was inspected; no answer was entered in the live assignment during verification.

**Publication:** main and v2.5.9 pushed at bce79a54f99e59335043614c0d3f4612428a4830. GitHub confirmed a public release with the 904,408-byte installable ZIP.

## October 3, 2026 — 2.5.10 release visibility

**Why:** The GitHub README still led with 2.5.0 after installation, making newer published releases look absent even though CHANGELOG.md and the 2.5.9 release were current.

**Changed:** Added recent-version notes near the README top, archived older feature narrative, linked changelog/releases, and corrected stale descriptions. No runtime logic changed.

**Verification and publication:** Node checks, ZIP integrity, and diff check passed. Commit 521e17bde617a7353eeb3c24a749ae4169730e63 was pushed to main and tagged v2.5.10. GitHub confirmed a public release with the 899,989-byte installable ZIP.
