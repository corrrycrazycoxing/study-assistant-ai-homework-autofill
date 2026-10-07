# Changelog

Versions listed here describe source changes. A version is downloadable as a GitHub release only after its tag, release notes and package have been published.

## 2.7.3 — October 6, 2026

### Fixed
- Detect MindTap outlines and activity controls in open component roots, and update Course Mode visibility as its single-page app moves between the outline and solo assignments.
- Accept case variations in MindTap's "Not started" status and show filter counts when an outline scan finds activities but no eligible assignments.
- Mount MindTap pace choices at the top-level page instead of inside its offset Aplia frame; display separate pace cards on a transparent strip.
- Resume a recent saved Auto run after MindTap refreshes during the Grade It Now or next-question transition; stop other refreshes for manual review.
- Recognize blank percent-suffix numeric fields and resolve merged multi-row table headings for Aplia field labels.

### Changed
- Keep in-progress MindTap assignments excluded by default; an explicit checkbox and confirmation are required to include them.
- Show the updated first-use setup again to existing users by advancing its acknowledgement version.
- Add the repository's MAJOR.MINOR.PATCH release policy and make the GitHub release title omit the tag's `v` prefix.

### Verification
- `node tests/universal-pacing.cjs`, `node tests/mindtap-course.cjs`, `node tests/mindtap-fields.cjs`, `node scripts/check.cjs`, and `git diff --check` pass. The updated top-frame bar and refresh resume still need a live Chrome reload/check; do not publish before that verification.

## 2.7.2 — October 6, 2026

- Add an always-visible **How to update** action in the panel so the unpacked-install instructions are available even when no newer version is detected.
- Make the panel’s **Refresh** button bypass the six-hour release-status cache and check GitHub immediately.
- Add regression coverage for both updater-help access and forced release checks.

## 2.7.1 — October 6, 2026

- Hide MindTap Course Mode during a solo assignment. Keep its card collapsed by default on the course activity list and show it again at course-level review checkpoints.
- Report clearly when a MindTap page is an individual assignment instead of reporting a false “no eligible assignments” result.
- Update version labels, install instructions, Help and walkthrough. Show a prominent warning in the opened Course Mode panel to verify results and completion in MindTap.
- Add tests for course-outline detection and hidden assignment-page UI.
- Live course-queue behavior still needs an untouched eligible assignment for end-to-end verification.

## 2.7.0 — October 6, 2026

- Add MindTap Course Mode to the Cengage course outline. Apply It grade-counting assessments are selected by default; optional checkboxes add Study It, Learn It and Other section assessments.
- Open only visible assessment activities explicitly marked Not started. Exclude reading/media, quizzes, tests, exams and unclear or in-progress work.
- After an assignment’s question flow, stop for review and require the user to submit in MindTap before continuing. End-of-run review lists skipped work and offers a direct reopen action.
- Share Instant Auto, Timed Auto, Human pace and working-speed preferences across supported platforms while keeping platform-specific pause and notebook settings separate.
- Add a MindTap course-outline mock and scanner/queue regression tests. Live outline markup was read-only checked; the open course had no eligible Apply It assignment, so a live end-to-end run was not performed.

## 2.6.0 — October 5, 2026

- Add Pearson Course Mode for homework and lessons in assignment-list order. Read each visible score and open only confirmed 0%, unstarted items through Start or the first question link Pearson provides; keep scored, resumed, unclear, test and exam items unopened and report them.
- In full course mode, continue past unsupported questions only when Pearson exposes a safe Next control, record skipped work for the end-of-run manual review, save through Pearson between assignments, and leave final Submit manual.
- Allow question automation to continue when required media is separate from the questions. Track media status independently and show a final review item linked to the exact assignment, with a reminder to verify Pearson's status.
- Capture supported linked Pearson tables and printouts into the AI question context; if a required source is unavailable or cannot be safely read, avoid guessing and leave the question for review.
- Handle Pearson questions that reveal more answer fields after a selection, and keep Auto attached to the same question when Pearson re-renders its math editor.
- Add installed-version and latest-release status to the side panel, with a link to GitHub Releases.
- Pin the course launcher to the top-level Pearson viewport, collapsed by default, and update Help and the walkthrough.
- Add a local Pearson-style course mock and end-to-end queue/DOM-double tests. Synthetic checks cover eligibility, Start/question entry, unsupported linked material, pending-media reporting, Save, next assignment and the final review dialog. Live Pearson course automation remains unverified.

