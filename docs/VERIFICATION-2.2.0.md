# Study Assistant 2.2.0 verification — September 30, 2026

## Scope

Live Connect Question 7 was inspected read-only. Its B worksheet has native account/debit/credit controls and seven rows; A and B were already recorded by the user. No live answers, Record entry, Check my work, Next or final submission were operated. No new chatbot messages or uploads were sent. Automated behavior below was tested with synthetic localhost assignments and mocked Chrome services, not live grading.

## Passed checks

- Worker routing: existing four-platform, original McGraw, correlated AI/source/picture requests and checkpoints; new AI tab focus/open behavior, selected NotebookLM destination, allowlisted service destinations and rejection of invalid URLs; authorized per-platform pause changes and stale/unauthorized command rejection.
- Monitor lifecycle: normal routing, temporary worker recovery, synchronous and asynchronous context invalidation, missing runtime ID, heartbeat teardown and startup/listener/storage invalidation. The obsolete monitor disables its controls and stops sending.
- Settings/schema/preview: per-platform isolation; exact journal account options, balanced entries, row capacity and conflict checks; readable journal tables, decimal precision, choices, explanations, sources, JSON fences, malformed responses and inert HTML text.
- Journal browser fixture: native account/numeric model commits; changing A/B/C transactions with six/seven/eight rows, a delayed worksheet rebuild and delayed B numeric cache; record-before-switch; Check my work once after the last transaction; conflict preservation/replacement, cancellation, stale question/cell rejection, unsupported layouts and native choice/text/select inputs.
- Recorded-entry browser flow: pre-recorded A/B were skipped, C was filled/recorded once and checking followed the remaining transaction.
- Continuous browser flow: A/B/C recorded without Resume clicks, one check, one Next, then automatic input on the next synthetic question. Final submission remained manual.
- Per-cell browser pacing: account countdown then account commit, separate debit countdown, and Stop between cells preventing later input/recording.
- Panel browser fixture: routing, pause/continue/stop/recovery, stale identity, local-control restoration, explicit replacement action, Nerd mode and clickable service cards. Responsive widths of 380 and 280 pixels had no horizontal overflow; assets loaded.

JavaScript syntax, manifest/HTML resources, fixture-to-production adapter parity, icon dimensions/transparency and the ZIP layout/integrity are validated before delivery. Required and optional permissions remain unchanged from 2.1.2.

## Practical limits

The native B cache failure shown in the screenshot could not be reproduced on a live assignment without changing its entries. This update skips untouched blanks, waits for stable transaction controls and briefly retries read-only verification; persistent failures still stop with a row/cell message. Live Check my work dialogs and server results vary and have not been exercised end to end. An unknown dialog or unobserved result stops for manual review; checks are not automatically replayed. Programmatic inputs can be logged by the site. These tests do not establish model answer correctness or compatibility with every player/question type.

Refresh assignment and AI tabs after loading the update; already-invalidated old content scripts cannot be replaced in place. Prior verification is retained in docs/VERIFICATION-2.1.2.md, docs/VERIFICATION-2.1.1.md, docs/VERIFICATION-2.1.md and docs/VERIFICATION-2.0.md. Provider upload and New Quizzes coverage remain experimental as described in the README.
