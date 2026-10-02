# Study Assistant 2.3.0 verification — October 1, 2026

## Live inspection

Connect Question 10 was inspected read-only in Chrome. Its accounting iframe body uses test-mode, two editable responseCell/isN amount cells and a td-readOnly total with a SUM formula. No journal transaction controls are present. The new adapter selects a numeric worksheet path from that visible markup, without reading hidden answer/scoring data. No live amounts, Record entry, Check my work, Next, submission or new AI requests were operated.

## Passed checks

- Synthetic numeric worksheet: exact field labels, read-only/calculated context, no journal activation requirement; two native model writes, calculated total left to the site, delayed value-cache verification, formatted currency equality, signed decimal amounts, extra calculated-field rejection, formula rejection, overwrite conflict preservation and per-cell countdown/Stop. Auto checks once and never attempts Record entry for a numeric worksheet.
- Journal regression: original nested-table header handling, native account/number commits, A/B/C switching, record-before-switch, check after final entry, conflicts, read-only/stale/unsupported controls, invalid responses, cancellation and native non-worksheet inputs all passed.
- Panel fixture: embedded Settings opens without leaving the assistant page; Back restores the assistant, selected-platform settings load, and the options iframe fits a 380px viewport without horizontal overflow. Existing command/preview/pacing/recovery checks passed.
- Mode/guide UI: all three illustrated cards select and save the existing pace keys; Timed Auto describes automatic continuation, Review each step describes required Continue clicks, and Instant Auto hides countdown options. Panel Help and the embedded Settings feature guide stay in place; Back returns to the correct view. The guide was visually checked at 380px width. The main panel displays the friendly mode name. Existing pace behavior is unchanged.
- Monitor lease tests: direct panel disconnect restores the original menu immediately; multiple panels keep it hidden until the last connection closes; stale read-only probes cannot hide it again; unauthorized connections are rejected. Previous context-invalidation and worker-disconnection checks pass.
- Worker tests: a content-script Settings gesture opens the side panel without a new tab, with a window-scoped settings intent and authorized one-time consumption. Background-by-default, optional Watch switching, correlated AI/NotebookLM/picture routing, settings authorization and checkpoints continue passing.
- Platform defaults, readable preview, journal schema and JavaScript syntax checks pass. Manifest/HTML resources, production-to-fixture parity, unchanged permissions and complete ZIP integrity are validated before delivery.

## Limits

The new extension has not been installed and exercised end to end against the live worksheet or a live Chrome panel-close event. Native editing/autosave was tested against a synthetic contract based on the observed markup and existing editor callback integration. Live grading results, provider background behavior and all worksheet variants remain unverified. Numeric worksheets currently support visible native numeric response cells; dropdown/text widgets, drawings and multi-frame layouts need manual entry. Computed totals are never written. An uncertain save/check/dialog stops for review. Final assignment submission remains manual.

Settings uses Chrome’s user-gesture sidePanel.open API; if Chrome refuses an open request, the local Connect status asks the user to use the toolbar icon. Immediate menu restoration uses a direct tabs.connect port, with no reliance on newer Chrome panel-close events. No new permissions were added. Previous scope/limitations remain in docs/VERIFICATION-2.2.1.md and earlier verification files.

Primary API references: https://developer.chrome.com/docs/extensions/reference/api/sidePanel and https://developer.chrome.com/docs/extensions/develop/concepts/messaging#connect .