## 2.5.13 — October 4, 2026

- Pearson Auto recognizes the “Nice work!” result dialog and uses its Next question button to continue. If that button is missing, Auto stops for review.
- New installations leave Pause after fill off by default; existing saved preferences remain unchanged.
- Course-wide Go automation remains a separate release-level feature and appears here in 2.6.0.

## 2.5.12 — October 3, 2026

- Load Pearson MyLab custom dropdown choices through the page's Dojo widget before opening and selecting the exact visible option. The prior click-only approach left the menu empty and stopped Auto.
- Verify the chosen text in the visible Pearson field and stop before checking if the choice does not match.
- Verified the load-and-select sequence on all three dropdowns of the reported live confidence-interval question without pressing Check answer; added a bridge regression test. Other live layouts and full AI-to-grade automation remain unverified.

## 2.5.11 — October 3, 2026

- Renamed the GitHub repository to `study-assistant-ai-homework-autofill` and updated project links, the local Git remote, updater and release tooling. Extension behavior is unchanged.

## 2.5.10 — October 3, 2026

- Put recent updates at the top of the GitHub README and link directly to the full changelog and releases.
- Move older feature notes to an archive and correct stale mode and verification wording in the main README. Extension behavior is unchanged.

## 2.5.9 — October 3, 2026

- Pearson custom dropdowns now match their visible menu labels, including menus with hidden arrow text. This fixes the reported “dropdown did not open” stop on the confidence-interval question.
- The small on-page assistant highlights attention and opens the side panel for recovery.
- Clicking an AI tab marked “Reload this tab” briefly shows that tab, reloads it, then returns to the original page unless the user switches tabs.
- The walkthrough highlights one mode card with a shorter explanation so the guide no longer obscures the mode list.

## 2.5.8 — October 3, 2026

- Removed publication and cross-chat maintenance sections from the public README and built-in guide.
- Kept development handoff and publication notes in their dedicated files.

## 2.5.7 — October 3, 2026

- Guided Answers asks AI for an answer and explanation while leaving entry and navigation to the user.
- Shorten the on-page assistant and move mode controls to the side panel, with an Open side panel button.
- Streamline the first-use walkthrough and make its initial prompt clearly request setup.
- Package releases as a single ready-to-load folder inside the ZIP.

## 2.5.6 — October 3, 2026

- Added an optional local helper to update a Load unpacked installation from the latest GitHub release in place. Chrome still needs a manual Reload.
- Added offline validation tests for the updater and documented the update command.
- Fixed Canvas Classic Quiz autosave verification so it cannot switch a selected radio answer; refreshed the browser fixture's change-event behavior.

## 2.5.5 — October 3, 2026

- Ignore graded Pearson answer widgets when checking whether active controls were captured, allowing later-part dropdowns to be read.
- Let the full assistant panel scroll together instead of pinning the entire control deck.
- Replace on-page pace and speed dropdowns with compact selectable cards across the shared platform controls.
- Give Human pace a distinct person-and-book icon in settings, setup and help.

## 2.5.4 — October 2, 2026

- Make AI homework autofill explicit in the extension name, description and repository overview.
- Keep supported-site claims precise and preserve manual final submission.

## 2.5.3 — October 2, 2026

- Put a direct ZIP download and four-step Chrome installation guide at the top of the repository README.
- Keep version labels and the installable archive in sync.

## 2.5.2 — October 2, 2026

- Correct version badges and four-mode walkthrough copy.
- Bring regression tests into the repository and add reproducible packaging/tagged releases.
- Record remaining work in HANDOFF.md for cross-chat continuity.

## 2.5.1 — October 2, 2026

- Add privacy and terms pages, support/deletion instructions and a publication checklist.
- Add GitHub release links and instructions for subscribing to release notifications.
- Show the version of a downloaded Chrome update in the side panel using Chrome's update event.
- Keep active runs under user control; the update notice does not reload the extension automatically.

## 2.5.0 — October 2, 2026

- Add question-specific AI study-time estimates and selectable pace profiles.
- Add pace choices to the small assignment popup.
- Improve Pearson dropdown discovery, answer previews, part labels and supported check/advance controls.
- Complete background AI response detection on page changes, with cancellation cleanup.
- Strengthen response validation and document privacy and compatibility limits.

See README.md and VERIFICATION.md for the supported layouts and tested scope. These entries do not promise compatibility with every live assignment.
