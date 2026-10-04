# Changelog

Versions listed here describe source changes. A version is downloadable as a GitHub release only after its tag, release notes and package have been published.

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
